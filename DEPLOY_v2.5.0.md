# Deployment v2.5.0

1. Backup database Supabase.
2. Jalankan `supabase/migrations/202608040010_professional_accounts_visual_import.sql` di SQL Editor.
3. Pastikan hasil verifikasi menunjukkan `category_missing = 0` dan `brand_missing = 0`.
4. Deploy source v2.5.0 ke Vercel.
5. Logout, tutup tab lama, login kembali memakai username atau email.
6. Uji Edit Produk, visual produk, tambah/edit/hapus karyawan, dan reset password.

Untuk import SQL berikutnya gunakan `supabase/IMPORT_PRODUCTS_WITH_CATEGORY_BRAND.sql` sebagai pola.
