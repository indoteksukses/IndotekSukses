# Indotek Sukses v2.5.3

- Memperbaiki kategori yang terlihat kosong setelah produk disimpan.
- Memperbaiki Visual Code yang kembali ke visual lama setelah reload.
- API produk tidak lagi bergantung pada RPC `save_product_master_v2`.
- Penyimpanan dan verifikasi memakai service-role client langsung ke tabel database.
- Pembacaan metadata produk, kategori, merek, gambar, dan visual memakai service-role client di server.
- URL gambar dan Visual Code tidak dapat aktif bersamaan.
- Respons API diberi `Cache-Control: no-store` dan halaman terkait direvalidasi.
- Tidak memerlukan migration SQL baru.
