# Indotek Sukses — Inventory & POS

Fondasi aplikasi web multi-toko untuk dua cabang dengan satu master produk/harga, stok terpisah, kasir, shift, transfer, pembelian, retur, opname, laporan, pengguna, dan audit.

## Yang sudah tersedia

- Dashboard owner dengan ringkasan dua toko.
- Master produk dan harga pusat.
- Stok per cabang dan indikator minimum stok.
- Form stok masuk/keluar dan riwayat.
- UI kasir responsif dengan keranjang dan simulasi pembayaran.
- Halaman transaksi, shift, transfer, opname, retur, pembelian, supplier, laporan, pengguna, audit, dan pengaturan.
- Supabase Auth SSR berbasis cookie.
- Skema PostgreSQL lengkap dengan RLS.
- RPC `post_stock_movement` untuk stok atomik.
- RPC `complete_sale` untuk transaksi kasir atomik, pembayaran, item penjualan, dan pengurangan stok.
- API server-only untuk membuat akun karyawan menggunakan service role.
- Mode demo untuk melihat UI sebelum Supabase terhubung.

## 1. Persyaratan

- Node.js 20.9 atau lebih baru.
- Akun Supabase.
- Akun Vercel.

## 2. Menjalankan lokal

```bash
npm install
copy .env.example .env.local
npm run dev
```

Di Windows PowerShell, perintah salin dapat diganti:

```powershell
Copy-Item .env.example .env.local
```

Buka `http://localhost:3000`.

## 3. Menghubungkan Supabase

1. Buat project baru di Supabase.
2. Buka SQL Editor.
3. Jalankan seluruh file `supabase/migrations/202607310001_indotek_sukses.sql`.
4. Opsional: jalankan `supabase/seed.sql` untuk produk dan stok contoh.
5. Salin Project URL dan Publishable Key dari menu Connect ke `.env.local`.
6. Ubah `NEXT_PUBLIC_DEMO_MODE=false`.

Contoh:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
NEXT_PUBLIC_DEMO_MODE=false
```

## 4. Membuat owner pertama

Daftar satu pengguna melalui Supabase Authentication > Users atau tambahkan halaman signup sementara. Setelah akun dibuat, jalankan SQL berikut dengan email Anda:

```sql
update public.profiles
set role='owner', full_name='Owner Indotek Sukses'
where email='EMAIL_OWNER_ANDA';

insert into public.user_store_access(user_id,store_id)
select id,'11111111-1111-1111-1111-111111111111'
from public.profiles where email='EMAIL_OWNER_ANDA'
on conflict do nothing;

insert into public.user_store_access(user_id,store_id)
select id,'22222222-2222-2222-2222-222222222222'
from public.profiles where email='EMAIL_OWNER_ANDA'
on conflict do nothing;
```

## 5. Deploy ke Vercel

1. Upload folder ke GitHub.
2. Import repository di Vercel.
3. Tambahkan Environment Variables yang sama seperti `.env.local`.
4. Tambahkan `SUPABASE_SERVICE_ROLE_KEY` hanya apabila fitur admin membuat akun karyawan akan digunakan.
5. Deploy.

Jangan pernah menaruh `SUPABASE_SERVICE_ROLE_KEY` pada variabel berawalan `NEXT_PUBLIC_`.

## 6. Integrasi RPC kasir

Komponen UI kasir saat ini menampilkan alur demo. Ketika disambungkan ke data asli, kirim keranjang ke RPC berikut:

```ts
const { data, error } = await supabase.rpc("complete_sale", {
  p_store_id: storeId,
  p_shift_id: shiftId,
  p_customer_name: customerName || null,
  p_items: cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
  p_payments: [{ method: "cash", amount: grandTotal }],
  p_discount: discount,
  p_notes: null,
});
```

RPC mengunci stok per produk, menolak stok minus, menyimpan snapshot harga, mencatat pembayaran, dan membuat `stock_movements` dalam satu transaksi database.

## 7. Struktur utama

```text
src/app/(protected)   halaman dashboard dan modul operasional
src/components        komponen shell, kasir, formulir, dan UI
src/lib/supabase      browser/server client dan session proxy
supabase/migrations   skema database, fungsi, view, dan RLS
supabase/seed.sql     data contoh
```

## Catatan produksi

Sebelum digunakan untuk transaksi nyata, lakukan uji kasir paralel, printer thermal, retur/reversal, transfer parsial, backup, dan seluruh kebijakan RLS menggunakan akun dari setiap role.
