"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Minus, Plus, Trash2 } from "lucide-react";
import type { Movement, Product, Store } from "@/lib/types";
import { ProductSearchSelect } from "@/components/product-search-select";

const inReasons = [
  { v: "purchase", l: "Pembelian supplier" }, { v: "customer_return", l: "Retur pelanggan" },
  { v: "stocktake_adjustment", l: "Koreksi opname" }, { v: "opening", l: "Stok awal" }, { v: "manual_adjustment", l: "Penyesuaian lain" },
];
const outReasons = [
  { v: "damage", l: "Barang rusak" }, { v: "loss", l: "Barang hilang" },
  { v: "internal_use", l: "Pemakaian internal" }, { v: "supplier_return", l: "Retur supplier" }, { v: "stocktake_adjustment", l: "Koreksi opname" }, { v: "manual_adjustment", l: "Penyesuaian lain" },
];

type Line = { key: string; product_id: string; quantity: number };
const newLine = (): Line => ({ key: `${Date.now()}-${Math.random()}`, product_id: "", quantity: 1 });

export function StockForm({ products, stores, defaultStoreId, onSaved }: { products: Product[]; stores: Store[]; defaultStoreId?: string; onSaved?: (movements: Movement[]) => void }) {
  const [type, setType] = useState<"in" | "out">("in");
  const [storeId, setStoreId] = useState(defaultStoreId ?? stores[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [movementType, setMovementType] = useState(inReasons[0].v);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const selectedIds = useMemo(() => new Set(lines.map((line) => line.product_id).filter(Boolean)), [lines]);

  const switchType = (next: "in" | "out") => { setType(next); setMovementType((next === "in" ? inReasons : outReasons)[0].v); setMessage(""); };
  const updateLine = (key: string, patch: Partial<Line>) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  const reset = () => setLines([newLine()]);

  return <div className="panel stock-entry-panel">
    <div className="panel-header"><div><h2>Catat pergerakan stok</h2><p>Tambahkan beberapa produk dalam satu dokumen dan simpan sekaligus.</p></div></div>
    <div className="movement-tabs"><button type="button" className={type === "in" ? "active" : ""} onClick={() => switchType("in")}><ArrowDownToLine size={18}/> Stok masuk</button><button type="button" className={type === "out" ? "active" : ""} onClick={() => switchType("out")}><ArrowUpFromLine size={18}/> Stok keluar</button></div>
    <form className="form-grid stock-movement-form" onSubmit={async (event) => {
      event.preventDefault(); setSaving(true); setMessage("");
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      const validLines = lines.filter((line) => line.product_id && line.quantity > 0);
      if (!validLines.length) { setMessage("Tambahkan minimal satu produk."); setSaving(false); return; }
      if (new Set(validLines.map((line) => line.product_id)).size !== validLines.length) { setMessage("Produk yang sama tidak boleh ditambahkan dua kali."); setSaving(false); return; }
      try {
        const response = await fetch("/api/stock/movement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ store_id: storeId, direction: type, items: validLines.map(({ product_id, quantity }) => ({ product_id, quantity })), movement_type: movementType, reference_label: form.get("reference_label"), reason: form.get("reason"), notes: form.get("notes") }) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal menyimpan stok");
        onSaved?.((result.movements ?? []) as Movement[]);
        reset(); formElement.reset();
      } catch (err) { setMessage(err instanceof Error ? err.message : "Gagal menyimpan stok"); }
      finally { setSaving(false); }
    }}>
      <label>Toko<select value={storeId} onChange={(event) => setStoreId(event.target.value)} required>{stores.map((store) => <option key={store.id} value={store.id}>{store.name} ({store.code})</option>)}</select></label>
      <label>Alasan<select value={movementType} onChange={(event) => setMovementType(event.target.value)}>{(type === "in" ? inReasons : outReasons).map((option) => <option key={option.v} value={option.v}>{option.l}</option>)}</select></label>
      <div className="span-2 batch-items-section"><div className="batch-items-heading"><div><strong>Daftar produk</strong><span>{lines.filter((line) => line.product_id).length} produk dipilih</span></div><button type="button" className="button secondary compact-button" onClick={() => setLines((current) => [...current, newLine()])}><Plus size={15}/> Tambah produk</button></div>
        <div className="batch-item-list">{lines.map((line, index) => { const product = products.find((item) => item.id === line.product_id); return <div className="batch-item-row" key={line.key}><span className="batch-number">{index + 1}</span><div className="batch-product-select"><ProductSearchSelect products={products.filter((item) => item.id === line.product_id || !selectedIds.has(item.id))} value={line.product_id} onChange={(product_id) => updateLine(line.key, { product_id })} storeId={storeId}/></div><div className="quantity-input"><button type="button" onClick={() => updateLine(line.key, { quantity: Math.max(1, line.quantity - 1) })}><Minus size={16}/></button><input aria-label={`Jumlah produk ${index + 1}`} type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: Math.max(1, Math.floor(Number(event.target.value || 1))) })}/><button type="button" onClick={() => updateLine(line.key, { quantity: line.quantity + 1 })}><Plus size={16}/></button></div><div className="batch-stock-info"><strong>{product ? `${product.stocks[storeId]?.quantity_on_hand ?? 0} ${product.unit}` : "—"}</strong><span>stok saat ini</span></div><button type="button" className="icon-button batch-remove" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}><Trash2 size={16}/></button></div>; })}</div>
      </div>
      <label>Nomor referensi<input name="reference_label" placeholder="Nota / dokumen (opsional)"/></label>
      <label>Alasan singkat<input name="reason" placeholder="Contoh: Pembelian nota INV-123" required/></label>
      <label className="span-2">Catatan<textarea name="notes" rows={3} placeholder="Keterangan tambahan untuk seluruh produk dalam dokumen ini..."/></label>
      <div className="span-2 form-footer"><span className={message ? "negative" : ""}>{message || "Semua baris disimpan secara atomik dan langsung masuk audit."}</span><button className="button primary" disabled={saving || !stores.length || !lines.some((line) => line.product_id)}>{saving ? "Menyimpan..." : `Simpan ${lines.filter((line) => line.product_id).length || ""} pergerakan`}</button></div>
    </form>
  </div>;
}
