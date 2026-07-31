"use client";

import { useMemo, useState } from "react";
import { ReceiptText } from "lucide-react";
import { CsvButton } from "@/components/export-buttons";
import { VoidSaleButton } from "@/components/forms/void-sale-button";
import { StatusBadge } from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { SaleSummary } from "@/lib/types";

export function SalesTable({ sales, canVoid }: { sales: SaleSummary[]; canVoid: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const filtered = useMemo(() => sales.filter((sale) => `${sale.invoice_number} ${sale.customer_name ?? ""} ${sale.cashier_name} ${sale.store_name}`.toLowerCase().includes(query.toLowerCase()) && (!status || sale.status === status)), [sales, query, status]);
  const rows = filtered.map((sale) => ({ Invoice: sale.invoice_number, Tanggal: formatDateTime(sale.completed_at), Toko: sale.store_name, Kasir: sale.cashier_name, Pelanggan: sale.customer_name ?? "Pelanggan umum", Total: sale.grand_total, Status: sale.status }));
  return <>
    <div className="toolbar-card"><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari invoice atau pelanggan..."/></div><select className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Semua status</option><option value="completed">Selesai</option><option value="partially_refunded">Sebagian diretur</option><option value="voided">Dibatalkan</option></select><CsvButton filename="transaksi-indotek-sukses" rows={rows} label="Ekspor transaksi"/></div>
    <div className="panel table-panel"><table><thead><tr><th>Invoice</th><th>Tanggal</th><th>Toko</th><th>Kasir</th><th>Pelanggan</th><th>Total</th><th>Status</th><th/></tr></thead><tbody>{filtered.map((sale) => <tr key={sale.id}><td><div className="product-cell"><div className="product-thumb"><ReceiptText size={20}/></div><div><strong>{sale.invoice_number}</strong><span>{sale.id.slice(0,8)}</span></div></div></td><td>{formatDateTime(sale.completed_at)}</td><td>{sale.store_name}</td><td>{sale.cashier_name}</td><td>{sale.customer_name || "Pelanggan umum"}</td><td><strong>{formatCurrency(sale.grand_total)}</strong></td><td><StatusBadge tone={sale.status === "completed" ? "success" : sale.status === "voided" ? "danger" : "warning"}>{sale.status === "completed" ? "Selesai" : sale.status === "voided" ? "Dibatalkan" : "Sebagian retur"}</StatusBadge></td><td>{canVoid && sale.status === "completed" ? <VoidSaleButton saleId={sale.id} invoice={sale.invoice_number}/> : null}</td></tr>)}{!filtered.length ? <tr><td colSpan={8}><div className="empty-inline">Transaksi tidak ditemukan.</div></td></tr> : null}</tbody></table></div>
  </>;
}
