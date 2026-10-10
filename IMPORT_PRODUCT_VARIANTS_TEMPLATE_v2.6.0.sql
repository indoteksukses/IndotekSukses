-- Contoh menambahkan varian melalui SQL setelah migration v2.6.0 dijalankan.
-- Ganti SKU-PRODUK dengan SKU produk induk yang ada.

with target as (
  select id from public.products where sku='SKU-PRODUK'
), source(name,sku,barcode,cost_price,selling_price,is_active,sort_order) as (
  values
    ('4 inch','SKU-PRODUK-4IN',null,150000,195000,true,0),
    ('5 inch','SKU-PRODUK-5IN',null,185000,235000,true,1)
)
insert into public.product_variants(product_id,name,sku,barcode,cost_price,selling_price,is_active,sort_order)
select target.id,source.name,source.sku,source.barcode,source.cost_price,source.selling_price,source.is_active,source.sort_order
from target cross join source;

-- Periksa hasil:
select p.sku,p.name,pv.name as varian,pv.sku as sku_varian,pv.cost_price,pv.selling_price,pv.is_active
from public.product_variants pv join public.products p on p.id=pv.product_id
where p.sku='SKU-PRODUK'
order by pv.sort_order;
