import { ArrowDownRight, ArrowUpRight, Boxes, CircleDollarSign, ReceiptText, ShoppingBag, TriangleAlert } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { ProductVisual } from "@/components/product-visual";
import { InteractiveSalesChart } from "@/components/interactive-sales-chart";
import { getDashboardSnapshot } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const params = await searchParams;
  const { products, movements, revenue, transactions, units, storeStats, dailyTrend } = await getDashboardSnapshot(params.store);
  const relevantStocks = (product: (typeof products)[number]) => params.store ? [product.stocks[params.store]].filter(Boolean) : Object.values(product.stocks);
  const lowProducts = products.filter((product) => relevantStocks(product).some((stock) => stock.quantity_available <= product.minimum_stock));
  const today = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" }).format(new Date());
  return (
    <>
      <PageHeader title="Dashboard" description={`Ringkasan operasional ${params.store ? "cabang terpilih" : "seluruh toko"} · ${today}.`} actions={<div className="dashboard-header-actions"><a className="button secondary" href="/reports">Unduh laporan</a><a className="button primary" href={params.store ? `/pos?store=${params.store}` : "/pos"}>Buka kasir</a></div>} />
      <div className="stats-grid">
        <StatCard label="Omzet hari ini" value={formatCurrency(revenue)} helper="Transaksi selesai hari ini" icon={<CircleDollarSign size={22}/>} tone="blue" />
        <StatCard label="Transaksi" value={String(transactions)} helper={transactions ? `Rata-rata ${formatCurrency(revenue / transactions)}` : "Belum ada transaksi"} icon={<ReceiptText size={22}/>} tone="green" />
        <StatCard label="Produk terjual" value={`${units} unit`} helper={params.store ? "Dari cabang terpilih" : "Dari seluruh cabang"} icon={<ShoppingBag size={22}/>} tone="purple" />
        <StatCard label="Stok perlu perhatian" value={`${lowProducts.length} produk`} helper="Habis atau di bawah minimum" icon={<TriangleAlert size={22}/>} tone="orange" />
      </div>

      <div className="dashboard-grid">
        <section className="panel sales-chart-panel">
          <div className="panel-header"><div><h2>Performa penjualan</h2><p>Visual ringkasan 7 hari terakhir</p></div><a href="/reports">Laporan lengkap</a></div>
          <InteractiveSalesChart points={dailyTrend}/>

        </section>
        <section className="panel branch-panel">
          <div className="panel-header"><div><h2>Performa cabang</h2><p>Penjualan hari ini</p></div><a href="/stores">Kelola cabang</a></div>
          {storeStats.length ? storeStats.slice(0, 6).map(({ store, revenue: storeRevenue, transactions: storeTransactions, units: storeUnits }, index) => <div className="branch-card" key={store.id}><div className={`branch-icon ${index % 2 ? "alt" : ""}`}>{store.image_url ? <img src={store.image_url} alt={store.name}/> : store.code.slice(-2)}</div><div><strong>{store.name}</strong><span>{storeTransactions} transaksi · {storeUnits} unit</span></div><div className="branch-value"><strong>{formatCurrency(storeRevenue)}</strong><span className="positive"><ArrowUpRight size={14}/> Aktif</span></div></div>) : <div className="empty-inline">Belum ada toko aktif.</div>}
        </section>
      </div>

      <div className="dashboard-grid lower-grid">
        <section className="panel">
          <div className="panel-header"><div><h2>Stok perlu perhatian</h2><p>Prioritas pengadaan dan distribusi</p></div><a href="/inventory">Lihat semua</a></div>
          <div className="stock-alert-list">
            {lowProducts.slice(0, 8).map((product) => {
              const critical = relevantStocks(product).filter((stock) => stock.quantity_available <= product.minimum_stock).sort((a,b) => a.quantity_available - b.quantity_available);
              const lowest = critical[0];
              return <div className="stock-alert" key={product.id}><div className="product-thumb"><ProductVisual name={product.name} imageUrl={product.image_url} definition={product.visual?.code} size="thumb"/></div><div><strong>{product.name}</strong><span>{product.sku}</span></div><div className="stock-split"><span>{lowest?.store_code ?? "—"} <b>{lowest?.quantity_available ?? 0}</b></span><small>{critical.length} cabang</small></div><StatusBadge tone={(lowest?.quantity_available ?? 0) === 0 ? "danger" : "warning"}>{(lowest?.quantity_available ?? 0) === 0 ? "Habis" : "Menipis"}</StatusBadge></div>;
            })}
            {!lowProducts.length ? <div className="empty-inline">Semua stok berada di atas batas minimum.</div> : null}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><div><h2>Aktivitas stok terbaru</h2><p>Pergerakan dari toko yang dapat Anda akses</p></div><a href="/stock-movements">Riwayat</a></div>
          <div className="activity-list">{movements.map((movement)=><div className="activity-row" key={movement.id}><div className={`movement-icon ${movement.quantity > 0 ? "in" : "out"}`}>{movement.quantity > 0 ? <ArrowDownRight size={18}/> : <ArrowUpRight size={18}/>}</div><div><strong>{movement.product}</strong><span>{movement.store} · {movement.user}</span></div><div className="activity-value"><strong className={movement.quantity > 0 ? "positive" : "negative"}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</strong><span>{formatDateTime(movement.time)}</span></div></div>)}</div>
        </section>
      </div>
    </>
  );
}
