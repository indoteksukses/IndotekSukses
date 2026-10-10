import Link from "next/link";
import { Building2, Database, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { SettingsForm } from "@/components/forms/settings-form";
import { PageHeader } from "@/components/ui";
import { getSystemSettings } from "@/lib/data";

export const metadata = { title: "Pengaturan" };

const settingsLinks = [
  { href: "/stores", icon: Building2, title: "Toko & cabang", description: "Tambah, ubah nama, kode, alamat, dan status cabang." },
  { href: "/users", icon: Users, title: "Karyawan & akses", description: "Role, toko utama, dan cabang yang dapat diakses." },
  { href: "/sales", icon: ReceiptText, title: "Struk & transaksi", description: "Nomor invoice otomatis dan riwayat pembatalan." },
  { href: "/audit", icon: ShieldCheck, title: "Keamanan & audit", description: "Jejak perubahan data penting dan aktivitas pengguna." },
];

export default async function SettingsPage() {
  const settings = await getSystemSettings();
  return <>
    <PageHeader title="Pengaturan Sistem" description="Atur identitas perusahaan, cabang, akses pengguna, struk, dan keamanan."/>
    <div className="settings-layout">
      <SettingsForm settings={settings}/>
      <div className="settings-side">
        {settingsLinks.map(({ href, icon: Icon, title, description }) => <Link className="setting-card" href={href} key={href}><div className="setting-icon"><Icon/></div><div><strong>{title}</strong><span>{description}</span></div><b>›</b></Link>)}
        <div className="setting-card"><div className="setting-icon"><Database/></div><div><strong>Database Supabase</strong><span>Backup terjadwal diatur melalui dashboard Supabase.</span></div><b>✓</b></div>
      </div>
    </div>
  </>;
}
