# Indotek Sukses v2.6.0

## Varian produk

- Produk dapat tetap berupa produk tunggal atau memiliki beberapa varian.
- Setiap varian memiliki nama, SKU opsional, barcode opsional, harga modal, harga jual, status aktif, dan urutan.
- Master Produk menampilkan satu baris produk induk. Daftar varian dapat dibuka saat dibutuhkan agar tabel tetap ringkas.
- Kasir menampilkan pemilih varian sebelum barang masuk ke keranjang.
- Scan SKU/barcode varian langsung memilih varian yang tepat.
- Invoice menyimpan nama, SKU, harga modal, dan harga jual varian sebagai snapshot.
- Retur pelanggan membedakan setiap varian berdasarkan baris invoice.
- Stok tetap berada pada produk induk agar stok masuk/keluar, transfer, dan opname tetap sederhana.

## Keamanan dan validasi

- SKU dan barcode varian tidak boleh bertabrakan dengan produk induk maupun varian lain.
- Total jumlah beberapa varian dari produk yang sama tidak dapat melebihi stok bersama.
- Harga modal varian hanya dikirim ke owner/admin, tidak ke akun kasir.
