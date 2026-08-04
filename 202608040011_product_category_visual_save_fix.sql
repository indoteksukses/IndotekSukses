-- Indotek Sukses v2.5.2
-- Atomic product master save for category, brand, image and code visual.
-- Run after 202608040010_professional_accounts_visual_import.sql.

begin;

create or replace function public.save_product_master_v2(
  p_product_id uuid,
  p_actor_id uuid,
  p_payload jsonb,
  p_sales_store_ids uuid[] default '{}'::uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_product_id, gen_random_uuid());
  v_category_id uuid;
  v_visual_id uuid;
  v_scope text;
  v_image_url text;
  v_result jsonb;
  v_expected_stores integer;
  v_valid_stores integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_actor_id
      and role in ('owner','admin')
      and is_active = true
  ) then
    raise exception 'Akun tidak memiliki izin menyimpan produk';
  end if;

  if coalesce(btrim(p_payload->>'name'),'') = '' then raise exception 'Nama produk wajib diisi'; end if;
  if coalesce(btrim(p_payload->>'sku'),'') = '' then raise exception 'SKU wajib diisi'; end if;
  if coalesce(btrim(p_payload->>'brand'),'') = '' then raise exception 'Merek wajib diisi'; end if;

  begin
    v_category_id := nullif(btrim(p_payload->>'category_id'),'')::uuid;
  exception when others then
    raise exception 'ID kategori tidak valid';
  end;
  if v_category_id is null or not exists (
    select 1 from public.categories where id = v_category_id and is_active = true
  ) then
    raise exception 'Kategori tidak ditemukan atau sudah nonaktif';
  end if;

  begin
    v_visual_id := nullif(btrim(p_payload->>'visual_id'),'')::uuid;
  exception when others then
    raise exception 'ID visual tidak valid';
  end;
  if v_visual_id is not null and not exists (
    select 1 from public.product_visuals where id = v_visual_id and is_active = true
  ) then
    raise exception 'Visual produk tidak ditemukan atau sudah nonaktif';
  end if;

  v_scope := case when p_payload->>'sales_scope' = 'selected' then 'selected' else 'all' end;
  v_image_url := nullif(btrim(p_payload->>'image_url'),'');

  if v_scope = 'selected' then
    v_expected_stores := coalesce(cardinality(p_sales_store_ids), 0);
    if v_expected_stores = 0 then raise exception 'Pilih minimal satu cabang penjualan'; end if;
    select count(*) into v_valid_stores
    from public.stores
    where id = any(p_sales_store_ids) and is_active = true;
    if v_valid_stores <> v_expected_stores then
      raise exception 'Salah satu cabang penjualan tidak valid atau nonaktif';
    end if;
  end if;

  if p_product_id is null then
    insert into public.products(
      id, sku, barcode, name, category_id, brand, unit,
      cost_price, selling_price, minimum_stock, image_url, visual_id,
      is_active, sales_scope, created_by, updated_at
    ) values (
      v_id,
      upper(btrim(p_payload->>'sku')),
      nullif(btrim(p_payload->>'barcode'),''),
      btrim(p_payload->>'name'),
      v_category_id,
      btrim(p_payload->>'brand'),
      coalesce(nullif(btrim(p_payload->>'unit'),''),'pcs'),
      greatest(coalesce(nullif(btrim(p_payload->>'cost_price'),'')::numeric,0),0),
      greatest(coalesce(nullif(btrim(p_payload->>'selling_price'),'')::numeric,0),0),
      greatest(coalesce(nullif(btrim(p_payload->>'minimum_stock'),'')::numeric,0),0),
      v_image_url,
      v_visual_id,
      coalesce((p_payload->>'is_active')::boolean,true),
      v_scope,
      p_actor_id,
      now()
    );

    insert into public.store_inventory(store_id, product_id, quantity_on_hand, quantity_reserved)
    select id, v_id, 0, 0 from public.stores
    on conflict(store_id, product_id) do nothing;
  else
    update public.products
    set sku = upper(btrim(p_payload->>'sku')),
        barcode = nullif(btrim(p_payload->>'barcode'),''),
        name = btrim(p_payload->>'name'),
        category_id = v_category_id,
        brand = btrim(p_payload->>'brand'),
        unit = coalesce(nullif(btrim(p_payload->>'unit'),''),'pcs'),
        cost_price = greatest(coalesce(nullif(btrim(p_payload->>'cost_price'),'')::numeric,0),0),
        selling_price = greatest(coalesce(nullif(btrim(p_payload->>'selling_price'),'')::numeric,0),0),
        minimum_stock = greatest(coalesce(nullif(btrim(p_payload->>'minimum_stock'),'')::numeric,0),0),
        image_url = v_image_url,
        visual_id = v_visual_id,
        is_active = coalesce((p_payload->>'is_active')::boolean,true),
        sales_scope = v_scope,
        updated_at = now()
    where id = p_product_id;

    if not found then raise exception 'Produk tidak ditemukan'; end if;
  end if;

  delete from public.product_store_sales where product_id = v_id;
  if v_scope = 'selected' then
    insert into public.product_store_sales(product_id, store_id)
    select v_id, store_id
    from unnest(p_sales_store_ids) as store_id
    on conflict(product_id, store_id) do nothing;
  end if;

  select jsonb_build_object(
    'id', p.id,
    'sku', p.sku,
    'name', p.name,
    'category_id', p.category_id,
    'category_name', c.name,
    'brand', p.brand,
    'image_url', p.image_url,
    'visual_id', p.visual_id,
    'visual_name', pv.name,
    'is_active', p.is_active,
    'sales_scope', p.sales_scope,
    'sales_store_ids', coalesce((
      select jsonb_agg(pss.store_id order by pss.store_id)
      from public.product_store_sales pss where pss.product_id = p.id
    ), '[]'::jsonb)
  ) into v_result
  from public.products p
  join public.categories c on c.id = p.category_id
  left join public.product_visuals pv on pv.id = p.visual_id
  where p.id = v_id;

  if v_result is null then raise exception 'Produk gagal diverifikasi setelah disimpan'; end if;
  return v_result;
end;
$$;

revoke all on function public.save_product_master_v2(uuid,uuid,jsonb,uuid[]) from public, anon, authenticated;
grant execute on function public.save_product_master_v2(uuid,uuid,jsonb,uuid[]) to service_role;

notify pgrst, 'reload schema';
commit;

-- Verification: the function must exist and both foreign-key columns must be present.
select
  to_regprocedure('public.save_product_master_v2(uuid,uuid,jsonb,uuid[])') is not null as fungsi_simpan_tersedia,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='category_id') as kolom_kategori_tersedia,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='visual_id') as kolom_visual_tersedia;
