-- Indotek Sukses v2.1.0 - Fresh installation
-- Generated from migrations 001, 002, and 004. Run only on a NEW Supabase project.

-- Indotek Sukses: multi-store inventory and point-of-sale foundation
-- Run in a NEW Supabase project through SQL Editor or Supabase CLI.

create extension if not exists pgcrypto;

create type public.user_role as enum ('owner','admin','manager','cashier','warehouse');
create type public.movement_type as enum ('opening','purchase','sale','sale_reversal','transfer_out','transfer_in','customer_return','supplier_return','damage','loss','internal_use','stocktake_adjustment','manual_adjustment');
create type public.document_status as enum ('draft','pending','approved','preparing','in_transit','partially_received','received','completed','rejected','cancelled','problem');
create type public.sale_status as enum ('held','completed','voided','refunded','partially_refunded');
create type public.payment_method as enum ('cash','bank_transfer','qris','debit_card','credit_card','mixed','customer_credit');

create table public.stores (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  address text, phone text, manager_name text, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', email text, phone text, role public.user_role not null default 'cashier',
  primary_store_id uuid references public.stores(id), is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.user_store_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  primary key (user_id, store_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(), name text not null unique, description text,
  is_active boolean not null default true, created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(), name text not null, contact_name text, phone text,
  email text, address text, bank_details text, notes text, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(), sku text not null unique, barcode text unique,
  name text not null, category_id uuid references public.categories(id), brand text, unit text not null default 'pcs',
  description text, image_url text, cost_price numeric(18,2) not null default 0 check(cost_price >= 0),
  selling_price numeric(18,2) not null default 0 check(selling_price >= 0), minimum_stock numeric(18,3) not null default 0,
  primary_supplier_id uuid references public.suppliers(id), track_serial boolean not null default false,
  is_active boolean not null default true, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.product_price_history (
  id bigint generated always as identity primary key, product_id uuid not null references public.products(id),
  old_cost_price numeric(18,2), new_cost_price numeric(18,2), old_selling_price numeric(18,2), new_selling_price numeric(18,2),
  changed_by uuid references public.profiles(id), reason text, changed_at timestamptz not null default now()
);

create table public.store_inventory (
  store_id uuid not null references public.stores(id), product_id uuid not null references public.products(id),
  quantity_on_hand numeric(18,3) not null default 0, quantity_reserved numeric(18,3) not null default 0,
  quantity_damaged numeric(18,3) not null default 0, quantity_in_transit numeric(18,3) not null default 0,
  rack_location text, updated_at timestamptz not null default now(),
  primary key(store_id, product_id), check(quantity_on_hand >= 0), check(quantity_reserved >= 0), check(quantity_damaged >= 0)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
  product_id uuid not null references public.products(id), movement_type public.movement_type not null,
  quantity numeric(18,3) not null check(quantity <> 0), stock_before numeric(18,3) not null,
  stock_after numeric(18,3) not null, reference_type text, reference_id uuid, reason text, notes text,
  evidence_url text, created_by uuid not null references public.profiles(id), approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index stock_movements_store_product_time_idx on public.stock_movements(store_id,product_id,created_at desc);

create table public.cashier_shifts (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
  cashier_id uuid not null references public.profiles(id), opening_cash numeric(18,2) not null default 0,
  expected_cash numeric(18,2), actual_cash numeric(18,2), cash_difference numeric(18,2), notes text,
  opened_at timestamptz not null default now(), closed_at timestamptz,
  status text not null default 'open' check(status in ('open','closed','review'))
);
create unique index one_open_shift_per_cashier on public.cashier_shifts(cashier_id) where status='open';

create sequence public.invoice_seq start 1;
create table public.sales (
  id uuid primary key default gen_random_uuid(), invoice_number text not null unique,
  store_id uuid not null references public.stores(id), cashier_id uuid not null references public.profiles(id),
  shift_id uuid references public.cashier_shifts(id), customer_name text, subtotal numeric(18,2) not null,
  discount numeric(18,2) not null default 0, tax numeric(18,2) not null default 0, grand_total numeric(18,2) not null,
  status public.sale_status not null default 'completed', notes text, completed_at timestamptz not null default now(),
  voided_at timestamptz, voided_by uuid references public.profiles(id), void_reason text
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.sales(id) on delete restrict,
  product_id uuid not null references public.products(id), product_name_snapshot text not null, sku_snapshot text not null,
  quantity numeric(18,3) not null check(quantity > 0), cost_price_snapshot numeric(18,2) not null,
  selling_price_snapshot numeric(18,2) not null, discount numeric(18,2) not null default 0,
  subtotal numeric(18,2) not null
);

create table public.payments (
  id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.sales(id) on delete restrict,
  method public.payment_method not null, amount numeric(18,2) not null check(amount > 0), reference_number text,
  status text not null default 'paid', created_at timestamptz not null default now()
);

create table public.stock_transfers (
  id uuid primary key default gen_random_uuid(), transfer_number text not null unique,
  source_store_id uuid not null references public.stores(id), destination_store_id uuid not null references public.stores(id),
  status public.document_status not null default 'draft', notes text, requested_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id), sent_by uuid references public.profiles(id), received_by uuid references public.profiles(id),
  requested_at timestamptz not null default now(), approved_at timestamptz, sent_at timestamptz, received_at timestamptz,
  check(source_store_id <> destination_store_id)
);

create table public.stock_transfer_items (
  id uuid primary key default gen_random_uuid(), transfer_id uuid not null references public.stock_transfers(id) on delete cascade,
  product_id uuid not null references public.products(id), quantity_requested numeric(18,3) not null check(quantity_requested > 0),
  quantity_sent numeric(18,3) not null default 0, quantity_received numeric(18,3) not null default 0,
  unique(transfer_id,product_id)
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(), po_number text not null unique, supplier_id uuid not null references public.suppliers(id),
  destination_store_id uuid not null references public.stores(id), status public.document_status not null default 'draft',
  subtotal numeric(18,2) not null default 0, discount numeric(18,2) not null default 0, shipping_cost numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0, supplier_invoice text, due_date date, notes text,
  created_by uuid references public.profiles(id), approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), received_at timestamptz
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(), purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id), quantity_ordered numeric(18,3) not null check(quantity_ordered > 0),
  quantity_received numeric(18,3) not null default 0, unit_cost numeric(18,2) not null check(unit_cost >= 0),
  subtotal numeric(18,2) not null, unique(purchase_order_id,product_id)
);

