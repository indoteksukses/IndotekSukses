# Indotek Sukses v2.4.1

Versi perbaikan untuk masalah PO tidak tersimpan.

## Urutan pemasangan

1. Backup database Supabase.
2. Jalankan `supabase/migrations/202608030008_fix_purchase_order_save.sql` di SQL Editor.
3. Ganti source repository dengan isi folder ini.
4. Commit dan push melalui GitHub Desktop.
5. Tunggu Vercel berstatus **Ready**.
6. Logout, login kembali, lalu hard refresh.

Migration v2.4.1 wajib dijalankan sebelum mengetes pembuatan PO.
