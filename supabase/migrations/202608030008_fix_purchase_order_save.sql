begin;

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

commit;