create table public.stocktakes (
  id uuid primary key default gen_random_uuid(), stocktake_number text not null unique, store_id uuid not null references public.stores(id),
  status public.document_status not null default 'draft', notes text, created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id), created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.stocktake_items (
  id uuid primary key default gen_random_uuid(), stocktake_id uuid not null references public.stocktakes(id) on delete cascade,
  product_id uuid not null references public.products(id), system_quantity numeric(18,3) not null,
  physical_quantity numeric(18,3), variance numeric(18,3) generated always as (physical_quantity-system_quantity) stored,
  notes text, unique(stocktake_id,product_id)
);

create table public.returns (
  id uuid primary key default gen_random_uuid(), return_number text not null unique, sale_id uuid references public.sales(id),
  store_id uuid not null references public.stores(id), status public.document_status not null default 'pending', resolution text,
  reason text not null, refund_amount numeric(18,2) not null default 0, created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id), created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.return_items (
  id uuid primary key default gen_random_uuid(), return_id uuid not null references public.returns(id) on delete cascade,
  sale_item_id uuid references public.sale_items(id), product_id uuid not null references public.products(id),
  quantity numeric(18,3) not null check(quantity > 0), condition text not null check(condition in ('sellable','damaged','inspection')),
  amount numeric(18,2) not null default 0
);

create table public.audit_logs (
  id bigint generated always as identity primary key, user_id uuid references public.profiles(id), store_id uuid references public.stores(id),
  action text not null, table_name text not null, record_id text, old_data jsonb, new_data jsonb,
  ip_address inet, created_at timestamptz not null default now()
);

create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_old jsonb; v_new jsonb; v_record text; v_store uuid;
begin
  if tg_op='INSERT' then v_new:=to_jsonb(new); v_record:=v_new->>'id'; v_store=nullif(coalesce(v_new->>'store_id',v_new->>'primary_store_id',v_new->>'source_store_id',v_new->>'destination_store_id'),'')::uuid;
  elsif tg_op='UPDATE' then v_old:=to_jsonb(old); v_new:=to_jsonb(new); v_record:=coalesce(v_new->>'id',v_old->>'id'); v_store=nullif(coalesce(v_new->>'store_id',v_new->>'primary_store_id',v_new->>'source_store_id',v_new->>'destination_store_id',v_old->>'store_id'),'')::uuid;
  else v_old:=to_jsonb(old); v_record:=v_old->>'id'; v_store=nullif(coalesce(v_old->>'store_id',v_old->>'primary_store_id',v_old->>'source_store_id',v_old->>'destination_store_id'),'')::uuid; end if;
  insert into public.audit_logs(user_id,store_id,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),v_store,tg_op,tg_table_name,v_record,v_old,v_new);
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

create trigger audit_stores after insert or update or delete on public.stores for each row execute function public.audit_row_change();
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function public.audit_row_change();
create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit_row_change();
create trigger audit_suppliers after insert or update or delete on public.suppliers for each row execute function public.audit_row_change();
create trigger audit_transfers after insert or update or delete on public.stock_transfers for each row execute function public.audit_row_change();
create trigger audit_purchase_orders after insert or update or delete on public.purchase_orders for each row execute function public.audit_row_change();
create trigger audit_returns after insert or update or delete on public.returns for each row execute function public.audit_row_change();
create trigger audit_shifts after insert or update or delete on public.cashier_shifts for each row execute function public.audit_row_change();

create or replace function public.current_user_role() returns public.user_role language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid() and is_active=true
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.current_user_role() in ('owner','admin'),false)
$$;
create or replace function public.current_primary_store() returns uuid language sql stable security definer set search_path=public as $$
  select primary_store_id from public.profiles where id=auth.uid() and is_active=true
$$;
create or replace function public.can_access_store(target_store uuid) returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin() or exists(select 1 from public.user_store_access usa where usa.user_id=auth.uid() and usa.store_id=target_store)
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  -- Never trust role/store claims supplied by a public signup request.
  -- Admin-created employees are assigned through the server-only admin API.
  insert into public.profiles(id,full_name,email,role,primary_store_id)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email,'cashier',null);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.log_price_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.cost_price is distinct from new.cost_price or old.selling_price is distinct from new.selling_price then
  insert into public.product_price_history(product_id,old_cost_price,new_cost_price,old_selling_price,new_selling_price,changed_by)
  values(new.id,old.cost_price,new.cost_price,old.selling_price,new.selling_price,auth.uid());
 end if; return new;
end $$;
create trigger products_price_history before update on public.products for each row execute function public.log_price_change();

create or replace function public.post_stock_movement(
 p_store_id uuid,p_product_id uuid,p_type public.movement_type,p_quantity numeric,
 p_reference_type text default null,p_reference_id uuid default null,p_reason text default null,p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_before numeric; v_after numeric; v_id uuid; v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise exception 'Not authenticated'; end if;
 if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot post manual stock movements'; end if;
 if not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;
 if p_quantity=0 then raise exception 'Quantity cannot be zero'; end if;
 insert into public.store_inventory(store_id,product_id) values(p_store_id,p_product_id) on conflict do nothing;
 select quantity_on_hand into v_before from public.store_inventory where store_id=p_store_id and product_id=p_product_id for update;
 v_after:=v_before+p_quantity;
 if v_after<0 then raise exception 'Insufficient stock'; end if;
 update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=p_store_id and product_id=p_product_id;
 insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,notes,created_by)
 values(p_store_id,p_product_id,p_type,p_quantity,v_before,v_after,p_reference_type,p_reference_id,p_reason,p_notes,v_actor) returning id into v_id;
 return v_id;
end $$;

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
 if p_shift_id is null or not exists(select 1 from public.cashier_shifts where id=p_shift_id and cashier_id=v_cashier and store_id=p_store_id and status='open') then raise exception 'Open cashier shift required'; end if;
 if exists(
   select 1 from jsonb_array_elements(p_items) item
   group by item->>'product_id' having count(*)>1
 ) then raise exception 'Duplicate product in cart'; end if;
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

create or replace view public.inventory_overview with (security_invoker=true) as
select p.id product_id,p.sku,p.barcode,p.name,p.unit,p.minimum_stock,p.selling_price,
 s.id store_id,s.code store_code,s.name store_name,coalesce(i.quantity_on_hand,0) quantity_on_hand,
 coalesce(i.quantity_reserved,0) quantity_reserved,coalesce(i.quantity_on_hand-i.quantity_reserved,0) quantity_available,
 case when coalesce(i.quantity_on_hand,0)=0 then 'out' when coalesce(i.quantity_on_hand,0)<=p.minimum_stock then 'low' else 'safe' end stock_status
from public.products p cross join public.stores s left join public.store_inventory i on i.product_id=p.id and i.store_id=s.id
where p.is_active and s.is_active;

