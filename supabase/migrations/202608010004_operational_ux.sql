-- Indotek Sukses v2.1.0
-- Operational UX, shared store shifts, stock corrections, store images, and profile avatars.
-- Safe to run after migrations 001-003. Existing sales, products, and stock are preserved.

begin;

alter table public.stores add column if not exists image_url text;
alter table public.profiles add column if not exists avatar_key text not null default 'ocean';
alter table public.categories add column if not exists updated_at timestamptz not null default now();
alter table public.stock_movements add column if not exists reversed_at timestamptz;
alter table public.stock_movements add column if not exists reversed_by uuid references public.profiles(id);
alter table public.stock_movements add column if not exists reversal_movement_id uuid references public.stock_movements(id);
alter table public.stock_movements add column if not exists correction_reason text;

-- Keep only the newest currently-open shift in each store before adding the new constraint.
with ranked as (
  select id, row_number() over(partition by store_id order by opened_at desc, id desc) as rn
  from public.cashier_shifts
  where status='open'
)
update public.cashier_shifts s
set status='closed', closed_at=coalesce(s.closed_at,now()),
    notes=concat_ws(E'\n',nullif(s.notes,''),'Ditutup otomatis saat upgrade: hanya satu shift aktif diperbolehkan per toko.')
from ranked r
where s.id=r.id and r.rn>1;

drop index if exists public.one_open_shift_per_cashier;
create unique index if not exists one_open_shift_per_store
  on public.cashier_shifts(store_id) where status='open';

