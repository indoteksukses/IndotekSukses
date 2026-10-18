import Link from "next/link";
import { Building2, Database, Printer, ReceiptText, ShieldCheck, Sparkles, Users } from "lucide-react";
import { SettingsForm } from "@/components/forms/settings-form";
import { ThermalPrinterSettings } from "@/components/thermal-printer-settings";
import { AISettingsPanel } from "@/components/ai-settings-panel";
import { PageHeader } from "@/components/ui";
import { getSystemSettings } from "@/lib/data";

export const metadata = { title: "Pengaturan" };

const settingsLinks = [
  { href: "/printer", icon: Printer, title: "Printer & Struk Thermal", description: "Ukuran kertas 58mm / 80mm, koneksi Bluetooth & USB." },
  { href: "/stores", icon: Building2, title: "Toko & cabang", description: "Tambah, ubah nama, kode, alamat, dan status cabang." },
  { href: "/users", icon: Users, title: "Karyawan & akses", description: "Role, toko utama, dan cabang yang dapat diakses." },
  { href: "/sales", icon: ReceiptText, title: "Struk & transaksi", description: "Nomor invoice otomatis dan riwayat pembatalan." },
  { href: "/audit", icon: ShieldCheck, title: "Keamanan & audit", description: "Jejak perubahan data penting dan aktivitas pengguna." },
];

export default async function SettingsPage() {
  const settings = await getSystemSettings();
  return (
    <>
      <PageHeader
        title="Pengaturan Sistem"
        description="Atur identitas perusahaan, pencarian AI LLM, printer struk thermal, cabang, dan akses pengguna."
      />
      <div className="settings-layout">
        <div className="settings-main-column">
          <SettingsForm settings={settings} />
          <div id="ai-search-section" style={{ marginTop: "24px" }}>
            <AISettingsPanel settings={settings} />
          </div>
          <div id="thermal-printer-section" style={{ marginTop: "24px" }}>
            <ThermalPrinterSettings settings={settings} />
          </div>
        </div>
        <div className="settings-side">
          <a className="setting-card highlight-ai-card" href="#ai-search-section">
            <div className="setting-icon">
              <Sparkles />
            </div>
            <div>
              <strong>Pencarian AI (LLM)</strong>
              <span>Base URL & model untuk pencarian bahasa pelanggan.</span>
            </div>
            <b>↓</b>
          </a>
          <a className="setting-card highlight-printer-card" href="#thermal-printer-section">
            <div className="setting-icon">
              <Printer />
            </div>
            <div>
              <strong>Printer & Struk Thermal</strong>
              <span>Koneksi Bluetooth, USB/Serial, kertas 58mm / 80mm.</span>
            </div>
            <b>↓</b>
          </a>

          {settingsLinks.map(({ href, icon: Icon, title, description }) => (
            <Link className="setting-card" href={href} key={href}>
              <div className="setting-icon">
                <Icon />
              </div>
              <div>
                <strong>{title}</strong>
                <span>{description}</span>
              </div>
              <b>›</b>
            </Link>
          ))}
          <div className="setting-card">
            <div className="setting-icon">
              <Database />
            </div>
            <div>
              <strong>Database Supabase</strong>
              <span>Backup terjadwal diatur melalui dashboard Supabase.</span>
            </div>
            <b>✓</b>
          </div>
        </div>
      </div>
    </>
  );
}
