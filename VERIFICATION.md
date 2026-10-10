Indotek Sukses v2.6.1

# Verification v2.6.0

- 96 file TypeScript/TSX lolos pemeriksaan sintaks TypeScript.
- Tidak ada import lokal `@/` yang hilang.
- Kurung CSS seimbang.
- Migration tersedia di root dan `supabase/migrations`.
- Checkout memvalidasi stok gabungan seluruh varian dari produk yang sama.
- Harga modal varian tidak dikirim ke akun kasir.
- Build Next.js penuh tidak dapat dijalankan di lingkungan pembuatan paket karena registry internal tidak menyediakan `@supabase/ssr@0.12.3`; deployment Vercel menjadi validasi build final.
