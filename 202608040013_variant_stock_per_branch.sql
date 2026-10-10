-- Indotek Sukses v2.7.0
-- Variant stock per branch for inventory, sales, transfers, purchases, returns, and corrections.

begin;

create table if not exists public.product_variant_inventory (
  store_id uuid not null references public.stores(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity_on_hand numeric(18,3) not null default 0 check(quantity_on_hand >= 0),
  quantity_reserved numeric(18,3) not null default 0 check(quantity_reserved >= 0),
  quantity_damaged numeric(18,3) not null default 0 check(quantity_damaged >= 0),
  quantity_in_transit numeric(18,3) not null default 0 check(quantity_in_transit >= 0),
  updated_at timestamptz not null default now(),
  primary key(store_id, variant_id)
);

create index if not exists product_variant_inventory_variant_idx
  on public.product_variant_inventory(variant_id, store_id);

alter table public.product_variant_inventory enable row level security;
grant select, insert, update, delete on public.product_variant_inventory to authenticated;
drop policy if exists product_variant_inventory_read on public.product_variant_inventory;
create policy product_variant_inventory_read on public.product_variant_inventory
for select to authenticated using(true);
drop policy if exists product_variant_inventory_write on public.product_variant_inventory;
create policy product_variant_inventory_write on public.product_variant_inventory
for all to authenticated
using(
  public.current_user_role() in ('owner','admin')
  or (public.current_user_role() in ('manager','warehouse') and public.can_access_store(store_id))
)
with check(
  public.current_user_role() in ('owner','admin')
  or (public.current_user_role() in ('manager','warehouse') and public.can_access_store(store_id))
);

alter table public.stock_movements add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table public.stock_transfer_items add column if not exists variant_id uuid references public.product_variants(id) on delete restrict;
alter table public.purchase_order_items add column if not exists variant_id uuid references public.product_variants(id) on delete restrict;
alter table public.return_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table public.stock_transfer_requests add column if not exists variant_id uuid references public.product_variants(id) on delete restrict;
alter table public.stocktake_items add column if not exists variant_id uuid references public.product_variants(id) on delete restrict;
alter table public.product_variants add column if not exists archived_at timestamptz;

-- Archived variants stay available for historical documents but disappear from the editor.
drop index if exists public.product_variants_product_name_unique;
create unique index product_variants_product_name_unique
  on public.product_variants(product_id,lower(trim(name))) where archived_at is null;
drop index if exists public.product_variants_sku_unique;
create unique index product_variants_sku_unique
  on public.product_variants(upper(trim(sku))) where archived_at is null and sku is not null and trim(sku)<>'';
drop index if exists public.product_variants_barcode_unique;
create unique index product_variants_barcode_unique
  on public.product_variants(trim(barcode)) where archived_at is null and barcode is not null and trim(barcode)<>'';
grant select (archived_at) on public.product_variants to authenticated;

create or replace function public.check_product_base_codes()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.sku is not null and trim(new.sku)<>'' and exists(
    select 1 from public.product_variants pv
    where pv.archived_at is null and upper(trim(pv.sku))=upper(trim(new.sku))
  ) then raise exception 'SKU produk sudah digunakan sebagai SKU varian'; end if;
  if new.barcode is not null and trim(new.barcode)<>'' and exists(
    select 1 from public.product_variants pv
    where pv.archived_at is null and pv.barcode is not null and trim(pv.barcode)=trim(new.barcode)
  ) then raise exception 'Barcode produk sudah digunakan sebagai barcode varian'; end if;
  return new;
end $$;

alter table public.stock_transfer_items drop constraint if exists stock_transfer_items_transfer_id_product_id_key;
alter table public.purchase_order_items drop constraint if exists purchase_order_items_purchase_order_id_product_id_key;
create unique index if not exists stock_transfer_items_document_variant_unique
  on public.stock_transfer_items(transfer_id, product_id, coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));
create unique index if not exists purchase_order_items_document_variant_unique
  on public.purchase_order_items(purchase_order_id, product_id, coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists stock_movements_variant_idx on public.stock_movements(variant_id, created_at desc);
alter table public.stocktake_items drop constraint if exists stocktake_items_stocktake_id_product_id_key;
create unique index if not exists stocktake_items_document_variant_unique
  on public.stocktake_items(stocktake_id,product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));

-- Preserve existing aggregate stock by assigning it to the first active variant once.
with first_variant as (
  select id, product_id,
         row_number() over(partition by product_id order by sort_order, created_at, id) as rn
  from public.product_variants
  where is_active=true
), seeded as (
  select si.store_id, fv.id as variant_id, si.quantity_on_hand, si.quantity_reserved,
         si.quantity_damaged, si.quantity_in_transit
  from public.store_inventory si
  join first_variant fv on fv.product_id=si.product_id and fv.rn=1
  where not exists(
    select 1 from public.product_variant_inventory pvi
    join public.product_variants pv on pv.id=pvi.variant_id
    where pvi.store_id=si.store_id and pv.product_id=si.product_id
  )
)
insert into public.product_variant_inventory(store_id,variant_id,quantity_on_hand,quantity_reserved,quantity_damaged,quantity_in_transit)
select store_id,variant_id,quantity_on_hand,quantity_reserved,quantity_damaged,quantity_in_transit from seeded
on conflict(store_id,variant_id) do nothing;

insert into public.product_variant_inventory(store_id,variant_id)
select s.id,pv.id
from public.stores s cross join public.product_variants pv
where s.is_active=true
on conflict(store_id,variant_id) do nothing;

