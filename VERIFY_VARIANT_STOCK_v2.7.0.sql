-- Indotek Sukses v2.7.0 — pemeriksaan stok varian per cabang

select
  to_regclass('public.product_variant_inventory') is not null as tabel_stok_varian,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='stock_movements' and column_name='variant_id') as pergerakan_varian,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='stock_transfer_items' and column_name='variant_id') as transfer_varian,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='purchase_order_items' and column_name='variant_id') as pembelian_varian,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='stocktake_items' and column_name='variant_id') as opname_varian,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='stock_transfer_requests' and column_name='variant_id') as permintaan_transfer_varian;

-- Harus menghasilkan 0.
select count(*) as baris_stok_varian_yang_belum_dibuat
from public.stores s
cross join public.product_variants pv
left join public.product_variant_inventory pvi on pvi.store_id=s.id and pvi.variant_id=pv.id
where s.is_active=true and pv.archived_at is null and pvi.variant_id is null;

-- Harus menghasilkan 0. Membandingkan stok agregat produk dengan jumlah seluruh variannya.
with variant_totals as (
  select pvi.store_id,pv.product_id,
         sum(pvi.quantity_on_hand) quantity_on_hand,
         sum(pvi.quantity_reserved) quantity_reserved,
         sum(pvi.quantity_damaged) quantity_damaged,
         sum(pvi.quantity_in_transit) quantity_in_transit
  from public.product_variant_inventory pvi
  join public.product_variants pv on pv.id=pvi.variant_id
  group by pvi.store_id,pv.product_id
)
select count(*) as agregat_stok_tidak_sinkron
from variant_totals v
join public.store_inventory si on si.store_id=v.store_id and si.product_id=v.product_id
where si.quantity_on_hand<>v.quantity_on_hand
   or si.quantity_reserved<>v.quantity_reserved
   or si.quantity_damaged<>v.quantity_damaged
   or si.quantity_in_transit<>v.quantity_in_transit;

-- Ringkasan stok per varian dan cabang.
select p.sku as sku_produk,p.name as produk,pv.name as varian,
       coalesce(pv.sku,'—') as sku_varian,s.code as cabang,
       pvi.quantity_on_hand as stok_fisik,
       greatest(pvi.quantity_on_hand-pvi.quantity_reserved,0) as stok_tersedia,
       pvi.quantity_in_transit as dalam_perjalanan
from public.product_variant_inventory pvi
join public.product_variants pv on pv.id=pvi.variant_id
join public.products p on p.id=pv.product_id
join public.stores s on s.id=pvi.store_id
where pv.archived_at is null
order by p.name,pv.sort_order,pv.name,s.name;
