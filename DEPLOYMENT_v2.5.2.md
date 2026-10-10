# Deployment v2.5.2

1. Backup database Supabase.
2. Jalankan seluruh isi `202608040011_product_category_visual_save_fix.sql` di SQL Editor.
3. Pastikan hasil verifikasi menunjukkan `fungsi_simpan_tersedia = true`.
4. Deploy source v2.5.2 ke Vercel.
5. Logout, login kembali, lalu lakukan hard refresh.
6. Edit satu produk, pilih kategori dan Visual kode, lalu simpan.
7. Jalankan `VERIFY_PRODUCT_CATEGORY_VISUAL_v2.5.2.sql` untuk melihat nilai yang tersimpan langsung di database.

Migration v2.5.0 harus sudah dijalankan terlebih dahulu.
