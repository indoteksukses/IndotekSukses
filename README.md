# Indotek Sukses v2.7.0

Sistem POS dan inventory multi-cabang dengan stok terpisah untuk setiap varian produk pada setiap cabang.

## Fitur utama v2.7.0

- Setiap varian mempunyai stok fisik, reservasi, stok rusak, dan barang dalam perjalanan sendiri pada setiap cabang.
- Stok Masuk/Keluar, Transfer Antartoko, Permintaan Restok, Pembelian, Kasir, Retur, dan Stok Opname sudah menggunakan varian.
- Stok produk induk tetap dihitung otomatis sebagai ringkasan seluruh varian untuk kompatibilitas dashboard dan laporan.
- Master Produk menampilkan harga serta stok setiap varian secara ringkas.
- Editor varian diperbaiki agar tombol hapus tidak keluar dari kartu pada desktop, tablet, maupun HP.
- Teks pada popup, form, tabel, dan pemilih produk diperbesar.
- Tombol Kelola Kategori, Visual Produk, dan Tambah Produk dibuat ringkas serta sejajar pada HP.

## Urutan upgrade

1. Backup database Supabase.
2. Pastikan migration `202608040012_product_variants.sql` sudah pernah dijalankan.
3. Jalankan `202608040013_variant_stock_per_branch.sql` sebagai satu query penuh.
4. Deploy seluruh source v2.7.0.
5. Tunggu Vercel berstatus **Ready**.
6. Logout, login kembali, lalu lakukan hard refresh.
7. Jalankan `VERIFY_VARIANT_STOCK_v2.7.0.sql`.

Baca `DEPLOYMENT_v2.7.0.md` dan `RELEASE_NOTES_v2.7.0.md` sebelum deployment.
