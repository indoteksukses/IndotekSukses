# Indotek Sukses v2.6.0

Sistem inventory dan POS multi-cabang dengan dukungan produk tunggal dan produk bervarian.

## Fitur varian

- Setiap produk dapat memiliki beberapa varian.
- Setiap varian mempunyai nama, SKU/barcode opsional, harga modal, harga jual, urutan, dan status aktif.
- Master Produk tetap ringkas: satu baris produk induk dengan daftar varian yang dapat dibuka.
- Kasir meminta pengguna memilih varian sebelum produk dimasukkan ke keranjang.
- Scan SKU atau barcode varian langsung memilih varian tersebut.
- Invoice, COGS, laba, dan retur menyimpan varian serta harga snapshot yang digunakan saat transaksi.
- Stok tetap berada pada produk induk agar stok masuk/keluar, transfer, pembelian, dan opname tidak menjadi rumit.

## Instalasi upgrade

1. Backup Supabase.
2. Jalankan `202608040012_product_variants.sql`.
3. Deploy source v2.6.0 ke Vercel.
4. Logout, login kembali, dan lakukan hard refresh.

Lihat `DEPLOYMENT_v2.6.0.md` untuk langkah lengkap.
