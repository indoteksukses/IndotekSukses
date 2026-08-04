Indotek Sukses v2.6.1

# Deployment Checklist v2.6.0

- [ ] Backup database Supabase.
- [ ] Jalankan `202608040012_product_variants.sql` sampai selesai.
- [ ] Pastikan `product_variants_ready` dan `sale_variant_ready` bernilai `true`.
- [ ] Deploy seluruh source v2.6.0.
- [ ] Pastikan Vercel menggunakan Node.js 24.x.
- [ ] Pastikan `SUPABASE_SERVICE_ROLE_KEY` tersedia di Vercel.
- [ ] Logout dan login kembali setelah deployment.
- [ ] Uji membuat produk dengan dua varian.
- [ ] Uji harga modal dan harga jual tersimpan setelah produk dibuka ulang.
- [ ] Uji pemilihan varian di kasir.
- [ ] Uji scan SKU/barcode varian.
- [ ] Uji invoice menampilkan nama varian.
- [ ] Uji retur membedakan dua varian dari produk yang sama.
