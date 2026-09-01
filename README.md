# Indotek Sukses v2.8.1

Versi ini meneruskan peningkatan UI dan performa v2.8.0, sekaligus memperbaiki dialog profil/avatar yang sebelumnya dapat terpotong dan tampil di area topbar.

## Peningkatan utama

- Dialog profil dirender melalui React portal langsung pada `document.body`, sehingga selalu mengikuti viewport dan berada di atas sidebar serta topbar.
- Backdrop menutupi seluruh aplikasi, scroll latar dikunci, fokus keyboard ditahan di dalam dialog, dan dialog mendukung klik backdrop serta tombol `Escape`.
- Modal edit produk, edit stok, dan permintaan transfer yang berada di kartu mobile juga memakai portal agar tidak terpotong oleh `content-visibility`, tabel, atau container lain.
- Avatar legacy dinormalisasi dan perubahan yang belum disimpan tidak lagi tampil sebagai avatar aktif.
- Pemilih toko menutup saat klik di luar atau menekan `Escape`, serta memiliki scroll internal untuk daftar cabang panjang.
- Efek blur mahal pada topbar dan toolbar dihapus untuk mencegah bug containing block dan mengurangi beban render.
- Seluruh pagination, query ringan, pencarian tertunda, optimasi katalog, dan optimasi POS dari v2.8.0 tetap dipertahankan.

## Upgrade

Versi ini tidak memerlukan migration SQL baru. Gunakan Node.js 24, lalu jalankan:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Lihat `DEPLOYMENT_v2.8.1.md`, `RELEASE_NOTES_v2.8.1.md`, dan `VERIFICATION_v2.8.1.md`.
