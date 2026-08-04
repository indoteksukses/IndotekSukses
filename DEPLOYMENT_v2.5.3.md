# Deployment v2.5.3

1. Ekstrak ZIP dan ganti source lama tanpa menghapus folder `.git`.
2. Pastikan Vercel mempunyai `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, serta salah satu dari `SUPABASE_SECRET_KEY` atau `SUPABASE_SERVICE_ROLE_KEY`.
3. Commit dan push ke GitHub.
4. Tunggu deployment Vercel berstatus Ready.
5. Logout, login kembali, dan lakukan hard refresh.
6. Edit satu produk, pilih kategori dan Visual Code, simpan, lalu buka kembali produk yang sama.

Tidak ada SQL migration baru pada versi ini.