create or replace function public.admin_product_financials()
returns table(product_id uuid, sku text, product_name text, cost_price numeric, selling_price numeric, stock_units numeric, inventory_value numeric)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query
  select p.id,p.sku,p.name,p.cost_price,p.selling_price,
    coalesce(sum(i.quantity_on_hand),0),coalesce(sum(i.quantity_on_hand*p.cost_price),0)
  from public.products p left join public.store_inventory i on i.product_id=p.id
  group by p.id,p.sku,p.name,p.cost_price,p.selling_price;
end $$;

-- RLS
alter table public.stores enable row level security; alter table public.profiles enable row level security;
alter table public.user_store_access enable row level security; alter table public.categories enable row level security;
alter table public.suppliers enable row level security; alter table public.products enable row level security;
alter table public.product_price_history enable row level security; alter table public.store_inventory enable row level security;
alter table public.stock_movements enable row level security; alter table public.cashier_shifts enable row level security;
alter table public.sales enable row level security; alter table public.sale_items enable row level security;
alter table public.payments enable row level security; alter table public.stock_transfers enable row level security;
alter table public.stock_transfer_items enable row level security; alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security; alter table public.stocktakes enable row level security;
alter table public.stocktake_items enable row level security; alter table public.returns enable row level security;
alter table public.return_items enable row level security; alter table public.audit_logs enable row level security;

create policy stores_read on public.stores for select to authenticated using(public.can_access_store(id));
create policy stores_admin_write on public.stores for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy profiles_self_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin() or (public.current_user_role()='manager' and primary_store_id is not distinct from public.current_primary_store()));
create policy profiles_admin_write on public.profiles for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy user_store_access_read on public.user_store_access for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy user_store_access_admin on public.user_store_access for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy categories_read on public.categories for select to authenticated using(true);
create policy categories_admin on public.categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy suppliers_read on public.suppliers for select to authenticated using(public.current_user_role() in ('owner','admin','manager','warehouse'));
create policy suppliers_admin on public.suppliers for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy products_read on public.products for select to authenticated using(true);
create policy products_admin on public.products for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy price_history_admin_read on public.product_price_history for select to authenticated using(public.is_admin());
create policy inventory_read on public.store_inventory for select to authenticated using(public.can_access_store(store_id));
create policy inventory_admin_write on public.store_inventory for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy movements_read on public.stock_movements for select to authenticated using(public.can_access_store(store_id));
create policy shifts_read on public.cashier_shifts for select to authenticated using(public.can_access_store(store_id));
create policy shifts_insert on public.cashier_shifts for insert to authenticated with check(cashier_id=auth.uid() and public.can_access_store(store_id));
create policy shifts_update on public.cashier_shifts for update to authenticated using(cashier_id=auth.uid() or public.is_admin() or public.current_user_role()='manager');
create policy sales_read on public.sales for select to authenticated using(public.can_access_store(store_id));
create policy sale_items_read on public.sale_items for select to authenticated using(exists(select 1 from public.sales s where s.id=sale_id and public.can_access_store(s.store_id)));
create policy payments_read on public.payments for select to authenticated using(exists(select 1 from public.sales s where s.id=sale_id and public.can_access_store(s.store_id)));
create policy transfers_read on public.stock_transfers for select to authenticated using(public.can_access_store(source_store_id) or public.can_access_store(destination_store_id));
create policy transfers_write on public.stock_transfers for all to authenticated using(public.current_user_role() in ('owner','admin','manager','warehouse')) with check(public.current_user_role() in ('owner','admin','manager','warehouse'));
create policy transfer_items_read on public.stock_transfer_items for select to authenticated using(exists(select 1 from public.stock_transfers t where t.id=transfer_id and (public.can_access_store(t.source_store_id) or public.can_access_store(t.destination_store_id))));
create policy purchase_orders_read on public.purchase_orders for select to authenticated using(public.can_access_store(destination_store_id) and public.current_user_role() in ('owner','admin','manager','warehouse'));
create policy purchase_orders_write on public.purchase_orders for all to authenticated using(public.current_user_role() in ('owner','admin','manager','warehouse')) with check(public.current_user_role() in ('owner','admin','manager','warehouse'));
create policy purchase_items_read on public.purchase_order_items for select to authenticated using(exists(select 1 from public.purchase_orders po where po.id=purchase_order_id and public.can_access_store(po.destination_store_id)));
create policy stocktakes_read on public.stocktakes for select to authenticated using(public.can_access_store(store_id));
create policy stocktakes_write on public.stocktakes for all to authenticated using(public.current_user_role() in ('owner','admin','manager','warehouse')) with check(public.current_user_role() in ('owner','admin','manager','warehouse'));
create policy stocktake_items_read on public.stocktake_items for select to authenticated using(exists(select 1 from public.stocktakes st where st.id=stocktake_id and public.can_access_store(st.store_id)));
create policy returns_read on public.returns for select to authenticated using(public.can_access_store(store_id));
create policy returns_write on public.returns for all to authenticated using(public.can_access_store(store_id)) with check(public.can_access_store(store_id));
create policy return_items_read on public.return_items for select to authenticated using(exists(select 1 from public.returns r where r.id=return_id and public.can_access_store(r.store_id)));
create policy audit_admin_read on public.audit_logs for select to authenticated using(public.is_admin() or (public.current_user_role()='manager' and public.can_access_store(store_id)));

-- RPC access: direct table writes remain restricted.
grant execute on function public.post_stock_movement(uuid,uuid,public.movement_type,numeric,text,uuid,text,text) to authenticated;
grant execute on function public.complete_sale(uuid,uuid,text,jsonb,jsonb,numeric,text) to authenticated;
grant execute on function public.admin_product_financials() to authenticated;

-- Column-level protection for product cost and sale cost snapshots.
revoke select on public.products from authenticated;
grant select(id,sku,barcode,name,category_id,brand,unit,description,image_url,selling_price,minimum_stock,primary_supplier_id,track_serial,is_active,created_by,created_at,updated_at) on public.products to authenticated;
grant insert,update,delete on public.products to authenticated;
revoke select on public.sale_items from authenticated;
grant select(id,sale_id,product_id,product_name_snapshot,sku_snapshot,quantity,selling_price_snapshot,discount,subtotal) on public.sale_items to authenticated;
grant select on public.inventory_overview to authenticated;

-- Initial categories. Stores are created from the web-based first-run setup.
insert into public.categories(name) values ('Aksesori Komputer'),('Kabel'),('Jaringan'),('Power'),('Lainnya') on conflict do nothing;

-- ================================================================
-- Multi-store production upgrade
-- ================================================================

-- Indotek Sukses v2: dynamic branches, first-run setup, and operational RPCs.
-- Safe to run after the original migration on an existing project.

