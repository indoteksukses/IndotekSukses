-- Indotek Sukses v2.2.0
-- Responsive operations, batch stock documents, safe code-based product visuals,
-- company logo URL, and invoice-aware customer returns.
-- Safe to run after migrations 001-004. Existing business data is preserved.

begin;

alter table public.system_settings
  add column if not exists logo_url text;

-- Branding is intentionally public so the login page can display the configured
-- company name and logo before a user signs in. No secret data is stored here.
drop policy if exists system_settings_read on public.system_settings;
create policy system_settings_read on public.system_settings
  for select to anon, authenticated using (true);
grant select on public.system_settings to anon, authenticated;

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
