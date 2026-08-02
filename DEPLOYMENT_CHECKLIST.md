# Deployment Checklist v2.4.0

- [ ] Backup database Supabase.
- [ ] Jalankan `202608030007_network_stock_purchase_workflow.sql`.
- [ ] Pastikan migration selesai tanpa error.
- [ ] Ganti source melalui GitHub Desktop.
- [ ] Jangan upload `.env.local`, `.next`, `node_modules`, atau `.vercel`.
- [ ] Push ke branch `main`.
- [ ] Pastikan Vercel build berstatus Ready.
- [ ] Logout dan login ulang.
- [ ] Uji Stok Semua Toko menggunakan akun kasir.
- [ ] Uji permintaan transfer stok.
- [ ] Uji popup produk di desktop, tablet, dan HP.
- [ ] Uji edit/hapus supplier.
- [ ] Buat PO untuk dua cabang dengan jumlah berbeda.
- [ ] Edit PO sebelum penerimaan.
- [ ] Buka detail dan Cetak/PDF.
- [ ] Terima barang dan cocokkan stok setiap cabang.
