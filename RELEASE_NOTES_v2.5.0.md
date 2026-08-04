# Indotek Sukses v2.5.0

## Perbaikan utama

- Pilihan sumber visual produk sekarang eksplisit: URL gambar, visual kode, atau visual umum. Memilih visual kode otomatis membuat URL lama tidak dipakai.
- Gambar URL yang gagal dimuat otomatis jatuh kembali ke visual kode/umum.
- Produk baru dan hasil edit wajib memiliki kategori serta merek.
- Migration memperbaiki kategori dan merek 146 produk MESIN & ALAT LISTRIK berdasarkan SKU.
- Disediakan fungsi SQL `import_product_catalog(jsonb)` agar import berikutnya selalu mengisi `category_id` dan `brand`.
- Login mendukung username maupun email.
- Owner dapat melihat username dan email, mengganti username/email, serta mereset password karyawan.
- Password lama tidak ditampilkan karena Supabase menyimpannya dalam bentuk hash yang tidak dapat dibalik.
- Karyawan dapat dihapus secara aman: login dinonaktifkan dan akun hilang dari daftar aktif, sementara riwayat transaksi tetap dipertahankan.
- Session akun yang dinonaktifkan otomatis dikeluarkan.
