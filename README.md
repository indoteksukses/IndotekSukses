# Indotek Sukses Inventory & POS v2.2.0

Aplikasi manajemen toko teknik multi-cabang untuk penjualan mur, baut, perkakas tangan, mesin, aksesori teknik, dan produk sejenis. Dibangun dengan Next.js 16, TypeScript, Supabase PostgreSQL/RLS, dan siap di-deploy ke Vercel.

## Perubahan v2.2.0

- Tampilan kasir tablet dioptimalkan menjadi tiga kolom produk; HP menjadi dua kolom.
- Tampilan transaksi, transfer, pembelian, dan retur berubah menjadi kartu yang mudah dibaca pada HP.
- Laporan memiliki kontrol tanggal rapi, dua tombol ekspor sejajar, serta dokumen cetak khusus yang padat tanpa halaman kosong besar.
- Stok masuk/keluar menerima beberapa produk dalam satu dokumen atomik.
- Transfer antartoko dan pembelian supplier menerima beberapa produk dalam satu dokumen.
- Retur mencari invoice terlebih dahulu; daftar produk hanya memuat barang yang benar-benar ada pada invoice dan masih dapat diretur.
- Produk mendukung URL gambar atau visual vector ringan berbasis kode JSON.
- Tersedia visual bawaan untuk baut, mur, sekrup, kunci, bor, gerinda, gergaji, palu, tang, bearing, meteran, dan perkakas umum.
- Visual `custom` dapat disusun dari elemen vector aman (`path`, `rect`, `circle`, `ellipse`, `polygon`, `line`) tanpa HTML mentah dan tanpa script.
- URL logo perusahaan dapat diatur dari Pengaturan dan dipakai pada sidebar, login, laporan, dan invoice.
- Validasi server ditambahkan untuk dokumen transfer dan pembelian.

## Upgrade dari v2.1.0

1. Backup database Supabase.
2. Buka Supabase → SQL Editor.
3. Jalankan file:

```text
supabase/migrations/202608010005_mobile_batch_visuals.sql
```

4. Ganti source repository dengan isi paket v2.2.0.
5. Push ke branch utama GitHub dan tunggu Vercel selesai membangun proyek.
6. Logout, login kembali, lalu lakukan hard refresh.

Migration tidak menghapus produk, toko, stok, transaksi, pengguna, pembelian, transfer, maupun riwayat audit.

## Instalasi baru

Untuk database Supabase kosong, jalankan:

```text
supabase/FRESH_INSTALL.sql
```

Setelah deploy, buka `/setup` untuk membuat owner dan toko pertama.

## Environment Variables Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_APP_NAME=Indotek Sukses
```

Untuk project Supabase lama, `SUPABASE_SERVICE_ROLE_KEY` masih dapat digunakan sebagai pengganti `SUPABASE_SECRET_KEY`. Jangan menambahkan awalan `NEXT_PUBLIC_` pada secret key.

## Visual produk berbasis kode

Buka **Master Produk → Visual Produk**. Admin dapat memilih preset atau menempel kode JSON yang dibuat khusus.

Contoh preset:

```json
{
  "shape": "bolt",
  "primary": "#334155",
  "secondary": "#94a3b8",
  "accent": "#f59e0b",
  "background": "#eff6ff"
}
```

Contoh vector custom:

```json
{
  "shape": "custom",
  "primary": "#334155",
  "secondary": "#94a3b8",
  "accent": "#f59e0b",
  "background": "#eff6ff",
  "elements": [
    { "type": "rect", "x": 33, "y": 20, "width": 14, "height": 52, "rx": 5, "fill": "primary", "stroke": "secondary", "strokeWidth": 2 },
    { "type": "polygon", "points": "25,18 55,18 62,28 55,38 25,38 18,28", "fill": "secondary", "stroke": "primary", "strokeWidth": 3 },
    { "type": "line", "x1": 31, "y1": 50, "x2": 49, "y2": 50, "stroke": "accent", "strokeWidth": 3 }
  ]
}
```

Kode custom diproses sebagai data vector terbatas. Aplikasi tidak menjalankan SVG mentah, HTML, JavaScript, URL eksternal, atau event handler dari kode tersebut.

## Alur batch

### Stok masuk/keluar

Pilih toko dan alasan, tambahkan beberapa produk, isi jumlah setiap baris, lalu simpan. Semua baris diproses dalam satu transaksi database: semuanya berhasil atau semuanya dibatalkan.

### Transfer

Satu dokumen transfer dapat berisi banyak produk. Stok toko asal dikurangi saat dokumen dikirim dan stok tujuan bertambah saat diterima.

### Pembelian

Satu PO dapat berisi banyak produk dengan harga beli berbeda. Stok bertambah ketika PO diterima.

### Retur

Cari nomor invoice, pilih produk dari invoice tersebut, lalu masukkan jumlah. Sistem memperhitungkan retur sebelumnya sehingga jumlah tidak dapat melebihi sisa yang masih boleh dikembalikan.

## Pemeriksaan sebelum produksi

- Jalankan migration tanpa error.
- Pastikan Vercel build berstatus Ready.
- Uji kasir dengan transaksi nominal kecil.
- Uji stok masuk banyak produk.
- Uji transfer kirim dan terima.
- Uji PO dan penerimaan barang.
- Uji cetak invoice dan laporan dari komputer serta HP.
- Uji kamera barcode melalui HTTPS dan berikan izin kamera.
- Pastikan backup Supabase aktif sebelum memasukkan data produksi besar.
