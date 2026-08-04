# v2.5.1

- Fixed TypeScript TS2783: duplicate `id` property in product PATCH response.
- Node engine updated from 22.x to 24.x.
- No database migration required.

# Release Notes v2.5.0

## Produk
- Sumber visual eksplisit dan konsisten.
- Fallback otomatis untuk gambar gagal dimuat.
- Kategori dan merek diwajibkan oleh UI, API, dan database.
- Pemetaan 146 produk MESIN & ALAT LISTRIK diperbaiki berdasarkan SKU.
- Helper import SQL memastikan kategori dibuat dan `category_id` terhubung.

## Karyawan & akses
- Login username atau email.
- Username unik untuk seluruh akun aktif.
- Owner dapat melihat username dan email.
- Owner dapat mengganti username/email dan mereset password.
- Penghapusan karyawan memakai soft delete dan ban akun agar histori aman.
- Email akun yang dihapus dibebaskan untuk digunakan kembali.

## Keamanan
- Password lama tidak ditampilkan karena tidak tersimpan dalam bentuk plaintext.
- Akun nonaktif/terhapus otomatis dikeluarkan dari sesi.
