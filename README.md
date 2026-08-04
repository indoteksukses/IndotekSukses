# Indotek Sukses v2.5.0

Versi profesional untuk sistem multi-cabang, stok, kasir, pembelian, transfer, dan manajemen karyawan.

## Peningkatan v2.5.0

- Visual produk mengikuti sumber yang dipilih: URL gambar, visual kode, atau visual umum.
- Gambar URL yang rusak otomatis memakai visual cadangan.
- Produk wajib memiliki kategori dan merek.
- Migration memperbaiki kategori dan merek produk MESIN & ALAT LISTRIK yang sudah terlanjur diimpor.
- Import SQL baru menggunakan `public.import_product_catalog(jsonb)` agar `category_id` dan `brand` selalu terisi.
- Login menggunakan username atau email.
- Owner dapat melihat username/email dan mereset password karyawan.
- Karyawan dapat dihapus secara aman tanpa merusak riwayat transaksi.

## Upgrade dari v2.4.4

1. Backup Supabase.
2. Jalankan `supabase/migrations/202608040010_professional_accounts_visual_import.sql`.
3. Pastikan hasil akhir menunjukkan `category_missing = 0` dan `brand_missing = 0`.
4. Deploy source ke Vercel.
5. Logout dan login kembali.

## Import produk melalui SQL

Gunakan salah satu file berikut:

- `supabase/IMPORT_PRODUCTS_WITH_CATEGORY_BRAND.sql` sebagai template.
- `supabase/IMPORT_MESIN_ALAT_LISTRIK_v2.5.0.sql` untuk batch MESIN & ALAT LISTRIK.

Setiap baris wajib memiliki `sku`, `name`, `category`, dan `brand`. Gunakan `Tanpa Merek` apabila merek belum diketahui.

## Keamanan password

Password Supabase disimpan sebagai hash satu arah. Password lama tidak dapat dan tidak boleh ditampilkan. Owner dapat menetapkan password baru melalui menu Karyawan & Akses.
