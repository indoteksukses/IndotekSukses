# Indotek Sukses v2.4.2

Versi perbaikan manajemen pembelian dan produk per cabang.

## Upgrade dari v2.4.1

1. Backup database Supabase.
2. Jalankan `supabase/migrations/202608030009_purchase_listing_product_branches.sql` melalui SQL Editor.
3. Ganti source lama dengan source v2.4.2.
4. Commit dan push ke GitHub.
5. Tunggu Vercel berstatus **Ready**.
6. Logout, login kembali, lalu lakukan hard refresh.

Migration wajib dijalankan sebelum fitur produk per cabang digunakan.
