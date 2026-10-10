# Indotek Sukses v2.8.0

## Ringkasan

Versi ini merapikan antarmuka dan memperbaiki jalur data yang paling terasa lambat. Perubahan tetap mempertahankan fitur, hak akses, pagination database v2.7.2, stok per cabang, stok varian, dan alur transaksi yang sudah ada.

## Performa server dan data

- `getCurrentProfile`, `getStores`, dan `getSystemSettings` menggunakan cache request React sehingga layout dan halaman tidak mengulang permintaan yang sama dalam satu render.
- Dashboard tidak lagi memuat metadata katalog lengkap beserta varian dan harga modal hanya untuk menghitung ringkasan stok.
- Query dashboard untuk stok dan penjualan dibatasi ke cabang yang dipilih atau cabang yang diizinkan bagi pengguna.
- Data stok dashboard, pergerakan, daftar toko, dan penjualan dijalankan secara paralel.
- Penjualan dashboard diambil dengan pagination database dan urutan stabil, sehingga ringkasan tidak terpotong pada batas 1.000 baris API.
- Agregasi penjualan harian, total hari ini, jumlah transaksi, unit, dan statistik cabang dilakukan dalam satu lintasan data.
- Query `inventory_overview`, `store_inventory`, dan `product_variant_inventory` sekarang mengikuti lingkup cabang yang sedang digunakan.
- Lookup stok varian memakai indeks `Map` sehingga tidak mengulang pencarian linear untuk setiap kombinasi produk, varian, dan cabang.
- Halaman Master Produk tidak lagi meminta kategori serta visual aktif dan seluruh data yang sama secara terpisah.

## Performa antarmuka

- Master Produk, Stok Semua Toko, Transaksi, dan POS memakai `useDeferredValue` agar mengetik pada kolom pencarian tetap lancar.
- Teks pencarian dinormalisasi dan diindeks sekali saat data berubah, bukan dibentuk ulang pada setiap penekanan tombol.
- Stok Semua Toko memiliki pagination 25, 50, atau 100 produk per halaman untuk mengurangi ukuran DOM.
- POS membuat indeks barcode produk dan varian sehingga pemindaian tidak lagi melakukan pencarian bertingkat pada seluruh katalog.
- POS merender 80 kartu pertama dan menyediakan tombol untuk menampilkan batch berikutnya.
- Ilustrasi produk dimemoisasi; gambar memakai lazy loading dan asynchronous decoding.
- Prefetch otomatis untuk seluruh menu berat dinonaktifkan. Prefetch dilakukan saat pengguna mengarahkan pointer atau fokus ke menu.
- Tautan internal memakai `next/link`, sehingga perpindahan halaman tidak memuat ulang seluruh aplikasi.

## Tampilan dan pengalaman pengguna

- Sidebar, topbar, pemilih toko, tombol, kartu statistik, panel, tabel, toolbar, input, dan halaman POS mendapat gaya yang lebih konsisten.
- Kontras teks, status aktif, hover, fokus keyboard, spacing, radius, dan bayangan diperhalus.
- Header tabel dibuat sticky pada area yang dapat digulir.
- Ditambahkan indikator proses pada pencarian, navigasi, dan pemilihan toko.
- Ditambahkan skeleton loading untuk halaman di dalam area aplikasi.
- Responsivitas tablet dan HP disempurnakan, termasuk pagination dan katalog POS.
- Preferensi `prefers-reduced-motion` dihormati untuk pengguna yang mengurangi animasi.

## Database

Tidak ada migration SQL baru untuk v2.8.0.
