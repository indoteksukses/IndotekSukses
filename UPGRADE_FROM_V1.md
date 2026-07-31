# Upgrade dari versi awal

1. Backup database Supabase.
2. Jalankan `supabase/migrations/202607310002_multi_store_ready.sql`.
3. Ganti source code repository dengan versi baru.
4. Tambahkan `SUPABASE_SECRET_KEY` atau pertahankan `SUPABASE_SERVICE_ROLE_KEY` lama.
5. Pastikan `NEXT_PUBLIC_DEMO_MODE=false`.
6. Deploy ulang Vercel.
7. Login menggunakan akun owner lama.
8. Buka **Toko & Cabang** untuk mengganti nama toko lama atau menambah cabang.

Jangan membuka `/setup` jika akun owner lama sudah ada. Halaman setup akan mendeteksi bahwa sistem sudah dikonfigurasi dan mengarahkan kembali ke login.
