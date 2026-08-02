begin;

-- Read-only stock directory for all authenticated users. This deliberately
-- exposes stock balances across active branches without granting write access.
create or replace function public.inventory_network_stores()
returns table(
  id uuid,
  code text,
  name text,
  address text,
  phone text,
  manager_name text,
  image_url text,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id,s.code,s.name,s.address,s.phone,s.manager_name,s.image_url,s.is_active
  from public.stores s
  where auth.uid() is not null and s.is_active = true
  order by s.name;
$$;

create or replace function public.inventory_network_snapshot()
returns table(
  product_id uuid,
  sku text,
  barcode text,
  name text,
  unit text,
  minimum_stock numeric,
  selling_price numeric,
  store_id uuid,
  store_code text,
  store_name text,
  quantity_on_hand numeric,
  quantity_reserved numeric,
  quantity_available numeric,
  stock_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,p.sku,p.barcode,p.name,p.unit,p.minimum_stock,p.selling_price,
         s.id,s.code,s.name,
         coalesce(i.quantity_on_hand,0),
         coalesce(i.quantity_reserved,0),
         coalesce(i.quantity_on_hand-i.quantity_reserved,0),
         case
           when coalesce(i.quantity_on_hand,0)=0 then 'out'
           when coalesce(i.quantity_on_hand,0)<=p.minimum_stock then 'low'
           else 'safe'
         end
  from public.products p
  cross join public.stores s
  left join public.store_inventory i on i.product_id=p.id and i.store_id=s.id
  where auth.uid() is not null and p.is_active=true and s.is_active=true
  order by p.name,s.name;
$$;

grant execute on function public.inventory_network_stores() to authenticated;
grant execute on function public.inventory_network_snapshot() to authenticated;

-- Requests from a branch when local stock is empty/low and another branch has stock.
create sequence if not exists public.transfer_request_seq start 1;
create table if not exists public.stock_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  product_id uuid not null references public.products(id),
  source_store_id uuid not null references public.stores(id),
  destination_store_id uuid not null references public.stores(id),
  quantity numeric(18,3) not null check(quantity>0),
  notes text,
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled','completed')),
  requested_by uuid not null references public.profiles(id),
  processed_by uuid references public.profiles(id),
  transfer_id uuid references public.stock_transfers(id),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  check(source_store_id<>destination_store_id)
);

alter table public.stock_transfer_requests enable row level security;
drop policy if exists transfer_requests_read on public.stock_transfer_requests;
create policy transfer_requests_read on public.stock_transfer_requests for select to authenticated
using(
  requested_by=auth.uid()
  or public.is_admin()
  or public.can_access_store(source_store_id)
  or public.can_access_store(destination_store_id)
);
drop policy if exists transfer_requests_insert on public.stock_transfer_requests;
create policy transfer_requests_insert on public.stock_transfer_requests for insert to authenticated
with check(requested_by=auth.uid() and public.can_access_store(destination_store_id));
drop policy if exists transfer_requests_update on public.stock_transfer_requests;
create policy transfer_requests_update on public.stock_transfer_requests for update to authenticated
using(public.is_admin() or (public.current_user_role() in ('manager','warehouse') and (public.can_access_store(source_store_id) or public.can_access_store(destination_store_id))))
with check(public.is_admin() or public.current_user_role() in ('manager','warehouse'));

grant select,insert,update on public.stock_transfer_requests to authenticated;
create index if not exists transfer_requests_destination_status_idx on public.stock_transfer_requests(destination_store_id,status,created_at desc);
create index if not exists transfer_requests_source_status_idx on public.stock_transfer_requests(source_store_id,status,created_at desc);

create or replace function public.create_stock_transfer_request(
  p_product_id uuid,
  p_source_store_id uuid,
  p_destination_store_id uuid,
  p_quantity numeric,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=auth.uid();
  v_id uuid:=gen_random_uuid();
  v_number text;
  v_available numeric;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if p_source_store_id=p_destination_store_id then raise exception 'Source and destination must differ'; end if;
  if not public.can_access_store(p_destination_store_id) then raise exception 'Destination store access denied'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Invalid request quantity'; end if;
  if not exists(select 1 from public.products where id=p_product_id and is_active=true) then raise exception 'Product not found'; end if;
  if not exists(select 1 from public.stores where id=p_source_store_id and is_active=true) then raise exception 'Source store not found'; end if;
  select coalesce(quantity_on_hand-quantity_reserved,0) into v_available
  from public.store_inventory where store_id=p_source_store_id and product_id=p_product_id;
  if coalesce(v_available,0)<=0 then raise exception 'Source store has no available stock'; end if;
  v_number:='REQ-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.transfer_request_seq')::text,5,'0');
  insert into public.stock_transfer_requests(id,request_number,product_id,source_store_id,destination_store_id,quantity,notes,requested_by)
  values(v_id,v_number,p_product_id,p_source_store_id,p_destination_store_id,p_quantity,nullif(trim(p_notes),''),v_actor);
  return jsonb_build_object('id',v_id,'request_number',v_number,'status','pending');
