# Indotek Sukses v2.8.1

Patch ini memperbaiki tampilan profil/avatar yang terpotong atau muncul di area topbar setelah pengguna menekan avatar, sekaligus menguatkan modal lain yang dapat dibuka dari kartu dengan containment CSS.

## Perbaikan utama

- Dialog profil dirender langsung pada `document.body` melalui React portal, sehingga tidak lagi terikat oleh ukuran, stacking context, atau efek visual topbar.
- Backdrop dialog menutup seluruh viewport, termasuk sidebar, dan dialog berada di tengah pada desktop serta menjadi bottom sheet pada ponsel.
- Scroll halaman belakang dikunci selama dialog terbuka. Fokus awal diarahkan ke tombol tutup, tombol `Tab` tetap berada di dalam dialog, dan fokus kembali ke avatar setelah dialog ditutup.
- Dialog dapat ditutup melalui tombol tutup, klik area backdrop, atau tombol `Escape`; penutupan dinonaktifkan saat penyimpanan sedang berjalan.
- Avatar lama seperti `ocean`, `indigo`, dan preset legacy lain dinormalisasi agar pilihan aktif selalu benar.
- Perubahan avatar yang belum disimpan tidak lagi langsung mengganti avatar topbar. Menutup dialog mengembalikan pilihan terakhir yang tersimpan.
- Setelah penyimpanan berhasil, avatar topbar diperbarui segera tanpa menunggu perpindahan halaman.
- Modal edit produk, edit stok, dan permintaan transfer menggunakan portal bersama. Ini mencegah modal terpotong ketika tombol dibuka dari kartu mobile yang memakai `content-visibility`.
- Lapisan modal diberi aturan viewport dan z-index yang konsisten agar selalu berada di atas sidebar, tabel, sticky header, dan kartu.
- Menu pemilih toko menutup ketika pengguna mengklik area luar, menekan `Escape`, memilih cabang, atau berpindah halaman.
- Daftar toko memiliki batas tinggi dan scroll internal agar tidak keluar dari layar pada akun dengan banyak cabang.
- Efek `backdrop-filter` pada topbar dan toolbar dihapus karena dapat membentuk containing block untuk elemen `position: fixed` serta menambah beban rendering saat scroll.
- Tombol aksi pada dialog terkait diberi tipe eksplisit dan label aksesibilitas untuk mencegah submit form yang tidak disengaja.

## Database

Tidak ada migration SQL baru dan tidak ada perubahan struktur database.
