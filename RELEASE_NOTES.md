# Indotek Sukses v2.4.1

Perbaikan khusus penyimpanan Pesanan Pembelian (PO).

- Fungsi SQL `save_purchase_order_multi` dibuat ulang dengan loop JSONB yang lebih stabil.
- Memastikan sequence, kolom multi-cabang, tabel alokasi, indeks, dan grant tersedia.
- Halaman `/purchases` direvalidasi setelah PO dibuat, diedit, atau diterima.
- Form PO memeriksa bahwa server benar-benar mengembalikan ID pesanan sebelum menampilkan sukses.
- Respons HTML/error server tidak lagi dibaca sebagai JSON mentah.
- Tidak menghapus PO, supplier, produk, stok, atau data lama.
