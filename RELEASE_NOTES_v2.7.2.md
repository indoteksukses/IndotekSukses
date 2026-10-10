# Indotek Sukses v2.7.2

## Perbaikan katalog besar

Versi ini memperbaiki batas 1.000 baris dari Supabase Data API yang sebelumnya menyebabkan sebagian produk, varian, stok varian, dan relasi cabang tidak terlihat di website.

### Perubahan

- Menambahkan pengambil data berhalaman internal dengan ukuran 1.000 baris per permintaan sampai seluruh data selesai dimuat.
- Produk tidak lagi berhenti pada baris ke-1.000.
- Seluruh varian aktif yang belum diarsipkan ikut dimuat, termasuk lebih dari 3.000 varian.
- Seluruh stok varian per cabang dimuat bertahap.
- Relasi produk ke cabang penjualan dimuat bertahap.
- Snapshot stok jaringan dan Stok Semua Toko dimuat bertahap.
- Master Produk sekarang dapat menampilkan produk aktif dan nonaktif.
- Master Produk memakai pagination tampilan 25, 50, atau 100 produk per halaman.
- Pencarian Master Produk mencakup seluruh produk yang telah dimuat, termasuk nama varian, SKU varian, barcode, dan merek.
- Ekspor CSV tetap mengekspor seluruh hasil filter, bukan hanya halaman yang sedang terlihat.
- Ditambahkan endpoint `/api/version` untuk memeriksa versi deployment.

## Dampak halaman

Perbaikan pengambilan data digunakan oleh:

- Master Produk
- POS/Kasir
- Stok Masuk/Keluar
- Stok Semua Toko
- Transfer Antar Toko
- Pembelian
- Stok Opname
- Laporan persediaan
- Pemilih produk dan varian

## Database

Tidak ada migration SQL baru untuk v2.7.2.
