# Root cause v2.5.3

Versi sebelumnya dapat menyimpan data lewat service role/RPC, tetapi halaman Master Produk membaca metadata kategori dan visual memakai sesi pengguna biasa. Pada database yang memakai column-level grants atau schema lama, query metadata tersebut dapat tidak mengembalikan `category_id`, `brand`, atau `visual_id`. Akibatnya data terlihat kosong setelah halaman dimuat ulang walaupun penyimpanan sudah berjalan.

v2.5.3 mengubah dua sisi sekaligus:

1. API produk menyimpan langsung melalui service-role client dan membaca ulang baris yang sama dari tabel `products` sebelum mengembalikan sukses.
2. Halaman Master Produk membaca metadata produk, kategori, dan visual melalui service-role client di server, sehingga tidak tergantung RLS atau column-level grants browser.
3. URL gambar dan visual kode dibuat saling eksklusif. Memilih visual kode otomatis menyimpan `image_url = null`, sedangkan memilih URL menyimpan `visual_id = null`.

Tidak diperlukan migration SQL baru untuk patch ini. Vercel harus memiliki `SUPABASE_SECRET_KEY` atau `SUPABASE_SERVICE_ROLE_KEY`.