create table if not exists public.system_settings (
  id smallint primary key default 1 check (id = 1),
  company_name text not null default 'Indotek Sukses',
  company_tagline text not null default 'Inventory & Point of Sale',
  phone text,
  address text,
  receipt_footer text not null default 'Terima kasih telah berbelanja di Indotek Sukses.',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
insert into public.system_settings(id) values(1) on conflict(id) do nothing;

alter table public.system_settings enable row level security;
drop policy if exists system_settings_read on public.system_settings;
create policy system_settings_read on public.system_settings for select to authenticated using(true);
drop policy if exists system_settings_admin on public.system_settings;
create policy system_settings_admin on public.system_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert,update on public.system_settings to authenticated;

do $$ begin
  if not exists(select 1 from pg_trigger where tgname='audit_system_settings') then
    execute 'create trigger audit_system_settings after insert or update or delete on public.system_settings for each row execute function public.audit_row_change()';
  end if;
end $$;

create sequence if not exists public.transfer_seq start 1;
create sequence if not exists public.purchase_seq start 1;
create sequence if not exists public.stocktake_seq start 1;
create sequence if not exists public.return_seq start 1;

create or replace function public.create_stock_transfer(
  p_source_store_id uuid,
  p_destination_store_id uuid,
  p_items jsonb,
  p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_id uuid:=gen_random_uuid(); v_number text; v_actor uuid:=auth.uid(); v_item jsonb;
  v_product_id uuid; v_quantity numeric;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot create transfers'; end if;
  if p_source_store_id=p_destination_store_id then raise exception 'Source and destination must differ'; end if;
  if not public.can_access_store(p_source_store_id) or not public.can_access_store(p_destination_store_id) then raise exception 'Store access denied'; end if;
  if coalesce(jsonb_typeof(p_items),'')<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Transfer has no items'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) item group by item->>'product_id' having count(*)>1) then raise exception 'Duplicate product in transfer'; end if;
  v_number:='TRF-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.transfer_seq')::text,5,'0');
  insert into public.stock_transfers(id,transfer_number,source_store_id,destination_store_id,status,notes,requested_by,approved_by,approved_at)
  values(v_id,v_number,p_source_store_id,p_destination_store_id,'approved',p_notes,v_actor,v_actor,now());
  foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
    v_product_id=(v_item->>'product_id')::uuid; v_quantity=(v_item->>'quantity')::numeric;
    if v_quantity<=0 then raise exception 'Invalid transfer quantity'; end if;
    if not exists(select 1 from public.products where id=v_product_id and is_active=true) then raise exception 'Product not found'; end if;
    insert into public.stock_transfer_items(transfer_id,product_id,quantity_requested) values(v_id,v_product_id,v_quantity);
  end loop;
  return jsonb_build_object('id',v_id,'transfer_number',v_number,'status','approved');
end $$;

create or replace function public.send_stock_transfer(p_transfer_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_transfer public.stock_transfers%rowtype; v_item public.stock_transfer_items%rowtype;
  v_before numeric; v_after numeric; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot send transfers'; end if;
  select * into v_transfer from public.stock_transfers where id=p_transfer_id for update;
  if not found or v_transfer.status not in ('draft','pending','approved','preparing') then raise exception 'Transfer cannot be sent'; end if;
  if not public.can_access_store(v_transfer.source_store_id) then raise exception 'Store access denied'; end if;
  for v_item in select * from public.stock_transfer_items where transfer_id=p_transfer_id loop
    insert into public.store_inventory(store_id,product_id) values(v_transfer.source_store_id,v_item.product_id) on conflict do nothing;
    select quantity_on_hand into v_before from public.store_inventory where store_id=v_transfer.source_store_id and product_id=v_item.product_id for update;
    if v_before<v_item.quantity_requested then raise exception 'Insufficient stock for transfer'; end if;
    v_after:=v_before-v_item.quantity_requested;
    update public.store_inventory set quantity_on_hand=v_after,quantity_in_transit=quantity_in_transit+v_item.quantity_requested,updated_at=now() where store_id=v_transfer.source_store_id and product_id=v_item.product_id;
    update public.stock_transfer_items set quantity_sent=v_item.quantity_requested where id=v_item.id;
    insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by)
    values(v_transfer.source_store_id,v_item.product_id,'transfer_out',-v_item.quantity_requested,v_before,v_after,'stock_transfer',p_transfer_id,'Transfer '||v_transfer.transfer_number,v_actor);
  end loop;
  update public.stock_transfers set status='in_transit',sent_by=v_actor,sent_at=now() where id=p_transfer_id;
  return jsonb_build_object('id',p_transfer_id,'status','in_transit');
end $$;

create or replace function public.receive_stock_transfer(p_transfer_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_transfer public.stock_transfers%rowtype; v_item public.stock_transfer_items%rowtype;
  v_before numeric; v_after numeric; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot receive transfers'; end if;
  select * into v_transfer from public.stock_transfers where id=p_transfer_id for update;
  if not found or v_transfer.status<>'in_transit' then raise exception 'Transfer is not in transit'; end if;
  if not public.can_access_store(v_transfer.destination_store_id) then raise exception 'Store access denied'; end if;
  for v_item in select * from public.stock_transfer_items where transfer_id=p_transfer_id loop
    insert into public.store_inventory(store_id,product_id) values(v_transfer.destination_store_id,v_item.product_id) on conflict do nothing;
    select quantity_on_hand into v_before from public.store_inventory where store_id=v_transfer.destination_store_id and product_id=v_item.product_id for update;
    v_after:=v_before+v_item.quantity_sent;
    update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_transfer.destination_store_id and product_id=v_item.product_id;
    update public.store_inventory set quantity_in_transit=greatest(quantity_in_transit-v_item.quantity_sent,0),updated_at=now() where store_id=v_transfer.source_store_id and product_id=v_item.product_id;
    update public.stock_transfer_items set quantity_received=v_item.quantity_sent where id=v_item.id;
    insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by)
    values(v_transfer.destination_store_id,v_item.product_id,'transfer_in',v_item.quantity_sent,v_before,v_after,'stock_transfer',p_transfer_id,'Penerimaan '||v_transfer.transfer_number,v_actor);
  end loop;
  update public.stock_transfers set status='received',received_by=v_actor,received_at=now() where id=p_transfer_id;
  return jsonb_build_object('id',p_transfer_id,'status','received');
end $$;

