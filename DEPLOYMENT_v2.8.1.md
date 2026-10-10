# Deployment v2.8.1

1. Gunakan Node.js 24 sesuai `package.json`.
2. Salin variabel lingkungan dari deployment v2.8.0; tidak ada variabel baru.
3. Jalankan `npm install`, `npm run typecheck`, `npm run lint`, dan `npm run build`.
4. Deploy hasil build seperti biasa.
5. Setelah deploy, buka halaman apa pun, tekan avatar di kanan atas, lalu pastikan backdrop menutup seluruh layar dan dialog tidak terpotong.
6. Uji tombol `Escape`, klik backdrop, navigasi `Tab`, pilihan avatar tanpa menyimpan, dan penyimpanan avatar.
7. Pada tampilan ponsel, uji edit produk, edit stok, dan permintaan transfer dari kartu daftar.
8. Uji menu pemilih toko melalui klik luar, `Escape`, pemilihan cabang, dan daftar cabang panjang.

Tidak ada migration SQL untuk versi ini.
