# Indotek Sukses v2.1.0 — Inventory & Point of Sale

Aplikasi web multi-cabang untuk produk, stok, kasir, pembelian, transfer, stok opname, retur, karyawan, laporan, dan audit. Dibangun dengan Next.js, TypeScript, Supabase, dan ditujukan untuk deployment Vercel.

## Pembaruan v2.1.0

- Kategori produk dapat ditambah, dicari, diedit, diaktifkan, dan dinonaktifkan.
- Form stok masuk/keluar memakai kenaikan jumlah 1 unit dan pencarian nama, SKU, barcode, atau kategori.
- Setelah pergerakan stok disimpan, notifikasi sukses tampil dan aktivitas terbaru langsung diperbarui.
- Pergerakan stok manual dapat diralat tanpa menghapus riwayat; sistem membuat transaksi pembalik.
- Saldo stok tiap produk dan toko dapat diedit langsung dengan alasan serta audit permanen.
- Invoice penjualan memiliki rincian produk, jumlah, harga, subtotal, metode pembayaran, kasir, pelanggan, toko, dan total.
- Invoice lama dapat dibuka, dicetak ulang, atau disimpan sebagai PDF dari menu Transaksi.
- Modal pembayaran dirapikan, termasuk uang diterima, pilihan nominal cepat, dan kembalian.
- Pemindai barcode memakai API browser dan fallback ZXing; scanner USB/Bluetooth tetap didukung melalui input kasir.
- Satu toko hanya memiliki satu shift aktif yang dapat dipakai bersama oleh seluruh karyawan berizin.
- Setiap toko dapat memakai gambar profil dari URL HTTPS.
- Tersedia 12 avatar bawaan untuk pengguna. Pengguna dapat mengganti avatar sendiri melalui ikon profil.
- Profil menampilkan role, email, telepon, dan akses cabang; detail tertentu hanya dapat diedit owner/admin.
- Penyempurnaan desktop dan mobile pada kasir, laporan, tabel, modal, stok, profil, dan invoice.

## Fitur utama

- Jumlah cabang dinamis tanpa batas tetap di kode.
- Satu master produk dan harga pusat untuk semua cabang.
- Stok terpisah per toko.
- Kasir atomik dengan tunai, QRIS, transfer, dan debit.
- Pencegahan stok minus dan produk ganda dalam satu transaksi.
- Shift toko, rekonsiliasi kas, pembelian, supplier, transfer, opname, retur, pembatalan, laporan, ekspor CSV, dan audit.
- Role Owner, Admin, Kepala Toko, Kasir, dan Gudang dengan akses per cabang.
- Supabase Auth, SSR cookie, RLS, RPC transaksi, dan service key hanya pada server.

## Instalasi Supabase

### Project baru

Jalankan satu file berikut melalui **Supabase → SQL Editor**:

```text
supabase/FRESH_INSTALL.sql
```

File tersebut sudah mencakup schema dasar, sistem multi-cabang, dan pembaruan operasional v2.1.0.

### Upgrade dari v2.0.0 / v2.0.1

Backup database, kemudian jalankan hanya:

```text
supabase/migrations/202608010004_operational_ux.sql
```

Migration ini tidak menghapus produk, toko, stok, transaksi, atau akun yang sudah ada.

Untuk database yang belum pernah menerima hotfix permission v2.0.1, migration v2.1.0 juga memperbaiki privilege dasar sambil tetap menyembunyikan harga modal dari query pengguna biasa.

## Environment Variables Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxx
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_APP_NAME=Indotek Sukses
```

Project legacy dapat memakai:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

Gunakan salah satu `SUPABASE_SECRET_KEY` atau `SUPABASE_SERVICE_ROLE_KEY`. Jangan menambahkan awalan `NEXT_PUBLIC_` pada key rahasia.

## Menjalankan lokal

```powershell
npm install
npm run dev
```

Buka:

```text
http://localhost:3000/setup
```

Pada setup pertama, isi perusahaan, owner, toko pertama, dan URL gambar toko bila diperlukan.

## Upgrade source code di GitHub

1. Ekstrak paket v2.1.0.
2. Ganti seluruh isi repository lama dengan isi folder ini.
3. Jangan menyalin `.env.local` ke GitHub.
4. Jalankan:

```powershell
git add .
git commit -m "Upgrade Indotek Sukses v2.1.0"
git push origin main
```

5. Tunggu deployment Vercel selesai.
6. Logout, login kembali, kemudian tekan `Ctrl + Shift + R`.

## Cara operasional baru

### Kategori

```text
Master Produk → Kelola kategori
```

Kategori nonaktif tetap terlihat pada pengelola kategori sehingga dapat diedit atau diaktifkan kembali, tetapi tidak ditawarkan pada produk baru.

### Stok masuk/keluar dan ralat

```text
Stok Masuk / Keluar
```

Cari produk, pilih toko, masukkan jumlah, alasan, lalu simpan. Aktivitas baru langsung muncul. Owner, admin, atau kepala toko dapat memilih **Ralat** pada pergerakan manual yang salah.

### Edit saldo stok

```text
Stok Semua Toko → ikon pensil pada saldo cabang
```

Masukkan stok fisik akhir dan alasan. Sistem menyimpan selisih sebagai pergerakan audit, bukan mengubah angka tanpa jejak.

### Invoice

```text
Transaksi → Detail atau Cetak
```

Halaman invoice dapat dibuka kembali kapan saja. Tombol **Cetak** dan **Unduh / Simpan PDF** memakai dialog cetak browser dengan layout invoice khusus, bukan mencetak seluruh dashboard.

### Barcode

Pada kasir:

- Klik **Scan** untuk kamera HP/laptop.
- Izinkan kamera dan gunakan website HTTPS.
- Scanner USB/Bluetooth dapat langsung mengetik ke kolom pencarian; tekan atau kirim Enter.
- Barcode dan SKU harus tersimpan di master produk.

### Shift toko

```text
Shift Kasir → Kelola shift toko
```

Satu karyawan membuka satu shift untuk satu toko. Setelah aktif, seluruh kasir yang memiliki akses ke toko tersebut dapat bertransaksi. Pembuka shift, kepala toko, admin, atau owner dapat menutupnya.

### Avatar dan profil

Klik avatar di kanan atas. Semua pengguna dapat mengganti avatar. Owner/admin dapat mengubah nama dan telepon sendiri; role lain melihat detailnya dalam mode baca-saja.

## Pemeriksaan sebelum digunakan

- `NEXT_PUBLIC_DEMO_MODE=false`.
- Migration v2.1.0 berhasil dijalankan.
- Akun owner memiliki akses ke seluruh cabang.
- Setiap produk memiliki SKU unik; barcode juga harus unik bila diisi.
- Uji stok masuk, ralat, edit saldo, buka shift, transaksi, cetak invoice, dan tutup shift.
- Uji kamera dari domain HTTPS Vercel.
- Buat akun terpisah untuk setiap karyawan.
- Aktifkan backup Supabase sesuai paket yang digunakan.

## Struktur proyek

```text
src/app/(protected)        halaman aplikasi
src/app/api                endpoint server
src/components             UI dan formulir
src/lib/data.ts             pembacaan data Supabase
src/lib/supabase            koneksi SSR/admin
supabase/migrations         migration bertahap
supabase/FRESH_INSTALL.sql  instalasi database baru
```