end $$;

grant execute on function public.create_stock_transfer_request(uuid,uuid,uuid,numeric,text) to authenticated;

create or replace function public.approve_stock_transfer_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=auth.uid();
  v_req public.stock_transfer_requests%rowtype;
  v_transfer_id uuid:=gen_random_uuid();
  v_transfer_number text;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot process request'; end if;
  select * into v_req from public.stock_transfer_requests where id=p_request_id for update;
  if not found or v_req.status<>'pending' then raise exception 'Request cannot be processed'; end if;
  if not public.can_access_store(v_req.source_store_id) and not public.is_admin() then raise exception 'Source store access denied'; end if;
  v_transfer_number:='TRF-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.transfer_seq')::text,5,'0');
  insert into public.stock_transfers(id,transfer_number,source_store_id,destination_store_id,status,notes,requested_by,approved_by,approved_at)
  values(v_transfer_id,v_transfer_number,v_req.source_store_id,v_req.destination_store_id,'approved',coalesce(v_req.notes,'Permintaan stok ')||' · '||v_req.request_number,v_req.requested_by,v_actor,now());
  insert into public.stock_transfer_items(transfer_id,product_id,quantity_requested)
  values(v_transfer_id,v_req.product_id,v_req.quantity);
  update public.stock_transfer_requests set status='approved',processed_by=v_actor,processed_at=now(),transfer_id=v_transfer_id where id=p_request_id;
  return jsonb_build_object('id',v_transfer_id,'transfer_number',v_transfer_number,'status','approved');
end $$;

grant execute on function public.approve_stock_transfer_request(uuid) to authenticated;

-- Purchase orders can now allocate each purchased product to one or more branches.
alter table public.purchase_orders add column if not exists receiving_scope text not null default 'single' check(receiving_scope in ('single','selected','all'));
alter table public.purchase_orders add column if not exists updated_at timestamptz not null default now();

create table if not exists public.purchase_order_allocations (
  id uuid primary key default gen_random_uuid(),
  purchase_order_item_id uuid not null references public.purchase_order_items(id) on delete cascade,
  store_id uuid not null references public.stores(id),
  quantity numeric(18,3) not null check(quantity>0),
  quantity_received numeric(18,3) not null default 0,
  unique(purchase_order_item_id,store_id)
);

alter table public.purchase_order_allocations enable row level security;
drop policy if exists purchase_allocations_read on public.purchase_order_allocations;
create policy purchase_allocations_read on public.purchase_order_allocations for select to authenticated
using(exists(
  select 1 from public.purchase_order_items poi
  join public.purchase_orders po on po.id=poi.purchase_order_id
  where poi.id=purchase_order_allocations.purchase_order_item_id
    and (public.is_admin() or public.can_access_store(purchase_order_allocations.store_id) or public.can_access_store(po.destination_store_id))
));
drop policy if exists purchase_allocations_write on public.purchase_order_allocations;
create policy purchase_allocations_write on public.purchase_order_allocations for all to authenticated
using(public.current_user_role() in ('owner','admin','manager','warehouse'))
with check(public.current_user_role() in ('owner','admin','manager','warehouse'));

grant select,insert,update,delete on public.purchase_order_allocations to authenticated;
create index if not exists purchase_allocations_store_idx on public.purchase_order_allocations(store_id,purchase_order_item_id);
create index if not exists purchase_items_order_idx on public.purchase_order_items(purchase_order_id);