create or replace function public.sync_product_inventory(p_store_id uuid,p_product_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_on_hand numeric; v_reserved numeric; v_damaged numeric; v_transit numeric;
begin
  select coalesce(sum(pvi.quantity_on_hand),0),coalesce(sum(pvi.quantity_reserved),0),
         coalesce(sum(pvi.quantity_damaged),0),coalesce(sum(pvi.quantity_in_transit),0)
  into v_on_hand,v_reserved,v_damaged,v_transit
  from public.product_variant_inventory pvi
  join public.product_variants pv on pv.id=pvi.variant_id
  where pvi.store_id=p_store_id and pv.product_id=p_product_id;
  insert into public.store_inventory(store_id,product_id,quantity_on_hand,quantity_reserved,quantity_damaged,quantity_in_transit)
  values(p_store_id,p_product_id,v_on_hand,v_reserved,v_damaged,v_transit)
  on conflict(store_id,product_id) do update set
    quantity_on_hand=excluded.quantity_on_hand,
    quantity_reserved=excluded.quantity_reserved,
    quantity_damaged=excluded.quantity_damaged,
    quantity_in_transit=excluded.quantity_in_transit,
    updated_at=now();
end $$;

create or replace function public.sync_variant_inventory_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_store_id uuid; v_variant_id uuid; v_product_id uuid;
begin
  if tg_op='DELETE' then
    v_store_id:=old.store_id; v_variant_id:=old.variant_id;
  else
    v_store_id:=new.store_id; v_variant_id:=new.variant_id;
  end if;
  select product_id into v_product_id from public.product_variants where id=v_variant_id;
  if v_product_id is not null then perform public.sync_product_inventory(v_store_id,v_product_id); end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists sync_variant_inventory_after_change on public.product_variant_inventory;
create trigger sync_variant_inventory_after_change
after insert or update or delete on public.product_variant_inventory
for each row execute function public.sync_variant_inventory_trigger();

create or replace function public.initialize_variant_inventory()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_is_first_variant boolean;
begin
  select not exists(
    select 1 from public.product_variants
    where product_id=new.product_id and id<>new.id and archived_at is null
  ) into v_is_first_variant;

  -- When a previously single product receives its first variant, move the
  -- existing aggregate branch stock into that variant instead of resetting it.
  if v_is_first_variant then
    insert into public.product_variant_inventory(
      store_id,variant_id,quantity_on_hand,quantity_reserved,quantity_damaged,quantity_in_transit
    )
    select s.id,new.id,
           coalesce(si.quantity_on_hand,0),coalesce(si.quantity_reserved,0),
           coalesce(si.quantity_damaged,0),coalesce(si.quantity_in_transit,0)
    from public.stores s
    left join public.store_inventory si on si.store_id=s.id and si.product_id=new.product_id
    where s.is_active=true
    on conflict(store_id,variant_id) do nothing;
  else
    insert into public.product_variant_inventory(store_id,variant_id)
    select id,new.id from public.stores where is_active=true
    on conflict(store_id,variant_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists initialize_variant_inventory_after_insert on public.product_variants;
create trigger initialize_variant_inventory_after_insert
after insert on public.product_variants
for each row execute function public.initialize_variant_inventory();

create or replace function public.initialize_store_variant_inventory()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.product_variant_inventory(store_id,variant_id)
  select new.id,id from public.product_variants
  on conflict(store_id,variant_id) do nothing;
  return new;
end $$;

drop trigger if exists initialize_store_variant_inventory_after_insert on public.stores;
create trigger initialize_store_variant_inventory_after_insert
after insert on public.stores
for each row execute function public.initialize_store_variant_inventory();

-- Keep aggregate product stock synchronized after migration.
do $$ declare r record; begin
  for r in select distinct pvi.store_id,pv.product_id from public.product_variant_inventory pvi join public.product_variants pv on pv.id=pvi.variant_id
  loop perform public.sync_product_inventory(r.store_id,r.product_id); end loop;
end $$;

create or replace function public.set_variant_stock_level(
  p_store_id uuid,p_product_id uuid,p_variant_id uuid,p_target_quantity numeric,p_reason text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_before numeric; v_delta numeric; v_id uuid;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot edit stock'; end if;
  if not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;
  if p_target_quantity is null or p_target_quantity<0 then raise exception 'Target stock cannot be negative'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Correction reason is required'; end if;
  if not exists(select 1 from public.product_variants where id=p_variant_id and product_id=p_product_id) then raise exception 'Variant does not belong to product'; end if;
  insert into public.product_variant_inventory(store_id,variant_id) values(p_store_id,p_variant_id) on conflict do nothing;
  select quantity_on_hand into v_before from public.product_variant_inventory where store_id=p_store_id and variant_id=p_variant_id for update;
  v_delta:=p_target_quantity-v_before;
  if v_delta=0 then raise exception 'Stock is already equal to target'; end if;
  update public.product_variant_inventory set quantity_on_hand=p_target_quantity,updated_at=now() where store_id=p_store_id and variant_id=p_variant_id;
  perform public.sync_product_inventory(p_store_id,p_product_id);
  insert into public.stock_movements(store_id,product_id,variant_id,movement_type,quantity,stock_before,stock_after,reference_type,reason,notes,created_by,approved_by)
  values(p_store_id,p_product_id,p_variant_id,'manual_adjustment',v_delta,v_before,p_target_quantity,'stock_edit',p_reason,'Perubahan stok varian langsung.',v_actor,v_actor)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.set_variant_stock_level(uuid,uuid,uuid,numeric,text) to authenticated;


create or replace function public.set_stock_level(
  p_store_id uuid,p_product_id uuid,p_target_quantity numeric,p_reason text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_before numeric; v_delta numeric; v_id uuid;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot edit stock'; end if;
  if not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;
  if exists(select 1 from public.product_variants where product_id=p_product_id and is_active=true and archived_at is null) then raise exception 'Variant must be selected for stock adjustment'; end if;
  if p_target_quantity is null or p_target_quantity<0 then raise exception 'Target stock cannot be negative'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Correction reason is required'; end if;
  insert into public.store_inventory(store_id,product_id) values(p_store_id,p_product_id) on conflict do nothing;
  select quantity_on_hand into v_before from public.store_inventory where store_id=p_store_id and product_id=p_product_id for update;
  v_delta:=p_target_quantity-v_before;
  if v_delta=0 then raise exception 'Stock is already equal to target'; end if;
  update public.store_inventory set quantity_on_hand=p_target_quantity,updated_at=now() where store_id=p_store_id and product_id=p_product_id;
  insert into public.stock_movements(store_id,product_id,movement_type,quantity,stock_before,stock_after,reference_type,reason,notes,created_by,approved_by)
  values(p_store_id,p_product_id,'manual_adjustment',v_delta,v_before,p_target_quantity,'stock_edit',p_reason,'Perubahan saldo stok produk tunggal.',v_actor,v_actor)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.set_stock_level(uuid,uuid,numeric,text) to authenticated;

create or replace function public.post_stock_movement_batch(
  p_store_id uuid,p_type public.movement_type,p_direction text,p_items jsonb,
  p_reference_label text default null,p_reason text default null,p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_item jsonb; v_product_id uuid; v_variant_id uuid; v_quantity numeric; v_signed numeric;
        v_before numeric; v_after numeric; v_id uuid; v_result jsonb:='[]'::jsonb; v_has_variants boolean;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot post manual stock movements'; end if;
  if not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;
  if p_direction not in ('in','out') then raise exception 'Invalid movement direction'; end if;
  if coalesce(jsonb_typeof(p_items),'')<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Movement has no items'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) item group by item->>'product_id',coalesce(nullif(item->>'variant_id',''),'base') having count(*)>1) then raise exception 'Duplicate product variant in movement'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Reason is required'; end if;
  if p_direction='in' and p_type not in ('opening','purchase','customer_return','stocktake_adjustment','manual_adjustment') then raise exception 'Movement type is not valid for stock in'; end if;
  if p_direction='out' and p_type not in ('supplier_return','damage','loss','internal_use','stocktake_adjustment','manual_adjustment') then raise exception 'Movement type is not valid for stock out'; end if;
  foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
    v_product_id:=nullif(v_item->>'product_id','')::uuid; v_variant_id:=nullif(v_item->>'variant_id','')::uuid; v_quantity:=(v_item->>'quantity')::numeric;
    if v_product_id is null or v_quantity is null or v_quantity<=0 then raise exception 'Invalid movement item'; end if;
    if not exists(select 1 from public.products where id=v_product_id and is_active=true) then raise exception 'Product not found'; end if;
    select exists(select 1 from public.product_variants where product_id=v_product_id and is_active=true) into v_has_variants;
    if v_has_variants and v_variant_id is null then raise exception 'Variant must be selected'; end if;
    if v_variant_id is not null and not exists(select 1 from public.product_variants where id=v_variant_id and product_id=v_product_id and is_active=true) then raise exception 'Invalid product variant'; end if;
    v_signed:=case when p_direction='out' then -v_quantity else v_quantity end;
    if v_variant_id is not null then
      insert into public.product_variant_inventory(store_id,variant_id) values(p_store_id,v_variant_id) on conflict do nothing;
      select quantity_on_hand into v_before from public.product_variant_inventory where store_id=p_store_id and variant_id=v_variant_id for update;
      v_after:=v_before+v_signed; if v_after<0 then raise exception 'Insufficient variant stock'; end if;
      update public.product_variant_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=p_store_id and variant_id=v_variant_id;
      perform public.sync_product_inventory(p_store_id,v_product_id);
    else
      insert into public.store_inventory(store_id,product_id) values(p_store_id,v_product_id) on conflict do nothing;
      select quantity_on_hand into v_before from public.store_inventory where store_id=p_store_id and product_id=v_product_id for update;
      v_after:=v_before+v_signed; if v_after<0 then raise exception 'Insufficient product stock'; end if;
      update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=p_store_id and product_id=v_product_id;
    end if;
    insert into public.stock_movements(store_id,product_id,variant_id,movement_type,quantity,stock_before,stock_after,reference_type,reason,notes,created_by,approved_by)
    values(p_store_id,v_product_id,v_variant_id,p_type,v_signed,v_before,v_after,nullif(trim(p_reference_label),''),p_reason,p_notes,v_actor,case when public.current_user_role() in ('owner','admin','manager') then v_actor else null end)
    returning id into v_id;
    v_result:=v_result||jsonb_build_array(jsonb_build_object('id',v_id,'product_id',v_product_id,'variant_id',v_variant_id,'quantity',v_signed,'stock_before',v_before,'stock_after',v_after));
  end loop;
  return v_result;
end $$;

grant execute on function public.post_stock_movement_batch(uuid,public.movement_type,text,jsonb,text,text,text) to authenticated;

create or replace function public.reverse_stock_movement(p_movement_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_original public.stock_movements%rowtype; v_before numeric; v_after numeric; v_reversal_id uuid;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager') then raise exception 'Only owner, admin, or manager may correct a movement'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Correction reason is required'; end if;
  select * into v_original from public.stock_movements where id=p_movement_id for update;
  if not found then raise exception 'Movement not found'; end if;
  if v_original.reversed_at is not null then raise exception 'Movement has already been corrected'; end if;
  if v_original.movement_type in ('sale','sale_reversal','transfer_out','transfer_in') then raise exception 'Use the original document to correct this movement'; end if;
  if v_original.variant_id is not null then
    select quantity_on_hand into v_before from public.product_variant_inventory where store_id=v_original.store_id and variant_id=v_original.variant_id for update;
    v_after:=v_before-v_original.quantity; if v_after<0 then raise exception 'Correction would make variant stock negative'; end if;
    update public.product_variant_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_original.store_id and variant_id=v_original.variant_id;
    perform public.sync_product_inventory(v_original.store_id,v_original.product_id);
  else
    select quantity_on_hand into v_before from public.store_inventory where store_id=v_original.store_id and product_id=v_original.product_id for update;
    v_after:=v_before-v_original.quantity; if v_after<0 then raise exception 'Correction would make stock negative'; end if;
    update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_original.store_id and product_id=v_original.product_id;
  end if;
  insert into public.stock_movements(store_id,product_id,variant_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,notes,created_by,approved_by,correction_reason)
  values(v_original.store_id,v_original.product_id,v_original.variant_id,'manual_adjustment',-v_original.quantity,v_before,v_after,'movement_reversal',v_original.id,'Ralat: '||coalesce(v_original.reason,v_original.movement_type::text),'Membalik pergerakan stok',v_actor,v_actor,p_reason)
  returning id into v_reversal_id;
  update public.stock_movements set reversed_at=now(),reversed_by=v_actor,reversal_movement_id=v_reversal_id,correction_reason=p_reason where id=v_original.id;
  return v_reversal_id;
end $$;

-- Variant-aware stocktake keeps physical counts aligned with branch variant stock.
create or replace function public.create_stocktake(p_store_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid:=gen_random_uuid(); v_number text; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot create stocktakes'; end if;
  if not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;
  v_number:='SO-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.stocktake_seq')::text,5,'0');
  insert into public.stocktakes(id,stocktake_number,store_id,status,notes,created_by)
  values(v_id,v_number,p_store_id,'draft',nullif(trim(coalesce(p_notes,'')),''),v_actor);

  insert into public.stocktake_items(stocktake_id,product_id,variant_id,system_quantity)
  select v_id,p.id,pv.id,coalesce(pvi.quantity_on_hand,0)
  from public.products p
  join public.product_variants pv on pv.product_id=p.id and pv.is_active=true and pv.archived_at is null
  left join public.product_variant_inventory pvi on pvi.variant_id=pv.id and pvi.store_id=p_store_id
  where p.is_active=true
  union all
  select v_id,p.id,null,coalesce(si.quantity_on_hand,0)
  from public.products p
  left join public.store_inventory si on si.product_id=p.id and si.store_id=p_store_id
  where p.is_active=true and not exists(
    select 1 from public.product_variants pv
    where pv.product_id=p.id and pv.is_active=true and pv.archived_at is null
  );
  return jsonb_build_object('id',v_id,'stocktake_number',v_number,'status','draft');
end $$;

create or replace function public.complete_stocktake(p_stocktake_id uuid,p_counts jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_st public.stocktakes%rowtype; v_count jsonb; v_item public.stocktake_items%rowtype; v_product_id uuid; v_variant_id uuid;
        v_physical numeric; v_before numeric; v_after numeric; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot complete stocktakes'; end if;
  if coalesce(jsonb_typeof(p_counts),'')<>'array' or jsonb_array_length(p_counts)=0 then raise exception 'Stocktake counts are empty'; end if;
  if exists(select 1 from jsonb_array_elements(p_counts) item group by item->>'product_id',coalesce(nullif(item->>'variant_id',''),'base') having count(*)>1) then raise exception 'Duplicate product variant in stocktake'; end if;
  select * into v_st from public.stocktakes where id=p_stocktake_id for update;
  if not found or v_st.status not in ('draft','pending','approved') then raise exception 'Stocktake cannot be completed'; end if;
  if not public.can_access_store(v_st.store_id) then raise exception 'Store access denied'; end if;

  foreach v_count in array array(select value from jsonb_array_elements(p_counts)) loop
    v_product_id:=nullif(v_count->>'product_id','')::uuid;
    v_variant_id:=nullif(v_count->>'variant_id','')::uuid;
    v_physical:=nullif(v_count->>'physical_quantity','')::numeric;
    if v_physical is null or v_physical<0 then raise exception 'Physical quantity cannot be negative'; end if;
    select * into v_item from public.stocktake_items
    where stocktake_id=p_stocktake_id and product_id=v_product_id and variant_id is not distinct from v_variant_id
    for update;
    if not found then raise exception 'Stocktake item not found'; end if;
    update public.stocktake_items set physical_quantity=v_physical,notes=nullif(trim(coalesce(v_count->>'notes','')),'') where id=v_item.id;

    if v_variant_id is not null then
      insert into public.product_variant_inventory(store_id,variant_id) values(v_st.store_id,v_variant_id) on conflict do nothing;
      select quantity_on_hand into v_before from public.product_variant_inventory where store_id=v_st.store_id and variant_id=v_variant_id for update;
      v_after:=v_physical;
      if v_after<>v_before then
        update public.product_variant_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_st.store_id and variant_id=v_variant_id;
        perform public.sync_product_inventory(v_st.store_id,v_product_id);
      end if;
    else
      insert into public.store_inventory(store_id,product_id) values(v_st.store_id,v_product_id) on conflict do nothing;
      select quantity_on_hand into v_before from public.store_inventory where store_id=v_st.store_id and product_id=v_product_id for update;
      v_after:=v_physical;
      if v_after<>v_before then update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_st.store_id and product_id=v_product_id; end if;
    end if;
    if v_after<>v_before then
      insert into public.stock_movements(store_id,product_id,variant_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by,approved_by)
      values(v_st.store_id,v_product_id,v_variant_id,'stocktake_adjustment',v_after-v_before,v_before,v_after,'stocktake',p_stocktake_id,'Penyesuaian stok opname '||v_st.stocktake_number,v_actor,v_actor);
    end if;
  end loop;
  update public.stocktakes set status='completed',approved_by=v_actor,completed_at=now() where id=p_stocktake_id;
  return jsonb_build_object('id',p_stocktake_id,'status','completed');
end $$;
grant execute on function public.create_stocktake(uuid,text) to authenticated;
grant execute on function public.complete_stocktake(uuid,jsonb) to authenticated;

-- Variant-aware quick restock requests from the network inventory page.
drop function if exists public.create_stock_transfer_request(uuid,uuid,uuid,numeric,text);
create or replace function public.create_stock_transfer_request(
  p_product_id uuid,p_variant_id uuid,p_source_store_id uuid,p_destination_store_id uuid,
  p_quantity numeric,p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_id uuid:=gen_random_uuid(); v_number text; v_available numeric; v_has_variants boolean;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if p_source_store_id=p_destination_store_id then raise exception 'Source and destination must differ'; end if;
  if not public.can_access_store(p_destination_store_id) then raise exception 'Destination store access denied'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Invalid request quantity'; end if;
  if not exists(select 1 from public.products where id=p_product_id and is_active=true) then raise exception 'Product not found'; end if;
  if not exists(select 1 from public.stores where id=p_source_store_id and is_active=true) then raise exception 'Source store not found'; end if;
  select exists(select 1 from public.product_variants where product_id=p_product_id and is_active=true) into v_has_variants;
  if v_has_variants and p_variant_id is null then raise exception 'Variant must be selected'; end if;
  if p_variant_id is not null and not exists(select 1 from public.product_variants where id=p_variant_id and product_id=p_product_id and is_active=true) then raise exception 'Invalid product variant'; end if;
  if p_variant_id is not null then
    select coalesce(quantity_on_hand-quantity_reserved,0) into v_available
    from public.product_variant_inventory where store_id=p_source_store_id and variant_id=p_variant_id;
  else
    select coalesce(quantity_on_hand-quantity_reserved,0) into v_available
    from public.store_inventory where store_id=p_source_store_id and product_id=p_product_id;
  end if;
  if coalesce(v_available,0)<p_quantity then raise exception 'Source store stock is insufficient'; end if;
  v_number:='REQ-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.transfer_request_seq')::text,5,'0');
  insert into public.stock_transfer_requests(id,request_number,product_id,variant_id,source_store_id,destination_store_id,quantity,notes,requested_by)
  values(v_id,v_number,p_product_id,p_variant_id,p_source_store_id,p_destination_store_id,p_quantity,nullif(trim(coalesce(p_notes,'')),''),v_actor);
  return jsonb_build_object('id',v_id,'request_number',v_number,'status','pending');
end $$;
grant execute on function public.create_stock_transfer_request(uuid,uuid,uuid,uuid,numeric,text) to authenticated;

-- Compatibility wrapper for the previous application version. Products with
-- active variants still require the new six-argument function.
create or replace function public.create_stock_transfer_request(
  p_product_id uuid,p_source_store_id uuid,p_destination_store_id uuid,p_quantity numeric,p_notes text default null
) returns jsonb language sql security definer set search_path=public as $$
  select public.create_stock_transfer_request(p_product_id,null::uuid,p_source_store_id,p_destination_store_id,p_quantity,p_notes)
$$;
grant execute on function public.create_stock_transfer_request(uuid,uuid,uuid,numeric,text) to authenticated;

create or replace function public.approve_stock_transfer_request(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_req public.stock_transfer_requests%rowtype; v_transfer_id uuid:=gen_random_uuid(); v_transfer_number text;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot process request'; end if;
  select * into v_req from public.stock_transfer_requests where id=p_request_id for update;
  if not found or v_req.status<>'pending' then raise exception 'Request cannot be processed'; end if;
  if not public.can_access_store(v_req.source_store_id) and not public.is_admin() then raise exception 'Source store access denied'; end if;
  v_transfer_number:='TRF-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.transfer_seq')::text,5,'0');
  insert into public.stock_transfers(id,transfer_number,source_store_id,destination_store_id,status,notes,requested_by,approved_by,approved_at)
  values(v_transfer_id,v_transfer_number,v_req.source_store_id,v_req.destination_store_id,'approved',coalesce(v_req.notes,'Permintaan stok ')||' · '||v_req.request_number,v_req.requested_by,v_actor,now());
  insert into public.stock_transfer_items(transfer_id,product_id,variant_id,quantity_requested)
  values(v_transfer_id,v_req.product_id,v_req.variant_id,v_req.quantity);
  update public.stock_transfer_requests set status='approved',processed_by=v_actor,processed_at=now(),transfer_id=v_transfer_id where id=p_request_id;
  return jsonb_build_object('id',v_transfer_id,'transfer_number',v_transfer_number,'status','approved');
end $$;
grant execute on function public.approve_stock_transfer_request(uuid) to authenticated;

create or replace function public.create_stock_transfer(p_source_store_id uuid,p_destination_store_id uuid,p_items jsonb,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid:=gen_random_uuid(); v_number text; v_actor uuid:=auth.uid(); v_item jsonb; v_product_id uuid; v_variant_id uuid; v_quantity numeric; v_has_variants boolean;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot create transfers'; end if;
  if p_source_store_id=p_destination_store_id then raise exception 'Source and destination must differ'; end if;
  if not public.can_access_store(p_source_store_id) or not public.can_access_store(p_destination_store_id) then raise exception 'Store access denied'; end if;
  if coalesce(jsonb_typeof(p_items),'')<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Transfer has no items'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) item group by item->>'product_id',coalesce(nullif(item->>'variant_id',''),'base') having count(*)>1) then raise exception 'Duplicate product variant in transfer'; end if;
  v_number:='TRF-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.transfer_seq')::text,5,'0');
  insert into public.stock_transfers(id,transfer_number,source_store_id,destination_store_id,status,notes,requested_by,approved_by,approved_at)
  values(v_id,v_number,p_source_store_id,p_destination_store_id,'approved',p_notes,v_actor,v_actor,now());
  foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
    v_product_id:=(v_item->>'product_id')::uuid; v_variant_id:=nullif(v_item->>'variant_id','')::uuid; v_quantity:=(v_item->>'quantity')::numeric;
    if v_quantity<=0 then raise exception 'Invalid transfer quantity'; end if;
    select exists(select 1 from public.product_variants where product_id=v_product_id and is_active=true) into v_has_variants;
    if v_has_variants and v_variant_id is null then raise exception 'Variant must be selected'; end if;
    if v_variant_id is not null and not exists(select 1 from public.product_variants where id=v_variant_id and product_id=v_product_id and is_active=true) then raise exception 'Invalid product variant'; end if;
    insert into public.stock_transfer_items(transfer_id,product_id,variant_id,quantity_requested) values(v_id,v_product_id,v_variant_id,v_quantity);
  end loop;
  return jsonb_build_object('id',v_id,'transfer_number',v_number,'status','approved');
end $$;

create or replace function public.send_stock_transfer(p_transfer_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_transfer public.stock_transfers%rowtype; v_item public.stock_transfer_items%rowtype; v_before numeric; v_after numeric; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot process transfers'; end if;
  select * into v_transfer from public.stock_transfers where id=p_transfer_id for update;
  if not found or v_transfer.status not in ('draft','pending','approved','preparing') then raise exception 'Transfer cannot be sent'; end if;
  if not public.can_access_store(v_transfer.source_store_id) then raise exception 'Store access denied'; end if;
  for v_item in select * from public.stock_transfer_items where transfer_id=p_transfer_id loop
    if v_item.variant_id is not null then
      insert into public.product_variant_inventory(store_id,variant_id) values(v_transfer.source_store_id,v_item.variant_id) on conflict do nothing;
      select quantity_on_hand into v_before from public.product_variant_inventory where store_id=v_transfer.source_store_id and variant_id=v_item.variant_id for update;
      if v_before<v_item.quantity_requested then raise exception 'Insufficient variant stock for transfer'; end if;
      v_after:=v_before-v_item.quantity_requested;
      update public.product_variant_inventory set quantity_on_hand=v_after,quantity_in_transit=quantity_in_transit+v_item.quantity_requested,updated_at=now() where store_id=v_transfer.source_store_id and variant_id=v_item.variant_id;
      perform public.sync_product_inventory(v_transfer.source_store_id,v_item.product_id);
    else
      insert into public.store_inventory(store_id,product_id) values(v_transfer.source_store_id,v_item.product_id) on conflict do nothing;
      select quantity_on_hand into v_before from public.store_inventory where store_id=v_transfer.source_store_id and product_id=v_item.product_id for update;
      if v_before<v_item.quantity_requested then raise exception 'Insufficient stock for transfer'; end if;
      v_after:=v_before-v_item.quantity_requested;
      update public.store_inventory set quantity_on_hand=v_after,quantity_in_transit=quantity_in_transit+v_item.quantity_requested,updated_at=now() where store_id=v_transfer.source_store_id and product_id=v_item.product_id;
    end if;
    update public.stock_transfer_items set quantity_sent=v_item.quantity_requested where id=v_item.id;
    insert into public.stock_movements(store_id,product_id,variant_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by)
    values(v_transfer.source_store_id,v_item.product_id,v_item.variant_id,'transfer_out',-v_item.quantity_requested,v_before,v_after,'stock_transfer',p_transfer_id,'Transfer '||v_transfer.transfer_number,v_actor);
  end loop;
  update public.stock_transfers set status='in_transit',sent_by=v_actor,sent_at=now() where id=p_transfer_id;
  return jsonb_build_object('id',p_transfer_id,'status','in_transit');
end $$;

create or replace function public.receive_stock_transfer(p_transfer_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_transfer public.stock_transfers%rowtype; v_item public.stock_transfer_items%rowtype; v_before numeric; v_after numeric; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot process transfers'; end if;
  select * into v_transfer from public.stock_transfers where id=p_transfer_id for update;
  if not found or v_transfer.status<>'in_transit' then raise exception 'Transfer is not in transit'; end if;
  if not public.can_access_store(v_transfer.destination_store_id) then raise exception 'Store access denied'; end if;
  for v_item in select * from public.stock_transfer_items where transfer_id=p_transfer_id loop
    if v_item.variant_id is not null then
      insert into public.product_variant_inventory(store_id,variant_id) values(v_transfer.destination_store_id,v_item.variant_id) on conflict do nothing;
      select quantity_on_hand into v_before from public.product_variant_inventory where store_id=v_transfer.destination_store_id and variant_id=v_item.variant_id for update;
      v_after:=v_before+v_item.quantity_sent;
      update public.product_variant_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_transfer.destination_store_id and variant_id=v_item.variant_id;
      update public.product_variant_inventory set quantity_in_transit=greatest(quantity_in_transit-v_item.quantity_sent,0),updated_at=now() where store_id=v_transfer.source_store_id and variant_id=v_item.variant_id;
      perform public.sync_product_inventory(v_transfer.destination_store_id,v_item.product_id);
      perform public.sync_product_inventory(v_transfer.source_store_id,v_item.product_id);
    else
      insert into public.store_inventory(store_id,product_id) values(v_transfer.destination_store_id,v_item.product_id) on conflict do nothing;
      select quantity_on_hand into v_before from public.store_inventory where store_id=v_transfer.destination_store_id and product_id=v_item.product_id for update;
      v_after:=v_before+v_item.quantity_sent;
      update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_transfer.destination_store_id and product_id=v_item.product_id;
      update public.store_inventory set quantity_in_transit=greatest(quantity_in_transit-v_item.quantity_sent,0),updated_at=now() where store_id=v_transfer.source_store_id and product_id=v_item.product_id;
    end if;
    update public.stock_transfer_items set quantity_received=v_item.quantity_sent where id=v_item.id;
    insert into public.stock_movements(store_id,product_id,variant_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by)
    values(v_transfer.destination_store_id,v_item.product_id,v_item.variant_id,'transfer_in',v_item.quantity_sent,v_before,v_after,'stock_transfer',p_transfer_id,'Penerimaan '||v_transfer.transfer_number,v_actor);
  end loop;
  update public.stock_transfers set status='received',received_by=v_actor,received_at=now() where id=p_transfer_id;
  return jsonb_build_object('id',p_transfer_id,'status','received');
end $$;

grant execute on function public.create_stock_transfer(uuid,uuid,jsonb,text) to authenticated;
grant execute on function public.send_stock_transfer(uuid) to authenticated;
grant execute on function public.receive_stock_transfer(uuid) to authenticated;

create or replace function public.save_purchase_order_multi(
  p_purchase_order_id uuid,p_supplier_id uuid,p_receiving_scope text,p_items jsonb,
  p_shipping_cost numeric default 0,p_discount numeric default 0,p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_number text; v_item jsonb; v_alloc jsonb; v_product_id uuid; v_variant_id uuid;
        v_item_id uuid; v_store_id uuid; v_quantity numeric; v_item_quantity numeric; v_cost numeric; v_subtotal numeric:=0; v_line numeric; v_total numeric; v_first_store uuid; v_existing public.purchase_orders%rowtype;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot create purchases'; end if;
  if p_supplier_id is null or not exists(select 1 from public.suppliers where id=p_supplier_id and is_active=true) then raise exception 'Supplier is not valid'; end if;
  if p_receiving_scope not in ('single','selected','all') then raise exception 'Invalid receiving scope'; end if;
  if coalesce(p_shipping_cost,0)<0 or coalesce(p_discount,0)<0 then raise exception 'Shipping cost and discount cannot be negative'; end if;
  if coalesce(jsonb_typeof(p_items),'')<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Purchase has no items'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) item group by item->>'product_id',coalesce(nullif(item->>'variant_id',''),'base') having count(*)>1) then raise exception 'Duplicate product variant in purchase'; end if;
  select nullif(value->'allocations'->0->>'store_id','')::uuid into v_first_store from jsonb_array_elements(p_items) limit 1;
  if v_first_store is null then raise exception 'Purchase destination is empty'; end if;
  if p_purchase_order_id is null then
    v_id:=gen_random_uuid(); v_number:='PO-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.purchase_seq')::text,5,'0');
    insert into public.purchase_orders(id,po_number,supplier_id,destination_store_id,status,subtotal,discount,shipping_cost,total,notes,created_by,approved_by,receiving_scope,updated_at)
    values(v_id,v_number,p_supplier_id,v_first_store,'pending',0,coalesce(p_discount,0),coalesce(p_shipping_cost,0),0,nullif(trim(coalesce(p_notes,'')),''),v_actor,v_actor,p_receiving_scope,now());
  else
    select * into v_existing from public.purchase_orders where id=p_purchase_order_id for update;
    if not found or v_existing.status not in ('draft','pending') then raise exception 'Purchase cannot be edited'; end if;
    v_id:=v_existing.id; v_number:=v_existing.po_number; delete from public.purchase_order_items where purchase_order_id=v_id;
  end if;
  foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
    v_product_id:=nullif(v_item->>'product_id','')::uuid; v_variant_id:=nullif(v_item->>'variant_id','')::uuid; v_cost:=coalesce((v_item->>'unit_cost')::numeric,0);
    if v_product_id is null or not exists(select 1 from public.products where id=v_product_id and is_active=true) then raise exception 'Product not found'; end if;
    if v_cost<0 then raise exception 'Purchase price cannot be negative'; end if;
    if coalesce(jsonb_typeof(v_item->'allocations'),'')<>'array' or jsonb_array_length(v_item->'allocations')=0 then raise exception 'Product has no branch allocation'; end if;
    if exists(select 1 from jsonb_array_elements(v_item->'allocations') a group by a->>'store_id' having count(*)>1) then raise exception 'Duplicate branch allocation'; end if;
    if v_variant_id is not null and not exists(select 1 from public.product_variants where id=v_variant_id and product_id=v_product_id) then raise exception 'Invalid product variant'; end if;
    if exists(select 1 from public.product_variants where product_id=v_product_id and is_active=true) and v_variant_id is null then raise exception 'Variant must be selected'; end if;
    v_item_quantity:=0;
    foreach v_alloc in array array(select value from jsonb_array_elements(v_item->'allocations')) loop
      v_store_id:=(v_alloc->>'store_id')::uuid; v_quantity:=(v_alloc->>'quantity')::numeric;
      if v_store_id is null or v_quantity<=0 or not exists(select 1 from public.stores where id=v_store_id and is_active=true) or not public.can_access_store(v_store_id) then raise exception 'Invalid branch allocation'; end if;
      v_item_quantity:=v_item_quantity+v_quantity;
    end loop;
    v_line:=v_item_quantity*v_cost; v_subtotal:=v_subtotal+v_line;
    insert into public.purchase_order_items(purchase_order_id,product_id,variant_id,quantity_ordered,quantity_received,unit_cost,subtotal)
    values(v_id,v_product_id,v_variant_id,v_item_quantity,0,v_cost,v_line) returning id into v_item_id;
    foreach v_alloc in array array(select value from jsonb_array_elements(v_item->'allocations')) loop
      insert into public.purchase_order_allocations(purchase_order_item_id,store_id,quantity)
      values(v_item_id,(v_alloc->>'store_id')::uuid,(v_alloc->>'quantity')::numeric);
    end loop;
  end loop;
  if coalesce(p_discount,0)>v_subtotal+coalesce(p_shipping_cost,0) then raise exception 'Discount exceeds purchase value'; end if;
  v_total:=v_subtotal+coalesce(p_shipping_cost,0)-coalesce(p_discount,0);
  update public.purchase_orders set supplier_id=p_supplier_id,destination_store_id=v_first_store,status='pending',subtotal=v_subtotal,discount=coalesce(p_discount,0),shipping_cost=coalesce(p_shipping_cost,0),total=v_total,notes=nullif(trim(coalesce(p_notes,'')),''),receiving_scope=p_receiving_scope,updated_at=now() where id=v_id;
  return jsonb_build_object('id',v_id,'po_number',v_number,'status','pending','subtotal',v_subtotal,'total',v_total);
end $$;

create or replace function public.receive_purchase_order(p_purchase_order_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_po public.purchase_orders%rowtype; v_item public.purchase_order_items%rowtype; v_alloc public.purchase_order_allocations%rowtype; v_before numeric; v_after numeric; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if public.current_user_role() not in ('owner','admin','manager','warehouse') then raise exception 'Role cannot receive purchases'; end if;
  select * into v_po from public.purchase_orders where id=p_purchase_order_id for update;
  if not found or v_po.status in ('received','completed','cancelled') then raise exception 'Purchase cannot be received'; end if;
  for v_alloc in select poa.* from public.purchase_order_allocations poa join public.purchase_order_items poi on poi.id=poa.purchase_order_item_id where poi.purchase_order_id=p_purchase_order_id loop
    if not public.can_access_store(v_alloc.store_id) then raise exception 'Store access denied'; end if;
    select * into v_item from public.purchase_order_items where id=v_alloc.purchase_order_item_id;
    if v_item.variant_id is not null then
      insert into public.product_variant_inventory(store_id,variant_id) values(v_alloc.store_id,v_item.variant_id) on conflict do nothing;
      select quantity_on_hand into v_before from public.product_variant_inventory where store_id=v_alloc.store_id and variant_id=v_item.variant_id for update;
      v_after:=v_before+v_alloc.quantity;
      update public.product_variant_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_alloc.store_id and variant_id=v_item.variant_id;
      perform public.sync_product_inventory(v_alloc.store_id,v_item.product_id);
    else
      insert into public.store_inventory(store_id,product_id) values(v_alloc.store_id,v_item.product_id) on conflict do nothing;
      select quantity_on_hand into v_before from public.store_inventory where store_id=v_alloc.store_id and product_id=v_item.product_id for update;
      v_after:=v_before+v_alloc.quantity;
      update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_alloc.store_id and product_id=v_item.product_id;
    end if;
    update public.purchase_order_allocations set quantity_received=v_alloc.quantity where id=v_alloc.id;
    insert into public.stock_movements(store_id,product_id,variant_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by)
    values(v_alloc.store_id,v_item.product_id,v_item.variant_id,'purchase',v_alloc.quantity,v_before,v_after,'purchase_order',p_purchase_order_id,'Penerimaan '||v_po.po_number,v_actor);
  end loop;
  update public.purchase_order_items poi set quantity_received=(select coalesce(sum(poa.quantity_received),0) from public.purchase_order_allocations poa where poa.purchase_order_item_id=poi.id) where poi.purchase_order_id=p_purchase_order_id;
  update public.purchase_orders set status='received',received_at=now(),updated_at=now() where id=p_purchase_order_id;
  return jsonb_build_object('id',p_purchase_order_id,'status','received');
end $$;

grant execute on function public.save_purchase_order_multi(uuid,uuid,text,jsonb,numeric,numeric,text) to authenticated;
grant execute on function public.receive_purchase_order(uuid) to authenticated;

create or replace function public.purchase_orders_overview(p_store_id uuid default null)
returns table(payload jsonb) language sql stable security definer set search_path=public as $$
select jsonb_build_object(
  'id',po.id,'po_number',po.po_number,'supplier_id',po.supplier_id,'supplier_name',coalesce(sup.name,'Supplier'),
  'destination_store_id',po.destination_store_id,'store_name',coalesce(dst.name,'Toko'),'receiving_scope',po.receiving_scope,
  'status',po.status,'subtotal',po.subtotal,'discount',po.discount,'shipping_cost',po.shipping_cost,'total',po.total,
  'notes',po.notes,'created_at',po.created_at,'received_at',po.received_at,'updated_at',po.updated_at,
  'store_names',coalesce((select jsonb_agg(distinct st.name order by st.name) from public.purchase_order_items x join public.purchase_order_allocations a on a.purchase_order_item_id=x.id join public.stores st on st.id=a.store_id where x.purchase_order_id=po.id),jsonb_build_array(coalesce(dst.name,'Toko'))),
  'items',coalesce((select jsonb_agg(jsonb_build_object(
    'id',poi.id,'product_id',poi.product_id,'variant_id',poi.variant_id,'name',coalesce(prod.name,'Produk'),
    'variant_name',pv.name,'sku',coalesce(prod.sku,''),'variant_sku',pv.sku,'unit',coalesce(prod.unit,'pcs'),
    'quantity_ordered',poi.quantity_ordered,'quantity_received',poi.quantity_received,'unit_cost',poi.unit_cost,'subtotal',poi.subtotal,
    'allocations',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'store_id',a.store_id,'store_name',st.name,'store_code',st.code,'quantity',a.quantity,'quantity_received',a.quantity_received) order by st.name) from public.purchase_order_allocations a join public.stores st on st.id=a.store_id where a.purchase_order_item_id=poi.id),'[]'::jsonb)
  ) order by prod.name,pv.name) from public.purchase_order_items poi left join public.products prod on prod.id=poi.product_id left join public.product_variants pv on pv.id=poi.variant_id where poi.purchase_order_id=po.id),'[]'::jsonb)
) payload
from public.purchase_orders po left join public.suppliers sup on sup.id=po.supplier_id left join public.stores dst on dst.id=po.destination_store_id
where auth.uid() is not null and (p_store_id is null or po.destination_store_id=p_store_id or exists(select 1 from public.purchase_order_items i join public.purchase_order_allocations a on a.purchase_order_item_id=i.id where i.purchase_order_id=po.id and a.store_id=p_store_id))
order by po.created_at desc;
$$;

grant execute on function public.purchase_orders_overview(uuid) to authenticated;

-- Variant-aware sales stock.
create or replace function public.complete_sale(
 p_store_id uuid,p_shift_id uuid,p_customer_name text,p_items jsonb,p_payments jsonb,p_discount numeric default 0,p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sale_id uuid:=gen_random_uuid(); v_invoice text; v_subtotal numeric:=0; v_total numeric; v_item jsonb; v_payment jsonb;
 v_product public.products%rowtype; v_variant public.product_variants%rowtype; v_variant_id uuid; v_qty numeric; v_unit_cost numeric; v_unit_price numeric; v_line numeric; v_before numeric; v_after numeric; v_cashier uuid:=auth.uid(); v_paid numeric:=0;
begin
 if v_cashier is null then raise exception 'Not authenticated'; end if;
 if public.current_user_role() not in ('owner','admin','manager','cashier') then raise exception 'Role cannot complete sales'; end if;
 if not public.can_access_store(p_store_id) then raise exception 'Store access denied'; end if;
 if p_shift_id is null or not exists(select 1 from public.cashier_shifts where id=p_shift_id and store_id=p_store_id and status='open') then raise exception 'An active store shift is required'; end if;
 if coalesce(jsonb_typeof(p_items),'')<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart is empty'; end if;
 if coalesce(jsonb_typeof(p_payments),'')<>'array' or jsonb_array_length(p_payments)=0 then raise exception 'Invalid payment data'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) item group by item->>'product_id',coalesce(nullif(item->>'variant_id',''),'base') having count(*)>1) then raise exception 'Duplicate product variant in cart'; end if;
 v_invoice:='IDS-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.invoice_seq')::text,6,'0');
 foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
  select * into v_product from public.products where id=(v_item->>'product_id')::uuid and is_active=true; if not found then raise exception 'Product not found'; end if;
  v_variant_id:=nullif(v_item->>'variant_id','')::uuid; v_qty:=(v_item->>'quantity')::numeric;
  if v_variant_id is not null then
    select * into v_variant from public.product_variants where id=v_variant_id and product_id=v_product.id and is_active=true; if not found then raise exception 'Variant not found'; end if;
    v_unit_cost:=v_variant.cost_price; v_unit_price:=v_variant.selling_price;
    insert into public.product_variant_inventory(store_id,variant_id) values(p_store_id,v_variant_id) on conflict do nothing;
    select quantity_on_hand into v_before from public.product_variant_inventory where store_id=p_store_id and variant_id=v_variant_id for update;
  else
    if exists(select 1 from public.product_variants where product_id=v_product.id and is_active=true) then raise exception 'Variant must be selected'; end if;
    v_unit_cost:=v_product.cost_price; v_unit_price:=v_product.selling_price;
    insert into public.store_inventory(store_id,product_id) values(p_store_id,v_product.id) on conflict do nothing;
    select quantity_on_hand into v_before from public.store_inventory where store_id=p_store_id and product_id=v_product.id for update;
  end if;
  if v_qty<=0 or v_before<v_qty then raise exception 'Insufficient stock for %',v_product.name; end if;
  v_subtotal:=v_subtotal+(v_unit_price*v_qty);
 end loop;
 if coalesce(p_discount,0)<0 or coalesce(p_discount,0)>v_subtotal then raise exception 'Invalid discount'; end if;
 v_total:=v_subtotal-coalesce(p_discount,0);
 if exists(select 1 from jsonb_array_elements(p_payments) payment where coalesce((payment->>'amount')::numeric,0)<0) then raise exception 'Payment amount cannot be negative'; end if;
 select coalesce(sum((value->>'amount')::numeric),0) into v_paid from jsonb_array_elements(p_payments); if v_paid<>v_total then raise exception 'Payment total must equal grand total'; end if;
 insert into public.sales(id,invoice_number,store_id,cashier_id,shift_id,customer_name,subtotal,discount,grand_total,notes) values(v_sale_id,v_invoice,p_store_id,v_cashier,p_shift_id,p_customer_name,v_subtotal,coalesce(p_discount,0),v_total,p_notes);
 foreach v_item in array array(select value from jsonb_array_elements(p_items)) loop
  select * into v_product from public.products where id=(v_item->>'product_id')::uuid; v_variant_id:=nullif(v_item->>'variant_id','')::uuid; v_qty:=(v_item->>'quantity')::numeric;
  if v_variant_id is not null then
    select * into v_variant from public.product_variants where id=v_variant_id; v_unit_cost:=v_variant.cost_price; v_unit_price:=v_variant.selling_price;
    select quantity_on_hand into v_before from public.product_variant_inventory where store_id=p_store_id and variant_id=v_variant_id for update; v_after:=v_before-v_qty;
    update public.product_variant_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=p_store_id and variant_id=v_variant_id; perform public.sync_product_inventory(p_store_id,v_product.id);
  else
    v_unit_cost:=v_product.cost_price; v_unit_price:=v_product.selling_price; select quantity_on_hand into v_before from public.store_inventory where store_id=p_store_id and product_id=v_product.id for update; v_after:=v_before-v_qty;
    update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=p_store_id and product_id=v_product.id;
  end if;
  v_line:=v_unit_price*v_qty;
  insert into public.sale_items(sale_id,product_id,variant_id,product_name_snapshot,sku_snapshot,variant_name_snapshot,variant_sku_snapshot,quantity,cost_price_snapshot,selling_price_snapshot,subtotal)
  values(v_sale_id,v_product.id,v_variant_id,v_product.name,v_product.sku,case when v_variant_id is null then null else v_variant.name end,case when v_variant_id is null then null else v_variant.sku end,v_qty,v_unit_cost,v_unit_price,v_line);
  insert into public.stock_movements(store_id,product_id,variant_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by)
  values(p_store_id,v_product.id,v_variant_id,'sale',-v_qty,v_before,v_after,'sale',v_sale_id,'Penjualan '||v_invoice,v_cashier);
 end loop;
 foreach v_payment in array array(select value from jsonb_array_elements(p_payments)) loop if (v_payment->>'amount')::numeric>0 then insert into public.payments(sale_id,method,amount,reference_number) values(v_sale_id,(v_payment->>'method')::public.payment_method,(v_payment->>'amount')::numeric,v_payment->>'reference_number'); end if; end loop;
 return jsonb_build_object('sale_id',v_sale_id,'invoice_number',v_invoice,'grand_total',v_total);
