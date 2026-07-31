import { StockForm } from "@/components/stock-form";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getProductsWithStocks, getRecentMovements, getStores } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Stok Masuk dan Keluar" };

export default async function StockMovementsPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const params = await searchParams;
  const [movements, products, stores] = await Promise.all([getRecentMovements(params.store), getProductsWithStocks(), getStores()]);
  return <><PageHeader title="Stok Masuk & Keluar" description="Catat penerimaan, kerusakan, pemakaian internal, dan koreksi stok pada cabang yang dipilih."/><div className="split-layout"><StockForm products={products} stores={stores} defaultStoreId={params.store}/><div className="panel"><div className="panel-header"><div><h2>Aktivitas terbaru</h2><p>Riwayat tidak dapat dihapus karyawan.</p></div></div><div className="activity-list">{movements.map((movement) => <div className="activity-row" key={movement.id}><div className={`movement-dot ${movement.quantity > 0 ? "green" : "red"}`}/><div><strong>{movement.product}</strong><span>{movement.store} · {movement.type}{movement.reason ? ` · ${movement.reason}` : ""}</span></div><div className="activity-value"><strong className={movement.quantity > 0 ? "positive" : "negative"}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</strong><span>{formatDateTime(movement.time)}</span></div></div>)}</div><div className="panel-footer"><StatusBadge tone="info">Audit aktif</StatusBadge><span>Semua aktivitas menyimpan petugas dan waktu.</span></div></div></div></>;
}
