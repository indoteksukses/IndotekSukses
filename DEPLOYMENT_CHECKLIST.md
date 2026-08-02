# Deployment Checklist v2.3.0

1. Backup database Supabase.
2. Jalankan `supabase/migrations/202608020006_v23_reports_ui_support.sql` pada SQL Editor.
3. Salin seluruh source v2.3.0 ke repository GitHub Desktop.
4. Jangan unggah `.env.local`, `node_modules`, `.next`, atau `.vercel`.
5. Commit dan Push origin.
6. Pastikan Vercel Environment Variables tetap tersedia.
7. Tunggu deployment berstatus Ready.
8. Logout, login kembali, lalu hard refresh.
9. Uji Stok Masuk/Keluar dengan beberapa produk.
10. Uji Transfer, Pembelian, Opname, dan Retur.
11. Sentuh grafik dashboard dan pastikan tooltip muncul.
12. Buka Laporan → Cetak/PDF dan uji setiap checklist.
