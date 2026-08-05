# Deployment Indotek Sukses v2.7.2

## 1. Backup

Backup repository dan database Supabase sebelum mengganti source.

## 2. Ganti source

Ganti seluruh source lama dengan isi paket v2.7.2. Jangan menghapus folder `.git` apabila deployment memakai repository yang sama.

## 3. Commit

Gunakan commit, misalnya:

```text
Fix catalog pagination beyond 1000 rows v2.7.2
```

Push ke GitHub dan tunggu deployment Vercel berstatus **Ready**.

## 4. Verifikasi versi

Buka alamat berikut setelah deployment:

```text
https://DOMAIN-ANDA/api/version
```

Respons yang benar berisi:

```json
{
  "app": "Indotek Sukses",
  "version": "2.7.2",
  "catalog_pagination": true,
  "database_page_size": 1000
}
```

## 5. Verifikasi katalog

Jalankan `VERIFY_LARGE_CATALOG_v2.7.2.sql` di Supabase SQL Editor.

Setelah itu:

1. Logout dari website.
2. Tutup tab lama.
3. Login kembali.
4. Tekan `Ctrl + Shift + R`.
5. Buka Master Produk.

Master Produk harus menampilkan jumlah penuh, pilihan 25/50/100 per halaman, serta navigasi Sebelumnya dan Selanjutnya.

## Migration

Tidak ada migration baru. Migration varian berikut tetap harus sudah terpasang:

- `202608040012_product_variants.sql`
- `202608040013_variant_stock_per_branch.sql`
