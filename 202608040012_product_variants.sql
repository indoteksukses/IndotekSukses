-- Indotek Sukses v2.6.0
-- Product variants with independent cost and selling prices.
-- Stock remains at product level so inventory, transfers and stocktakes stay compact.

begin;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text,
  barcode text,
  cost_price numeric(18,2) not null default 0 check(cost_price >= 0),
  selling_price numeric(18,2) not null default 0 check(selling_price >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(length(trim(name)) > 0)
);

create unique index if not exists product_variants_product_name_unique
  on public.product_variants(product_id, lower(trim(name)));
create unique index if not exists product_variants_sku_unique
  on public.product_variants(upper(trim(sku))) where sku is not null and trim(sku) <> '';
create unique index if not exists product_variants_barcode_unique
  on public.product_variants(trim(barcode)) where barcode is not null and trim(barcode) <> '';
create index if not exists product_variants_product_sort_idx
  on public.product_variants(product_id, sort_order, name);

create or replace function public.check_product_variant_codes()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.sku is not null and trim(new.sku) <> '' and exists(
    select 1 from public.products p where upper(trim(p.sku))=upper(trim(new.sku))
  ) then raise exception 'SKU varian sudah digunakan sebagai SKU produk'; end if;
  if new.barcode is not null and trim(new.barcode) <> '' and exists(
    select 1 from public.products p where p.barcode is not null and trim(p.barcode)=trim(new.barcode)
  ) then raise exception 'Barcode varian sudah digunakan sebagai barcode produk'; end if;
  return new;
end $$;

drop trigger if exists validate_product_variant_codes on public.product_variants;
create trigger validate_product_variant_codes before insert or update of sku,barcode
on public.product_variants for each row execute function public.check_product_variant_codes();

create or replace function public.check_product_base_codes()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.sku is not null and trim(new.sku) <> '' and exists(
    select 1 from public.product_variants pv where upper(trim(pv.sku))=upper(trim(new.sku))
  ) then raise exception 'SKU produk sudah digunakan sebagai SKU varian'; end if;
  if new.barcode is not null and trim(new.barcode) <> '' and exists(
    select 1 from public.product_variants pv where pv.barcode is not null and trim(pv.barcode)=trim(new.barcode)
  ) then raise exception 'Barcode produk sudah digunakan sebagai barcode varian'; end if;
  return new;
end $$;

drop trigger if exists validate_product_base_codes on public.products;
create trigger validate_product_base_codes before insert or update of sku,barcode
on public.products for each row execute function public.check_product_base_codes();

alter table public.product_variants enable row level security;

grant select (id, product_id, name, sku, barcode, selling_price, is_active, sort_order, created_at, updated_at)
  on public.product_variants to authenticated;
grant insert, update, delete on public.product_variants to authenticated;

drop policy if exists product_variants_read on public.product_variants;
create policy product_variants_read on public.product_variants
for select to authenticated using (true);

drop policy if exists product_variants_admin on public.product_variants;
create policy product_variants_admin on public.product_variants
for all to authenticated
using (public.current_user_role() in ('owner','admin'))
with check (public.current_user_role() in ('owner','admin'));

alter table public.sale_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_name_snapshot text,
  add column if not exists variant_sku_snapshot text;