-- Extend purchase visibility to any allocated destination branch.
drop policy if exists purchase_orders_read on public.purchase_orders;
create policy purchase_orders_read on public.purchase_orders for select to authenticated
using(
  public.current_user_role() in ('owner','admin','manager','warehouse')
  and (
    public.is_admin()
    or public.can_access_store(destination_store_id)
    or exists(
      select 1 from public.purchase_order_items poi
      join public.purchase_order_allocations poa on poa.purchase_order_item_id=poi.id
      where poi.purchase_order_id=purchase_orders.id and public.can_access_store(poa.store_id)
    )
  )
);

drop policy if exists purchase_items_read on public.purchase_order_items;
create policy purchase_items_read on public.purchase_order_items for select to authenticated
using(exists(
  select 1 from public.purchase_orders po
  where po.id=purchase_order_id
    and (
      public.is_admin()
      or public.can_access_store(po.destination_store_id)
      or exists(select 1 from public.purchase_order_allocations poa where poa.purchase_order_item_id=purchase_order_items.id and public.can_access_store(poa.store_id))
    )
));

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
set search_path=public
as $$
declare
  v_actor uuid:=auth.uid();
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
  v_subtotal numeric:=0;
  v_line numeric;
  v_total numeric;
  v_first_store uuid;
  v_existing public.purchase_orders%rowtype;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot create purchases'; end if;
  if p_receiving_scope not in ('single','selected','all') then raise exception 'Invalid receiving scope'; end if;
  if not exists(select 1 from public.suppliers where id=p_supplier_id and is_active=true) then raise exception 'Supplier not found or inactive'; end if;
  if coalesce(jsonb_typeof(p_items),'')<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Purchase has no items'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) item group by item->>'product_id' having count(*)>1) then raise exception 'Duplicate product in purchase'; end if;

  begin
    v_first_store=(p_items->0->'allocations'->0->>'store_id')::uuid;
  exception when others then
    raise exception 'Purchase destination is empty';
  end;
  if v_first_store is null or not public.can_access_store(v_first_store) then raise exception 'Branch access denied'; end if;

  if p_purchase_order_id is null then
    v_id:=gen_random_uuid();
    v_number:='PO-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.purchase_seq')::text,5,'0');
    insert into public.purchase_orders(id,po_number,supplier_id,destination_store_id,status,subtotal,discount,shipping_cost,total,notes,created_by,approved_by,receiving_scope,updated_at)
    values(v_id,v_number,p_supplier_id,v_first_store,'pending',0,coalesce(p_discount,0),coalesce(p_shipping_cost,0),0,nullif(trim(p_notes),''),v_actor,v_actor,p_receiving_scope,now());
  else
    select * into v_existing from public.purchase_orders where id=p_purchase_order_id for update;
    if not found then raise exception 'Purchase order not found'; end if;
    if v_existing.status not in ('draft','pending') then raise exception 'Only draft or pending purchase can be edited'; end if;
    if not public.is_admin() and not public.can_access_store(v_existing.destination_store_id) then raise exception 'Purchase access denied'; end if;
    v_id:=v_existing.id;
    v_number:=v_existing.po_number;
    delete from public.purchase_order_items where purchase_order_id=v_id;
  end if;

  foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
    v_product_id=(v_item->>'product_id')::uuid;
    v_cost=(v_item->>'unit_cost')::numeric;
    if v_cost<0 or not exists(select 1 from public.products where id=v_product_id and is_active=true) then raise exception 'Invalid purchase product or cost'; end if;
    if coalesce(jsonb_typeof(v_item->'allocations'),'')<>'array' or jsonb_array_length(v_item->'allocations')=0 then raise exception 'Every product needs at least one branch allocation'; end if;
    if exists(select 1 from jsonb_array_elements(v_item->'allocations') a group by a->>'store_id' having count(*)>1) then raise exception 'Duplicate branch allocation'; end if;
    v_item_quantity:=0;
    foreach v_allocation in array array(select value from jsonb_array_elements(v_item->'allocations')) loop
      v_store_id=(v_allocation->>'store_id')::uuid;
      v_quantity=(v_allocation->>'quantity')::numeric;
      if v_quantity<=0 then raise exception 'Invalid branch allocation quantity'; end if;
      if not public.can_access_store(v_store_id) then raise exception 'Branch access denied'; end if;
      v_item_quantity:=v_item_quantity+v_quantity;
    end loop;
    v_line:=v_item_quantity*v_cost;
    v_subtotal:=v_subtotal+v_line;
    insert into public.purchase_order_items(purchase_order_id,product_id,quantity_ordered,quantity_received,unit_cost,subtotal)
    values(v_id,v_product_id,v_item_quantity,0,v_cost,v_line)
    returning id into v_item_id;
    foreach v_allocation in array array(select value from jsonb_array_elements(v_item->'allocations')) loop
      insert into public.purchase_order_allocations(purchase_order_item_id,store_id,quantity)
      values(v_item_id,(v_allocation->>'store_id')::uuid,(v_allocation->>'quantity')::numeric);
    end loop;
  end loop;

  v_total:=greatest(v_subtotal+coalesce(p_shipping_cost,0)-coalesce(p_discount,0),0);
  update public.purchase_orders set supplier_id=p_supplier_id,destination_store_id=v_first_store,status='pending',subtotal=v_subtotal,discount=coalesce(p_discount,0),shipping_cost=coalesce(p_shipping_cost,0),total=v_total,notes=nullif(trim(p_notes),''),receiving_scope=p_receiving_scope,updated_at=now()
  where id=v_id;
  return jsonb_build_object('id',v_id,'po_number',v_number,'status','pending','total',v_total);
