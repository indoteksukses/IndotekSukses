# Indotek Sukses Inventory & POS v2.3.0

Aplikasi manajemen multi-toko untuk toko mur, baut, perkakas, mesin, dan perlengkapan teknik. Dibangun dengan Next.js, TypeScript, Vercel, Supabase, PostgreSQL RLS, dan transaksi stok atomik.

## Upgrade dari v2.2.0

1. Backup Supabase.
2. Jalankan `supabase/migrations/202608020006_v23_reports_ui_support.sql`.
3. Ganti source repository dengan isi paket ini melalui GitHub Desktop.
4. Commit dan klik Push origin.
5. Tunggu Vercel menjadi Ready.
6. Logout, login kembali, dan lakukan hard refresh.

Migration v2.3.0 tidak menghapus produk, stok, toko, pengguna, transaksi, invoice, transfer, pembelian, retur, atau audit.

## Environment Variables Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_APP_NAME=Indotek Sukses
```

Project lama masih dapat menggunakan `SUPABASE_SERVICE_ROLE_KEY` sebagai pengganti `SUPABASE_SECRET_KEY`.

## Fitur v2.3.0

- Stok Masuk & Keluar multi-produk dengan layout operasional baru.
- Aktivitas stok real-time setelah simpan dan fitur ralat berbasis transaksi pembalik.
- Transfer antartoko multi-produk.
- Pembelian supplier multi-produk.
- Stok opname dengan pencarian, filter kategori, selisih, dan finalisasi.
- Retur berbasis invoice dan hanya menampilkan produk yang dibeli.
- Grafik dashboard interaktif untuk mouse, keyboard, dan sentuhan.
- Laporan dengan definisi keuangan yang lebih jelas.
- Checklist Cetak/PDF untuk memilih isi laporan.
- Tampilan responsif desktop, tablet, dan HP.

## Build

```bash
npm install
npm run typecheck
npm run build
```

Node.js: 22.x.
