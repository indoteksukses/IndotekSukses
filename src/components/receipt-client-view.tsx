"use client";

import { useEffect, useState } from "react";
import type { SaleDetail, SystemSettings } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ReceiptThermalView } from "@/components/receipt-thermal-view";
import { ReceiptActions, type ReceiptFormat } from "@/components/receipt-actions";
import { thermalPrinter } from "@/lib/thermal-printer";

interface ReceiptClientViewProps {
  sale: SaleDetail;
  settings: SystemSettings;
  initialFormat?: ReceiptFormat;
  autoPrint?: boolean;
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

export function ReceiptClientView({
  sale,
  settings,
  initialFormat,
  autoPrint = false,
}: ReceiptClientViewProps) {
  const [format, setFormat] = useState<ReceiptFormat>(() => {
    if (initialFormat) return initialFormat;
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem("indotek_thermal_paper_width");
      if (savedWidth === "80") return "thermal80";
    }
    return "thermal58";
  });

  // Sync format changes with thermalPrinter paperWidth
  const handleFormatChange = (newFormat: ReceiptFormat) => {
    setFormat(newFormat);
    if (newFormat === "thermal58") thermalPrinter.setPaperWidth(58);
    if (newFormat === "thermal80") thermalPrinter.setPaperWidth(80);
  };

  // Set print class on document body for @media print styles
  useEffect(() => {
    document.body.classList.remove("thermal-print-58", "thermal-print-80", "standard-print");
    if (format === "thermal58") {
      document.body.classList.add("thermal-print-58");
    } else if (format === "thermal80") {
      document.body.classList.add("thermal-print-80");
    } else {
      document.body.classList.add("standard-print");
    }
    return () => {
      document.body.classList.remove("thermal-print-58", "thermal-print-80", "standard-print");
    };
  }, [format]);

  // Handle autoPrint if requested via URL
  useEffect(() => {
    if (autoPrint) {
      const timer = window.setTimeout(() => {
        window.print();
      }, 400);
      return () => window.clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className={`receipt-page format-${format}`}>
      <ReceiptActions
        sale={sale}
        settings={settings}
        format={format}
        onFormatChange={handleFormatChange}
      />

      {/* Format Thermal 58mm atau 80mm */}
      {format === "thermal58" || format === "thermal80" ? (
        <ReceiptThermalView
          sale={sale}
          settings={settings}
          paperWidth={format === "thermal80" ? 80 : 58}
        />
      ) : (
        /* Format Standar (A4 / Invoice Dokumen) */
        <article className="receipt-document" id="invoice-document">
          <header className="receipt-header">
            <div className="receipt-brand">
              {sale.store_image_url || settings.logo_url ? (
                <img src={sale.store_image_url || settings.logo_url || ""} alt={sale.store_name} />
              ) : (
                <div className="receipt-logo">IS</div>
              )}
              <div>
                <h1>{sale.store_name}</h1>
                <p>{sale.store_address || settings.address || ""}</p>
                <p>{sale.store_phone || settings.phone || ""}</p>
              </div>
            </div>
            <div className="receipt-title">
              <span>INVOICE PENJUALAN</span>
              <strong>{sale.invoice_number}</strong>
              <small>{formatDateTime(sale.completed_at)}</small>
            </div>
          </header>

          <section className="receipt-meta">
            <div>
              <span>Pelanggan</span>
              <strong>{sale.customer_name || "Pelanggan umum"}</strong>
            </div>
            <div>
              <span>Kasir</span>
              <strong>{sale.cashier_name}</strong>
            </div>
            <div>
              <span>Cabang</span>
              <strong>{sale.store_code || sale.store_name}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{sale.status === "completed" ? "Lunas" : sale.status.replaceAll("_", " ")}</strong>
            </div>
          </section>

          <div className="receipt-items">
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Qty</th>
                  <th>Harga</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      {item.variant_name ? <em>{item.variant_name}</em> : null}
                      <span>{item.variant_sku || item.sku}</span>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="receipt-bottom">
            <section className="receipt-payment">
              <h3>Pembayaran</h3>
              {sale.payments.map((payment) => (
                <div key={payment.id}>
                  <span>
                    {paymentNames[payment.method] ?? payment.method}
                    {payment.reference_number ? ` · ${payment.reference_number}` : ""}
                  </span>
                  <strong>{formatCurrency(payment.amount)}</strong>
                </div>
              ))}
              {sale.notes ? <p>{sale.notes}</p> : null}
            </section>

            <section className="receipt-totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(sale.subtotal)}</strong>
              </div>
              {sale.discount > 0 ? (
                <div>
                  <span>Diskon</span>
                  <strong>-{formatCurrency(sale.discount)}</strong>
                </div>
              ) : null}
              {sale.tax > 0 ? (
                <div>
                  <span>Pajak</span>
                  <strong>{formatCurrency(sale.tax)}</strong>
                </div>
              ) : null}
              <div className="receipt-grand">
                <span>Total</span>
                <strong>{formatCurrency(sale.grand_total)}</strong>
              </div>
            </section>
          </div>

          <footer className="receipt-footer">
            <p>{settings.receipt_footer || "Terima kasih telah berbelanja."}</p>
            <span>Invoice dibuat otomatis oleh Indotek Sukses Inventory & POS.</span>
          </footer>
        </article>
      )}
    </div>
  );
}
