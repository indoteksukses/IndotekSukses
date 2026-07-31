"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Minus, Plus } from "lucide-react";
import type { Movement, Product, Store } from "@/lib/types";
import { ProductSearchSelect } from "@/components/product-search-select";

const inReasons = [
  { v: "purchase", l: "Pembelian supplier" }, { v: "customer_return", l: "Retur pelanggan" },
  { v: "stocktake_adjustment", l: "Koreksi opname" }, { v: "opening", l: "Stok awal" }, { v: "manual_adjustment", l: "Penyesuaian lain" },
];
const outReasons = [
  { v: "damage", l: "Barang rusak" }, { v: "loss", l: "Barang hilang" },
  { v: "internal_use", l: "Pemakaian internal" }, { v: "supplier_return", l: "Retur supplier" }, { v: "stocktake_adjustment", l: "Koreksi opname" },
];

export function StockForm({ products, stores, defaultStoreId, onSaved }: { products: Product[]; stores: Store[]; defaultStoreId?: string; onSaved?: (movement: Movement) => void }) {
  const [type, setType] = useState<"in" | "out">("in");
  const [storeId, setStoreId] = useState(defaultStoreId ?? stores[0]?.id ?? "");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [movementType, setMovementType] = useState(inReasons[0].v);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const selectedProduct = useMemo(() => products.find((product) => product.id === productId), [products, productId]);

  const switchType = (next: "in" | "out") => { setType(next); setMovementType((next === "in" ? inReasons : outReasons)[0].v); setMessage(""); };

  return <div className="panel stock-entry-panel">
    <div className="panel-header"><div><h2>Catat pergerakan stok</h2><p>Form cepat dengan pencarian untuk katalog berukuran besar.</p></div></div>
    <div className="movement-tabs"><button type="button" className={type === "in" ? "active" : ""} onClick={() => switchType("in")}><ArrowDownToLine size={18}/> Stok masuk</button><button type="button" className={type === "out" ? "active" : ""} onClick={() => switchType("out")}><ArrowUpFromLine size={18}/> Stok keluar</button></div>
    <form className="form-grid stock-movement-form" onSubmit={async (event) => {
      event.preventDefault(); setSaving(true); setMessage("");
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      try {
        const response = await fetch("/api/stock/movement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ store_id: storeId, product_id: productId, quantity, movement_type: movementType, reference_type: form.get("reference_type"), reason: form.get("reason"), notes: form.get("notes") }) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal menyimpan stok");
        if (result.movement) onSaved?.(result.movement as Movement);
        setProductId(""); setQuantity(1); formElement.reset();
      } catch (err) { setMessage(err instanceof Error ? err.message : "Gagal menyimpan stok"); }
      finally { setSaving(false); }
    }}>
      <label>Toko<select value={storeId} onChange={(event) => setStoreId(event.target.value)} required>{stores.map((store) => <option key={store.id} value={store.id}>{store.name} ({store.code})</option>)}</select></label>
      <label>Alasan<select value={movementType} onChange={(event) => setMovementType(event.target.value)}>{(type === "in" ? inReasons : outReasons).map((option) => <option key={option.v} value={option.v}>{option.l}</option>)}</select></label>
      <label className="span-2">Produk<ProductSearchSelect products={products} value={productId} onChange={setProductId} storeId={storeId}/><input name="product_id" type="hidden" value={productId}/></label>
      <label>Jumlah<div className="quantity-input"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={16}/></button><input name="quantity" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.floor(Number(event.target.value || 1))))} required/><button type="button" onClick={() => setQuantity((value) => value + 1)}><Plus size={16}/></button></div><small>{selectedProduct ? `Satuan ${selectedProduct.unit} · stok saat ini ${selectedProduct.stocks[storeId]?.quantity_on_hand ?? 0}` : "Setiap klik menambah atau mengurangi 1"}</small></label>
      <label>Nomor referensi<input name="reference_type" placeholder="Nota / dokumen (opsional)"/></label>
      <label className="span-2">Alasan singkat<input name="reason" placeholder="Contoh: Pembelian nota INV-123" required/></label>
      <label className="span-2">Catatan<textarea name="notes" rows={3} placeholder="Keterangan tambahan untuk audit..."/></label>
      <div className="span-2 form-footer"><span className={message ? "negative" : ""}>{message || "Perubahan langsung tercatat pada aktivitas dan audit."}</span><button className="button primary" disabled={saving || !stores.length || !productId}>{saving ? "Menyimpan..." : "Simpan pergerakan"}</button></div>
    </form>
  </div>;
}