-- Replace checkout while keeping the same RPC signature used by the application.
create or replace function public.complete_sale(
 p_store_id uuid,
 p_shift_id uuid,
 p_customer_name text,
 p_items jsonb,
 p_payments jsonb,
 p_discount numeric default 0,
 p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_sale_id uuid := gen_random_uuid();
 v_invoice text;
 v_subtotal numeric := 0;
 v_total numeric;
 v_item jsonb;
 v_payment jsonb;
 v_product public.products%rowtype;
 v_variant public.product_variants%rowtype;
 v_variant_id uuid;
 v_qty numeric;
 v_product_total numeric;
 v_unit_cost numeric;
 v_unit_price numeric;
 v_line numeric;
 v_before numeric;
 v_after numeric;
 v_cashier uuid := auth.uid();
 v_paid numeric := 0;
 v_snapshot_name text;
 v_snapshot_sku text;
begin
 if v_cashier is null then raise exception 'Not authenticated'; end if;
 if public.current_user_role() not in ('owner','admin','manager','cashier') then raise exception 'Role cannot complete sales'; end if;
 if not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;
 if coalesce(jsonb_typeof(p_items),'') <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart is empty'; end if;
 if coalesce(jsonb_typeof(p_payments),'') <> 'array' then raise exception 'Invalid payment data'; end if;
 if p_shift_id is null or not exists(select 1 from public.cashier_shifts where id=p_shift_id and store_id=p_store_id and status='open') then raise exception 'An active store shift is required'; end if;

 if exists(
   select 1
   from jsonb_array_elements(p_items) item
   group by item->>'product_id', coalesce(nullif(item->>'variant_id',''),'base')
   having count(*) > 1
 ) then raise exception 'Duplicate product variant in cart'; end if;

 v_invoice := 'IDS-' || to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD') || '-' || lpad(nextval('public.invoice_seq')::text,6,'0');

 -- Validate and calculate totals.
 foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
  select * into v_product from public.products where id=(v_item->>'product_id')::uuid and is_active=true;
  if not found then raise exception 'Product not found'; end if;
  if exists(select 1 from public.product_variants pv where pv.product_id=v_product.id and pv.is_active)
     and nullif(v_item->>'variant_id','') is null then
    raise exception 'Variant must be selected for %', v_product.name;
  end if;

  v_variant_id := nullif(v_item->>'variant_id','')::uuid;
  if v_variant_id is not null then
    select * into v_variant from public.product_variants
      where id=v_variant_id and product_id=v_product.id and is_active=true;
    if not found then raise exception 'Product variant not found for %', v_product.name; end if;
    v_unit_cost := v_variant.cost_price;
    v_unit_price := v_variant.selling_price;
  else
    v_unit_cost := v_product.cost_price;
    v_unit_price := v_product.selling_price;
  end if;

  v_qty := (v_item->>'quantity')::numeric;
  if v_qty <= 0 then raise exception 'Invalid quantity'; end if;
  insert into public.store_inventory(store_id,product_id) values(p_store_id,v_product.id) on conflict do nothing;
  select quantity_on_hand into v_before from public.store_inventory where store_id=p_store_id and product_id=v_product.id for update;
  select sum((item->>'quantity')::numeric) into v_product_total
    from jsonb_array_elements(p_items) item
    where (item->>'product_id')::uuid = v_product.id;
  if v_before < coalesce(v_product_total,0) then raise exception 'Insufficient stock for %',v_product.name; end if;
  v_line := v_unit_price * v_qty;
  v_subtotal := v_subtotal + v_line;
 end loop;

 if coalesce(p_discount,0) < 0 or coalesce(p_discount,0) > v_subtotal then raise exception 'Invalid discount'; end if;
 v_total := v_subtotal - coalesce(p_discount,0);
 if exists(select 1 from jsonb_array_elements(p_payments) payment where (payment->>'amount')::numeric < 0) then raise exception 'Payment amount cannot be negative'; end if;
 select coalesce(sum((value->>'amount')::numeric),0) into v_paid from jsonb_array_elements(p_payments);
 if v_paid <> v_total then raise exception 'Payment total must equal grand total'; end if;

 insert into public.sales(id,invoice_number,store_id,cashier_id,shift_id,customer_name,subtotal,discount,grand_total,notes)
 values(v_sale_id,v_invoice,p_store_id,v_cashier,p_shift_id,p_customer_name,v_subtotal,coalesce(p_discount,0),v_total,p_notes);

 -- Post sale and stock movement.
 foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
  select * into v_product from public.products where id=(v_item->>'product_id')::uuid;
  v_variant_id := nullif(v_item->>'variant_id','')::uuid;
  if v_variant_id is not null then
    select * into v_variant from public.product_variants where id=v_variant_id and product_id=v_product.id;
    v_unit_cost := v_variant.cost_price;
    v_unit_price := v_variant.selling_price;
    v_snapshot_name := v_variant.name;
    v_snapshot_sku := v_variant.sku;
  else
    v_unit_cost := v_product.cost_price;
    v_unit_price := v_product.selling_price;
    v_snapshot_name := null;
    v_snapshot_sku := null;
  end if;
  v_qty := (v_item->>'quantity')::numeric;
  v_line := v_unit_price * v_qty;
  select quantity_on_hand into v_before from public.store_inventory where store_id=p_store_id and product_id=v_product.id for update;
  v_after := v_before - v_qty;
  update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=p_store_id and product_id=v_product.id;
  insert into public.sale_items(
    sale_id,product_id,variant_id,product_name_snapshot,sku_snapshot,variant_name_snapshot,variant_sku_snapshot,
    quantity,cost_price_snapshot,selling_price_snapshot,subtotal
  ) values(
    v_sale_id,v_product.id,v_variant_id,v_product.name,v_product.sku,v_snapshot_name,v_snapshot_sku,
    v_qty,v_unit_cost,v_unit_price,v_line
  );
  insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by)
  values(p_store_id,v_product.id,'sale',-v_qty,v_before,v_after,'sale',v_sale_id,
    'Penjualan '||v_invoice||case when v_snapshot_name is not null then ' · '||v_snapshot_name else '' end,v_cashier);
 end loop;

 foreach v_payment in array array(select value from jsonb_array_elements(p_payments)) loop
  if (v_payment->>'amount')::numeric > 0 then
   insert into public.payments(sale_id,method,amount,reference_number)
   values(v_sale_id,(v_payment->>'method')::public.payment_method,(v_payment->>'amount')::numeric,v_payment->>'reference_number');
  end if;
 end loop;
 return jsonb_build_object('sale_id',v_sale_id,'invoice_number',v_invoice,'grand_total',v_total);
