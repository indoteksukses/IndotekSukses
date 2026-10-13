import Link from "next/link";
import { getSystemSettings } from "@/lib/data";
import { login } from "./actions";
import { LoginErrorAlert } from "./error-alert";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getSystemSettings();
  const mark = settings.logo_url ? <img className="login-logo-image" src={settings.logo_url} alt={settings.company_name} /> : <span>IS</span>;

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand hero-login-brand">{mark}<div><strong>{settings.company_name}</strong><small>{settings.company_tagline}</small></div></div>
        <div className="login-copy">
          <span className="eyebrow">SISTEM OPERASIONAL TOKO TEKNIK</span>
          <h1>Kelola mur, baut, perkakas, stok, dan kasir seluruh cabang.</h1>
          <p>Tambah toko tanpa batas, pantau stok per cabang, jalankan pembelian, transfer, retur, laporan, dan audit aktivitas dalam satu pusat kendali.</p>
        </div>
        <div className="login-feature-grid"><div>✓ Multi-cabang dinamis</div><div>✓ Kasir & satu shift toko</div><div>✓ Stok alat teknik</div><div>✓ Audit lengkap</div></div>
      </section>
      <section className="login-form-panel">
        <form action={login} className="login-card">
          <div className="mobile-login-logo">{mark}<strong>{settings.company_name}</strong></div>
          <h2>Masuk ke sistem</h2><p>Gunakan akun yang telah didaftarkan oleh owner atau admin.</p>
          <LoginErrorAlert />
          <label>Username atau email<input name="identifier" type="text" autoCapitalize="none" autoComplete="username" placeholder="owner atau admin@indoteksukses.id" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Masukkan password" required /></label>
          <button className="button primary login-button" type="submit">Masuk</button>
          <div className="login-help"><span>Belum membuat owner pertama?</span><Link href="/setup">Jalankan setup awal</Link></div>
        </form>
      </section>
    </main>
  );
}
