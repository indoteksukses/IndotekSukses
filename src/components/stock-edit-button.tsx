"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, X } from "lucide-react";
import type { Product, Store } from "@/lib/types";
import { LoadingSpinner } from "@/components/loading-spinner";

export function StockEditButton({ product, store, onSaved }: { product: Product; store: Store; onSaved?: (quantity: number) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const current = product.stocks[store.id]?.quantity_on_hand ?? 0;
  return <>
    <button className="stock-edit-button" title={`Edit stok ${product.name} di ${store.name}`} onClick={() => setOpen(true)}><PencilLine size={14}/></button>
    {open ? <div className="modal-backdrop"><div className="modal-card small-modal"><div className="modal-header"><div><h2>Edit saldo stok</h2><p>Perubahan tetap disimpan sebagai pergerakan dan masuk ke audit.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <div className="stock-edit-summary"><strong>{product.name}</strong><span>{store.name} · stok saat ini {current} {product.unit}</span></div>
      {error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); try { const response = await fetch("/api/stock/level", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ store_id: store.id, product_id: product.id, target_quantity: Number(form.get("target_quantity")), reason: form.get("reason") }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal mengedit stok"); const target = Number(form.get("target_quantity")); onSaved?.(target); setOpen(false); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Gagal mengedit stok"); } finally { setSaving(false); } }}>
        <label className="span-2">Stok akhir<input name="target_quantity" type="number" min="0" step="1" defaultValue={current} required autoFocus/></label>
        <label className="span-2">Alasan perubahan<textarea name="reason" rows={3} required placeholder="Contoh: Penyesuaian setelah hitung fisik"/></label>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? <><LoadingSpinner/><span>Menyimpan...</span></> : "Simpan stok"}</button></div>
      </form>
    </div></div> : null}
  </>;
}
