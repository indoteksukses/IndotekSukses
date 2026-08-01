"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Plus, Search, X } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { SaleSummary } from "@/lib/types";

type ReturnableItem = { sale_item_id: string; product_id: string; product_name: string; sku: string; purchased_quantity: number; returned_quantity: number; remaining_quantity: number; unit_price: number };

export function ReturnManager({ sales }: { sales: SaleSummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [saleId, setSaleId] = useState("");
  const [items, setItems] = useState<ReturnableItem[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const eligibleSales = useMemo(() => sales.filter((sale) => sale.status === "completed" || sale.status === "partially_refunded"), [sales]);
  const matchingSales = useMemo(() => eligibleSales.filter((sale) => `${sale.invoice_number} ${sale.customer_name ?? ""} ${sale.store_name}`.toLowerCase().includes(invoiceQuery.toLowerCase())).slice(0, 30), [eligibleSales, invoiceQuery]);
  const selectedSale = eligibleSales.find((sale) => sale.id === saleId);
  const matchingItems = useMemo(() => items.filter((item) => `${item.product_name} ${item.sku}`.toLowerCase().includes(productQuery.toLowerCase())), [items, productQuery]);
  const selectedItem = items.find((item) => item.product_id === productId);

  const selectInvoice = async (sale: SaleSummary) => {
    setSaleId(sale.id); setInvoiceQuery(sale.invoice_number); setProductId(""); setProductQuery(""); setItems([]); setError(""); setLoadingItems(true);
    try { const response = await fetch(`/api/sales/${sale.id}/returnable-items`); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal membaca rincian invoice"); setItems(result.items ?? []); }
    catch (err) { setError(err instanceof Error ? err.message : "Gagal membaca rincian invoice"); }
    finally { setLoadingItems(false); }
  };
  const close = () => { setOpen(false); setError(""); setSuccess(""); setSaleId(""); setInvoiceQuery(""); setItems([]); setProductId(""); };

  return <><button className="button primary" onClick={() => setOpen(true)}><Plus size={17}/> Buat retur</button>{open ? <div className="modal-backdrop"><div className="modal-card return-modal"><div className="modal-header"><div><h2>Retur pelanggan</h2><p>Cari invoice terlebih dahulu. Produk hanya berasal dari barang yang benar-benar dibeli.</p></div><button className="icon-button" onClick={close}><X size={20}/></button></div>
    {error ? <div className="alert error">{error}</div> : null}{success ? <div className="alert success"><CheckCircle2 size={17}/>{success}</div> : null}
    <form className="return-form" onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(""); setSuccess(""); const form = new FormData(event.currentTarget); try { if (!saleId || !selectedItem) throw new Error("Pilih invoice dan produk yang akan diretur."); if (quantity > selectedItem.remaining_quantity) throw new Error("Jumlah retur melebihi sisa yang dapat diretur."); const response = await fetch("/api/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sale_id: saleId, product_id: selectedItem.product_id, quantity, condition: form.get("condition"), resolution: form.get("resolution"), reason: form.get("reason") }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal membuat retur"); setSuccess(`Retur ${result.return_number || ""} berhasil disimpan.`); setItems((current) => current.map((item) => item.product_id === selectedItem.product_id ? { ...item, returned_quantity: item.returned_quantity + quantity, remaining_quantity: item.remaining_quantity - quantity } : item).filter((item) => item.remaining_quantity > 0)); setProductId(""); setQuantity(1); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat retur"); } finally { setSaving(false); } }}>
      <section className="return-step"><div className="return-step-head"><span>1</span><div><strong>Cari invoice</strong><small>Nomor invoice, pelanggan, atau toko</small></div></div><div className="invoice-search"><Search size={17}/><input value={invoiceQuery} onChange={(event) => { setInvoiceQuery(event.target.value); if (saleId && event.target.value !== selectedSale?.invoice_number) { setSaleId(""); setItems([]); setProductId(""); } }} placeholder="Contoh: IDS-20260801-000004"/></div>{!saleId && invoiceQuery ? <div className="invoice-results">{matchingSales.map((sale) => <button type="button" key={sale.id} onClick={() => selectInvoice(sale)}><div><strong>{sale.invoice_number}</strong><span>{sale.store_name} · {sale.customer_name || "Pelanggan umum"}</span></div><div><strong>{formatCurrency(sale.grand_total)}</strong><span>{formatDateTime(sale.completed_at)}</span></div></button>)}{!matchingSales.length ? <div className="empty-inline">Invoice tidak ditemukan.</div> : null}</div> : null}{selectedSale ? <div className="selected-invoice"><Check size={17}/><div><strong>{selectedSale.invoice_number}</strong><span>{selectedSale.store_name} · {selectedSale.customer_name || "Pelanggan umum"}</span></div><b>{formatCurrency(selectedSale.grand_total)}</b></div> : null}</section>
      <section className={`return-step ${!saleId ? "disabled-step" : ""}`}><div className="return-step-head"><span>2</span><div><strong>Pilih produk dari invoice</strong><small>{loadingItems ? "Memuat rincian..." : `${items.length} produk masih dapat diretur`}</small></div></div>{saleId ? <><div className="invoice-search"><Search size={17}/><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Cari nama produk atau SKU..."/></div><div className="return-product-list">{matchingItems.map((item) => <button type="button" className={productId === item.product_id ? "selected" : ""} key={item.sale_item_id} onClick={() => { setProductId(item.product_id); setQuantity(1); }}><div><strong>{item.product_name}</strong><span>{item.sku} · dibeli {item.purchased_quantity} · sudah retur {item.returned_quantity}</span></div><div><strong>Sisa {item.remaining_quantity}</strong><span>{formatCurrency(item.unit_price)} / item</span></div>{productId === item.product_id ? <Check size={16}/> : null}</button>)}{!loadingItems && !matchingItems.length ? <div className="empty-inline">Tidak ada produk yang masih dapat diretur.</div> : null}</div></> : <div className="empty-inline">Pilih invoice untuk menampilkan produk.</div>}</section>
      <section className={`return-step return-detail-grid ${!selectedItem ? "disabled-step" : ""}`}><div className="return-step-head span-2"><span>3</span><div><strong>Detail retur</strong><small>Jumlah maksimal {selectedItem?.remaining_quantity ?? 0}</small></div></div><label>Jumlah<input type="number" min="1" max={selectedItem?.remaining_quantity ?? 1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(selectedItem?.remaining_quantity ?? 1, Math.floor(Number(event.target.value || 1)))))}/></label><label>Kondisi<select name="condition"><option value="sellable">Layak dijual</option><option value="damaged">Rusak</option><option value="inspection">Perlu pemeriksaan</option></select></label><label>Penyelesaian<select name="resolution"><option value="refund">Pengembalian uang</option><option value="exchange">Tukar barang</option><option value="store_credit">Saldo pelanggan</option></select></label><label>Alasan<input name="reason" required placeholder="Contoh: Ukuran tidak sesuai"/></label></section>
      <div className="modal-actions return-actions"><button type="button" className="button secondary" onClick={close}>Tutup</button><button className="button primary" disabled={saving || !selectedItem}>{saving ? "Memproses..." : "Simpan retur"}</button></div>
    </form>
  </div></div> : null}</>;
}
