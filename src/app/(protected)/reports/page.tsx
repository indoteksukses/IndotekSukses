import { Boxes, CircleDollarSign, ReceiptText, RotateCcw, TrendingUp } from "lucide-react";
import { ExportButtons } from "@/components/export-buttons";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { getCurrentProfile, getFinancialReport, getProductsWithStocks, getSalesForPeriod, getStores } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const metadata = { title: "Laporan & Analitik" };

function defaultPeriod() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return { from: `${parts.slice(0, 7)}-01`, to: parts };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ store?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const defaults = defaultPeriod();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : defaults.from;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : defaults.to;
  const [report, sales, products, stores, profile] = await Promise.all([
    getFinancialReport(params.store, from, to), getSalesForPeriod(params.store, from, to), getProductsWithStocks(params.store), getStores(), getCurrentProfile(),
  ]);
  const canViewProductCosts = profile.role === "owner" || profile.role === "admin";
  const selectedStore = stores.find((store) => store.id === params.store);
  const stockValue = report.inventory_value;
  const exportRows = sales.map((sale) => ({
    Invoice: sale.invoice_number, Tanggal: formatDateTime(sale.completed_at), Toko: sale.store_name, Kasir: sale.cashier_name,
    Pelanggan: sale.customer_name ?? "Pelanggan umum", Total: sale.grand_total, Status: sale.status,
  }));

  return <>
    <PageHeader title="Laporan & Analitik" description={`Periode ${from} sampai ${to} · ${selectedStore?.name ?? "Semua toko"}.`} actions={<ExportButtons filename={`laporan-indotek-${from}-${to}`} rows={exportRows}/>}/>
    <form className="panel report-filter" method="get">
      {params.store ? <input type="hidden" name="store" value={params.store}/> : null}
      <label>Dari tanggal<input type="date" name="from" defaultValue={from}/></label>
      <label>Sampai tanggal<input type="date" name="to" defaultValue={to}/></label>
      <button className="button primary">Terapkan periode</button>
    </form>
    <div className="stats-grid">
      <StatCard label="Penjualan bersih" value={formatCurrency(report.net_sales)} helper={`Omzet kotor ${formatCurrency(report.gross_sales)}`} icon={<CircleDollarSign size={22}/>} tone="blue"/>
      <StatCard label="Retur" value={formatCurrency(report.refunds)} helper="Retur selesai dalam periode" icon={<RotateCcw size={22}/>} tone="orange"/>
      <StatCard label="Laba kotor" value={formatCurrency(report.gross_profit)} helper={`HPP ${formatCurrency(report.cogs)}`} icon={<TrendingUp size={22}/>} tone="green"/>
      <StatCard label="Transaksi & unit" value={`${report.transactions} transaksi`} helper={`${report.net_units} unit bersih`} icon={<ReceiptText size={22}/>} tone="purple"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-header"><div><h2>Ringkasan persediaan</h2><p>Nilai stok saat ini berdasarkan harga modal</p></div><Boxes size={20}/></div><div className="report-table"><div className="report-row report-summary-row"><div><strong>Nilai persediaan</strong><span>{products.length} produk aktif</span></div><strong>{formatCurrency(stockValue)}</strong></div>{products.slice(0, 10).map((product) => { const relevantStocks = params.store ? [product.stocks[params.store]].filter(Boolean) : Object.values(product.stocks); const critical = relevantStocks.filter((stock) => stock.quantity_available <= product.minimum_stock).length; return <div className="report-row inventory-report-row" key={product.id}><div><strong>{product.name}</strong><span>{product.sku}</span></div><span>{product.total_stock} {product.unit}</span><strong>{canViewProductCosts ? formatCurrency(product.total_stock * product.cost_price) : "Terlindungi"}</strong><StatusBadge tone={critical ? "warning" : "success"}>{critical ? `${critical} cabang kritis` : "Aman"}</StatusBadge></div>; })}</div></section>
      <section className="panel"><div className="panel-header"><div><h2>Transaksi terbaru</h2><p>Maksimal 10 transaksi pada periode terpilih</p></div><ReceiptText size={20}/></div><div className="report-table">{sales.slice(0, 10).map((sale) => <a className="report-row transaction-report-row" href={`/sales/${sale.id}/receipt`} key={sale.id}><div><strong>{sale.invoice_number}</strong><span>{sale.store_name} · {formatDateTime(sale.completed_at)}</span></div><strong>{formatCurrency(sale.grand_total)}</strong><StatusBadge tone={sale.status === "completed" ? "success" : sale.status === "voided" ? "danger" : "warning"}>{sale.status}</StatusBadge></a>)}{!sales.length ? <div className="empty-inline">Tidak ada transaksi pada periode ini.</div> : null}</div></section>
    </div>
  </>;
}
