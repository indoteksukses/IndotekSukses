-- 202608040014_performance_indexes.sql
-- Optimasi Index Database untuk Mempercepat Query Katalog, Stok, dan Laporan POS

-- 1. Index untuk inventaris toko (Pencarian stok cepat per toko)
create index if not exists idx_store_inventory_store_product 
  on public.store_inventory (store_id, product_id);

create index if not exists idx_store_inventory_product 
  on public.store_inventory (product_id);

-- 2. Index untuk varian & stok varian per cabang
create index if not exists idx_product_variants_product_active 
  on public.product_variants (product_id, sort_order) 
  where archived_at is null;

create index if not exists idx_product_variant_inventory_store_variant 
  on public.product_variant_inventory (store_id, variant_id);

-- 3. Index untuk pergerakan stok (Riwayat mutasi & audit)
create index if not exists idx_stock_movements_store_created 
  on public.stock_movements (store_id, created_at desc);

create index if not exists idx_stock_movements_product_created 
  on public.stock_movements (product_id, created_at desc);

-- 4. Index untuk relasi penjualan POS & item penjualan
create index if not exists idx_sales_store_completed 
  on public.sales (store_id, completed_at desc);

create index if not exists idx_sales_status_completed 
  on public.sales (status, completed_at desc);

create index if not exists idx_sale_items_sale_id 
  on public.sale_items (sale_id);

create index if not exists idx_sale_items_product_variant 
  on public.sale_items (product_id, variant_id);

-- 5. Index untuk katalog & filter kategori
create index if not exists idx_products_category_active 
  on public.products (category_id, is_active);

create index if not exists idx_products_visual_id 
  on public.products (visual_id);

create index if not exists idx_product_store_sales_lookup 
  on public.product_store_sales (product_id, store_id);
