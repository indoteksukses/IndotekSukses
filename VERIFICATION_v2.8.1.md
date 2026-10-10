# Verifikasi v2.8.1

## Pemeriksaan otomatis di paket ini

- 101 file TypeScript/TSX diparsing menggunakan TypeScript compiler API: 0 kesalahan sintaks.
- 102 file TypeScript/TSX diperiksa untuk import lokal: 0 import hilang.
- Seluruh source diperiksa dengan TypeScript strict berbasis ambient stubs: 0 diagnostik.
- CSS diparsing menjadi 2.371 node: 0 parse error.
- Portal modal diterapkan pada profil, editor produk, editor stok, dan permintaan transfer.
- Arsip ZIP diuji dengan `unzip -t` setelah paket dibuat.

## Skenario UI setelah deployment

- Dialog profil terbuka di tengah viewport desktop dan tidak berada di dalam tinggi topbar.
- Backdrop menutupi sidebar, topbar, dan konten.
- Pada ponsel, dialog profil tampil sebagai bottom sheet dan isi dapat digulir.
- Klik backdrop dan tombol `Escape` menutup dialog; navigasi `Tab` tidak keluar dari dialog.
- Pilihan avatar legacy terlihat sebagai pilihan aktif yang benar.
- Menutup dialog tanpa menyimpan tidak mengubah avatar topbar.
- Menyimpan avatar memperbarui avatar topbar dan data profil.
- Modal edit produk, edit stok, dan permintaan transfer tidak terpotong pada kartu mobile.
- Menu toko menutup saat klik di luar, menekan `Escape`, memilih cabang, atau berpindah halaman.

## Batas pemeriksaan lingkungan

Build Next.js berbasis dependensi tidak dijalankan di lingkungan perbaikan karena registry npm tidak dapat dijangkau dan Node.js yang tersedia adalah v22, sedangkan proyek menetapkan Node.js 24. Jalankan rangkaian build pada mesin deployment sebelum produksi.
