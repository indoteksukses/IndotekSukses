-- Indotek Sukses v2.3.0
-- Performance support for interactive dashboard, stock activity, and period reports.
-- Safe for an existing v2.2 database. No user data is deleted.

begin;

create index if not exists sales_store_completed_v23_idx
  on public.sales(store_id, completed_at desc)
  where status in ('completed','partially_refunded');

create index if not exists sale_items_sale_v23_idx
  on public.sale_items(sale_id, product_id);

create index if not exists returns_sale_created_v23_idx
  on public.returns(sale_id, created_at desc)
  where status in ('approved','completed');

create index if not exists return_items_return_v23_idx
  on public.return_items(return_id, sale_item_id);

create index if not exists stock_movements_store_created_v23_idx
  on public.stock_movements(store_id, created_at desc);

create index if not exists stock_movements_product_created_v23_idx
  on public.stock_movements(product_id, created_at desc);

commit;