end $$;

grant execute on function public.complete_sale(uuid,uuid,text,jsonb,jsonb,numeric,text) to authenticated;

-- Keep cost prices protected from ordinary browser SELECT queries.
revoke select on public.product_variants from authenticated;
grant select (id, product_id, name, sku, barcode, selling_price, is_active, sort_order, created_at, updated_at)
  on public.product_variants to authenticated;


-- Allow invoice screens to read variant snapshots while cost snapshots remain protected.
revoke select on public.sale_items from authenticated;
grant select (
  id,sale_id,product_id,variant_id,product_name_snapshot,sku_snapshot,variant_name_snapshot,variant_sku_snapshot,
  quantity,selling_price_snapshot,discount,subtotal
) on public.sale_items to authenticated;

-- Variant-aware return item lookup.
drop function if exists public.returnable_sale_items(uuid);
create function public.returnable_sale_items(p_sale_id uuid)
returns table(
  sale_item_id uuid,
  product_id uuid,
  variant_id uuid,
  product_name text,
  variant_name text,
  sku text,
  variant_sku text,
  purchased_quantity numeric,
  returned_quantity numeric,
  remaining_quantity numeric,
  unit_price numeric
) language plpgsql stable security definer set search_path=public as $$
declare v_store_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','cashier') then raise exception 'Return access denied'; end if;
  select store_id into v_store_id from public.sales where id=p_sale_id and status in ('completed','partially_refunded');
  if v_store_id is null then raise exception 'Sale not found'; end if;
  if not public.can_access_store(v_store_id) then raise exception 'Store access denied'; end if;
  return query
  with returned as (
    select ri.sale_item_id,sum(ri.quantity) quantity
    from public.return_items ri join public.returns r on r.id=ri.return_id
    where r.status in ('approved','completed') group by ri.sale_item_id
  )
  select si.id,si.product_id,si.variant_id,si.product_name_snapshot,si.variant_name_snapshot,
         si.sku_snapshot,si.variant_sku_snapshot,si.quantity,coalesce(returned.quantity,0),
         si.quantity-coalesce(returned.quantity,0),si.selling_price_snapshot
  from public.sale_items si left join returned on returned.sale_item_id=si.id
  where si.sale_id=p_sale_id and si.quantity-coalesce(returned.quantity,0)>0
  order by si.product_name_snapshot,si.variant_name_snapshot;
