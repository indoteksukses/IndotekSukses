-- Verify category and code visual storage after installing v2.5.2.
select
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
order by p.updated_at desc, p.name
limit 100;

select
  count(*) as total_products,
  count(*) filter (where p.category_id is null) as category_missing,
  count(*) filter (where nullif(btrim(p.brand),'') is null) as brand_missing,
  count(*) filter (where p.image_url is not null) as using_image_url,
  count(*) filter (where p.visual_id is not null) as using_code_visual
from public.products p;
