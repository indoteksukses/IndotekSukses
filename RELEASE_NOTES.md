# Release Notes v2.4.0

## Stok jaringan
- Stok semua cabang dapat dilihat oleh kasir untuk rekomendasi pelanggan.
- Hak tulis tetap mengikuti akses cabang dan role.
- Visual produk tampil pada tabel dan kartu stok.
- Permintaan transfer dapat dibuat dari cabang tujuan ke cabang sumber yang memiliki stok.

## Pemilih produk
- Menggunakan portal agar tidak terpotong card atau modal.
- Desktop menentukan posisi atas/bawah secara otomatis.
- Tablet dan HP memakai popup tetap di dalam viewport.

## Supplier
- Edit supplier.
- Hapus supplier yang belum memiliki transaksi.
- Supplier dengan riwayat pembelian diarsipkan agar integritas data tetap terjaga.

## Pembelian multi-cabang
- Semua cabang atau cabang terpilih.
- Jumlah per produk dan per cabang.
- Total unit dan nilai otomatis.
- Detail, edit, penerimaan, dan cetak/PDF.

## Database
- Migration baru: `202608030007_network_stock_purchase_workflow.sql`.
