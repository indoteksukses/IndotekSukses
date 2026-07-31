import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand"><span>IS</span><div><strong>Indotek Sukses</strong><small>Inventory & Point of Sale</small></div></div>
        <div className="login-copy"><span className="eyebrow">SISTEM OPERASIONAL TERPADU</span><h1>Kelola dua toko dalam satu pusat kendali.</h1><p>Stok real-time per cabang, transaksi kasir, pembelian, transfer barang, laporan, dan audit aktivitas.</p></div>
        <div className="login-feature-grid"><div>✓ Stok per cabang</div><div>✓ Kasir & shift</div><div>✓ Hak akses</div><div>✓ Audit lengkap</div></div>
      </section>
      <section className="login-form-panel">
        <form action={login} className="login-card">
          <div className="mobile-login-logo"><span>IS</span><strong>Indotek Sukses</strong></div>
          <h2>Masuk ke sistem</h2><p>Gunakan akun karyawan yang telah didaftarkan admin.</p>
          {params.error ? <div className="alert error">{params.error}</div> : null}
          <label>Email<input name="email" type="email" placeholder="admin@indoteksukses.id" required /></label>
          <label>Password<input name="password" type="password" placeholder="Minimal 8 karakter" required /></label>
          <button className="button primary login-button" type="submit">Masuk</button>
          <div className="demo-note"><strong>Mode demo</strong><span>Set NEXT_PUBLIC_DEMO_MODE=true untuk membuka dashboard tanpa login saat pengembangan.</span></div>
        </form>
      </section>
    </main>
  );
}
