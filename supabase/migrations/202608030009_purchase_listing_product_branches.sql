begin;

-- Repair and recreate the multi-branch PO save objects first. This makes
-- migration 009 sufficient even when migration 008 was only partially applied.
-- Ensure all v2.4 purchase-order objects exist even if the previous migration
-- was only partially applied.
create sequence if not exists public.purchase_seq start 1;

alter table public.purchase_orders
  add column if not exists receiving_scope text not null default 'single';

alter table public.purchase_orders
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.purchase_order_allocations (
  id uuid primary key default gen_random_uuid(),
  purchase_order_item_id uuid not null references public.purchase_order_items(id) on delete cascade,
  store_id uuid not null references public.stores(id),
  quantity numeric(18,3) not null check(quantity > 0),
  quantity_received numeric(18,3) not null default 0,
  unique(purchase_order_item_id, store_id)
);

alter table public.purchase_order_allocations enable row level security;
grant select, insert, update, delete on public.purchase_order_allocations to authenticated;

create index if not exists purchase_allocations_store_idx
  on public.purchase_order_allocations(store_id, purchase_order_item_id);
create index if not exists purchase_items_order_idx
  on public.purchase_order_items(purchase_order_id);

-- Recreate the save function using normal FOR ... SELECT loops. This avoids
-- array-casting edge cases when p_items is sent by Supabase as JSONB.
create or replace function public.save_purchase_order_multi(
  p_purchase_order_id uuid,
  p_supplier_id uuid,
  p_receiving_scope text,
  p_items jsonb,
  p_shipping_cost numeric default 0,
  p_discount numeric default 0,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_number text;
  v_item jsonb;
  v_allocation jsonb;
  v_product_id uuid;
  v_item_id uuid;
  v_store_id uuid;
  v_quantity numeric;
  v_item_quantity numeric;
  v_cost numeric;
  v_subtotal numeric := 0;
  v_line numeric;
  v_total numeric;
  v_first_store uuid;
  v_existing public.purchase_orders%rowtype;
  v_allocation_count integer;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  if public.current_user_role() not in ('owner','admin','manager','warehouse') then
    raise exception 'Role cannot create purchases';
  end if;

  if p_receiving_scope not in ('single','selected','all') then
    raise exception 'Invalid receiving scope';
  end if;

  if p_supplier_id is null or not exists (
    select 1 from public.suppliers where id = p_supplier_id and is_active = true
  ) then
    raise exception 'Supplier not found or inactive';
  end if;

  if coalesce(p_shipping_cost, 0) < 0 or coalesce(p_discount, 0) < 0 then
    raise exception 'Invalid purchase cost';
  end if;

  if coalesce(jsonb_typeof(p_items), '') <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Purchase has no items';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as rows(value)
    group by value->>'product_id'
    having count(*) > 1
  ) then
    raise exception 'Duplicate product in purchase';
  end if;

  select nullif(value->'allocations'->0->>'store_id', '')::uuid
    into v_first_store
  from jsonb_array_elements(p_items) as rows(value)
  limit 1;

  if v_first_store is null then
    raise exception 'Purchase destination is empty';
  end if;

  if not public.can_access_store(v_first_store) then
    raise exception 'Branch access denied';
  end if;

  if p_purchase_order_id is null then
    v_id := gen_random_uuid();
    v_number := 'PO-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD') || '-' || lpad(nextval('public.purchase_seq')::text, 5, '0');

    insert into public.purchase_orders(
      id, po_number, supplier_id, destination_store_id, status,
      subtotal, discount, shipping_cost, total, notes,
      created_by, approved_by, receiving_scope, updated_at
    ) values (
      v_id, v_number, p_supplier_id, v_first_store, 'pending',
      0, coalesce(p_discount, 0), coalesce(p_shipping_cost, 0), 0,
      nullif(trim(coalesce(p_notes, '')), ''),
      v_actor, v_actor, p_receiving_scope, now()
    );
  else
    select * into v_existing
    from public.purchase_orders
    where id = p_purchase_order_id
    for update;

    if not found then
      raise exception 'Purchase order not found';
    end if;

    if v_existing.status not in ('draft','pending') then
      raise exception 'Only draft or pending purchase can be edited';
    end if;

    if not public.is_admin() and not public.can_access_store(v_existing.destination_store_id) then
      raise exception 'Purchase access denied';
    end if;

    v_id := v_existing.id;
    v_number := v_existing.po_number;

    -- Allocations are deleted by cascade together with their item rows.
    delete from public.purchase_order_items where purchase_order_id = v_id;
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items) as rows(value)
  loop
    begin
      v_product_id := nullif(v_item->>'product_id', '')::uuid;
      v_cost := coalesce(nullif(v_item->>'unit_cost', '')::numeric, 0);
    exception when others then
      raise exception 'Invalid purchase product or cost';
    end;

    if v_product_id is null or v_cost < 0 or not exists (
      select 1 from public.products where id = v_product_id and is_active = true
    ) then
      raise exception 'Invalid purchase product or cost';
    end if;

    if coalesce(jsonb_typeof(v_item->'allocations'), '') <> 'array'
       or jsonb_array_length(v_item->'allocations') = 0 then
      raise exception 'Every product needs at least one branch allocation';
    end if;

    select count(*) into v_allocation_count
    from jsonb_array_elements(v_item->'allocations') as rows(value);

    if exists (
      select 1
      from jsonb_array_elements(v_item->'allocations') as rows(value)
      group by value->>'store_id'
      having count(*) > 1
    ) then
      raise exception 'Duplicate branch allocation';
    end if;

    v_item_quantity := 0;

    for v_allocation in
      select value from jsonb_array_elements(v_item->'allocations') as rows(value)
    loop
      begin
        v_store_id := nullif(v_allocation->>'store_id', '')::uuid;
        v_quantity := nullif(v_allocation->>'quantity', '')::numeric;
      exception when others then
        raise exception 'Invalid branch allocation';
      end;

      if v_store_id is null or v_quantity is null or v_quantity <= 0 then
        raise exception 'Invalid branch allocation quantity';
      end if;

      if not exists (select 1 from public.stores where id = v_store_id and is_active = true) then
        raise exception 'Branch not found or inactive';
      end if;

      if not public.can_access_store(v_store_id) then
        raise exception 'Branch access denied';
      end if;

      v_item_quantity := v_item_quantity + v_quantity;
    end loop;

    if p_receiving_scope = 'all' and v_allocation_count <> (
      select count(*)
      from public.stores s
      where s.is_active = true
        and (public.is_admin() or public.can_access_store(s.id))
    ) then
      raise exception 'All branch mode requires an allocation for every active branch';
    end if;

    v_line := v_item_quantity * v_cost;
    v_subtotal := v_subtotal + v_line;

    insert into public.purchase_order_items(
      purchase_order_id, product_id, quantity_ordered,
      quantity_received, unit_cost, subtotal
    ) values (
      v_id, v_product_id, v_item_quantity, 0, v_cost, v_line
    ) returning id into v_item_id;

    for v_allocation in
      select value from jsonb_array_elements(v_item->'allocations') as rows(value)
    loop
      insert into public.purchase_order_allocations(
        purchase_order_item_id, store_id, quantity
      ) values (
        v_item_id,
        (v_allocation->>'store_id')::uuid,
        (v_allocation->>'quantity')::numeric
      );
    end loop;
  end loop;

  v_total := greatest(v_subtotal + coalesce(p_shipping_cost, 0) - coalesce(p_discount, 0), 0);

  update public.purchase_orders
  set supplier_id = p_supplier_id,
      destination_store_id = v_first_store,
      status = 'pending',
      subtotal = v_subtotal,
      discount = coalesce(p_discount, 0),
      shipping_cost = coalesce(p_shipping_cost, 0),
      total = v_total,
      notes = nullif(trim(coalesce(p_notes, '')), ''),
      receiving_scope = p_receiving_scope,
      updated_at = now()
  where id = v_id;

  return jsonb_build_object(
    'id', v_id,
    'po_number', v_number,
    'status', 'pending',
    'subtotal', v_subtotal,
    'total', v_total,
    'item_count', jsonb_array_length(p_items)
  );