create or replace function public.create_purchase_order(
  p_supplier_id uuid,
  p_destination_store_id uuid,
  p_items jsonb,
  p_shipping_cost numeric default 0,
  p_discount numeric default 0,
  p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_id uuid:=gen_random_uuid(); v_number text; v_actor uuid:=auth.uid(); v_item jsonb;
  v_product_id uuid; v_quantity numeric; v_cost numeric; v_subtotal numeric:=0; v_line numeric; v_total numeric;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot create purchases'; end if;
  if not public.can_access_store(p_destination_store_id) then raise exception 'Store access denied'; end if;
  if coalesce(jsonb_typeof(p_items),'')<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Purchase has no items'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) item group by item->>'product_id' having count(*)>1) then raise exception 'Duplicate product in purchase'; end if;
  v_number:='PO-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.purchase_seq')::text,5,'0');
  foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
    v_quantity=(v_item->>'quantity')::numeric; v_cost=(v_item->>'unit_cost')::numeric;
    if v_quantity<=0 or v_cost<0 then raise exception 'Invalid purchase item'; end if;
    v_subtotal:=v_subtotal+(v_quantity*v_cost);
  end loop;
  v_total:=greatest(v_subtotal+coalesce(p_shipping_cost,0)-coalesce(p_discount,0),0);
  insert into public.purchase_orders(id,po_number,supplier_id,destination_store_id,status,subtotal,discount,shipping_cost,total,notes,created_by,approved_by)
  values(v_id,v_number,p_supplier_id,p_destination_store_id,'pending',v_subtotal,coalesce(p_discount,0),coalesce(p_shipping_cost,0),v_total,p_notes,v_actor,v_actor);
  foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
    v_product_id=(v_item->>'product_id')::uuid; v_quantity=(v_item->>'quantity')::numeric; v_cost=(v_item->>'unit_cost')::numeric; v_line:=v_quantity*v_cost;
    insert into public.purchase_order_items(purchase_order_id,product_id,quantity_ordered,unit_cost,subtotal) values(v_id,v_product_id,v_quantity,v_cost,v_line);
  end loop;
  return jsonb_build_object('id',v_id,'po_number',v_number,'status','pending','total',v_total);
end $$;

create or replace function public.receive_purchase_order(p_purchase_order_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_po public.purchase_orders%rowtype; v_item public.purchase_order_items%rowtype;
  v_before numeric; v_after numeric; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot receive purchases'; end if;
  select * into v_po from public.purchase_orders where id=p_purchase_order_id for update;
  if not found or v_po.status in ('received','completed','cancelled') then raise exception 'Purchase cannot be received'; end if;
  if not public.can_access_store(v_po.destination_store_id) then raise exception 'Store access denied'; end if;
  for v_item in select * from public.purchase_order_items where purchase_order_id=p_purchase_order_id loop
    insert into public.store_inventory(store_id,product_id) values(v_po.destination_store_id,v_item.product_id) on conflict do nothing;
    select quantity_on_hand into v_before from public.store_inventory where store_id=v_po.destination_store_id and product_id=v_item.product_id for update;
    v_after:=v_before+v_item.quantity_ordered;
    update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_po.destination_store_id and product_id=v_item.product_id;
    update public.purchase_order_items set quantity_received=v_item.quantity_ordered where id=v_item.id;
    insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by)
    values(v_po.destination_store_id,v_item.product_id,'purchase',v_item.quantity_ordered,v_before,v_after,'purchase_order',p_purchase_order_id,'Penerimaan '||v_po.po_number,v_actor);
  end loop;
  update public.purchase_orders set status='received',received_at=now() where id=p_purchase_order_id;
  return jsonb_build_object('id',p_purchase_order_id,'status','received');
end $$;

create or replace function public.create_stocktake(p_store_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid:=gen_random_uuid(); v_number text; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot create stocktakes'; end if;
  if not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;
  v_number:='SO-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.stocktake_seq')::text,5,'0');
  insert into public.stocktakes(id,stocktake_number,store_id,status,notes,created_by) values(v_id,v_number,p_store_id,'draft',p_notes,v_actor);
  insert into public.stocktake_items(stocktake_id,product_id,system_quantity)
  select v_id,p.id,coalesce(i.quantity_on_hand,0) from public.products p left join public.store_inventory i on i.product_id=p.id and i.store_id=p_store_id where p.is_active;
  return jsonb_build_object('id',v_id,'stocktake_number',v_number,'status','draft');
end $$;

create or replace function public.complete_stocktake(p_stocktake_id uuid,p_counts jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_st public.stocktakes%rowtype; v_count jsonb; v_item public.stocktake_items%rowtype; v_physical numeric; v_before numeric; v_after numeric; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot complete stocktakes'; end if;
  if coalesce(jsonb_typeof(p_counts),'')<>'array' or jsonb_array_length(p_counts)=0 then raise exception 'Stocktake counts are empty'; end if;
  if exists(select 1 from jsonb_array_elements(p_counts) item group by item->>'product_id' having count(*)>1) then raise exception 'Duplicate product in stocktake'; end if;
  select * into v_st from public.stocktakes where id=p_stocktake_id for update;
  if not found or v_st.status not in ('draft','pending','approved') then raise exception 'Stocktake cannot be completed'; end if;
  if not public.can_access_store(v_st.store_id) then raise exception 'Store access denied'; end if;
  foreach v_count in array array(select value from jsonb_array_elements(p_counts)) loop
    select * into v_item from public.stocktake_items where stocktake_id=p_stocktake_id and product_id=(v_count->>'product_id')::uuid for update;
    if not found then continue; end if;
    v_physical=(v_count->>'physical_quantity')::numeric;
    if v_physical<0 then raise exception 'Physical quantity cannot be negative'; end if;
    update public.stocktake_items set physical_quantity=v_physical,notes=v_count->>'notes' where id=v_item.id;
    insert into public.store_inventory(store_id,product_id) values(v_st.store_id,v_item.product_id) on conflict do nothing;
    select quantity_on_hand into v_before from public.store_inventory where store_id=v_st.store_id and product_id=v_item.product_id for update;
    v_after:=v_physical;
    if v_after<>v_before then
      update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_st.store_id and product_id=v_item.product_id;
      insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by,approved_by)
      values(v_st.store_id,v_item.product_id,'stocktake_adjustment',v_after-v_before,v_before,v_after,'stocktake',p_stocktake_id,'Penyesuaian stok opname '||v_st.stocktake_number,v_actor,v_actor);
    end if;
  end loop;
  update public.stocktakes set status='completed',approved_by=v_actor,completed_at=now() where id=p_stocktake_id;
  return jsonb_build_object('id',p_stocktake_id,'status','completed');
end $$;

