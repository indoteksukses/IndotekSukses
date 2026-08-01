"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, X } from "lucide-react";
import { createDocumentLine, DocumentItemLines, type DocumentLine } from "@/components/document-item-lines";
import type { Product, Store } from "@/lib/types";

export function TransferManager({ stores, products }: { stores: Store[]; products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sourceStoreId, setSourceStoreId] = useState(stores[0]?.id ?? "");
  const [destinationStoreId, setDestinationStoreId] = useState(stores.find((store) => store.id !== stores[0]?.id)?.id ?? "");
  const [lines, setLines] = useState<DocumentLine[]>([createDocumentLine()]);

  const close = () => { setOpen(false); setError(""); setSuccess(""); };
  return <><button className="button primary" onClick={() => setOpen(true)}><Plus size={17}/> Buat transfer</button>{open ? <div className="modal-backdrop"><div className="modal-card document-modal"><div className="modal-header"><div><h2>Transfer stok antartoko</h2><p>Tambahkan beberapa produk dalam satu dokumen transfer.</p></div><button className="icon-button" onClick={close}><X size={20}/></button></div>
    {error ? <div className="alert error">{error}</div> : null}{success ? <div className="alert success"><CheckCircle2 size={17}/>{success}</div> : null}
    <form className="document-form" onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(""); setSuccess(""); const form = new FormData(event.currentTarget); const items = lines.filter((line) => line.product_id).map((line) => ({ product_id: line.product_id, quantity: line.quantity })); try { if (sourceStoreId === destinationStoreId) throw new Error("Toko asal dan tujuan harus berbeda."); if (!items.length) throw new Error("Tambahkan minimal satu produk."); const response = await fetch("/api/transfers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", source_store_id: sourceStoreId, destination_store_id: destinationStoreId, items, notes: form.get("notes") }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal membuat transfer"); setSuccess(`Transfer ${result.transfer_number || "baru"} berhasil dibuat.`); setLines([createDocumentLine()]); router.refresh(); window.setTimeout(close, 1200); } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat transfer"); } finally { setSaving(false); } }}>
      <div className="document-header-fields"><label>Toko asal<select value={sourceStoreId} onChange={(event) => setSourceStoreId(event.target.value)} required>{stores.map((store) => <option value={store.id} key={store.id}>{store.name}</option>)}</select></label><label>Toko tujuan<select value={destinationStoreId} onChange={(event) => setDestinationStoreId(event.target.value)} required>{stores.map((store) => <option value={store.id} key={store.id} disabled={store.id === sourceStoreId}>{store.name}</option>)}</select></label></div>
      <DocumentItemLines products={products} lines={lines} onChange={setLines} storeId={sourceStoreId}/>
      <label className="document-notes">Catatan<textarea name="notes" rows={3} placeholder="Contoh: Pemenuhan stok cabang pusat"/></label>
      <div className="modal-actions document-actions"><button type="button" className="button secondary" onClick={close}>Batal</button><button className="button primary" disabled={saving}>{saving ? "Membuat..." : `Buat transfer (${lines.filter((line) => line.product_id).length} produk)`}</button></div>
    </form>
  </div></div> : null}</>;
}

export function TransferAction({ id, action, label }: { id: string; action: "send" | "receive"; label: string }) { const router = useRouter(); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); return <div><button className="table-action" disabled={saving} onClick={async () => { setSaving(true); setError(""); try { const response = await fetch("/api/transfers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, transfer_id: id }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal memproses transfer"); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Gagal"); } finally { setSaving(false); } }}>{saving ? "Memproses..." : label}</button>{error ? <small className="negative">{error}</small> : null}</div>; }
