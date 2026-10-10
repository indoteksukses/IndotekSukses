import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, ReceiptText, ShoppingBag, TriangleAlert } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { ProductVisual } from "@/components/product-visual";
import { InteractiveSalesChart } from "@/components/interactive-sales-chart";
import { getDashboardSnapshot } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const params = await searchParams;
  const storeId = params.store;
  const { products, movements, revenue, transactions, units, storeStats, dailyTrend } = await getDashboardSnapshot(storeId);

  let lowCount = 0;
  const lowAlerts: Array<{
    product: (typeof products)[number];
    lowestQty: number;
    lowestStoreCode: string;
    criticalBranchesCount: number;
  }> = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    let isLow = false;
    let lowestQty = Infinity;
    let lowestStoreCode = "—";
    let criticalBranchesCount = 0;

    if (storeId) {
      const stock = product.stocks[storeId];
      if (stock && stock.quantity_available <= product.minimum_stock) {
        isLow = true;
        lowestQty = stock.quantity_available;
        lowestStoreCode = stock.store_code ?? "—";
        criticalBranchesCount = 1;
      }
    } else {
      const storeKeys = Object.keys(product.stocks);
      for (let j = 0; j < storeKeys.length; j++) {
        const stock = product.stocks[storeKeys[j]];
        if (stock && stock.quantity_available <= product.minimum_stock) {
          isLow = true;
          criticalBranchesCount++;
          if (stock.quantity_available < lowestQty) {
            lowestQty = stock.quantity_available;
            lowestStoreCode = stock.store_code ?? "—";
          }
        }
      }
    }

    if (isLow) {
      lowCount++;
      if (lowAlerts.length < 8) {
        lowAlerts.push({
          product,
          lowestQty: lowestQty === Infinity ? 0 : lowestQty,
          lowestStoreCode,
          criticalBranchesCount,
        });
      }
    }
  }

  const storeQuery = storeId ? `?store=${storeId}` : "";
  const today = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Ringkasan operasional ${storeId ? "cabang terpilih" : "seluruh toko"} · ${today}.`}
        actions={
          <div className="dashboard-header-actions">
            <Link className="button secondary" href={`/reports${storeQuery}`}>Unduh laporan</Link>
            <Link className="button primary" href={storeId ? `/pos?store=${storeId}` : "/pos"}>Buka kasir</Link>
          </div>
        }
      />
      <div className="stats-grid">
        <StatCard label="Omzet hari ini" value={formatCurrency(revenue)} helper="Transaksi selesai hari ini" icon={<CircleDollarSign size={22}/>} tone="blue" />
        <StatCard label="Transaksi" value={String(transactions)} helper={transactions ? `Rata-rata ${formatCurrency(revenue / transactions)}` : "Belum ada transaksi"} icon={<ReceiptText size={22}/>} tone="green" />
        <StatCard label="Produk terjual" value={`${units} unit`} helper={storeId ? "Dari cabang terpilih" : "Dari seluruh cabang"} icon={<ShoppingBag size={22}/>} tone="purple" />
        <StatCard label="Stok perlu perhatian" value={`${lowCount} produk`} helper="Habis atau di bawah minimum" icon={<TriangleAlert size={22}/>} tone="orange" />
      </div>

      <div className="dashboard-grid">
        <section className="panel sales-chart-panel">
          <div className="panel-header"><div><h2>Performa penjualan</h2><p>Visual ringkasan 7 hari terakhir</p></div><Link href={`/reports${storeQuery}`}>Laporan lengkap</Link></div>
          <InteractiveSalesChart points={dailyTrend}/>
        </section>
        <section className="panel branch-panel">
          <div className="panel-header"><div><h2>Performa cabang</h2><p>Penjualan hari ini</p></div><Link href="/stores">Kelola cabang</Link></div>
          {storeStats.length ? storeStats.slice(0, 6).map(({ store, revenue: storeRevenue, transactions: storeTransactions, units: storeUnits }, index) => (
            <div className="branch-card" key={store.id}>
              <div className={`branch-icon ${index % 2 ? "alt" : ""}`}>
                {store.image_url ? <img src={store.image_url} alt={store.name} loading="lazy" decoding="async"/> : store.code.slice(-2)}
              </div>
              <div><strong>{store.name}</strong><span>{storeTransactions} transaksi · {storeUnits} unit</span></div>
              <div className="branch-value"><strong>{formatCurrency(storeRevenue)}</strong><span className="positive"><ArrowUpRight size={14}/> Aktif</span></div>
            </div>
          )) : <div className="empty-inline">Belum ada toko aktif.</div>}
        </section>
      </div>

      <div className="dashboard-grid lower-grid">
        <section className="panel">
          <div className="panel-header"><div><h2>Stok perlu perhatian</h2><p>Prioritas pengadaan dan distribusi</p></div><Link href={`/inventory${storeQuery}`}>Lihat semua</Link></div>
          <div className="stock-alert-list">
            {lowAlerts.map(({ product, lowestQty, lowestStoreCode, criticalBranchesCount }) => (
              <div className="stock-alert" key={product.id}>
                <div className="product-thumb">
                  <ProductVisual name={product.name} imageUrl={product.image_url} definition={product.visual?.code} size="thumb"/>
                </div>
                <div><strong>{product.name}</strong><span>{product.sku}</span></div>
                <div className="stock-split">
                  <span>{lowestStoreCode} <b>{lowestQty}</b></span>
                  <small>{criticalBranchesCount} cabang</small>
                </div>
                <StatusBadge tone={lowestQty === 0 ? "danger" : "warning"}>
                  {lowestQty === 0 ? "Habis" : "Menipis"}
                </StatusBadge>
              </div>
            ))}
            {!lowAlerts.length ? <div className="empty-inline">Semua stok berada di atas batas minimum.</div> : null}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><div><h2>Aktivitas stok terbaru</h2><p>Pergerakan dari toko yang dapat Anda akses</p></div><Link href={`/stock-movements${storeQuery}`}>Riwayat</Link></div>
          <div className="activity-list">{movements.map((movement)=>(
            <div className="activity-row" key={movement.id}>
              <div className={`movement-icon ${movement.quantity > 0 ? "in" : "out"}`}>{movement.quantity > 0 ? <ArrowDownRight size={18}/> : <ArrowUpRight size={18}/>}</div>
              <div><strong>{movement.product}</strong><span>{movement.store} · {movement.user}</span></div>
              <div className="activity-value">
                <strong className={movement.quantity > 0 ? "positive" : "negative"}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</strong>
                <span>{formatDateTime(movement.time)}</span>
              </div>
            </div>
          ))}</div>
        </section>
      </div>
    </>
  );
}
