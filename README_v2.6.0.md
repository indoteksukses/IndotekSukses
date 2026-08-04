# Indotek Sukses v2.6.0

Versi ini menambahkan varian produk yang ringkas dan terintegrasi dengan Master Produk, kasir, invoice, laporan laba, serta retur.

## Aturan stok

Varian mempunyai harga modal dan harga jual sendiri, sedangkan stok tetap menggunakan saldo produk induk. Pendekatan ini cocok ketika variasi hanya membedakan ukuran, warna, daya, atau tipe tetapi pencatatan stok masih ingin dikelola secara ringkas.

## Pemasangan

Jalankan migration `202608040012_product_variants.sql` terlebih dahulu, kemudian deploy source.
