# Deployment Indotek Sukses v2.7.0

## 1. Backup Supabase
Backup database sebelum menjalankan migration.

## 2. Jalankan migration
Pastikan migration `202608040012_product_variants.sql` sudah pernah dijalankan, lalu jalankan seluruh isi:

`202608040013_variant_stock_per_branch.sql`

Jalankan sebagai satu query penuh. Migration ini tidak menghapus produk, invoice, stok, pengguna, atau cabang.

### Pemindahan stok lama
Untuk produk yang sudah mempunyai varian, stok produk lama pada setiap cabang dipindahkan ke varian aktif pertama. Tujuannya agar jumlah stok tidak hilang. Setelah upgrade, saldo tersebut dapat dibagi ke varian lain melalui menu **Stok Semua Toko**, **Stok Masuk/Keluar**, atau transfer.

## 3. Deploy source
Ganti seluruh source lama dengan source v2.7.0 tanpa menghapus folder `.git`.

Commit yang disarankan:

`Add branch-level variant inventory v2.7.0`

Push ke GitHub dan tunggu Vercel berstatus **Ready**.

## 4. Muat ulang aplikasi
Logout, tutup tab lama, login kembali, lalu tekan `Ctrl + Shift + R`.

## 5. Uji
1. Buka produk bervarian dan pastikan tombol hapus tetap berada di dalam kartu.
2. Isi stok berbeda untuk dua varian pada dua cabang.
3. Buat stok masuk dan stok keluar dengan varian.
4. Buat transfer dengan varian, kirim, lalu terima.
5. Buat PO dengan varian dan alokasi beberapa cabang, lalu terima barang.
6. Buka kasir dan pastikan stok serta harga mengikuti varian.
7. Jalankan `VERIFY_VARIANT_STOCK_v2.7.0.sql`.
