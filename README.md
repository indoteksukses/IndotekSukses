# Indotek Sukses Inventory & POS v2.3.1

Aplikasi manajemen multi-toko untuk toko mur, baut, perkakas, mesin, dan perlengkapan teknik. Dibangun dengan Next.js, TypeScript, Vercel, Supabase, PostgreSQL RLS, dan transaksi stok atomik.

## Upgrade dari v2.3.0

Versi v2.3.1 hanya mengubah source aplikasi dan **tidak membutuhkan migration database baru**.

1. Ekstrak paket ini.
2. Buka repository melalui GitHub Desktop.
3. Ganti source lama dengan seluruh isi paket v2.3.1. Jangan hapus folder tersembunyi `.git`.
4. Commit dengan pesan `Upgrade Indotek Sukses v2.3.1`.
5. Klik **Push origin**.
6. Tunggu Vercel menjadi **Ready**.
7. Logout, login kembali, lalu lakukan hard refresh.

Jika database masih berada pada versi v2.2.0, jalankan migration `supabase/migrations/202608020006_v23_reports_ui_support.sql` terlebih dahulu.

## Environment Variables Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_APP_NAME=Indotek Sukses
```

Project lama masih dapat menggunakan `SUPABASE_SERVICE_ROLE_KEY` sebagai pengganti `SUPABASE_SECRET_KEY`.

## Fitur dan revisi v2.3.1

- Galeri visual produk dapat diedit dan dihapus oleh admin.
- Visual bawaan dapat disembunyikan dan ditampilkan kembali.
- Preview gambar pada form tambah/edit produk berada di kolom kanan pada desktop dan tablet.
- Tampilan gambar produk pada katalog kasir tablet dan HP lebih konsisten.
- Tooltip grafik muncul di dekat batang tanggal yang disentuh atau diklik.
- Keranjang kasir pada tablet dan HP menggunakan tombol tetap di bawah dengan jumlah item dan total belanja.
- Keranjang dibuka sebagai bottom sheet agar mudah dijangkau.
- Baris produk Transfer dan Pembelian diperbesar.
- Satuan seperti `pcs` tampil di samping jumlah.
- Stok opname memiliki tombol Rincian dengan stok sistem, stok fisik, selisih, dan catatan per produk.
- Semua proses simpan, buat, terima, finalisasi, dan pembayaran menampilkan spinner pada tombol.
- Ikon menu berubah menjadi spinner ketika halaman sedang dibuka.

## Build

```bash
npm install
npm run typecheck
npm run build
```

Node.js: 22.x.
