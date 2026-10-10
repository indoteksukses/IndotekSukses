-- VERIFIKASI INDOTEK SUKSES v2.5.0

select
  count(*) filter(where category_id is null) as kategori_kosong,
  count(*) filter(where nullif(btrim(brand),'') is null) as merek_kosong,
  count(*) as total_produk
from public.products;

select sku,name,c.name as kategori,p.brand,p.visual_id,p.image_url
from public.products p
left join public.categories c on c.id=p.category_id
order by p.name
limit 50;

select
  count(*) filter(where nullif(btrim(username),'') is null) as username_kosong,
  count(*) filter(where deleted_at is null) as akun_aktif_di_daftar,
  count(*) filter(where deleted_at is not null) as akun_terhapus
from public.profiles;
