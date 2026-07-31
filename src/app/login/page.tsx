import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand"><span>IS</span><div><strong>Indotek Sukses</strong><small>Inventory & Point of Sale</small></div></div>
        <div className="login-copy"><span className="eyebrow">SISTEM OPERASIONAL TERPADU</span><h1>Kelola seluruh cabang dalam satu pusat kendali.</h1><p>Tambah toko tanpa batas kode, pantau stok per cabang, jalankan kasir, pembelian, transfer, laporan, dan audit aktivitas.</p></div>
        <div className="login-feature-grid"><div>✓ Multi-cabang dinamis</div><div>✓ Kasir & shift</div><div>✓ Hak akses per toko</div><div>✓ Audit lengkap</div></div>
      </section>
      <section className="login-form-panel">
        <form action={login} className="login-card">
          <div className="mobile-login-logo"><span>IS</span><strong>Indotek Sukses</strong></div>
          <h2>Masuk ke sistem</h2><p>Gunakan akun yang telah didaftarkan oleh owner atau admin.</p>
          {params.error ? <div className="alert error">{params.error}</div> : null}
          <label>Email<input name="email" type="email" placeholder="admin@indoteksukses.id" required /></label>
          <label>Password<input name="password" type="password" placeholder="Minimal 8 karakter" required /></label>
          <button className="button primary login-button" type="submit">Masuk</button>
          <div className="login-help"><span>Belum membuat owner pertama?</span><Link href="/setup">Jalankan setup awal</Link></div>
        </form>
      </section>
    </main>
  );
}
