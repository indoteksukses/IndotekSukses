# Checklist Deploy v2.3.1

- [ ] Backup database Supabase.
- [ ] Jika masih memakai v2.2.0, jalankan migration `202608020006_v23_reports_ui_support.sql`.
- [ ] Jika sudah memakai v2.3.0, jangan jalankan migration ulang.
- [ ] Ekstrak ZIP v2.3.1.
- [ ] Salin seluruh isi source ke folder repository GitHub Desktop.
- [ ] Pastikan `.env.local`, `node_modules`, `.next`, dan `.vercel` tidak ikut commit.
- [ ] Commit `Upgrade Indotek Sukses v2.3.1`.
- [ ] Klik Push origin.
- [ ] Pastikan deployment Vercel berstatus Ready.
- [ ] Logout dan login kembali.
- [ ] Lakukan hard refresh.
- [ ] Uji edit/hapus visual produk.
- [ ] Uji preview gambar produk pada tablet dan HP.
- [ ] Uji tooltip grafik pada beberapa tanggal.
- [ ] Uji keranjang bawah kasir di HP/tablet.
- [ ] Uji transfer beberapa produk.
- [ ] Uji rincian stok opname.
- [ ] Uji spinner pada tombol simpan dan menu navigasi.
