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
