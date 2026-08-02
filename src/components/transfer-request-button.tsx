"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, CheckCircle2, X } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import type { Product, Store } from "@/lib/types";

export function TransferRequestButton({ product, stores, destinationStoreIds }: { product: Product; stores: Store[]; destinationStoreIds: string[] }) {
  const destinations = stores.filter((store) => destinationStoreIds.includes(store.id));
  const sourceCandidates = useMemo(() => stores
    .filter((store) => !destinationStoreIds.includes(store.id) && (product.stocks[store.id]?.quantity_available ?? 0) > 0)
    .sort((a, b) => (product.stocks[b.id]?.quantity_available ?? 0) - (product.stocks[a.id]?.quantity_available ?? 0)), [stores, destinationStoreIds, product]);
  const [open, setOpen] = useState(false);
  const [destinationId, setDestinationId] = useState(destinations[0]?.id ?? "");
  const [sourceId, setSourceId] = useState(sourceCandidates[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const ownStock = destinationId ? product.stocks[destinationId]?.quantity_available ?? 0 : 0;
  if (!destinations.length || !sourceCandidates.length) return null;

  return <>
    <button type="button" className="inventory-request-button" onClick={() => { setOpen(true); setMessage(""); }}><ArrowRightLeft size={14}/> Minta stok</button>
    {open ? <div className="modal-backdrop"><div className="modal-card transfer-request-modal">
      <div className="modal-header"><div><h2>Permintaan transfer stok</h2><p>Laporkan stok cabang yang habis atau menipis dan pilih cabang sumber.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <div className="transfer-request-product"><strong>{product.name}</strong><span>{product.sku} · stok cabang tujuan {ownStock} {product.unit}</span></div>
      {message ? <div className={message.includes("berhasil") ? "alert success" : "alert error"}>{message.includes("berhasil") ? <CheckCircle2 size={17}/> : null}{message}</div> : null}
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setMessage("");
        try {
          const response = await fetch("/api/transfer-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: product.id, source_store_id: sourceId, destination_store_id: destinationId, quantity, notes }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Gagal membuat permintaan transfer.");
          setMessage(`Permintaan ${result.request_number ?? "transfer"} berhasil dikirim.`);
          window.setTimeout(() => setOpen(false), 1200);
        } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal membuat permintaan transfer."); }
        finally { setSaving(false); }
      }}>
        <label>Cabang tujuan<select value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>{destinations.map((store) => <option key={store.id} value={store.id}>{store.name} ({product.stocks[store.id]?.quantity_available ?? 0} {product.unit})</option>)}</select></label>
        <label>Rekomendasi cabang sumber<select value={sourceId} onChange={(event) => setSourceId(event.target.value)}>{sourceCandidates.map((store) => <option key={store.id} value={store.id}>{store.name} · tersedia {product.stocks[store.id]?.quantity_available ?? 0} {product.unit}</option>)}</select></label>
        <label>Jumlah diminta<input type="number" min="1" max={Math.max(1, product.stocks[sourceId]?.quantity_available ?? 1)} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))}/></label>
        <label>Catatan<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Contoh: stok habis, kebutuhan pelanggan"/></label>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? <><LoadingSpinner/><span>Mengirim...</span></> : "Kirim permintaan"}</button></div>
      </form>
    </div></div> : null}
  </>;
}