end $$;
grant execute on function public.returnable_sale_items(uuid) to authenticated;

create or replace function public.create_customer_return_v2(
  p_sale_id uuid,
  p_sale_item_id uuid,
  p_quantity numeric,
  p_condition text,
  p_reason text,
  p_resolution text default 'refund'
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_sale public.sales%rowtype; v_item public.sale_items%rowtype; v_id uuid:=gen_random_uuid(); v_number text;
  v_before numeric; v_after numeric; v_amount numeric; v_already_returned numeric:=0; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','cashier') then raise exception 'Role cannot create returns'; end if;
  if p_quantity<=0 or p_condition not in ('sellable','damaged','inspection') then raise exception 'Invalid return data'; end if;
  select * into v_sale from public.sales where id=p_sale_id and status in ('completed','partially_refunded') for update;
  if not found then raise exception 'Sale not found'; end if;
  if not public.can_access_store(v_sale.store_id) then raise exception 'Store access denied'; end if;
  select * into v_item from public.sale_items where id=p_sale_item_id and sale_id=p_sale_id;
  if not found then raise exception 'Sale item not found'; end if;
  select coalesce(sum(ri.quantity),0) into v_already_returned
  from public.return_items ri join public.returns r on r.id=ri.return_id
  where ri.sale_item_id=v_item.id and r.status in ('approved','completed');
  if p_quantity>(v_item.quantity-v_already_returned) then raise exception 'Returned quantity exceeds remaining sale quantity'; end if;
  v_amount:=p_quantity*v_item.selling_price_snapshot;
  v_number:='RET-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.return_seq')::text,5,'0');
  insert into public.returns(id,return_number,return_type,sale_id,store_id,status,resolution,reason,refund_amount,created_by,approved_by,completed_at)
  values(v_id,v_number,'customer',p_sale_id,v_sale.store_id,'completed',p_resolution,p_reason,v_amount,v_actor,v_actor,now());
  insert into public.return_items(return_id,sale_item_id,product_id,quantity,condition,amount)
  values(v_id,v_item.id,v_item.product_id,p_quantity,p_condition,v_amount);
  insert into public.store_inventory(store_id,product_id) values(v_sale.store_id,v_item.product_id) on conflict do nothing;
  select quantity_on_hand into v_before from public.store_inventory where store_id=v_sale.store_id and product_id=v_item.product_id for update;
  if p_condition='sellable' then
    v_after:=v_before+p_quantity;
    update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_sale.store_id and product_id=v_item.product_id;
    insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by,approved_by)
    values(v_sale.store_id,v_item.product_id,'customer_return',p_quantity,v_before,v_after,'return',v_id,p_reason,v_actor,v_actor);
  else
    v_after:=v_before;
    update public.store_inventory set quantity_damaged=quantity_damaged+p_quantity,updated_at=now() where store_id=v_sale.store_id and product_id=v_item.product_id;
  end if;
  update public.sales set status='partially_refunded' where id=p_sale_id and status='completed';
  return jsonb_build_object('id',v_id,'return_number',v_number,'refund_amount',v_amount,'status','completed');
end $$;
grant execute on function public.create_customer_return_v2(uuid,uuid,numeric,text,text,text) to authenticated;

notify pgrst, 'reload schema';
commit;

select
  to_regclass('public.product_variants') is not null as product_variants_ready,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='sale_items' and column_name='variant_id') as sale_variant_ready;
