"use client";

import type { SaleDetail, SystemSettings } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { ThermalPaperWidth } from "@/lib/thermal-printer";

interface ReceiptThermalViewProps {
  sale: SaleDetail;
  settings?: SystemSettings | null;
  paperWidth?: ThermalPaperWidth;
}

const paymentNames: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  bank_transfer: "Transfer",
  debit_card: "Debit",
  credit_card: "Kredit",
  mixed: "Campuran",
  customer_credit: "Piutang",
};

export function ReceiptThermalView({ sale, settings, paperWidth = 58 }: ReceiptThermalViewProps) {
  const is80 = paperWidth === 80;

  return (
    <div className={`receipt-thermal-container ${is80 ? "width-80" : "width-58"}`}>
      <div className="receipt-thermal-paper" id="thermal-receipt-document">
        {/* Paper top jagged/edge pattern */}
        <div className="thermal-paper-edge top no-print" />

        {/* Header Toko */}
        <header className="thermal-header">
          <h1 className="thermal-store-name">{sale.store_name || settings?.company_name || "INDOTEK SUKSES"}</h1>
          {sale.store_address || settings?.address ? (
            <p className="thermal-store-meta">{sale.store_address || settings?.address}</p>
          ) : null}
          {sale.store_phone || settings?.phone ? (
            <p className="thermal-store-meta">Telp: {sale.store_phone || settings?.phone}</p>
          ) : null}
        </header>

        <div className="thermal-divider-double" />

        {/* Info Transaksi */}
        <section className="thermal-meta-section">
          <div className="thermal-meta-row">
            <span>No. Invoice:</span>
            <strong>{sale.invoice_number}</strong>
          </div>
          <div className="thermal-meta-row">
            <span>Tanggal:</span>
            <span>{formatDateTime(sale.completed_at)}</span>
          </div>
          <div className="thermal-meta-row">
            <span>Kasir:</span>
            <span>{sale.cashier_name || "-"}</span>
          </div>
          <div className="thermal-meta-row">
            <span>Pelanggan:</span>
            <span>{sale.customer_name || "Pelanggan umum"}</span>
          </div>
        </section>

        <div className="thermal-divider-dashed" />

        {/* Daftar Barang */}
        <section className="thermal-items-section">
          {sale.items.map((item) => (
            <div key={item.id} className="thermal-item-row">
              <div className="thermal-item-title">
                <strong>{item.name}</strong>
                {item.variant_name ? <span className="thermal-item-variant">({item.variant_name})</span> : null}
              </div>
              <div className="thermal-item-calculation">
                <span>
                  {item.quantity} x {formatCurrency(item.unit_price)}
                </span>
                <strong className="thermal-item-subtotal">{formatCurrency(item.subtotal)}</strong>
              </div>
            </div>
          ))}
        </section>

        <div className="thermal-divider-dashed" />

        {/* Ringkasan Biaya */}
        <section className="thermal-totals-section">
          <div className="thermal-summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>

          {sale.discount > 0 ? (
            <div className="thermal-summary-row">
              <span>Diskon</span>
              <span>-{formatCurrency(sale.discount)}</span>
            </div>
          ) : null}

          {sale.tax > 0 ? (
            <div className="thermal-summary-row">
              <span>Pajak</span>
              <span>{formatCurrency(sale.tax)}</span>
            </div>
          ) : null}

          <div className="thermal-divider-dashed" />

          <div className="thermal-grand-total-row">
            <span>TOTAL</span>
            <strong>{formatCurrency(sale.grand_total)}</strong>
          </div>
        </section>

        <div className="thermal-divider-dashed" />

        {/* Pembayaran */}
        <section className="thermal-payment-section">
          {sale.payments.map((payment) => (
            <div key={payment.id} className="thermal-summary-row">
              <span>
                Bayar ({paymentNames[payment.method] ?? payment.method}
                {payment.reference_number ? ` · ${payment.reference_number}` : ""})
              </span>
              <strong>{formatCurrency(payment.amount)}</strong>
            </div>
          ))}
          {sale.notes ? <p className="thermal-notes">{sale.notes}</p> : null}
        </section>

        <div className="thermal-divider-double" />

        {/* Footer Struk */}
        <footer className="thermal-footer">
          <p className="thermal-footer-thankyou">{settings?.receipt_footer || "Terima kasih telah berbelanja."}</p>
          <p className="thermal-footer-terms">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
          <div className="thermal-barcode-sim">
            <span className="thermal-barcode-lines">|||||| |||| | |||||||| || |||||| | |||||||</span>
            <span className="thermal-barcode-text">{sale.invoice_number}</span>
          </div>
          <span className="thermal-app-credit">Indotek Sukses POS & Inventory</span>
        </footer>

        {/* Paper bottom jagged edge */}
        <div className="thermal-paper-edge bottom no-print" />
      </div>
    </div>
  );
}
