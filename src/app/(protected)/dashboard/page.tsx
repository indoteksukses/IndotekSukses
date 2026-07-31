import { ArrowDownRight, ArrowUpRight, Boxes, CircleDollarSign, PackageX, ReceiptText, ShoppingBag, TriangleAlert } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { getDashboardSnapshot } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { products: demoProducts, movements: demoMovements, revenue, transactions, units } = await getDashboardSnapshot();
  return (
    <>
      <PageHeader title="Dashboard" description="Ringkasan operasional Indotek Sukses hari ini, 31 Juli 2026." actions={<><button className="button secondary">Unduh laporan</button><a className="button primary" href="/pos">Buka kasir</a></>} />
      <div className="stats-grid">
        <StatCard label="Omzet hari ini" value={formatCurrency(revenue)} helper="↑ 12,4% dari kemarin" icon={<CircleDollarSign size={22}/>} tone="blue" />
        <StatCard label="Transaksi" value={String(transactions)} helper={transactions ? `Rata-rata ${formatCurrency(revenue / transactions)}` : "Belum ada transaksi"} icon={<ReceiptText size={22}/>} tone="green" />
        <StatCard label="Produk terjual" value={`${units} unit`} helper="Dari kedua toko" icon={<ShoppingBag size={22}/>} tone="purple" />
        <StatCard label="Stok hampir habis" value="13 produk" helper="3 produk sudah kritis" icon={<TriangleAlert size={22}/>} tone="orange" />
      </div>

      <div className="dashboard-grid">
        <section className="panel sales-chart-panel">
          <div className="panel-header"><div><h2>Performa penjualan</h2><p>Omzet 7 hari terakhir</p></div><select className="select compact"><option>Semua toko</option></select></div>
          <div className="chart-placeholder">
            {[38,55,47,72,60,83,68].map((h,i)=><div className="chart-column" key={i}><div className="chart-bar" style={{height:`${h}%`}}/><span>{["Sen","Sel","Rab","Kam","Jum","Sab","Min"][i]}</span></div>)}
          </div>
        </section>
        <section className="panel branch-panel">
          <div className="panel-header"><div><h2>Perbandingan toko</h2><p>Penjualan hari ini</p></div></div>
          <div className="branch-card"><div className="branch-icon">T1</div><div><strong>Indotek Sukses Toko 1</strong><span>35 transaksi · 58 unit</span></div><div className="branch-value"><strong>{formatCurrency(2500000)}</strong><span className="positive"><ArrowUpRight size={14}/> 14%</span></div></div>
          <div className="branch-card"><div className="branch-icon alt">T2</div><div><strong>Indotek Sukses Toko 2</strong><span>27 transaksi · 39 unit</span></div><div className="branch-value"><strong>{formatCurrency(1850000)}</strong><span className="positive"><ArrowUpRight size={14}/> 9%</span></div></div>
          <div className="branch-summary"><span>Kontribusi Toko 1</span><strong>57,5%</strong><div className="progress"><i style={{width:"57.5%"}}/></div></div>
        </section>
      </div>

      <div className="dashboard-grid lower-grid">
        <section className="panel">
          <div className="panel-header"><div><h2>Stok perlu perhatian</h2><p>Prioritas pengadaan dan distribusi</p></div><a href="/inventory">Lihat semua</a></div>
          <div className="stock-alert-list">
            {demoProducts.filter(p => Math.min(p.stock_store_1 ?? 0, p.stock_store_2 ?? 0) <= p.minimum_stock).map((p)=><div className="stock-alert" key={p.id}><div className="product-thumb"><Boxes size={20}/></div><div><strong>{p.name}</strong><span>{p.sku}</span></div><div className="stock-split"><span>T1 <b>{p.stock_store_1}</b></span><span>T2 <b>{p.stock_store_2}</b></span></div><StatusBadge tone={(Math.min(p.stock_store_1 ?? 0,p.stock_store_2 ?? 0) <= 3) ? "danger" : "warning"}>{Math.min(p.stock_store_1 ?? 0,p.stock_store_2 ?? 0) <= 3 ? "Kritis" : "Menipis"}</StatusBadge></div>)}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><div><h2>Aktivitas stok terbaru</h2><p>Pergerakan dari seluruh toko</p></div><a href="/stock-movements">Riwayat</a></div>
          <div className="activity-list">{demoMovements.map((m)=><div className="activity-row" key={m.id}><div className={`movement-icon ${m.quantity > 0 ? "in" : "out"}`}>{m.quantity > 0 ? <ArrowDownRight size={18}/> : <ArrowUpRight size={18}/>}</div><div><strong>{m.product}</strong><span>{m.store} · {m.user}</span></div><div className="activity-value"><strong className={m.quantity > 0 ? "positive" : "negative"}>{m.quantity > 0 ? "+" : ""}{m.quantity}</strong><span>{formatDateTime(m.time)}</span></div></div>)}</div>
        </section>
      </div>
    </>
  );
}
