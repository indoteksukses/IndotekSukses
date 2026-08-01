"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, X } from "lucide-react";
import { createDocumentLine, DocumentItemLines, type DocumentLine } from "@/components/document-item-lines";
import { formatCurrency } from "@/lib/format";
import type { Product, Store } from "@/lib/types";

export function PurchaseManager({ stores, products, suppliers }: { stores: Store[]; products: Product[]; suppliers: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [lines, setLines] = useState<DocumentLine[]>([createDocumentLine()]);
  const [shipping, setShipping] = useState(0);
  const [discount, setDiscount] = useState(0);
  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * (line.unit_cost ?? 0), 0), [lines]);
  const total = Math.max(subtotal + shipping - discount, 0);
  const close = () => { setOpen(false); setError(""); setSuccess(""); };

  return <><button className="button primary" onClick={() => setOpen(true)}><Plus size={17}/> Buat pembelian</button>{open ? <div className="modal-backdrop"><div className="modal-card document-modal"><div className="modal-header"><div><h2>Pesanan pembelian</h2><p>Masukkan beberapa produk dan harga beli dalam satu PO.</p></div><button className="icon-button" onClick={close}><X size={20}/></button></div>
    {error ? <div className="alert error">{error}</div> : null}{success ? <div className="alert success"><CheckCircle2 size={17}/>{success}</div> : null}
    <form className="document-form" onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(""); setSuccess(""); const form = new FormData(event.currentTarget); const items = lines.filter((line) => line.product_id).map((line) => ({ product_id: line.product_id, quantity: line.quantity, unit_cost: line.unit_cost ?? 0 })); try { if (!items.length) throw new Error("Tambahkan minimal satu produk."); const response = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", supplier_id: form.get("supplier_id"), destination_store_id: storeId, items, shipping_cost: shipping, discount, notes: form.get("notes") }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal membuat pembelian"); setSuccess(`Pembelian ${result.po_number || "baru"} berhasil dibuat.`); setLines([createDocumentLine()]); router.refresh(); window.setTimeout(close, 1200); } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat pembelian"); } finally { setSaving(false); } }}>
      <div className="document-header-fields"><label>Supplier<select name="supplier_id" required><option value="">Pilih supplier</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select></label><label>Toko penerima<select value={storeId} onChange={(event) => setStoreId(event.target.value)} required>{stores.map((store) => <option value={store.id} key={store.id}>{store.name}</option>)}</select></label></div>
      <DocumentItemLines products={products} lines={lines} onChange={setLines} storeId={storeId} showUnitCost/>
      <div className="document-cost-grid"><label>Ongkir<input type="number" min="0" value={shipping || ""} onChange={(event) => setShipping(Math.max(0, Number(event.target.value || 0)))}/></label><label>Diskon<input type="number" min="0" value={discount || ""} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value || 0)))}/></label><div className="document-total"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong><span>Total akhir</span><b>{formatCurrency(total)}</b></div></div>
      <label className="document-notes">Catatan<textarea name="notes" rows={3} placeholder="Nomor invoice supplier, termin, atau keterangan lain..."/></label>
      <div className="modal-actions document-actions"><button type="button" className="button secondary" onClick={close}>Batal</button><button className="button primary" disabled={saving}>{saving ? "Membuat..." : `Buat PO (${lines.filter((line) => line.product_id).length} produk)`}</button></div>
    </form>
  </div></div> : null}</>;
}

export function ReceivePurchaseButton({ id }: { id: string }) { const router = useRouter(); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); return <div><button className="table-action" disabled={saving} onClick={async () => { setSaving(true); setError(""); try { const response = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "receive", purchase_order_id: id }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal menerima barang"); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Gagal"); } finally { setSaving(false); } }}>{saving ? "Memproses..." : "Terima barang"}</button>{error ? <small className="negative">{error}</small> : null}</div>; }
