"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { CsvButton } from "@/components/export-buttons";
import { StatusBadge } from "@/components/ui";
import { StockEditButton } from "@/components/stock-edit-button";
import { ProductVisual } from "@/components/product-visual";
import { TransferRequestButton } from "@/components/transfer-request-button";
import type { Product, Store } from "@/lib/types";

export function InventoryTable({ products, stores, editableStoreIds = [], requestDestinationStoreIds = [] }: { products: Product[]; stores: Store[]; editableStoreIds?: string[]; requestDestinationStoreIds?: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [toast, setToast] = useState("");
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3500); };
  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean) as string[])].sort(), [products]);
  const editable = useMemo(() => new Set(editableStoreIds), [editableStoreIds]);
  const state = (product: Product) => {
    const quantities = stores.map((store) => product.stocks[store.id]?.quantity_available ?? 0);
    const minimum = quantities.length ? Math.min(...quantities) : 0;
    return minimum === 0 ? "out" : minimum <= product.minimum_stock ? "low" : "safe";
  };
  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.sku} ${product.barcode ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (!category || product.category === category) && (!condition || state(product) === condition)), [products, query, category, condition, stores]);
  const rows = filtered.flatMap((product) => stores.map((store) => { const stock = product.stocks[store.id]; return { Produk: product.name, SKU: product.sku, Toko: store.name, KodeToko: store.code, StokFisik: stock?.quantity_on_hand ?? 0, Dipesan: stock?.quantity_reserved ?? 0, Tersedia: stock?.quantity_available ?? 0, Minimum: product.minimum_stock, Satuan: product.unit, Kondisi: stock?.stock_status ?? "out" }; }));

  return <>
    <div className="toolbar-card"><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk atau SKU..."/></div><select className="select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua kategori</option>{categories.map((name) => <option key={name}>{name}</option>)}</select><select className="select" value={condition} onChange={(event) => setCondition(event.target.value)}><option value="">Semua kondisi stok</option><option value="safe">Aman</option><option value="low">Menipis</option><option value="out">Habis</option></select><CsvButton filename="stok-indotek-sukses" rows={rows} label="Ekspor stok"/></div>

    <div className="inventory-mobile-list">
      {filtered.map((product) => {
        const quantities = stores.map((store) => product.stocks[store.id]?.quantity_available ?? 0);
        const total = quantities.reduce((sum, value) => sum + value, 0);
        const conditionValue = state(product);
        const tone = conditionValue === "out" ? "danger" : conditionValue === "low" ? "warning" : "success";
        return <article className="inventory-mobile-card" key={product.id}>
          <header><ProductVisual name={product.name} imageUrl={product.image_url} definition={product.visual?.code} size="thumb"/><div><strong>{product.name}</strong><span>{product.sku}</span></div></header>
          <div className="inventory-mobile-metrics">
            <div><span>Minimum</span><strong>{product.minimum_stock} <small>{product.unit}</small></strong></div>
            <div><span>Total</span><strong>{total} <small>{product.unit}</small></strong></div>
            <div className="inventory-condition"><span>Kondisi</span><StatusBadge tone={tone}>{conditionValue === "out" ? "Ada yang habis" : conditionValue === "low" ? "Perlu restok" : "Aman"}</StatusBadge></div>
          </div>
          <div className="inventory-mobile-branches">{stores.map((store) => { const row = product.stocks[store.id]; return <div className="inventory-mobile-branch" key={store.id}><div><strong>{store.name}</strong><span>{store.code}</span></div><div className="inventory-mobile-stock"><strong>{row?.quantity_on_hand ?? 0} <small>{product.unit}</small></strong>{row?.quantity_reserved ? <span>{row.quantity_reserved} dipesan</span> : <span>Stok tersedia</span>}</div>{editable.has(store.id) ? <StockEditButton product={product} store={store} onSaved={(quantity) => notify(`Stok ${product.name} di ${store.name} berhasil diubah menjadi ${quantity} ${product.unit}.`)}/> : null}</div>; })}</div>
          {requestDestinationStoreIds.length ? <div className="inventory-mobile-request"><TransferRequestButton product={product} stores={stores} destinationStoreIds={requestDestinationStoreIds}/></div> : null}
        </article>;
      })}
      {!filtered.length ? <div className="empty-inline">Stok tidak ditemukan.</div> : null}
    </div>

    <div className="panel table-panel inventory-table"><table><thead><tr><th className="sticky-col">Produk</th><th>Minimum</th>{stores.map((store) => <th key={store.id}><div className="store-head"><strong>{store.name}</strong><span>{store.code}</span></div></th>)}<th>Total</th><th>Kondisi</th><th>Permintaan</th></tr></thead><tbody>{filtered.map((product) => {
      const quantities = stores.map((store) => product.stocks[store.id]?.quantity_available ?? 0);
      const conditionValue = state(product);
      const tone = conditionValue === "out" ? "danger" : conditionValue === "low" ? "warning" : "success";
      return <tr key={product.id}><td className="sticky-col" data-label="Produk"><div className="product-cell"><ProductVisual name={product.name} imageUrl={product.image_url} definition={product.visual?.code} size="thumb"/><div><strong>{product.name}</strong><span>{product.sku}</span></div></div></td><td data-label="Minimum">{product.minimum_stock} {product.unit}</td>{stores.map((store) => { const row = product.stocks[store.id]; return <td key={store.id} data-label={store.name}><div className="stock-number stock-number-editable"><div><strong>{row?.quantity_on_hand ?? 0}</strong><span>{product.unit}{row?.quantity_reserved ? ` · ${row.quantity_reserved} dipesan` : ""}</span></div>{editable.has(store.id) ? <StockEditButton product={product} store={store} onSaved={(quantity) => notify(`Stok ${product.name} di ${store.name} berhasil diubah menjadi ${quantity} ${product.unit}.`)}/> : null}</div></td>; })}<td data-label="Total"><strong>{quantities.reduce((sum, value) => sum + value, 0)}</strong></td><td data-label="Kondisi"><StatusBadge tone={tone}>{conditionValue === "out" ? "Ada yang habis" : conditionValue === "low" ? "Perlu restok" : "Aman"}</StatusBadge></td><td data-label="Permintaan">{requestDestinationStoreIds.length ? <TransferRequestButton product={product} stores={stores} destinationStoreIds={requestDestinationStoreIds}/> : "—"}</td></tr>;
    })}{!filtered.length ? <tr><td colSpan={stores.length + 5}><div className="empty-inline">Stok tidak ditemukan.</div></td></tr> : null}</tbody></table></div>
    {toast ? <div className="toast success"><CheckCircle2 size={20}/><div><strong>Stok berhasil diperbarui</strong><span>{toast}</span></div><button onClick={() => setToast("")}><X size={16}/></button></div> : null}
  </>;
}
