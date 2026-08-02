# Implementation Status v2.3.1

## Selesai

- Edit, hapus, sembunyikan, dan tampilkan visual produk.
- Preview produk di kanan pada desktop/tablet dan stack pada HP.
- Tooltip grafik mengikuti posisi batang.
- Bottom cart kasir untuk tablet dan HP.
- Baris produk transfer/pembelian diperbesar.
- Satuan jumlah tampil inline.
- Rincian stok opname melalui API dan modal.
- Spinner tombol proses dan navigasi menu.
- Progress bar navigasi global.

## Tidak memerlukan migration baru

Versi v2.3.1 menggunakan tabel dan kolom yang sudah tersedia pada v2.3.0. Database v2.2.0 tetap perlu migration v2.3.0 (`202608020006_v23_reports_ui_support.sql`).
