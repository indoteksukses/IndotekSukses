# Indotek Sukses v2.0.0 — Release Notes

## Perubahan utama

- Tidak ada lagi asumsi dua toko. Cabang dapat ditambah sebanyak kebutuhan bisnis.
- Nama, kode, alamat, telepon, penanggung jawab, dan status setiap cabang dapat diubah.
- Cabang baru otomatis tersedia pada kasir, inventori, transfer, pembelian, opname, laporan, dan akses karyawan.
- Setup owner dan toko pertama dilakukan langsung melalui `/setup`.
- Kasir wajib memakai shift milik pengguna yang sedang login.
- Scan barcode atau SKU dapat langsung ditambahkan dengan tombol Enter.
- Referensi pembayaran QRIS, transfer, dan debit disimpan bersama transaksi.
- Filter dan ekspor CSV produk, inventori, transaksi, laporan, serta audit telah berfungsi.
- Dashboard 7 hari memakai transaksi nyata, bukan grafik contoh.
- Laporan periode menghitung penjualan kotor, retur, penjualan bersih, HPP, laba kotor, unit bersih, dan nilai persediaan.
- Hak akses karyawan diperketat; admin tidak dapat menaikkan dirinya atau pengguna lain menjadi owner/admin tanpa izin owner.
- Retur kumulatif tidak dapat melebihi jumlah barang pada transaksi asli.
- RPC transfer, pembelian, dan opname memeriksa role dan akses cabang di database.
- Nilai modal produk tidak ditampilkan kepada kasir dan gudang.

## Pemeriksaan rilis

- Pemeriksaan TypeScript struktural: lulus.
- Pemeriksaan seluruh import lokal: lulus.
- Tidak ditemukan referensi produksi yang mengunci sistem pada Toko 1/Toko 2.
- SQL instalasi baru dan SQL upgrade disertakan.

Build Next.js penuh perlu dijalankan oleh Vercel atau komputer yang dapat mengakses registry npm publik.