create or replace function public.set_stock_level(
  p_store_id uuid,
  p_product_id uuid,
  p_target_quantity numeric,
  p_reason text
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid:=auth.uid();
  v_before numeric;
  v_delta numeric;
  v_id uuid;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot edit stock'; end if;
  if not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;
  if p_target_quantity is null or p_target_quantity<0 then raise exception 'Target stock cannot be negative'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Correction reason is required'; end if;

  insert into public.store_inventory(store_id,product_id)
  values(p_store_id,p_product_id) on conflict do nothing;

  select quantity_on_hand into v_before
  from public.store_inventory
  where store_id=p_store_id and product_id=p_product_id
  for update;

  v_delta:=p_target_quantity-v_before;
  if v_delta=0 then raise exception 'Stock is already equal to target'; end if;

  update public.store_inventory
  set quantity_on_hand=p_target_quantity,updated_at=now()
  where store_id=p_store_id and product_id=p_product_id;

  insert into public.stock_movements(
    store_id,product_id,movement_type,quantity,stock_before,stock_after,
    reference_type,reason,notes,created_by,approved_by
  ) values(
    p_store_id,p_product_id,'manual_adjustment',v_delta,v_before,p_target_quantity,
    'stock_edit',p_reason,'Perubahan saldo stok langsung dengan jejak audit.',v_actor,v_actor
  ) returning id into v_id;

  return v_id;
end $$;

create or replace function public.reverse_stock_movement(
  p_movement_id uuid,
  p_reason text
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid:=auth.uid();
  v_original public.stock_movements%rowtype;
  v_before numeric;
  v_after numeric;
  v_reversal_id uuid;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager') then raise exception 'Only owner, admin, or store manager may correct a movement'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Correction reason is required'; end if;

  select * into v_original from public.stock_movements where id=p_movement_id for update;
  if not found then raise exception 'Movement not found'; end if;
  if not public.can_access_store(v_original.store_id) then raise exception 'Store access denied'; end if;
  if v_original.reversed_at is not null then raise exception 'Movement has already been corrected'; end if;
  if v_original.movement_type in ('sale','sale_reversal','transfer_out','transfer_in') then
    raise exception 'Sales and transfers must be corrected from their own document menu';
  end if;

  select quantity_on_hand into v_before
  from public.store_inventory
  where store_id=v_original.store_id and product_id=v_original.product_id
  for update;

  v_after:=v_before-v_original.quantity;
  if v_after<0 then raise exception 'Correction would make stock negative'; end if;

  update public.store_inventory
  set quantity_on_hand=v_after,updated_at=now()
  where store_id=v_original.store_id and product_id=v_original.product_id;

  insert into public.stock_movements(
    store_id,product_id,movement_type,quantity,stock_before,stock_after,
    reference_type,reference_id,reason,notes,created_by,approved_by,correction_reason
  ) values(
    v_original.store_id,v_original.product_id,'manual_adjustment',-v_original.quantity,
    v_before,v_after,'movement_reversal',v_original.id,
    'Ralat: '||coalesce(v_original.reason,v_original.movement_type::text),
    'Membalik pergerakan stok '||v_original.id::text,v_actor,v_actor,p_reason
  ) returning id into v_reversal_id;

  update public.stock_movements
  set reversed_at=now(),reversed_by=v_actor,reversal_movement_id=v_reversal_id,correction_reason=p_reason
  where id=v_original.id;

  return v_reversal_id;
end $$;

-- One shared active shift per store. Any authorized cashier with store access can use it.
create or replace function public.complete_sale(
 p_store_id uuid,p_shift_id uuid,p_customer_name text,p_items jsonb,p_payments jsonb,p_discount numeric default 0,p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sale_id uuid:=gen_random_uuid(); v_invoice text; v_subtotal numeric:=0; v_total numeric; v_item jsonb; v_payment jsonb;
 v_product public.products%rowtype; v_qty numeric; v_line numeric; v_before numeric; v_after numeric; v_cashier uuid:=auth.uid(); v_paid numeric:=0;
begin
 if v_cashier is null then raise exception 'Not authenticated'; end if;
 if public.current_user_role() not in ('owner','admin','manager','cashier') then raise exception 'Role cannot complete sales'; end if;
 if not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;
 if coalesce(jsonb_typeof(p_items),'')<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart is empty'; end if;
 if coalesce(jsonb_typeof(p_payments),'')<>'array' then raise exception 'Invalid payment data'; end if;
 if p_shift_id is null or not exists(
   select 1 from public.cashier_shifts
   where id=p_shift_id and store_id=p_store_id and status='open'
 ) then raise exception 'An active store shift is required'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) item group by item->>'product_id' having count(*)>1) then raise exception 'Duplicate product in cart'; end if;
 v_invoice:='IDS-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.invoice_seq')::text,6,'0');
 foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
  select * into v_product from public.products where id=(v_item->>'product_id')::uuid and is_active=true;
  if not found then raise exception 'Product not found'; end if;
  v_qty:=(v_item->>'quantity')::numeric; if v_qty<=0 then raise exception 'Invalid quantity'; end if;
  insert into public.store_inventory(store_id,product_id) values(p_store_id,v_product.id) on conflict do nothing;
  select quantity_on_hand into v_before from public.store_inventory where store_id=p_store_id and product_id=v_product.id for update;
  if v_before<v_qty then raise exception 'Insufficient stock for %',v_product.name; end if;
  v_line:=v_product.selling_price*v_qty; v_subtotal:=v_subtotal+v_line;
 end loop;
 if coalesce(p_discount,0)<0 or coalesce(p_discount,0)>v_subtotal then raise exception 'Invalid discount'; end if;
 v_total:=v_subtotal-coalesce(p_discount,0);
 if exists(select 1 from jsonb_array_elements(p_payments) payment where (payment->>'amount')::numeric<0) then raise exception 'Payment amount cannot be negative'; end if;
 select coalesce(sum((value->>'amount')::numeric),0) into v_paid from jsonb_array_elements(p_payments);
 if v_paid<>v_total then raise exception 'Payment total must equal grand total'; end if;
 insert into public.sales(id,invoice_number,store_id,cashier_id,shift_id,customer_name,subtotal,discount,grand_total,notes)
 values(v_sale_id,v_invoice,p_store_id,v_cashier,p_shift_id,p_customer_name,v_subtotal,coalesce(p_discount,0),v_total,p_notes);
 foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
  select * into v_product from public.products where id=(v_item->>'product_id')::uuid;
  v_qty:=(v_item->>'quantity')::numeric; v_line:=v_product.selling_price*v_qty;
  select quantity_on_hand into v_before from public.store_inventory where store_id=p_store_id and product_id=v_product.id for update;
  v_after:=v_before-v_qty;
  update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=p_store_id and product_id=v_product.id;
  insert into public.sale_items(sale_id,product_id,product_name_snapshot,sku_snapshot,quantity,cost_price_snapshot,selling_price_snapshot,subtotal)
  values(v_sale_id,v_product.id,v_product.name,v_product.sku,v_qty,v_product.cost_price,v_product.selling_price,v_line);
  insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by)
  values(p_store_id,v_product.id,'sale',-v_qty,v_before,v_after,'sale',v_sale_id,'Penjualan '||v_invoice,v_cashier);
 end loop;
 foreach v_payment in array array(select value from jsonb_array_elements(p_payments)) loop
  if (v_payment->>'amount')::numeric>0 then
   insert into public.payments(sale_id,method,amount,reference_number)
   values(v_sale_id,(v_payment->>'method')::public.payment_method,(v_payment->>'amount')::numeric,v_payment->>'reference_number');
  end if;
 end loop;
 return jsonb_build_object('sale_id',v_sale_id,'invoice_number',v_invoice,'grand_total',v_total);
end $$;

grant execute on function public.set_stock_level(uuid,uuid,numeric,text) to authenticated;
grant execute on function public.reverse_stock_movement(uuid,text) to authenticated;
grant execute on function public.complete_sale(uuid,uuid,text,jsonb,jsonb,numeric,text) to authenticated;

-- Repair base privileges on upgraded projects. RLS remains the authorization layer.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Keep cost prices hidden from ordinary authenticated SELECT queries.
revoke select on public.products from authenticated;
grant select (
  id, sku, barcode, name, category_id, brand, unit, description, image_url,
  selling_price, minimum_stock, primary_supplier_id, track_serial, is_active,
  created_by, created_at, updated_at
) on public.products to authenticated;
grant insert, update, delete on public.products to authenticated;

revoke select on public.sale_items from authenticated;
grant select (
  id, sale_id, product_id, product_name_snapshot, sku_snapshot, quantity,
  selling_price_snapshot, discount, subtotal
) on public.sale_items to authenticated;

commit;
