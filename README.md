# Indotek Sukses v2.7.1

Patch tampilan profesional untuk Master Produk, editor varian, dan galeri Visual Code.

## Perubahan v2.7.1

- Editor varian menggunakan kartu responsif yang stabil pada desktop, tablet, dan HP.
- Tombol hapus selalu berada di dalam kartu varian dan tidak menutupi input.
- Input varian ditata 4 kolom pada desktop, 2 kolom pada tablet, dan 1 kolom pada HP.
- Master Produk pada HP menggunakan kartu produk khusus dengan informasi yang lebih ringkas dan mudah dibaca.
- Detail varian pada HP menampilkan harga, stok total, status, dan stok per cabang.
- Pencarian Visual Code tersedia pada Galeri Visual Produk dan saat memilih visual di form produk.
- Tombol Kategori, Visual, dan Tambah Produk ditata dalam tiga kolom yang seimbang pada tablet dan HP.
- Ukuran teks, input, label, dan tombol pada form produk diperbesar.

## Upgrade

Versi ini tidak memerlukan migration SQL baru.

Apabila sistem belum pernah memakai v2.7.0, jalankan migration `202608040013_variant_stock_per_branch.sql` sebelum menggunakan stok varian per cabang.

Lihat `DEPLOYMENT_v2.7.1.md` untuk urutan deployment.
