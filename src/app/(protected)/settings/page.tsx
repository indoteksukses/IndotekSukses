import { Bell, Building2, CreditCard, DatabaseBackup, FileText, LockKeyhole, Palette, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/ui";
const sections=[
 {title:"Profil perusahaan",desc:"Nama, logo, alamat pusat, kontak, dan identitas usaha.",icon:Building2},
 {title:"Data toko",desc:"Nama cabang, kode, alamat, telepon, kepala toko, dan status.",icon:Building2},
 {title:"Struk & nomor transaksi",desc:"Logo, footer, ukuran printer, pola invoice, dan nomor urut.",icon:ReceiptText},
 {title:"Metode pembayaran",desc:"Tunai, transfer, QRIS, kartu, dan pembayaran campuran.",icon:CreditCard},
 {title:"Hak akses & keamanan",desc:"Matriks izin, PIN persetujuan, sesi, dan batas percobaan login.",icon:LockKeyhole},
 {title:"Notifikasi",desc:"Stok kritis, transfer, retur, selisih kas, dan persetujuan.",icon:Bell},
 {title:"Tampilan",desc:"Logo, warna merek, mode terang/gelap, dan kepadatan tabel.",icon:Palette},
 {title:"Backup & ekspor",desc:"Cadangan data, retensi audit, dan ekspor arsip perusahaan.",icon:DatabaseBackup},
];
export const metadata={title:"Pengaturan"};
export default function SettingsPage(){return <><PageHeader title="Pengaturan Sistem" description="Konfigurasi perusahaan, toko, transaksi, keamanan, dan integrasi."/><div className="settings-grid">{sections.map(({title,desc,icon:Icon})=><button className="setting-card" key={title}><div className="setting-icon"><Icon size={22}/></div><div><strong>{title}</strong><span>{desc}</span></div><b>›</b></button>)}</div><div className="panel danger-zone"><div><h2>Zona administratif</h2><p>Perubahan berikut memerlukan autentikasi ulang owner.</p></div><button className="button danger">Nonaktifkan sistem sementara</button></div></>}
