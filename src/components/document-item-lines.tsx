"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { ProductSearchSelect } from "@/components/product-search-select";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

export type DocumentLine = { key: string; product_id: string; quantity: number; unit_cost?: number };
export const createDocumentLine = (unitCost = 0): DocumentLine => ({ key: `${Date.now()}-${Math.random()}`, product_id: "", quantity: 1, unit_cost: unitCost });

export function DocumentItemLines({ products, lines, onChange, storeId, showUnitCost = false }: { products: Product[]; lines: DocumentLine[]; onChange: (lines: DocumentLine[]) => void; storeId?: string; showUnitCost?: boolean }) {
  const selected = new Set(lines.map((line) => line.product_id).filter(Boolean));
  const patch = (key: string, values: Partial<DocumentLine>) => onChange(lines.map((line) => line.key === key ? { ...line, ...values } : line));
  return <div className="document-lines">
    <div className={`document-line document-line-head ${showUnitCost ? "with-cost" : ""}`}><span>#</span><span>Produk</span><span>Jumlah</span>{showUnitCost ? <span>Harga beli</span> : <span>Stok asal</span>}<span/></div>
    {lines.map((line, index) => { const product = products.find((item) => item.id === line.product_id); return <div className={`document-line ${showUnitCost ? "with-cost" : ""}`} key={line.key}>
      <span className="batch-number">{index + 1}</span>
      <ProductSearchSelect products={products.filter((item) => item.id === line.product_id || !selected.has(item.id))} value={line.product_id} onChange={(product_id) => { const found = products.find((item) => item.id === product_id); patch(line.key, { product_id, ...(showUnitCost && !line.unit_cost ? { unit_cost: found?.cost_price ?? 0 } : {}) }); }} storeId={storeId}/>
      <div className="quantity-input"><button type="button" onClick={() => patch(line.key, { quantity: Math.max(1, line.quantity - 1) })}><Minus size={15}/></button><input type="number" min="1" step="1" value={line.quantity} onChange={(event) => patch(line.key, { quantity: Math.max(1, Math.floor(Number(event.target.value || 1))) })}/><button type="button" onClick={() => patch(line.key, { quantity: line.quantity + 1 })}><Plus size={15}/></button></div>
      {showUnitCost ? <div className="line-cost"><input aria-label="Harga beli per unit" type="number" min="0" step="1" value={line.unit_cost ?? 0} onChange={(event) => patch(line.key, { unit_cost: Math.max(0, Number(event.target.value || 0)) })}/><small>{formatCurrency(line.quantity * (line.unit_cost ?? 0))}</small></div> : <div className="batch-stock-info"><strong>{product && storeId ? `${product.stocks[storeId]?.quantity_available ?? 0} ${product.unit}` : "—"}</strong><span>tersedia</span></div>}
      <button type="button" className="icon-button batch-remove" disabled={lines.length === 1} onClick={() => onChange(lines.filter((item) => item.key !== line.key))}><Trash2 size={16}/></button>
    </div>; })}
    <button type="button" className="document-add-line" onClick={() => onChange([...lines, createDocumentLine()])}><Plus size={15}/> Tambah produk lain</button>
  </div>;
}
