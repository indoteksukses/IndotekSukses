# Deployment Indotek Sukses v2.7.1

## Database

Tidak ada migration baru untuk patch v2.7.1.

Migration `202608040013_variant_stock_per_branch.sql` tetap wajib apabila belum pernah dijalankan saat upgrade ke v2.7.0.

## Source

1. Backup source/repository saat ini.
2. Ekstrak `indotek-sukses-v2.7.1-ready.zip`.
3. Ganti seluruh source lama, tetapi jangan menghapus folder `.git`.
4. Commit yang disarankan: `Polish product variants and mobile catalog v2.7.1`.
5. Push ke GitHub.
6. Tunggu Vercel berstatus **Ready**.
7. Logout, tutup tab lama, login kembali, lalu lakukan hard refresh.

## Pengujian

- Buka Tambah/Edit Produk pada tablet dan HP.
- Tambah minimal tiga varian dan pastikan semua input tetap berada di dalam kartu.
- Pastikan tombol hapus tidak menutupi input.
- Cari Visual Code dari form produk.
- Cari Visual Code dari Galeri Visual Produk.
- Buka Master Produk pada HP dan perluas daftar varian.
- Periksa tiga tombol Kategori, Visual, dan Tambah di tablet serta HP.