end $$;

grant execute on function public.save_purchase_order_multi(uuid,uuid,text,jsonb,numeric,numeric,text) to authenticated;

create or replace function public.receive_purchase_order(p_purchase_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_po public.purchase_orders%rowtype;
  v_item public.purchase_order_items%rowtype;
  v_alloc public.purchase_order_allocations%rowtype;
  v_before numeric;
  v_after numeric;
  v_actor uuid:=auth.uid();
  v_has_allocations boolean;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot receive purchases'; end if;
  select * into v_po from public.purchase_orders where id=p_purchase_order_id for update;
  if not found or v_po.status in ('received','completed','cancelled') then raise exception 'Purchase cannot be received'; end if;
  select exists(select 1 from public.purchase_order_allocations poa join public.purchase_order_items poi on poi.id=poa.purchase_order_item_id where poi.purchase_order_id=p_purchase_order_id) into v_has_allocations;
  if v_has_allocations then
    for v_alloc in
      select poa.* from public.purchase_order_allocations poa
      join public.purchase_order_items poi on poi.id=poa.purchase_order_item_id
      where poi.purchase_order_id=p_purchase_order_id
    loop
      if not public.can_access_store(v_alloc.store_id) then raise exception 'Store access denied'; end if;
      select * into v_item from public.purchase_order_items where id=v_alloc.purchase_order_item_id;
      insert into public.store_inventory(store_id,product_id) values(v_alloc.store_id,v_item.product_id) on conflict do nothing;
      select quantity_on_hand into v_before from public.store_inventory where store_id=v_alloc.store_id and product_id=v_item.product_id for update;
      v_after:=v_before+v_alloc.quantity;
      update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_alloc.store_id and product_id=v_item.product_id;
      update public.purchase_order_allocations set quantity_received=v_alloc.quantity where id=v_alloc.id;
      insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by)
      values(v_alloc.store_id,v_item.product_id,'purchase',v_alloc.quantity,v_before,v_after,'purchase_order',p_purchase_order_id,'Penerimaan '||v_po.po_number,v_actor);
    end loop;
    update public.purchase_order_items poi set quantity_received=(select coalesce(sum(poa.quantity_received),0) from public.purchase_order_allocations poa where poa.purchase_order_item_id=poi.id) where poi.purchase_order_id=p_purchase_order_id;
  else
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
  end if;
  update public.purchase_orders set status='received',received_at=now(),updated_at=now() where id=p_purchase_order_id;
  return jsonb_build_object('id',p_purchase_order_id,'status','received');
end $$;

commit;
