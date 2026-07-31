# Checklist Deployment Indotek Sukses v2.1.0

## Database lama

1. Backup Supabase.
2. Jalankan `supabase/migrations/202608010004_operational_ux.sql`.
3. Pastikan query selesai tanpa error.

## Source dan Vercel

4. Ganti source repository dengan versi v2.1.0.
5. Pastikan environment variables Supabase masih terpasang.
6. Pastikan `NEXT_PUBLIC_DEMO_MODE=false`.
7. Push ke branch yang dipakai Vercel.
8. Pastikan `npm install` memasang `@zxing/browser`.
9. Pastikan build Vercel selesai.
10. Logout, login kembali, dan hard refresh.

## Uji operasional

11. Tambah dan edit kategori.
12. Catat stok masuk sebanyak 1, lalu pastikan aktivitas langsung muncul.
13. Ralat pergerakan uji dan periksa saldo kembali.
14. Edit saldo stok dari tabel inventori.
15. Buka satu shift toko dan login dengan kasir kedua untuk memastikan shift yang sama dapat dipakai.
16. Scan barcode melalui kamera HTTPS dan scanner eksternal bila tersedia.
17. Lakukan transaksi tunai, periksa kembalian dan stok.
18. Buka invoice dari menu Transaksi.
19. Cetak/simpan PDF dan pastikan hanya invoice yang tercetak.
20. Buka dashboard, laporan, produk, stok, kasir, dan profil dari HP.
21. Tambahkan URL gambar toko dan pilih avatar pengguna.
