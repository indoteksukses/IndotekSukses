# Indotek Sukses v2.0.0 — Inventory & Point of Sale

Aplikasi web multi-cabang untuk pengelolaan produk, stok, kasir, pembelian, transfer, stok opname, retur, karyawan, laporan, dan audit. Dibangun dengan Next.js 16, TypeScript, Supabase, dan siap diterapkan di Vercel.

## Fitur produksi

- Jumlah toko dinamis: tambah cabang baru tanpa mengubah kode.
- Nama, kode, alamat, telepon, penanggung jawab, dan status toko dapat diatur.
- Satu master produk dan harga pusat untuk seluruh cabang.
- Stok terpisah untuk setiap toko, termasuk stok tersedia, dipesan, rusak, dan dalam perjalanan.
- Kasir per toko dengan shift wajib, scan barcode/SKU, diskon, pelanggan, referensi pembayaran, tunai, QRIS, transfer, dan debit.
- Transaksi atomik: penjualan dan pengurangan stok berhasil bersama-sama atau dibatalkan bersama-sama.
- Shift kasir dengan kas awal, kas seharusnya, kas fisik, dan selisih.
- Stok masuk/keluar dengan alasan dan jejak audit.
- Transfer antartoko dengan status disetujui, dikirim, dalam perjalanan, dan diterima.
- Pembelian supplier dan penerimaan otomatis ke stok toko tujuan.
- Stok opname dengan snapshot stok sistem, input fisik, dan koreksi otomatis.
- Retur pelanggan dengan kondisi layak jual, rusak, atau pemeriksaan.
- Pembatalan transaksi melalui reversal, bukan menghapus transaksi.
- Karyawan dengan role Owner, Admin, Kepala Toko, Kasir, dan Gudang.
- Karyawan dapat ditambah, diedit, dinonaktifkan, serta diberi akses ke satu atau beberapa cabang.
- Dashboard dengan tren penjualan nyata, laporan periode, laba kotor/HPP terlindungi, ekspor CSV, cetak/PDF, audit aktivitas, dan pengaturan perusahaan.
- Setup owner dan toko pertama langsung dari website.
- Mode demo opsional.

## 1. Persyaratan

- Node.js 22.x
- Project Supabase
- Akun Vercel
- Repository GitHub

## 2. Database Supabase

### Instalasi baru

Buka **Supabase → SQL Editor**, lalu jalankan berurutan:

Jalankan satu file gabungan:

```text
supabase/FRESH_INSTALL.sql
```

Alternatifnya, jalankan dua migration secara berurutan:

1. `supabase/migrations/202607310001_indotek_sukses.sql`
2. `supabase/migrations/202607310002_multi_store_ready.sql`

Migration pertama membuat tabel dasar. Migration kedua menambahkan sistem multi-cabang produksi, setup awal, pengaturan perusahaan, dan fungsi transaksi operasional.

### Upgrade dari versi sebelumnya

Jika migration `202607310001_indotek_sukses.sql` sudah pernah dijalankan, cukup jalankan:

```text
supabase/migrations/202607310002_multi_store_ready.sql
```

Data toko dan transaksi lama tetap dipertahankan. Toko lama dapat diganti nama melalui menu **Toko & Cabang**.

### Data produk contoh

Setelah owner dan toko pertama selesai dibuat, data contoh dapat ditambahkan dengan menjalankan:

```text
supabase/seed.sql
```

Jangan menjalankan seed jika Anda ingin memulai dengan data kosong.

## 3. Environment Variables

Salin `.env.example` menjadi `.env.local` untuk penggunaan lokal.

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxx
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_APP_NAME=Indotek Sukses
```

Project lama yang masih memakai key legacy dapat menggunakan:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

Gunakan salah satu `SUPABASE_SECRET_KEY` atau `SUPABASE_SERVICE_ROLE_KEY`. Key tersebut hanya boleh dipasang pada server/Vercel dan tidak boleh menggunakan awalan `NEXT_PUBLIC_`.

## 4. Menjalankan lokal

```powershell
npm install
npm run dev
```

Buka:

```text
http://localhost:3000/setup
```

Isi:

- Nama perusahaan
- Nama dan email owner
- Password owner
- Nama toko pertama
- Kode toko pertama
- Alamat dan telepon toko

Setelah setup berhasil, login dari `/login`.

## 5. Deploy ke Vercel

1. Push seluruh folder proyek ke repository GitHub.
2. Import repository di Vercel.
3. Tambahkan seluruh environment variables.
4. Deploy.
5. Buka `https://domain-anda/setup` untuk membuat owner pertama.

Untuk deployment lama, jalankan migration upgrade sebelum membuka versi website yang baru.

## 6. Menambahkan toko baru

Login sebagai Owner atau Admin, lalu buka:

```text
Toko & Cabang → Tambah toko baru
```

Isi nama dan kode toko. Cabang baru otomatis muncul pada:

- Pemilih toko di bagian atas
- Kasir
- Stok semua toko
- Stok masuk/keluar
- Transfer antartoko
- Pembelian
- Stok opname
- Laporan
- Pengaturan akses karyawan

Tidak ada batas dua toko di kode aplikasi.

## 7. Hak akses

| Fitur | Owner | Admin | Kepala Toko | Kasir | Gudang |
|---|:---:|:---:|:---:|:---:|:---:|
| Atur toko | Ya | Ya | Tidak | Tidak | Tidak |
| Atur produk dan harga | Ya | Ya | Tidak | Tidak | Tidak |
| Melihat stok | Semua | Semua | Toko akses | Toko akses | Toko akses |
| Kasir | Ya | Ya | Ya | Ya | Tidak |
| Stok manual | Ya | Ya | Ya | Tidak | Ya |
| Transfer stok | Ya | Ya | Ya | Tidak | Ya |
| Pembelian | Ya | Ya | Ya | Tidak | Ya |
| Opname | Ya | Ya | Ya | Tidak | Ya |
| Kelola karyawan | Ya | Ya terbatas | Tidak | Tidak | Tidak |
| Audit | Semua | Semua | Toko akses | Tidak | Tidak |

Validasi hak akses dilakukan kembali di server dan database RLS, bukan hanya melalui tampilan.

## 8. Pemeriksaan sebelum operasional

- Pastikan `NEXT_PUBLIC_DEMO_MODE=false`.
- Pastikan secret/service role key hanya berada di Vercel.
- Buat akun terpisah untuk setiap karyawan.
- Berikan akses cabang sesuai tugas.
- Uji satu transaksi kasir dan periksa stok berkurang.
- Uji pembatalan transaksi dan periksa stok kembali.
- Uji transfer dari cabang asal sampai diterima cabang tujuan.
- Uji tutup shift dan selisih kas.
- Aktifkan backup database pada paket Supabase yang digunakan.

## Struktur penting

```text
src/app/(protected)       halaman aplikasi
src/app/api               endpoint transaksi server
src/components            komponen tampilan dan formulir
src/lib/data.ts            pembacaan data Supabase
src/lib/supabase           koneksi Supabase SSR dan admin
supabase/migrations        schema, RLS, trigger, dan RPC
supabase/seed.sql          data contoh opsional
```

## Keamanan

- Autentikasi menggunakan Supabase Auth dan cookie SSR.
- RLS aktif pada tabel utama.
- Secret/service role key tidak dikirim ke browser.
- Perubahan produk, harga, toko, supplier, pengguna, transfer, pembelian, retur, shift, dan pengaturan masuk ke audit log.
- Stok tidak dapat minus pada transaksi penjualan dan transfer.
- Transaksi yang dibatalkan tetap tersimpan.
