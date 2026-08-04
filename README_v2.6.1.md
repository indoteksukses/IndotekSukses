# Indotek Sukses v2.6.1

Patch tampilan selector varian produk.

Pada popup Tambah/Edit Produk, setelah Kategori dan Merek akan muncul blok:

- Produk tunggal
- Memiliki varian

Saat `Memiliki varian` dipilih, setiap varian dapat memiliki nama, SKU, barcode, harga modal, harga jual, dan status aktif.

Migration baru tidak diperlukan. Pastikan `202608040012_product_variants.sql` sudah pernah dijalankan.
