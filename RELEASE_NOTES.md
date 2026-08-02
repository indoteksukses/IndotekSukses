Indotek Sukses v2.3.3

Indotek Sukses v2.3.2

# Indotek Sukses v2.3.1

## Perbaikan visual produk

- Galeri visual produk sekarang memiliki tombol Edit dan Hapus.
- Visual buatan admin dapat dihapus permanen; relasi produk otomatis kembali kosong karena database menggunakan `ON DELETE SET NULL`.
- Visual bawaan tidak dihapus permanen, tetapi dapat disembunyikan atau ditampilkan kembali.
- Editor produk menggunakan susunan field di kiri dan preview gambar di kanan.
- Preview berubah menjadi satu kolom pada layar HP.

## Kasir HP dan tablet

- Ditambahkan tombol keranjang tetap di bagian bawah layar.
- Tombol menampilkan jumlah item dan total transaksi.
- Keranjang dibuka sebagai bottom sheet.
- Kartu dan gambar produk dirapikan untuk grid tiga kolom pada tablet dan dua kolom pada HP.

## Grafik

- Tooltip omzet mengikuti posisi batang tanggal yang aktif.
- Mendukung hover, fokus keyboard, klik, dan sentuhan.

## Transfer dan dokumen multi-produk

- Baris produk diperbesar dan diberi kontras lebih jelas.
- Hasil pencarian produk dibuat lebih tinggi dan mudah dibaca.
- Jumlah dan satuan ditampilkan dalam satu baris, misalnya `10 pcs`.
- Layout tetap berubah menjadi card pada HP.

## Stok opname

- Ditambahkan modal Rincian untuk draft maupun opname selesai.
- Rincian menampilkan nama produk, SKU, stok sistem, stok fisik, selisih, dan catatan.
- Pencarian tersedia di dalam rincian.

## Loading state

- Spinner ditambahkan pada tombol simpan, buat, proses, terima, finalisasi, ralat, dan pembayaran.
- Ikon navigasi sidebar berubah menjadi spinner saat route sedang dimuat.
- Ditambahkan progress bar tipis di bagian paling atas halaman.

## Database

Tidak ada migration baru untuk upgrade dari v2.3.0 ke v2.3.1.