create or replace function public.void_sale(p_sale_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sale public.sales%rowtype; v_item public.sale_items%rowtype; v_before numeric; v_after numeric; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager') then raise exception 'Approval required'; end if;
  select * into v_sale from public.sales where id=p_sale_id for update;
  if not found or v_sale.status<>'completed' then raise exception 'Sale cannot be voided'; end if;
  if not public.can_access_store(v_sale.store_id) then raise exception 'Store access denied'; end if;
  for v_item in select * from public.sale_items where sale_id=p_sale_id loop
    select quantity_on_hand into v_before from public.store_inventory where store_id=v_sale.store_id and product_id=v_item.product_id for update;
    v_after:=v_before+v_item.quantity;
    update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_sale.store_id and product_id=v_item.product_id;
    insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by,approved_by)
    values(v_sale.store_id,v_item.product_id,'sale_reversal',v_item.quantity,v_before,v_after,'sale',p_sale_id,p_reason,v_actor,v_actor);
  end loop;
  update public.sales set status='voided',voided_at=now(),voided_by=v_actor,void_reason=p_reason where id=p_sale_id;
  return jsonb_build_object('id',p_sale_id,'status','voided');
end $$;

-- Child rows are normally written through security-definer RPCs. These policies also support admin maintenance.
drop policy if exists transfer_items_admin_write on public.stock_transfer_items;
create policy transfer_items_admin_write on public.stock_transfer_items for all to authenticated using(public.current_user_role() in ('owner','admin','manager','warehouse')) with check(public.current_user_role() in ('owner','admin','manager','warehouse'));
drop policy if exists purchase_items_admin_write on public.purchase_order_items;
create policy purchase_items_admin_write on public.purchase_order_items for all to authenticated using(public.current_user_role() in ('owner','admin','manager','warehouse')) with check(public.current_user_role() in ('owner','admin','manager','warehouse'));
drop policy if exists stocktake_items_admin_write on public.stocktake_items;
create policy stocktake_items_admin_write on public.stocktake_items for all to authenticated using(public.current_user_role() in ('owner','admin','manager','warehouse')) with check(public.current_user_role() in ('owner','admin','manager','warehouse'));
drop policy if exists return_items_write on public.return_items;
create policy return_items_write on public.return_items for all to authenticated using(public.current_user_role() in ('owner','admin','manager','cashier','warehouse')) with check(public.current_user_role() in ('owner','admin','manager','cashier','warehouse'));

grant execute on function public.create_stock_transfer(uuid,uuid,jsonb,text) to authenticated;
grant execute on function public.send_stock_transfer(uuid) to authenticated;
grant execute on function public.receive_stock_transfer(uuid) to authenticated;
grant execute on function public.create_purchase_order(uuid,uuid,jsonb,numeric,numeric,text) to authenticated;
grant execute on function public.receive_purchase_order(uuid) to authenticated;
grant execute on function public.create_stocktake(uuid,text) to authenticated;
grant execute on function public.complete_stocktake(uuid,jsonb) to authenticated;
grant execute on function public.void_sale(uuid,text) to authenticated;

alter table public.returns add column if not exists return_type text not null default 'customer' check(return_type in ('customer','supplier'));

create or replace function public.create_customer_return(
  p_sale_id uuid,
  p_product_id uuid,
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
  select * into v_item from public.sale_items where sale_id=p_sale_id and product_id=p_product_id;
  if not found then raise exception 'Sale item not found'; end if;
  select coalesce(sum(ri.quantity),0) into v_already_returned
  from public.return_items ri
  join public.returns r on r.id=ri.return_id
  where ri.sale_item_id=v_item.id and r.status in ('approved','completed');
  if p_quantity>(v_item.quantity-v_already_returned) then raise exception 'Returned quantity exceeds remaining sale quantity'; end if;
  v_amount:=p_quantity*v_item.selling_price_snapshot;
  v_number:='RET-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.return_seq')::text,5,'0');
  insert into public.returns(id,return_number,return_type,sale_id,store_id,status,resolution,reason,refund_amount,created_by,approved_by,completed_at)
  values(v_id,v_number,'customer',p_sale_id,v_sale.store_id,'completed',p_resolution,p_reason,v_amount,v_actor,v_actor,now());
  insert into public.return_items(return_id,sale_item_id,product_id,quantity,condition,amount)
  values(v_id,v_item.id,p_product_id,p_quantity,p_condition,v_amount);
  insert into public.store_inventory(store_id,product_id) values(v_sale.store_id,p_product_id) on conflict do nothing;
  select quantity_on_hand into v_before from public.store_inventory where store_id=v_sale.store_id and product_id=p_product_id for update;
  if p_condition='sellable' then
    v_after:=v_before+p_quantity;
    update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_sale.store_id and product_id=p_product_id;
    insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by,approved_by)
    values(v_sale.store_id,p_product_id,'customer_return',p_quantity,v_before,v_after,'return',v_id,p_reason,v_actor,v_actor);
  else
    v_after:=v_before;
    update public.store_inventory set quantity_damaged=quantity_damaged+p_quantity,updated_at=now() where store_id=v_sale.store_id and product_id=p_product_id;
  end if;
  update public.sales set status='partially_refunded' where id=p_sale_id and status='completed';
  return jsonb_build_object('id',v_id,'return_number',v_number,'refund_amount',v_amount,'status','completed');
end $$;
grant execute on function public.create_customer_return(uuid,uuid,numeric,text,text,text) to authenticated;

-- Financial reporting with protected cost data. Results are scoped to stores the user may access.
create or replace function public.financial_report(
  p_store_id uuid default null,
  p_from timestamptz default date_trunc('month', now()),
  p_to timestamptz default now()
) returns table(
  gross_sales numeric,
  refunds numeric,
  net_sales numeric,
  cogs numeric,
  gross_profit numeric,
  transactions bigint,
  net_units numeric,
  inventory_value numeric
) language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager') then raise exception 'Report access denied'; end if;
  if p_from is null or p_to is null or p_from>p_to then raise exception 'Invalid report period'; end if;
  if p_store_id is not null and not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;

  return query
  with scoped_sales as (
    select s.id,s.grand_total
    from public.sales s
    where s.status in ('completed','partially_refunded')
      and s.completed_at>=p_from and s.completed_at<=p_to
      and (p_store_id is null or s.store_id=p_store_id)
      and public.can_access_store(s.store_id)
  ),
  sales_total as (
    select coalesce(sum(grand_total),0)::numeric gross_sales, count(*)::bigint transactions
    from scoped_sales
  ),
  item_total as (
    select coalesce(sum(si.quantity*si.cost_price_snapshot),0)::numeric cogs,
           coalesce(sum(si.quantity),0)::numeric sold_units
    from public.sale_items si join scoped_sales ss on ss.id=si.sale_id
  ),
  return_total as (
    select coalesce(sum(ri.amount),0)::numeric refunds,
           coalesce(sum(ri.quantity),0)::numeric returned_units,
           coalesce(sum(case when ri.condition='sellable' then ri.quantity*si.cost_price_snapshot else 0 end),0)::numeric reversed_cogs
    from public.returns r
    join scoped_sales ss on ss.id=r.sale_id
    join public.return_items ri on ri.return_id=r.id
    left join public.sale_items si on si.id=ri.sale_item_id
    where r.status in ('approved','completed') and r.created_at>=p_from and r.created_at<=p_to
  ),
  inventory_total as (
    select coalesce(sum(i.quantity_on_hand*p.cost_price),0)::numeric inventory_value
    from public.store_inventory i join public.products p on p.id=i.product_id
    where p.is_active and (p_store_id is null or i.store_id=p_store_id) and public.can_access_store(i.store_id)
  )
  select st.gross_sales,
         rt.refunds,
         st.gross_sales-rt.refunds,
         greatest(it.cogs-rt.reversed_cogs,0),
         (st.gross_sales-rt.refunds)-greatest(it.cogs-rt.reversed_cogs,0),
         st.transactions,
         greatest(it.sold_units-rt.returned_units,0),
         inv.inventory_value
  from sales_total st cross join item_total it cross join return_total rt cross join inventory_total inv;
