-- Verifikasi katalog besar Indotek Sukses v2.7.2
select
  (select count(*) from public.products) as total_produk,
  (select count(*) from public.products where is_active) as produk_aktif,
  (select count(*) from public.products where not is_active) as produk_nonaktif,
  (select count(*) from public.product_variants where archived_at is null) as total_varian,
  (select count(*) from public.product_variants where archived_at is null and is_active) as varian_aktif,
  (select count(*) from public.product_variant_inventory) as baris_stok_varian,
  (select count(*) from public.store_inventory) as baris_stok_produk;

select
  c.name as kategori,
  count(distinct p.id) as jumlah_produk,
  count(pv.id) filter (where pv.archived_at is null) as jumlah_varian
from public.products p
left join public.categories c on c.id = p.category_id
left join public.product_variants pv on pv.product_id = p.id
group by c.id, c.name
order by jumlah_produk desc, c.name;
