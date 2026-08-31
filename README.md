# Indotek Sukses v2.8.0

Patch ini berfokus pada dua hal: tampilan aplikasi yang lebih rapi dan respons aplikasi yang lebih cepat pada katalog serta jaringan toko berukuran besar.

## Peningkatan utama

- Dashboard memakai payload stok yang lebih ringan dan memuat data penjualan secara paralel.
- Query stok, stok varian, dan relasi penjualan dibatasi ke cabang yang benar-benar dipilih atau diizinkan.
- Data profil, daftar toko, dan pengaturan tidak lagi diminta berulang dalam satu render server.
- Master Produk, Stok Semua Toko, dan Transaksi memakai pencarian tertunda agar input tidak tersendat.
- Stok Semua Toko sekarang memiliki pagination 25, 50, atau 100 produk per halaman.
- POS memakai indeks barcode, membatasi jumlah kartu awal, dan menambah produk secara bertahap.
- Navigasi internal tidak lagi melakukan reload penuh dan prefetch halaman berat dikendalikan secara eksplisit.
- Sidebar, topbar, kartu statistik, tabel, form, status loading, fokus keyboard, serta tampilan mobile dirapikan.
- Ditambahkan skeleton loading untuk perpindahan halaman terlindungi.

## Upgrade

Versi ini tidak memerlukan migration SQL baru. Seluruh migration yang diwajibkan pada v2.7.2 tetap harus sudah terpasang.

Lihat `DEPLOYMENT_v2.8.0.md`, `RELEASE_NOTES_v2.8.0.md`, dan `VERIFICATION_v2.8.0.md`.