end;
$$;

grant execute on function public.save_purchase_order_multi(uuid,uuid,text,jsonb,numeric,numeric,text) to authenticated;

-- Product sales availability per branch. Existing products remain available
-- in every active branch until an administrator changes the scope.
alter table public.products
  add column if not exists sales_scope text not null default 'all';

alter table public.products
  drop constraint if exists products_sales_scope_check;
alter table public.products
  add constraint products_sales_scope_check
  check (sales_scope in ('all','selected'));

create table if not exists public.product_store_sales (
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(product_id, store_id)
);

alter table public.product_store_sales enable row level security;
grant select, insert, update, delete on public.product_store_sales to authenticated;

drop policy if exists product_store_sales_read on public.product_store_sales;
create policy product_store_sales_read
on public.product_store_sales for select to authenticated
using (true);

drop policy if exists product_store_sales_admin on public.product_store_sales;
create policy product_store_sales_admin
on public.product_store_sales for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists product_store_sales_store_idx
  on public.product_store_sales(store_id, product_id);

create or replace function public.product_is_sellable_at_store(
  p_product_id uuid,
  p_store_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.products p
    where p.id = p_product_id
      and p.is_active = true
      and (
        p.sales_scope = 'all'
        or exists(
          select 1
          from public.product_store_sales pss
          where pss.product_id = p.id
            and pss.store_id = p_store_id
        )
      )
  );
