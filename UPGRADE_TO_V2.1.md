# Upgrade v2.0.x ke v2.1.0

1. Backup database Supabase.
2. Jalankan `supabase/migrations/202608010004_operational_ux.sql`.
3. Ganti seluruh source repository dengan paket v2.1.0.
4. Push ke GitHub dan tunggu Vercel selesai deploy.
5. Logout dan login kembali.
6. Tekan `Ctrl + Shift + R`.
7. Uji kategori, stok, shift bersama, barcode, dan invoice.

Tidak perlu menjalankan migration 001 atau 002 ulang. Migration 004 mempertahankan data lama.
