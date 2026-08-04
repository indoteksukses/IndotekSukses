# Indotek Sukses v2.5.2

Sistem POS, inventori, pembelian, transfer stok, laporan, dan manajemen multi-cabang.

Versi ini memperbaiki penyimpanan kategori, merek, URL gambar, dan visual kode produk. Penyimpanan produk sekarang dilakukan secara atomik di database dan hasilnya diverifikasi sebelum aplikasi menampilkan pesan berhasil.

## Pemasangan

1. Jalankan `202608040011_product_category_visual_save_fix.sql` di Supabase SQL Editor.
2. Deploy source ke Vercel.
3. Uji Edit Produk dengan memilih kategori dan Visual kode.

Lihat `DEPLOYMENT_v2.5.2.md` dan `RELEASE_NOTES_v2.5.2.md` untuk rincian.
