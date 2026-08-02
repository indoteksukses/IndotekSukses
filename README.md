# Indotek Sukses v2.4.0

Sistem inventori, kasir, transfer, supplier, dan pembelian multi-cabang berbasis Next.js, Vercel, dan Supabase.

## Fitur baru v2.4.0

- Kasir dapat melihat stok seluruh cabang sebagai informasi read-only.
- Stok cabang yang menjadi akses karyawan tetap menjadi satu-satunya stok yang dapat diubah.
- Permintaan transfer stok dari cabang yang kehabisan barang, dengan rekomendasi cabang sumber berdasarkan stok tersedia.
- Popup pencarian produk dirender di luar card menggunakan portal. Desktop otomatis membuka ke atas atau bawah; HP/tablet menggunakan popup layar aman.
- Visual produk tampil di Stok Semua Toko.
- Supplier dapat diedit, dihapus, atau diarsipkan bila sudah memiliki riwayat pembelian.
- Pesanan pembelian dapat dialokasikan ke semua cabang atau cabang terpilih.
- Jumlah setiap produk dapat dibagi per cabang dan total pembelian dihitung otomatis.
- Pesanan pembelian dapat dilihat, diedit sebelum diterima, serta dicetak atau disimpan sebagai PDF.

## Upgrade database wajib

Sebelum memakai source v2.4.0, jalankan file berikut di Supabase SQL Editor:

```text
supabase/migrations/202608030007_network_stock_purchase_workflow.sql
```

Migration menambahkan:

- fungsi read-only stok jaringan;
- tabel permintaan transfer;
- tabel alokasi pembelian per cabang;
- fungsi simpan/edit PO multi-cabang;
- penerimaan pembelian ke beberapa cabang secara atomik.

Migration tidak menghapus produk, stok, toko, transaksi, supplier, atau pesanan lama.

## Environment Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_APP_NAME=Indotek Sukses
```

`SUPABASE_SERVICE_ROLE_KEY` masih dapat dipakai sebagai pengganti `SUPABASE_SECRET_KEY` pada project lama. Jangan beri awalan `NEXT_PUBLIC_` pada secret key.

## Deploy melalui GitHub Desktop

1. Backup Supabase.
2. Jalankan migration `007`.
3. Ekstrak ZIP v2.4.0.
4. Di GitHub Desktop pilih **Repository → Show in Explorer**.
5. Ganti source lama dengan isi folder hasil ekstrak. Jangan hapus folder `.git`.
6. Commit dengan pesan `Upgrade Indotek Sukses v2.4.0`.
7. Klik **Push origin**.
8. Tunggu Vercel berstatus **Ready**.
9. Logout, login kembali, lalu hard refresh.

## Catatan operasional pembelian

- PO berstatus `draft` atau `pending` dapat diedit.
- Setelah barang diterima, PO tidak dapat diedit.
- Penerimaan menambahkan stok ke setiap cabang berdasarkan alokasi yang tersimpan.
- Tombol **Cetak / PDF** membuka dokumen khusus yang dapat dicetak atau disimpan melalui dialog browser.