end $$;
grant execute on function public.financial_report(uuid,timestamptz,timestamptz) to authenticated;


-- ============================================================
-- Migration 004: operational UX and shared store shifts
-- ============================================================

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
-- Indotek Sukses v2.2.0
-- Responsive operations, batch stock documents, safe code-based product visuals,
-- company logo URL, and invoice-aware customer returns.
-- Safe to run after migrations 001-004. Existing business data is preserved.

begin;

alter table public.system_settings
  add column if not exists logo_url text;

create table if not exists public.product_visuals (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code jsonb not null,
  is_builtin boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_visual_code_object check (jsonb_typeof(code) = 'object')
);

alter table public.products
  add column if not exists visual_id uuid references public.product_visuals(id) on delete set null;

create index if not exists products_visual_id_idx on public.products(visual_id);

alter table public.product_visuals enable row level security;
drop policy if exists product_visuals_read on public.product_visuals;
create policy product_visuals_read on public.product_visuals
  for select to authenticated using (is_active or public.is_admin());
drop policy if exists product_visuals_admin on public.product_visuals;
create policy product_visuals_admin on public.product_visuals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.product_visuals to authenticated;

-- Lightweight SVG-like presets rendered safely by the application. The code is JSON,
-- not executable HTML, so it can be stored and reused without allowing scripts.
insert into public.product_visuals(id,name,code,is_builtin,is_active) values
('31000000-0000-0000-0000-000000000001','Baut Hexagonal', '{"shape":"bolt","primary":"#334155","secondary":"#94a3b8","accent":"#f59e0b","background":"#eff6ff"}'::jsonb,true,true),
('31000000-0000-0000-0000-000000000002','Mur Hexagonal', '{"shape":"nut","primary":"#475569","secondary":"#cbd5e1","accent":"#2563eb","background":"#f8fafc"}'::jsonb,true,true),
('31000000-0000-0000-0000-000000000003','Sekrup', '{"shape":"screw","primary":"#475569","secondary":"#94a3b8","accent":"#0ea5e9","background":"#eff6ff"}'::jsonb,true,true),
('31000000-0000-0000-0000-000000000004','Kunci Pas', '{"shape":"wrench","primary":"#334155","secondary":"#94a3b8","accent":"#2563eb","background":"#eef2ff"}'::jsonb,true,true),
('31000000-0000-0000-0000-000000000005','Bor Tangan', '{"shape":"drill","primary":"#0f4c81","secondary":"#60a5fa","accent":"#f59e0b","background":"#eff6ff"}'::jsonb,true,true),
('31000000-0000-0000-0000-000000000006','Gerinda', '{"shape":"grinder","primary":"#1e3a5f","secondary":"#64748b","accent":"#f97316","background":"#f8fafc"}'::jsonb,true,true),
('31000000-0000-0000-0000-000000000007','Gergaji', '{"shape":"saw","primary":"#475569","secondary":"#cbd5e1","accent":"#ef4444","background":"#fff7ed"}'::jsonb,true,true),
('31000000-0000-0000-0000-000000000008','Palu', '{"shape":"hammer","primary":"#334155","secondary":"#94a3b8","accent":"#92400e","background":"#fff7ed"}'::jsonb,true,true),
('31000000-0000-0000-0000-000000000009','Tang', '{"shape":"pliers","primary":"#334155","secondary":"#64748b","accent":"#dc2626","background":"#fef2f2"}'::jsonb,true,true),
('31000000-0000-0000-0000-000000000010','Bearing', '{"shape":"bearing","primary":"#475569","secondary":"#cbd5e1","accent":"#0ea5e9","background":"#f0fdfa"}'::jsonb,true,true),
('31000000-0000-0000-0000-000000000011','Meteran', '{"shape":"tape","primary":"#f59e0b","secondary":"#fcd34d","accent":"#111827","background":"#fffbeb"}'::jsonb,true,true),
('31000000-0000-0000-0000-000000000012','Perkakas Umum', '{"shape":"generic","primary":"#2563eb","secondary":"#93c5fd","accent":"#f59e0b","background":"#eff6ff"}'::jsonb,true,true)
on conflict(id) do update set name=excluded.name,code=excluded.code,is_builtin=true,is_active=true,updated_at=now();

-- Apply useful defaults to existing hardware products without overwriting a manual choice.
update public.products set visual_id='31000000-0000-0000-0000-000000000001'
where visual_id is null and lower(name) like '%baut%';
update public.products set visual_id='31000000-0000-0000-0000-000000000002'
where visual_id is null and lower(name) like '%mur%';
update public.products set visual_id='31000000-0000-0000-0000-000000000003'
where visual_id is null and (lower(name) like '%sekrup%' or lower(name) like '%screw%');
update public.products set visual_id='31000000-0000-0000-0000-000000000004'
where visual_id is null and lower(name) like '%kunci%';
update public.products set visual_id='31000000-0000-0000-0000-000000000005'
where visual_id is null and lower(name) like '%bor%';
update public.products set visual_id='31000000-0000-0000-0000-000000000006'
where visual_id is null and lower(name) like '%gerinda%';
update public.products set visual_id='31000000-0000-0000-0000-000000000007'
where visual_id is null and lower(name) like '%gergaji%';
update public.products set visual_id='31000000-0000-0000-0000-000000000008'
where visual_id is null and lower(name) like '%palu%';
update public.products set visual_id='31000000-0000-0000-0000-000000000009'
where visual_id is null and lower(name) like '%tang%';
update public.products set visual_id='31000000-0000-0000-0000-000000000010'
where visual_id is null and lower(name) like '%bearing%';
update public.products set visual_id='31000000-0000-0000-0000-000000000011'
where visual_id is null and (lower(name) like '%meter%' or lower(name) like '%meteran%');
update public.products set visual_id='31000000-0000-0000-0000-000000000012'
where visual_id is null;