$$;

grant execute on function public.product_is_sellable_at_store(uuid, uuid) to authenticated;

-- Final server-side protection. complete_sale inserts the sale row before the
-- item rows; if a product is unavailable in that branch the whole transaction,
-- including stock changes, is rolled back.
create or replace function public.enforce_sale_item_store_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  select s.store_id into v_store_id
  from public.sales s
  where s.id = new.sale_id;

  if v_store_id is null then
    raise exception 'Sale store not found';
  end if;

  if not public.product_is_sellable_at_store(new.product_id, v_store_id) then
    raise exception 'Product is not available for sale at this branch';
  end if;

  return new;
end;
$$;

drop trigger if exists sale_item_store_availability on public.sale_items;
create trigger sale_item_store_availability
before insert or update of product_id, sale_id on public.sale_items
for each row execute function public.enforce_sale_item_store_availability();

-- Rebuild read policies for purchase documents. The order is visible when the
-- user is an owner/admin or has access to any receiving allocation.
drop policy if exists purchase_orders_read on public.purchase_orders;
create policy purchase_orders_read
on public.purchase_orders for select to authenticated
using (
  public.is_admin()
  or public.can_access_store(destination_store_id)
  or exists(
    select 1
    from public.purchase_order_items poi
    join public.purchase_order_allocations poa
      on poa.purchase_order_item_id = poi.id
    where poi.purchase_order_id = purchase_orders.id
      and public.can_access_store(poa.store_id)
  )
);

drop policy if exists purchase_items_read on public.purchase_order_items;
create policy purchase_items_read
on public.purchase_order_items for select to authenticated
using (
  exists(
    select 1
    from public.purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and (
        public.is_admin()
        or public.can_access_store(po.destination_store_id)
        or exists(
          select 1
          from public.purchase_order_allocations poa
          where poa.purchase_order_item_id = purchase_order_items.id
            and public.can_access_store(poa.store_id)
        )
      )
  )
);

