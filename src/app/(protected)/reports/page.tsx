import { BarChart3, Boxes, CircleDollarSign, ReceiptText, Users } from "lucide-react";
import { PageHeader } from "@/components/ui";
const reports=[
 {title:"Penjualan",desc:"Harian, bulanan, per toko, kasir, produk, kategori, dan jam.",icon:ReceiptText},
 {title:"Stok",desc:"Saldo per cabang, pergerakan, barang rusak, nilai stok, dan umur stok.",icon:Boxes},
 {title:"Keuntungan",desc:"Omzet, HPP, diskon, retur, laba kotor, dan perbandingan cabang.",icon:CircleDollarSign},
 {title:"Kinerja kasir",desc:"Jumlah transaksi, rata-rata belanja, diskon, pembatalan, dan selisih kas.",icon:Users},
 {title:"Analisis bisnis",desc:"Produk terlaris, produk lambat, tren, kontribusi toko, dan metode bayar.",icon:BarChart3},
];
export const metadata={title:"Laporan"};
export default function ReportsPage(){return <><PageHeader title="Laporan & Analitik" description="Pusat laporan operasional dan pengambilan keputusan Indotek Sukses." actions={<button className="button primary">Buat laporan</button>}/><div className="report-grid">{reports.map(({title,desc,icon:Icon})=><article className="report-card" key={title}><div className="report-icon"><Icon size={24}/></div><h2>{title}</h2><p>{desc}</p><div><button className="button secondary">Buka laporan</button><button className="text-button">Jadwalkan</button></div></article>)}</div><section className="panel report-scheduler"><div><span className="eyebrow">LAPORAN OTOMATIS</span><h2>Ringkasan harian untuk owner</h2><p>Kirim rekap dua toko melalui email atau integrasi Telegram setelah shift terakhir ditutup.</p></div><button className="button primary">Atur jadwal</button></section></>}