end $$;

create or replace function public.void_sale(p_sale_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sale public.sales%rowtype; v_item public.sale_items%rowtype; v_before numeric; v_after numeric; v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise exception 'Not authenticated'; end if;
 if public.current_user_role() not in ('owner','admin','manager') then raise exception 'Approval required'; end if;
 if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Void reason is required'; end if;
 select * into v_sale from public.sales where id=p_sale_id for update; if not found or v_sale.status<>'completed' then raise exception 'Sale cannot be voided'; end if;
 if not public.can_access_store(v_sale.store_id) then raise exception 'Store access denied'; end if;
 for v_item in select * from public.sale_items where sale_id=p_sale_id loop
  if v_item.variant_id is not null then
   insert into public.product_variant_inventory(store_id,variant_id) values(v_sale.store_id,v_item.variant_id) on conflict do nothing;
   select quantity_on_hand into v_before from public.product_variant_inventory where store_id=v_sale.store_id and variant_id=v_item.variant_id for update; v_after:=v_before+v_item.quantity;
   update public.product_variant_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_sale.store_id and variant_id=v_item.variant_id; perform public.sync_product_inventory(v_sale.store_id,v_item.product_id);
  else
   select quantity_on_hand into v_before from public.store_inventory where store_id=v_sale.store_id and product_id=v_item.product_id for update; v_after:=v_before+v_item.quantity;
   update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_sale.store_id and product_id=v_item.product_id;
  end if;
  insert into public.stock_movements(store_id,product_id,variant_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by,approved_by)
  values(v_sale.store_id,v_item.product_id,v_item.variant_id,'sale_reversal',v_item.quantity,v_before,v_after,'sale',p_sale_id,p_reason,v_actor,v_actor);
 end loop;
 update public.sales set status='voided',voided_at=now(),voided_by=v_actor,void_reason=p_reason where id=p_sale_id;
 return jsonb_build_object('id',p_sale_id,'status','voided');
end $$;

create or replace function public.create_customer_return_v2(p_sale_id uuid,p_sale_item_id uuid,p_quantity numeric,p_condition text,p_reason text,p_resolution text default 'refund')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sale public.sales%rowtype; v_item public.sale_items%rowtype; v_id uuid:=gen_random_uuid(); v_number text; v_before numeric; v_after numeric; v_amount numeric; v_already_returned numeric:=0; v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise exception 'Not authenticated'; end if;
 if public.current_user_role() not in ('owner','admin','manager','cashier') then raise exception 'Role cannot create returns'; end if;
 if p_quantity<=0 or p_condition not in ('sellable','damaged','inspection') then raise exception 'Invalid return data'; end if;
 if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Return reason is required'; end if;
 select * into v_sale from public.sales where id=p_sale_id and status in ('completed','partially_refunded') for update;
 if not found then raise exception 'Sale not found'; end if;
 if not public.can_access_store(v_sale.store_id) then raise exception 'Store access denied'; end if;
 select * into v_item from public.sale_items where id=p_sale_item_id and sale_id=p_sale_id;
 if not found then raise exception 'Sale item not found'; end if;
 select coalesce(sum(ri.quantity),0) into v_already_returned from public.return_items ri join public.returns r on r.id=ri.return_id where ri.sale_item_id=v_item.id and r.status in ('approved','completed');
 if p_quantity>(v_item.quantity-v_already_returned) then raise exception 'Returned quantity exceeds remaining sale quantity'; end if;
 v_amount:=p_quantity*v_item.selling_price_snapshot; v_number:='RET-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||lpad(nextval('public.return_seq')::text,5,'0');
 insert into public.returns(id,return_number,return_type,sale_id,store_id,status,resolution,reason,refund_amount,created_by,approved_by,completed_at)
 values(v_id,v_number,'customer',p_sale_id,v_sale.store_id,'completed',p_resolution,p_reason,v_amount,v_actor,v_actor,now());
 insert into public.return_items(return_id,sale_item_id,product_id,variant_id,quantity,condition,amount) values(v_id,v_item.id,v_item.product_id,v_item.variant_id,p_quantity,p_condition,v_amount);
 if p_condition='sellable' then
  if v_item.variant_id is not null then
   insert into public.product_variant_inventory(store_id,variant_id) values(v_sale.store_id,v_item.variant_id) on conflict do nothing;
   select quantity_on_hand into v_before from public.product_variant_inventory where store_id=v_sale.store_id and variant_id=v_item.variant_id for update; v_after:=v_before+p_quantity;
   update public.product_variant_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_sale.store_id and variant_id=v_item.variant_id; perform public.sync_product_inventory(v_sale.store_id,v_item.product_id);
  else
   select quantity_on_hand into v_before from public.store_inventory where store_id=v_sale.store_id and product_id=v_item.product_id for update; v_after:=v_before+p_quantity;
   update public.store_inventory set quantity_on_hand=v_after,updated_at=now() where store_id=v_sale.store_id and product_id=v_item.product_id;
  end if;
  insert into public.stock_movements(store_id,product_id,variant_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,reason,created_by,approved_by)
  values(v_sale.store_id,v_item.product_id,v_item.variant_id,'customer_return',p_quantity,v_before,v_after,'return',v_id,p_reason,v_actor,v_actor);
 else
  if v_item.variant_id is not null then
   insert into public.product_variant_inventory(store_id,variant_id) values(v_sale.store_id,v_item.variant_id) on conflict do nothing;
   update public.product_variant_inventory set quantity_damaged=quantity_damaged+p_quantity,updated_at=now() where store_id=v_sale.store_id and variant_id=v_item.variant_id;
   perform public.sync_product_inventory(v_sale.store_id,v_item.product_id);
  else
   insert into public.store_inventory(store_id,product_id) values(v_sale.store_id,v_item.product_id) on conflict do nothing;
   update public.store_inventory set quantity_damaged=quantity_damaged+p_quantity,updated_at=now() where store_id=v_sale.store_id and product_id=v_item.product_id;
  end if;
 end if;
 update public.sales set status='partially_refunded' where id=p_sale_id and status='completed';
 return jsonb_build_object('id',v_id,'return_number',v_number,'refund_amount',v_amount,'status','completed');
end $$;

grant execute on function public.complete_sale(uuid,uuid,text,jsonb,jsonb,numeric,text) to authenticated;
grant execute on function public.void_sale(uuid,text) to authenticated;
grant execute on function public.create_customer_return_v2(uuid,uuid,numeric,text,text,text) to authenticated;

revoke select on public.product_variant_inventory from authenticated;
grant select (store_id,variant_id,quantity_on_hand,quantity_reserved,quantity_damaged,quantity_in_transit,updated_at) on public.product_variant_inventory to authenticated;

notify pgrst,'reload schema';
commit;

select to_regclass('public.product_variant_inventory') is not null as variant_inventory_ready,
       exists(select 1 from information_schema.columns where table_schema='public' and table_name='stock_transfer_items' and column_name='variant_id') as transfer_variant_ready,
       exists(select 1 from information_schema.columns where table_schema='public' and table_name='purchase_order_items' and column_name='variant_id') as purchase_variant_ready;
