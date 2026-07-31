"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, ShieldCheck, Store } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/setup").then((response) => response.json()).then((result) => {
      if (result.configured) router.replace("/login");
      else setChecking(false);
    }).catch(() => setChecking(false));
  }, [router]);

  if (checking) return <main className="setup-page"><div className="setup-loading">Memeriksa konfigurasi...</div></main>;

  return <main className="setup-page">
    <section className="setup-hero">
      <div className="login-brand"><span>IS</span><div><strong>Indotek Sukses</strong><small>Setup Sistem Pertama</small></div></div>
      <div><span className="eyebrow">SIAP DIGUNAKAN</span><h1>Bangun pusat kendali toko Anda.</h1><p>Buat owner pertama dan cabang awal. Setelah masuk, Anda dapat menambahkan cabang sebanyak kebutuhan bisnis.</p></div>
      <div className="setup-benefits"><span><ShieldCheck/> Hak akses aman</span><span><Store/> Multi-cabang dinamis</span><span><Building2/> Stok terpisah</span></div>
    </section>
    <section className="setup-form-wrap">
      {done ? <div className="setup-success"><CheckCircle2 size={54}/><h2>Setup berhasil</h2><p>Akun owner dan toko pertama sudah dibuat.</p><button className="button primary" onClick={() => router.push("/login")}>Masuk ke sistem</button></div> :
      <form className="setup-card" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError("");
        const form = new FormData(event.currentTarget);
        const payload = Object.fromEntries(form.entries());
        try {
          const response = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Setup gagal");
          setDone(true);
        } catch (err) { setError(err instanceof Error ? err.message : "Setup gagal"); }
        finally { setSaving(false); }
      }}>
        <div className="setup-title"><span>LANGKAH 1 DARI 1</span><h2>Konfigurasi awal</h2><p>Data ini dapat diubah kembali melalui menu Pengaturan.</p></div>
        {error ? <div className="alert error">{error}</div> : null}
        <div className="form-section"><h3>Perusahaan</h3><div className="form-grid">
          <label className="span-2">Nama perusahaan<input name="company_name" defaultValue="Indotek Sukses" required/></label>
          <label className="span-2">Alamat perusahaan<input name="company_address" placeholder="Opsional"/></label>
        </div></div>
        <div className="form-section"><h3>Owner</h3><div className="form-grid">
          <label>Nama lengkap<input name="full_name" placeholder="Nama owner" required/></label>
          <label>Email login<input name="email" type="email" placeholder="admin@indoteksukses.id" required/></label>
          <label className="span-2">Password<input name="password" type="password" minLength={8} placeholder="Minimal 8 karakter" required/></label>
        </div></div>
        <div className="form-section"><h3>Toko pertama</h3><div className="form-grid">
          <label>Nama toko<input name="store_name" placeholder="Indotek Sukses Pusat" required/></label>
          <label>Kode toko<input name="store_code" defaultValue="IDS-01" required/></label>
          <label>Alamat toko<input name="store_address" placeholder="Alamat cabang"/></label>
          <label>Telepon toko<input name="store_phone" placeholder="08xxxxxxxxxx"/></label>
          <label className="span-2">URL gambar toko<input name="store_image_url" type="url" placeholder="https://.../logo-toko.png"/><small>Opsional. Dapat diubah lagi melalui menu Toko & Cabang.</small></label>
        </div></div>
        <button className="button primary setup-submit" disabled={saving}>{saving ? "Menyiapkan sistem..." : "Buat sistem Indotek Sukses"}</button>
      </form>}
    </section>
  </main>;
}
