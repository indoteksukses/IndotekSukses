# Deployment Indotek Sukses v2.8.0

## 1. Persiapan

- Backup repository dan database Supabase.
- Pastikan deployment memakai Node.js 24 sesuai `package.json`.
- Pastikan instalasi saat ini minimal v2.7.2 dan migration stok varian sudah terpasang.

## 2. Ganti source

Ganti source aplikasi dengan isi paket v2.8.0. Pertahankan `.env.local` atau environment variables pada platform deployment. Jangan menyalin file environment dari paket contoh ke produksi.

## 3. Instalasi dan verifikasi lokal/CI

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Jangan melanjutkan deployment apabila salah satu pemeriksaan gagal.

## 4. Deploy

Commit dan push source ke repository deployment. Tunggu deployment berstatus berhasil, lalu buka:

```text
https://DOMAIN-ANDA/api/version
```

Respons harus memuat nilai berikut:

```json
{
  "app": "Indotek Sukses",
  "version": "2.8.0",
  "catalog_pagination": true,
  "database_page_size": 1000,
  "ui_performance_patch": true,
  "dashboard_lightweight_queries": true
}
```

Urutan properti JSON dapat berbeda.

## 5. Uji cepat setelah deployment

1. Login sebagai owner/admin dan satu akun dengan akses cabang terbatas.
2. Pindah antarmenu dan pastikan tidak terjadi reload penuh.
3. Pilih satu cabang lalu periksa Dashboard, POS, Stok Semua Toko, dan Laporan.
4. Cari produk, SKU, barcode, serta varian pada katalog besar.
5. Scan barcode produk dan barcode varian di POS.
6. Uji pagination Stok Semua Toko dan Master Produk.
7. Selesaikan satu transaksi uji dan buka/cetak invoice.
8. Uji tampilan desktop serta HP.

## Migration

Tidak ada migration SQL baru. Migration berikut tetap harus sudah terpasang:

- `202608040012_product_variants.sql`
- `202608040013_variant_stock_per_branch.sql`
