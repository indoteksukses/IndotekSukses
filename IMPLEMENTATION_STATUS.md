# Status Implementasi

## Sudah dieksekusi dalam paket ini

- Struktur Next.js App Router, TypeScript, dan desain responsif desktop/HP.
- Login Supabase SSR dan proteksi route melalui `proxy.ts`.
- Database untuk dua toko, akun/role, master produk, kategori, supplier, stok per toko, pergerakan stok, shift, penjualan, pembayaran, transfer, pembelian, opname, retur, histori harga, dan audit.
- Row Level Security per toko dan per role.
- Perlindungan kolom harga modal dan snapshot modal penjualan.
- RPC transaksi kasir atomik yang menolak stok minus.
- RPC stok masuk/keluar atomik.
- API checkout kasir dan API pergerakan stok.
- API server-only untuk membuat akun karyawan.
- Halaman dashboard, kasir, produk, stok, pergerakan stok, transfer, opname, retur, shift, pembelian, supplier, laporan, pengguna, audit, dan pengaturan.
- Produk, stok, kasir, dashboard, dan aktivitas stok memakai Supabase ketika mode demo dimatikan.
- Mode demo untuk pratinjau tanpa koneksi Supabase.

## Tahap penyelesaian produksi berikutnya

- Menghubungkan formulir CRUD lengkap untuk transfer, pembelian, retur, opname, supplier, shift, dan pengaturan.
- Approval workflow kepala toko/admin pada UI.
- Cetak struk thermal 58/80 mm dan PDF.
- Integrasi QRIS sesuai provider yang dipilih.
- Upload bukti nota/foto ke Supabase Storage.
- Grafik laporan dengan query agregasi produksi.
- Pengujian paralel beberapa kasir, RLS seluruh role, retur/reversal, transfer parsial, dan backup restore.
- Monitoring error, rate limit, dan hardening produksi.

Paket ini adalah fondasi deployable dan bukan klaim bahwa seluruh modul lanjutan sudah siap dipakai tanpa pengujian operasional.
