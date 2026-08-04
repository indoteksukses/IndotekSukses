-- Verifikasi fitur varian Indotek Sukses v2.6.0
select
  to_regclass('public.product_variants') is not null as tabel_varian,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='sale_items' and column_name='variant_id') as invoice_menyimpan_varian,
  exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='complete_sale') as checkout_tersedia,
  exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='create_customer_return_v2') as retur_varian_tersedia;

select
  p.sku as sku_produk,
  p.name as produk,
  count(pv.id) as jumlah_varian,
  count(pv.id) filter (where pv.is_active) as varian_aktif,
  min(pv.selling_price) filter (where pv.is_active) as harga_jual_terendah,
  max(pv.selling_price) filter (where pv.is_active) as harga_jual_tertinggi
from public.products p
left join public.product_variants pv on pv.product_id=p.id
group by p.id,p.sku,p.name
having count(pv.id)>0
order by p.name;

select pv.id,p.sku as sku_produk,p.name as produk,pv.name as varian,pv.sku as sku_varian,pv.barcode,
       pv.cost_price as harga_modal,pv.selling_price as harga_jual,pv.is_active
from public.product_variants pv
join public.products p on p.id=pv.product_id
order by p.name,pv.sort_order,pv.name;
