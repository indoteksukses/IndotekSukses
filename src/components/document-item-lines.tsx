"use client";

import { Plus, Trash2 } from "lucide-react";
import { ProductSearchSelect } from "@/components/product-search-select";
import { QuantityStepper } from "@/components/quantity-stepper";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

export type DocumentLine = { key: string; product_id: string; quantity: number; unit_cost?: number };
export const createDocumentLine = (unitCost = 0): DocumentLine => ({ key: `${Date.now()}-${Math.random()}`, product_id: "", quantity: 1, unit_cost: unitCost });

export function DocumentItemLines({ products, lines, onChange, storeId, showUnitCost = false, hideAddButton = false }: { products: Product[]; lines: DocumentLine[]; onChange: (lines: DocumentLine[]) => void; storeId?: string; showUnitCost?: boolean; hideAddButton?: boolean }) {
  const selected = new Set(lines.map((line) => line.product_id).filter(Boolean));
  const patch = (key: string, values: Partial<DocumentLine>) => onChange(lines.map((line) => line.key === key ? { ...line, ...values } : line));
  const selectedCount = lines.filter((line) => line.product_id).length;
  const totalQuantity = lines.filter((line) => line.product_id).reduce((sum, line) => sum + line.quantity, 0);

  return <section className="document-products-section">
    <div className="document-products-header">
      <div><strong>Daftar produk</strong><span>Cari nama, SKU, atau barcode lalu tentukan jumlah.</span></div>
      <b>{selectedCount} produk · {totalQuantity} unit</b>
    </div>
    <div className={`document-line document-line-head ${showUnitCost ? "with-cost" : ""}`}><span>#</span><span>Produk</span><span>Jumlah</span>{showUnitCost ? <span>Harga beli</span> : <span>Stok asal</span>}<span>Aksi</span></div>
    <div className="document-line-list">
      {lines.map((line, index) => {
        const product = products.find((item) => item.id === line.product_id);
        const available = product && storeId ? product.stocks[storeId]?.quantity_available ?? 0 : 0;
        return <div className={`document-line ${showUnitCost ? "with-cost" : ""}`} key={line.key}>
          <span className="batch-number">{index + 1}</span>
          <div className="document-product-picker"><ProductSearchSelect products={products.filter((item) => item.id === line.product_id || !selected.has(item.id))} value={line.product_id} onChange={(product_id) => { const found = products.find((item) => item.id === product_id); patch(line.key, { product_id, ...(showUnitCost && !line.unit_cost ? { unit_cost: found?.cost_price ?? 0 } : {}) }); }} storeId={storeId}/></div>
          <QuantityStepper value={line.quantity} max={!showUnitCost && product ? Math.max(available, 1) : undefined} unit={product?.unit} ariaLabel={`Jumlah ${product?.name ?? `produk ${index + 1}`}`} onChange={(quantity) => patch(line.key, { quantity })}/>
          {showUnitCost ? <div className="line-cost"><label><span>Harga/unit</span><input aria-label="Harga beli per unit" type="number" min="0" step="1" value={line.unit_cost ?? 0} onChange={(event) => patch(line.key, { unit_cost: Math.max(0, Number(event.target.value || 0)) })}/></label><small>Subtotal {formatCurrency(line.quantity * (line.unit_cost ?? 0))}</small></div> : <div className="batch-stock-info"><span>Stok tersedia</span><strong>{product && storeId ? `${available} ${product.unit}` : "—"}</strong></div>}
          <button type="button" className="document-remove-line" disabled={lines.length === 1} onClick={() => onChange(lines.filter((item) => item.key !== line.key))}><Trash2 size={16}/><span>Hapus</span></button>
        </div>;
      })}
    </div>
    {!hideAddButton ? <button type="button" className="document-add-line" onClick={() => onChange([...lines, createDocumentLine()])}><Plus size={15}/> Tambah produk lain</button> : null}
  </section>;
}