-- Post several stock items in one atomic operation. Either every line is saved,
-- or the entire request rolls back.
create or replace function public.post_stock_movement_batch(
  p_store_id uuid,
  p_type public.movement_type,
  p_direction text,
  p_items jsonb,
  p_reference_label text default null,
  p_reason text default null,
  p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid:=auth.uid();
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_signed numeric;
  v_before numeric;
  v_after numeric;
  v_id uuid;
  v_result jsonb:='[]'::jsonb;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then
    raise exception 'Role cannot post manual stock movements';
  end if;
  if not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;
  if p_direction not in ('in','out') then raise exception 'Invalid movement direction'; end if;
  if coalesce(jsonb_typeof(p_items),'') <> 'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Movement has no items';
  end if;
  if exists(select 1 from jsonb_array_elements(p_items) item group by item->>'product_id' having count(*)>1) then
    raise exception 'Duplicate product in movement';
  end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Reason is required'; end if;

  if p_direction='in' and p_type not in ('opening','purchase','customer_return','stocktake_adjustment','manual_adjustment') then
    raise exception 'Movement type is not valid for stock in';
  end if;
  if p_direction='out' and p_type not in ('supplier_return','damage','loss','internal_use','stocktake_adjustment','manual_adjustment') then
    raise exception 'Movement type is not valid for stock out';
  end if;

  foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
    v_product_id := nullif(v_item->>'product_id','')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    if v_product_id is null or v_quantity is null or v_quantity<=0 then raise exception 'Invalid movement item'; end if;
    if not exists(select 1 from public.products where id=v_product_id and is_active=true) then raise exception 'Product not found'; end if;
    v_signed := case when p_direction='out' then -v_quantity else v_quantity end;

    insert into public.store_inventory(store_id,product_id)
    values(p_store_id,v_product_id) on conflict do nothing;

    select quantity_on_hand into v_before
    from public.store_inventory
    where store_id=p_store_id and product_id=v_product_id
    for update;

    v_after := v_before + v_signed;
    if v_after < 0 then raise exception 'Insufficient stock for product %',v_product_id; end if;

    update public.store_inventory
    set quantity_on_hand=v_after,updated_at=now()
    where store_id=p_store_id and product_id=v_product_id;

    insert into public.stock_movements(
      store_id,product_id,movement_type,quantity,stock_before,stock_after,
      reference_type,reason,notes,created_by,approved_by
    ) values(
      p_store_id,v_product_id,p_type,v_signed,v_before,v_after,
      nullif(trim(p_reference_label),''),p_reason,p_notes,v_actor,
      case when public.current_user_role() in ('owner','admin','manager') then v_actor else null end
    ) returning id into v_id;

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'id',v_id,'product_id',v_product_id,'quantity',v_signed,
      'stock_before',v_before,'stock_after',v_after
    ));
  end loop;

  return v_result;
end $$;

grant execute on function public.post_stock_movement_batch(uuid,public.movement_type,text,jsonb,text,text,text) to authenticated;

-- Return only items actually purchased on the selected invoice, together with the
-- remaining quantity that may still be returned.
create or replace function public.returnable_sale_items(p_sale_id uuid)
returns table(
  sale_item_id uuid,
  product_id uuid,
  product_name text,
  sku text,
  purchased_quantity numeric,
  returned_quantity numeric,
  remaining_quantity numeric,
  unit_price numeric
) language plpgsql stable security definer set search_path=public as $$
declare
  v_store_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','cashier') then raise exception 'Return access denied'; end if;
  select store_id into v_store_id from public.sales where id=p_sale_id and status in ('completed','partially_refunded');
  if v_store_id is null then raise exception 'Sale not found'; end if;
  if not public.can_access_store(v_store_id) then raise exception 'Store access denied'; end if;

  return query
  with returned as (
    select ri.sale_item_id,sum(ri.quantity) quantity
    from public.return_items ri
    join public.returns r on r.id=ri.return_id
    where r.status in ('approved','completed')
    group by ri.sale_item_id
  )
  select si.id,si.product_id,si.product_name_snapshot,si.sku_snapshot,
         si.quantity,coalesce(returned.quantity,0),si.quantity-coalesce(returned.quantity,0),
         si.selling_price_snapshot
  from public.sale_items si
  left join returned on returned.sale_item_id=si.id
  where si.sale_id=p_sale_id
    and si.quantity-coalesce(returned.quantity,0)>0
  order by si.product_name_snapshot;
end $$;

grant execute on function public.returnable_sale_items(uuid) to authenticated;

-- Restore column-level read access after adding visual_id. Cost price remains hidden.
revoke select on public.products from authenticated;
grant select (
  id,sku,barcode,name,category_id,brand,unit,description,image_url,visual_id,
  selling_price,minimum_stock,primary_supplier_id,track_serial,is_active,
  created_by,created_at,updated_at
) on public.products to authenticated;
grant insert,update,delete on public.products to authenticated;

-- Audit custom visual changes when the shared audit function is available.
do $$ begin
  if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='audit_row_change')
     and not exists(select 1 from pg_trigger where tgname='audit_product_visuals') then
    execute 'create trigger audit_product_visuals after insert or update or delete on public.product_visuals for each row execute function public.audit_row_change()';
  end if;
end $$;

commit;

-- v2.2 public branding access for login screen
begin;
drop policy if exists system_settings_read on public.system_settings;
create policy system_settings_read on public.system_settings for select to anon, authenticated using (true);
grant select on public.system_settings to anon, authenticated;
commit;
-- Indotek Sukses v2.3.0
-- Performance support for interactive dashboard, stock activity, and period reports.
-- Safe for an existing v2.2 database. No user data is deleted.

begin;

create index if not exists sales_store_completed_v23_idx
  on public.sales(store_id, completed_at desc)
  where status in ('completed','partially_refunded');

create index if not exists sale_items_sale_v23_idx
  on public.sale_items(sale_id, product_id);

create index if not exists returns_sale_created_v23_idx
  on public.returns(sale_id, created_at desc)
  where status in ('approved','completed');

create index if not exists return_items_return_v23_idx
  on public.return_items(return_id, sale_item_id);

create index if not exists stock_movements_store_created_v23_idx
  on public.stock_movements(store_id, created_at desc);

create index if not exists stock_movements_product_created_v23_idx
  on public.stock_movements(product_id, created_at desc);

commit;
