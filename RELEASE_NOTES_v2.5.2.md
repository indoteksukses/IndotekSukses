# Indotek Sukses v2.5.2

## Perbaikan utama

- Penyimpanan produk dipindahkan ke fungsi database atomik `save_product_master_v2`.
- `category_id`, `brand`, `image_url`, dan `visual_id` diverifikasi setelah disimpan.
- URL gambar dan visual kode dibuat saling eksklusif sehingga URL lama tidak lagi menimpa visual pilihan.
- Form kategori dan merek menggunakan state terkontrol, bukan hanya `defaultValue`.
- Setelah berhasil, halaman Master Produk dimuat ulang penuh agar tidak menampilkan data cache lama.
- Pembacaan kategori dan visual tidak lagi bergantung pada nested relation PostgREST; data dibaca melalui ID dan digabungkan secara eksplisit.
- Cache halaman produk, inventori, dashboard, dan kasir direvalidasi setelah produk disimpan.

## Database

Migration wajib:

`202608040011_product_category_visual_save_fix.sql`

Migration tidak menghapus produk, stok, invoice, pembelian, transfer, atau data pengguna.
