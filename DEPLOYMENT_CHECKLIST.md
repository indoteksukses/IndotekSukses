# Checklist Deployment Produksi

1. Jalankan `supabase/FRESH_INSTALL.sql` untuk project Supabase baru, atau migration `202607310002_multi_store_ready.sql` untuk database versi lama.
2. Pasang `NEXT_PUBLIC_SUPABASE_URL`.
3. Pasang `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Pasang `SUPABASE_SECRET_KEY` atau `SUPABASE_SERVICE_ROLE_KEY` sebagai server-only variable.
5. Pastikan `NEXT_PUBLIC_DEMO_MODE=false`.
6. Deploy repository ke Vercel.
7. Buka `/setup` dan buat owner serta toko pertama.
8. Login, lalu tambah cabang melalui **Toko & Cabang**.
9. Tambah produk dan catat stok awal.
10. Buat akun karyawan dan berikan akses cabang.
11. Buka shift, lakukan transaksi uji, lalu pastikan stok berkurang.
12. Batalkan transaksi uji dan pastikan stok kembali.
13. Uji transfer sampai status diterima.
14. Uji laporan dan ekspor CSV.
15. Hapus data uji sebelum operasional sebenarnya.