drop policy if exists purchase_allocations_read on public.purchase_order_allocations;
create policy purchase_allocations_read
on public.purchase_order_allocations for select to authenticated
using (
  public.is_admin()
  or public.can_access_store(store_id)
  or exists(
    select 1
    from public.purchase_order_items poi
    join public.purchase_orders po on po.id = poi.purchase_order_id
    where poi.id = purchase_order_allocations.purchase_order_item_id
      and public.can_access_store(po.destination_store_id)
  )
);

-- Stable purchase listing RPC. It avoids fragile nested PostgREST relation
-- queries and always returns complete PO, item, and branch allocation data.
create or replace function public.purchase_orders_overview(
  p_store_id uuid default null
) returns table(payload jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', po.id,
    'po_number', po.po_number,
    'supplier_id', po.supplier_id,
    'supplier_name', coalesce(sup.name, 'Supplier'),
    'destination_store_id', po.destination_store_id,
    'store_name', coalesce(destination.name, 'Toko'),
    'receiving_scope', po.receiving_scope,
    'status', po.status,
    'subtotal', po.subtotal,
    'discount', po.discount,
    'shipping_cost', po.shipping_cost,
    'total', po.total,
    'notes', po.notes,
    'created_at', po.created_at,
    'received_at', po.received_at,
    'updated_at', po.updated_at,
    'store_names', coalesce(
      (
        select jsonb_agg(distinct st.name order by st.name)
        from public.purchase_order_items poi_names
        join public.purchase_order_allocations poa_names
          on poa_names.purchase_order_item_id = poi_names.id
        join public.stores st on st.id = poa_names.store_id
        where poi_names.purchase_order_id = po.id
      ),
      jsonb_build_array(coalesce(destination.name, 'Toko'))
    ),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', poi.id,
            'product_id', poi.product_id,
            'name', coalesce(prod.name, 'Produk'),
            'sku', coalesce(prod.sku, ''),
            'unit', coalesce(prod.unit, 'pcs'),
            'quantity_ordered', poi.quantity_ordered,
            'quantity_received', poi.quantity_received,
            'unit_cost', poi.unit_cost,
            'subtotal', poi.subtotal,
            'allocations', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', poa.id,
                    'store_id', poa.store_id,
                    'store_name', coalesce(st.name, 'Toko'),
                    'store_code', coalesce(st.code, ''),
                    'quantity', poa.quantity,
                    'quantity_received', poa.quantity_received
                  ) order by st.name
                )
                from public.purchase_order_allocations poa
                join public.stores st on st.id = poa.store_id
                where poa.purchase_order_item_id = poi.id
              ),
              '[]'::jsonb
            )
          ) order by prod.name
        )
        from public.purchase_order_items poi
        left join public.products prod on prod.id = poi.product_id
        where poi.purchase_order_id = po.id
      ),
      '[]'::jsonb
    )
  ) as payload
  from public.purchase_orders po
  left join public.suppliers sup on sup.id = po.supplier_id
  left join public.stores destination on destination.id = po.destination_store_id
  where auth.uid() is not null
    and public.current_user_role() in ('owner','admin','manager','warehouse')
    and (
      public.is_admin()
      or public.can_access_store(po.destination_store_id)
      or exists(
        select 1
        from public.purchase_order_items poi_access
        join public.purchase_order_allocations poa_access
          on poa_access.purchase_order_item_id = poi_access.id
        where poi_access.purchase_order_id = po.id
          and public.can_access_store(poa_access.store_id)
      )
    )
    and (
      p_store_id is null
      or po.destination_store_id = p_store_id
      or exists(
        select 1
        from public.purchase_order_items poi_filter
        join public.purchase_order_allocations poa_filter
          on poa_filter.purchase_order_item_id = poi_filter.id
        where poi_filter.purchase_order_id = po.id
          and poa_filter.store_id = p_store_id
      )
    )
  order by po.created_at desc;
$$;

grant execute on function public.purchase_orders_overview(uuid) to authenticated;

commit;
