# Indotek Sukses v2.1.0 — Release Notes

## Produk dan kategori

- Pengelola kategori baru dengan tambah, cari, edit, aktif/nonaktif.
- Kategori nonaktif dapat dibuka kembali oleh admin.
- Pencarian produk diperluas untuk katalog ratusan hingga ribuan item.

## Stok

- Tombol jumlah stok bergerak 1 unit per klik.
- Product combobox mencari nama, SKU, barcode, dan kategori.
- Notifikasi sukses dan pembaruan aktivitas tanpa refresh manual.
- Ralat stok membuat reversal, bukan menghapus log.
- Edit stok fisik langsung dengan alasan dan audit.
- Saldo negatif tetap dicegah.

## Kasir dan barcode

- Modal pembayaran dirapikan dan dibuat responsif.
- Nominal cepat, uang diterima, dan kembalian berada dalam layout yang konsisten.
- Kamera barcode memakai detector native dengan fallback `@zxing/browser`.
- Scanner USB/Bluetooth dan input SKU tetap didukung.
- Satu shift aktif per toko dapat dipakai bersama beberapa karyawan.

## Invoice dan laporan

- Invoice detail berisi item, qty, harga, subtotal, pembayaran, pelanggan, kasir, toko, dan total.
- Invoice lama dapat dicetak ulang atau disimpan sebagai PDF.
- Print stylesheet hanya mencetak dokumen invoice.
- Tabel laporan dan kartu statistik dirapikan untuk desktop dan HP.

## Profil dan toko

- URL gambar profil toko.
- Dua belas avatar pengguna bawaan.
- Menu profil untuk melihat detail akun dan akses cabang.
- Role biasa hanya dapat mengganti avatar; detail lain baca-saja.

## Database

Migration baru:

```text
supabase/migrations/202608010004_operational_ux.sql
```

Migration menambah kolom gambar toko, avatar, metadata reversal, satu shift per toko, RPC edit stok, RPC ralat stok, complete-sale shared shift, dan perbaikan privilege aman.

## Pemeriksaan rilis

- Seluruh import lokal ditemukan.
- Transpilasi sintaks 81 file TypeScript/TSX: lulus.
- Pemeriksaan semantic internal dengan strict null checking: lulus.
- Kurung CSS seimbang.
- Fresh install telah digabung dengan migration v2.1.0.

Build penuh tetap perlu dilakukan melalui Vercel atau komputer yang dapat mengakses registry npm publik.
