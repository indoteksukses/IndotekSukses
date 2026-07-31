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
