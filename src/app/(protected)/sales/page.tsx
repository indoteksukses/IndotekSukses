import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { SalesTable } from "@/components/sales-table";
import { getCurrentProfile, getSales } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Transaksi Penjualan" };
export default async function SalesPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const params = await searchParams;
  const [sales, profile] = await Promise.all([getSales(params.store), getCurrentProfile()]);
  const completed = sales.filter((sale) => sale.status === "completed" || sale.status === "partially_refunded");
  const revenue = completed.reduce((sum, sale) => sum + sale.grand_total, 0);
  const canVoid = ["owner", "admin", "manager"].includes(profile.role);
  return <>
    <PageHeader title="Transaksi Penjualan" description="Seluruh penjualan, pembayaran, pembatalan, dan retur tersimpan permanen." actions={<Link className="button primary" href={params.store ? `/pos?store=${params.store}` : "/pos"}>+ Transaksi baru</Link>}/>
    <div className="mini-stats"><div><span>Total transaksi</span><strong>{sales.length}</strong></div><div><span>Transaksi aktif</span><strong>{completed.length}</strong></div><div><span>Dibatalkan</span><strong>{sales.filter((sale) => sale.status === "voided").length}</strong></div><div><span>Omzet tercatat</span><strong>{formatCurrency(revenue)}</strong></div></div>
    <SalesTable sales={sales} canVoid={canVoid}/>
  </>;
}
