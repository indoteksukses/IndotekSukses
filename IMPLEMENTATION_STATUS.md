Indotek Sukses v2.6.1

# Implementation Status v2.5.2

Selesai:

- Penyimpanan kategori produk secara atomik.
- Penyimpanan merek produk.
- Penyimpanan URL gambar atau visual kode secara eksklusif.
- Verifikasi hasil database sebelum UI menyatakan berhasil.
- Pembacaan kategori dan visual melalui ID langsung.
- Revalidasi cache dan reload penuh setelah simpan.

Migration wajib: `202608040011_product_category_visual_save_fix.sql`.
