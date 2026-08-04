import { notFound } from "next/navigation";
import { ReceiptActions } from "@/components/receipt-actions";
import { getSaleDetail, getSystemSettings } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";

const paymentNames: Record<string, string> = { cash: "Tunai", qris: "QRIS", bank_transfer: "Transfer", debit_card: "Debit", credit_card: "Kredit", mixed: "Campuran", customer_credit: "Piutang" };

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ print?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [sale, settings] = await Promise.all([getSaleDetail(id), getSystemSettings()]);
  if (!sale) notFound();
  return <div className="receipt-page">
    <ReceiptActions autoPrint={query.print === "1"}/>
    <article className="receipt-document" id="invoice-document">
      <header className="receipt-header">
        <div className="receipt-brand">{sale.store_image_url || settings.logo_url ? <img src={sale.store_image_url || settings.logo_url} alt={sale.store_name}/> : <div className="receipt-logo">IS</div>}<div><h1>{sale.store_name}</h1><p>{sale.store_address || settings.address || ""}</p><p>{sale.store_phone || settings.phone || ""}</p></div></div>
        <div className="receipt-title"><span>INVOICE PENJUALAN</span><strong>{sale.invoice_number}</strong><small>{formatDateTime(sale.completed_at)}</small></div>
      </header>
      <section className="receipt-meta"><div><span>Pelanggan</span><strong>{sale.customer_name || "Pelanggan umum"}</strong></div><div><span>Kasir</span><strong>{sale.cashier_name}</strong></div><div><span>Cabang</span><strong>{sale.store_code || sale.store_name}</strong></div><div><span>Status</span><strong>{sale.status === "completed" ? "Lunas" : sale.status.replaceAll("_", " ")}</strong></div></section>
      <div className="receipt-items"><table><thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>{sale.items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong>{item.variant_name ? <em>{item.variant_name}</em> : null}<span>{item.variant_sku || item.sku}</span></td><td>{item.quantity}</td><td>{formatCurrency(item.unit_price)}</td><td>{formatCurrency(item.subtotal)}</td></tr>)}</tbody></table></div>
      <div className="receipt-bottom"><section className="receipt-payment"><h3>Pembayaran</h3>{sale.payments.map((payment) => <div key={payment.id}><span>{paymentNames[payment.method] ?? payment.method}{payment.reference_number ? ` · ${payment.reference_number}` : ""}</span><strong>{formatCurrency(payment.amount)}</strong></div>)}{sale.notes ? <p>{sale.notes}</p> : null}</section><section className="receipt-totals"><div><span>Subtotal</span><strong>{formatCurrency(sale.subtotal)}</strong></div>{sale.discount > 0 ? <div><span>Diskon</span><strong>-{formatCurrency(sale.discount)}</strong></div> : null}{sale.tax > 0 ? <div><span>Pajak</span><strong>{formatCurrency(sale.tax)}</strong></div> : null}<div className="receipt-grand"><span>Total</span><strong>{formatCurrency(sale.grand_total)}</strong></div></section></div>
      <footer className="receipt-footer"><p>{settings.receipt_footer || "Terima kasih telah berbelanja."}</p><span>Invoice dibuat otomatis oleh Indotek Sukses Inventory & POS.</span></footer>
    </article>
  </div>;
}
