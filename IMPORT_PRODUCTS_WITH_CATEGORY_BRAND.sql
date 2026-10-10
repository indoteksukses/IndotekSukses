-- TEMPLATE IMPORT PRODUK INDOTEK SUKSES v2.5.0
-- Jalankan migration 202608040010_professional_accounts_visual_import.sql terlebih dahulu.
-- Setiap produk WAJIB memiliki category dan brand.
-- Gunakan "Tanpa Merek" apabila merek belum diketahui.

select public.import_product_catalog($products$
[
  {
    "sku": "BOR-MAK-001",
    "name": "Mesin Bor Tangan M0600B 400 W",
    "category": "Mesin Bor",
    "brand": "Makita",
    "unit": "pcs",
    "cost_price": 0,
    "selling_price": 0,
    "minimum_stock": 1,
    "barcode": "",
    "description": "",
    "visual_name": "Bor Tangan",
    "image_url": "",
    "is_active": false
  },
  {
    "sku": "GRD-MOD-001",
    "name": "Mesin Gerinda Tangan M2300B",
    "category": "Mesin Gerinda & Poles",
    "brand": "Modern",
    "unit": "pcs",
    "cost_price": 0,
    "selling_price": 0,
    "minimum_stock": 1,
    "visual_name": "Gerinda",
    "is_active": false
  }
]
$products$::jsonb);

-- Pemeriksaan. Nilai kosong harus 0.
select
  count(*) filter(where category_id is null) as kategori_kosong,
  count(*) filter(where nullif(btrim(brand),'') is null) as merek_kosong,
  count(*) as total_produk
from public.products;
