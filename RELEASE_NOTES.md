# Release Notes — v2.2.0

## Antarmuka

- Memperbaiki skala tampilan transaksi pada HP yang sebelumnya tampak terlalu kecil.
- Kasir tablet menggunakan grid tiga kolom agar kartu tidak terlalu sempit.
- Kasir HP menggunakan dua kolom dengan nama, SKU, harga, dan stok yang tetap terbaca.
- Tabel transaksi, retur, transfer, dan pembelian berubah menjadi kartu pada layar kecil.
- Modal dokumen batch diubah menjadi panel bawah yang ramah sentuhan.

## Laporan

- Tombol Cetak/PDF dan Unduh CSV sejajar.
- Tanggal awal dan akhir sejajar; tombol periode menggunakan satu baris penuh.
- Cetak laporan menggunakan dokumen khusus, bukan menangkap halaman dashboard.
- Ringkasan, persediaan, dan transaksi dirapatkan agar tidak menghasilkan halaman kosong yang besar.

## Stok dan dokumen

- Batch stok masuk/keluar atomik.
- Batch transfer antartoko.
- Batch pembelian supplier dengan harga beli per produk.
- Validasi produk duplikat, jumlah, harga, toko asal/tujuan, ongkir, dan diskon.

## Retur

- Pencarian invoice berdasarkan nomor, pelanggan, atau toko.
- Pencarian produk hanya di dalam invoice terpilih.
- Menampilkan jumlah dibeli, jumlah sudah diretur, dan sisa yang dapat diretur.

## Branding dan visual produk

- URL logo perusahaan untuk website, login, laporan, dan invoice.
- URL gambar untuk setiap produk.
- 12 preset vector alat teknik.
- Editor JSON dan pratinjau visual.
- Dukungan vector custom aman dengan maksimum 30 elemen.
