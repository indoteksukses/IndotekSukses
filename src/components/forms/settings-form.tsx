"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";
import type { SystemSettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: SystemSettings }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? "");

  return (
    <form
      className="panel settings-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        setSuccess(false);
        const values = Object.fromEntries(new FormData(event.currentTarget).entries());
        try {
          const response = await fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Gagal menyimpan pengaturan");
          setSuccess(true);
          setMessage("Pengaturan perusahaan berhasil disimpan.");
          router.refresh();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Gagal menyimpan pengaturan");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="panel-header">
        <div>
          <h2>Identitas perusahaan</h2>
          <p>Nama dan logo digunakan pada navigasi, halaman masuk, laporan, dan invoice.</p>
        </div>
      </div>
      <div className="settings-logo-row">
        <div className="settings-logo-preview">
          {logoUrl ? <img src={logoUrl} alt="Pratinjau logo" /> : <ImageIcon size={28} />}
        </div>
        <div>
          <strong>Logo website</strong>
          <span>Gunakan URL gambar langsung HTTPS. Disarankan PNG/WebP persegi dengan latar transparan.</span>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Nama perusahaan
          <input name="company_name" defaultValue={settings.company_name} required />
        </label>
        <label>
          Tagline aplikasi
          <input name="company_tagline" defaultValue={settings.company_tagline} />
        </label>
        <label className="span-2">
          URL logo website
          <input
            name="logo_url"
            type="url"
            placeholder="https://domain.com/logo.webp"
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
          />
        </label>
        <label>
          Nomor telepon
          <input name="phone" defaultValue={settings.phone} />
        </label>
        <label>
          Alamat
          <input name="address" defaultValue={settings.address} />
        </label>
        <label className="span-2">
          Footer struk
          <textarea name="receipt_footer" rows={3} defaultValue={settings.receipt_footer} />
        </label>
        <div className="form-footer span-2">
          <span className={success ? "positive" : message ? "negative" : ""}>{message || "Perubahan hanya dapat dilakukan owner atau admin."}</span>
          <button className="button primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan pengaturan"}</button>
        </div>
      </div>
    </form>
  );
}
