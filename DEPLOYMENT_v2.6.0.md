# Deployment v2.6.0

1. Backup database Supabase.
2. Jalankan `202608040012_product_variants.sql` melalui Supabase SQL Editor.
3. Pastikan hasil akhir menunjukkan `product_variants_ready = true` dan `sale_variant_ready = true`.
4. Deploy source v2.6.0 ke Vercel.
5. Logout, login kembali, lalu lakukan hard refresh.
6. Edit satu produk, pilih **Memiliki varian**, tambahkan minimal satu varian, lalu simpan.
7. Buka kasir dan pastikan popup pemilihan varian muncul.

Migration tidak menghapus produk, stok, invoice, transaksi, kategori, merek, visual, atau akun.
