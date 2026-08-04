-- Verifikasi kategori, merek, gambar, dan visual produk langsung dari database.
select
  p.id,
  p.sku,
  p.name,
  p.category_id,
  c.name as category_name,
  p.brand,
  p.image_url,
  p.visual_id,
  pv.name as visual_name,
  p.updated_at
from public.products p
left join public.categories c on c.id = p.category_id
left join public.product_visuals pv on pv.id = p.visual_id
order by p.updated_at desc, p.name;
