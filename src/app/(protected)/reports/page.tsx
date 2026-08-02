import { Boxes, CircleDollarSign, PackageCheck, ReceiptText, RotateCcw, TrendingUp } from "lucide-react";
import { ReportDefinitionHelp } from "@/components/report-definition-help";
import { ReportExportActions } from "@/components/report-print-options";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { getCurrentProfile, getFinancialReport, getProductsWithStocks, getSalesForPeriod, getStores, getSystemSettings } from "@/lib/data";
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
  const [report, sales, products, stores, profile, settings] = await Promise.all([
    getFinancialReport(params.store, from, to),
    getSalesForPeriod(params.store, from, to),
    getProductsWithStocks(params.store),
    getStores(),
    getCurrentProfile(),
    getSystemSettings(),
  ]);
  const canViewProductCosts = profile.role === "owner" || profile.role === "admin";
  const selectedStore = stores.find((store) => store.id === params.store);
  const scopeName = selectedStore?.name ?? "Semua toko";
  const exportRows = sales.map((sale) => ({
    Invoice: sale.invoice_number,
    Tanggal: formatDateTime(sale.completed_at),
    Toko: sale.store_name,
    Kasir: sale.cashier_name,
    Pelanggan: sale.customer_name ?? "Pelanggan umum",
    Total: sale.grand_total,
    Status: sale.status,
  }));
  const lowStockCount = products.filter((product) => {
    const relevantStocks = params.store ? [product.stocks[params.store]].filter(Boolean) : Object.values(product.stocks);
    return relevantStocks.some((stock) => stock.quantity_available <= product.minimum_stock);
  }).length;

  return <div className="reports-page">
    <div className="report-screen">
      <PageHeader
        title="Laporan & Analitik"
        description={`Periode ${from} sampai ${to} · ${scopeName}.`}
        actions={<ReportExportActions filename={`laporan-indotek-${from}-${to}`} rows={exportRows} canViewCosts={canViewProductCosts}/>} />

      <form className="panel report-filter report-filter-v23" method="get">
        {params.store ? <input type="hidden" name="store" value={params.store}/> : null}
        <label>Dari tanggal<input type="date" name="from" defaultValue={from}/></label>
        <label>Sampai tanggal<input type="date" name="to" defaultValue={to}/></label>
        <button className="button primary">Terapkan periode</button>
      </form>

      <div className={`stats-grid report-stats-grid ${canViewProductCosts ? "with-costs" : ""}`}>
        <StatCard label={<span className="stat-label-with-help">Penjualan bersih <ReportDefinitionHelp title="Penjualan bersih" description="Total transaksi selesai setelah dikurangi nilai retur pada periode laporan."/></span>} value={formatCurrency(report.net_sales)} helper={`Sebelum retur ${formatCurrency(report.gross_sales)}`} icon={<CircleDollarSign size={22}/>} tone="blue"/>
        <StatCard label={<span className="stat-label-with-help">Retur <ReportDefinitionHelp title="Retur" description="Nilai barang yang diretur dan berstatus disetujui atau selesai pada periode ini."/></span>} value={formatCurrency(report.refunds)} helper="Retur selesai dalam periode" icon={<RotateCcw size={22}/>} tone="orange"/>
        {canViewProductCosts ? <StatCard label={<span className="stat-label-with-help">HPP bersih <ReportDefinitionHelp title="HPP bersih" description="Harga pokok barang terjual setelah memperhitungkan barang retur yang kembali layak jual."/></span>} value={formatCurrency(report.cogs)} helper="Modal unit yang terjual bersih" icon={<PackageCheck size={22}/>} tone="purple"/> : null}
        <StatCard label={<span className="stat-label-with-help">Laba kotor <ReportDefinitionHelp title="Laba kotor" description="Penjualan bersih dikurangi HPP bersih. Belum dikurangi biaya operasional toko."/></span>} value={canViewProductCosts ? formatCurrency(report.gross_profit) : "Terlindungi"} helper={canViewProductCosts ? "Penjualan bersih − HPP bersih" : "Hanya owner dan admin"} icon={<TrendingUp size={22}/>} tone="green"/>
        <StatCard label={<span className="stat-label-with-help">Transaksi & unit <ReportDefinitionHelp title="Transaksi dan unit" description="Jumlah transaksi selesai dan total unit terjual setelah dikurangi unit yang diretur."/></span>} value={`${report.transactions} transaksi`} helper={`${report.net_units} unit bersih`} icon={<ReceiptText size={22}/>} tone="red"/>
      </div>

      <div className="dashboard-grid report-dashboard-grid">
        <section className="panel report-panel-v23">
          <div className="panel-header"><div><h2>Ringkasan persediaan</h2><p>Nilai stok saat ini berdasarkan harga modal</p></div><div className="report-panel-summary"><strong>{products.length}</strong><span>produk · {lowStockCount} perlu restok</span></div></div>
          <div className="report-table">
            <div className="report-row report-summary-row"><div><strong>Nilai persediaan</strong><span>{products.length} produk aktif</span></div><strong>{canViewProductCosts ? formatCurrency(report.inventory_value) : "Terlindungi"}</strong></div>
            {products.slice(0, 12).map((product) => {
              const relevantStocks = params.store ? [product.stocks[params.store]].filter(Boolean) : Object.values(product.stocks);
              const critical = relevantStocks.filter((stock) => stock.quantity_available <= product.minimum_stock).length;
              return <div className="report-row inventory-report-row" key={product.id}>
                <div><strong>{product.name}</strong><span>{product.sku}</span></div>
                <span>{product.total_stock} {product.unit}</span>
                <strong>{canViewProductCosts ? formatCurrency(product.total_stock * product.cost_price) : "Terlindungi"}</strong>
                <StatusBadge tone={critical ? "warning" : "success"}>{critical ? `${critical} cabang kritis` : "Aman"}</StatusBadge>
              </div>;
            })}
          </div>
        </section>
        <section className="panel report-panel-v23">
          <div className="panel-header"><div><h2>Transaksi terbaru</h2><p>Maksimal 10 transaksi pada periode terpilih</p></div><ReceiptText size={20}/></div>
          <div className="report-table">{sales.slice(0, 10).map((sale) => <a className="report-row transaction-report-row" href={`/sales/${sale.id}/receipt`} key={sale.id}>
            <div><strong>{sale.invoice_number}</strong><span>{sale.store_name} · {formatDateTime(sale.completed_at)}</span></div>
            <strong>{formatCurrency(sale.grand_total)}</strong>
            <StatusBadge tone={sale.status === "completed" ? "success" : sale.status === "voided" ? "danger" : "warning"}>{sale.status}</StatusBadge>
          </a>)}{!sales.length ? <div className="empty-inline">Tidak ada transaksi pada periode ini.</div> : null}</div>
        </section>
      </div>
    </div>

    <article className="report-print-document">
      <header className="report-print-header">
        <div className="report-print-brand">
          {settings.logo_url ? <img src={settings.logo_url} alt={settings.company_name}/> : <div className="report-print-logo">IS</div>}
          <div><h1>{settings.company_name}</h1><p>{settings.company_tagline}</p></div>
        </div>
        <div><strong>LAPORAN OPERASIONAL</strong><span>{from} s.d. {to}</span><span>{scopeName}</span></div>
      </header>
      <section className="report-print-summary" data-report-section="summary">
        <div><span>Penjualan sebelum retur</span><strong>{formatCurrency(report.gross_sales)}</strong></div>
        <div><span>Retur</span><strong>{formatCurrency(report.refunds)}</strong></div>
        <div><span>Penjualan bersih</span><strong>{formatCurrency(report.net_sales)}</strong></div>
        <div className="report-cost-column"><span>HPP bersih</span><strong>{canViewProductCosts ? formatCurrency(report.cogs) : "-"}</strong></div>
        <div className="report-cost-column"><span>Laba kotor</span><strong>{canViewProductCosts ? formatCurrency(report.gross_profit) : "-"}</strong></div>
        <div><span>Transaksi / unit</span><strong>{report.transactions} / {report.net_units}</strong></div>
      </section>
      <section className="report-print-section" data-report-section="inventory">
        <h2>Ringkasan persediaan</h2>
        <table><thead><tr><th>Produk</th><th>SKU</th><th className="number">Stok</th><th className="number report-cost-column">Nilai</th><th>Status</th></tr></thead>
          <tbody>{products.slice(0, 80).map((product) => {
            const relevantStocks = params.store ? [product.stocks[params.store]].filter(Boolean) : Object.values(product.stocks);
            const critical = relevantStocks.some((stock) => stock.quantity_available <= product.minimum_stock);
            return <tr key={product.id}><td>{product.name}</td><td>{product.sku}</td><td className="number">{product.total_stock} {product.unit}</td><td className="number report-cost-column">{canViewProductCosts ? formatCurrency(product.total_stock * product.cost_price) : "-"}</td><td>{critical ? "Perlu restok" : "Aman"}</td></tr>;
          })}</tbody>
        </table>
      </section>
      <section className="report-print-section" data-report-section="transactions">
        <h2>Transaksi periode</h2>
        <table><thead><tr><th>Invoice</th><th>Tanggal</th><th>Toko <span className="report-cashier-column">/ Kasir</span></th><th className="number">Total</th><th>Status</th></tr></thead>
          <tbody>{sales.slice(0, 160).map((sale) => <tr key={sale.id}><td>{sale.invoice_number}</td><td>{formatDateTime(sale.completed_at)}</td><td>{sale.store_name}<span className="report-cashier-column"> / {sale.cashier_name}</span></td><td className="number">{formatCurrency(sale.grand_total)}</td><td>{sale.status}</td></tr>)}</tbody>
        </table>
      </section>
      <footer className="report-print-footer">Dicetak dari {settings.company_name} Inventory & POS · {new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</footer>
    </article>
  </div>;
}
