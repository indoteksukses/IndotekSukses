Indotek Sukses v2.3.3

Indotek Sukses v2.3.2

# Verification v2.3.1

Pemeriksaan yang dijalankan pada paket source:

- Parsing TypeScript/TSX: 93 file, tidak ada syntax error.
- Resolusi import lokal: 92 file, tidak ada import lokal yang hilang.
- Pemeriksaan semantic dengan stub dependency: lulus.
- Keseimbangan CSS: jumlah kurung pembuka dan penutup sama.
- API visual memiliki POST, PATCH, dan DELETE.
- API stok opname memiliki GET rincian dan POST proses.
- Tidak ada `node_modules`, `.next`, `.vercel`, `.env.local`, atau cache build dalam paket.

`npm install` dan `next build` penuh tidak dapat dijalankan di lingkungan pembuatan karena registry npm internal tidak menyediakan `@supabase/ssr`, sedangkan akses registry publik mengalami timeout. Build final harus dikonfirmasi melalui status **Ready** pada Vercel.
