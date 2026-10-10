# Upgrade dari versi awal

1. Backup database Supabase.
2. Jalankan migration secara berurutan sesuai yang belum pernah dijalankan:
   - `202607310002_multi_store_ready.sql`
   - `202608010004_operational_ux.sql`
3. Migration `202607310003_fix_roles_and_product_permissions.sql` hanya diperlukan untuk instalasi lama yang masih mengalami masalah role/permission produk. Ganti email owner di dalamnya sebelum menjalankan.
4. Ganti source repository dengan versi v2.1.0.
5. Pastikan environment variables Vercel benar dan `NEXT_PUBLIC_DEMO_MODE=false`.
6. Deploy ulang, logout, login, dan hard refresh.
