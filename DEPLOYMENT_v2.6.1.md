# Deployment v2.6.1

1. Pastikan migration `202608040012_product_variants.sql` sudah dijalankan di Supabase.
2. Ganti seluruh source lama dengan paket v2.6.1. Jangan menghapus folder `.git`.
3. Commit dan push ke GitHub.
4. Tunggu Vercel berstatus Ready.
5. Logout, tutup tab lama, login kembali, lalu lakukan hard refresh.
6. Buka Edit Produk. Blok `Harga dan varian produk v2.6.1` harus terlihat setelah Kategori dan Merek.
7. Pilih `Memiliki varian`, isi varian, simpan, lalu buka kembali produk untuk memastikan data tetap ada.
