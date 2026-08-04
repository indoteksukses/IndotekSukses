# Deployment Checklist v2.5.0

- [ ] Backup database Supabase.
- [ ] Jalankan migration `202608040010_professional_accounts_visual_import.sql`.
- [ ] Hasil verifikasi: kategori kosong 0, merek kosong 0.
- [ ] Push source v2.5.0 ke GitHub.
- [ ] Tunggu Vercel berstatus Ready.
- [ ] Logout, hard refresh, lalu login dengan username dan password.
- [ ] Uji perubahan visual produk.
- [ ] Uji tambah karyawan dengan username.
- [ ] Uji reset password karyawan.
- [ ] Uji hapus karyawan dan pastikan akun tidak dapat login.
- [ ] Uji edit produk dan pastikan kategori serta merek wajib terisi.
