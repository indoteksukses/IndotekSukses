"use client";

import { useMemo, useState } from "react";
import { Boxes } from "lucide-react";
import { CsvButton } from "@/components/export-buttons";
import { StatusBadge } from "@/components/ui";
import type { Product, Store } from "@/lib/types";

export function InventoryTable({ products, stores }: { products: Product[]; stores: Store[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean) as string[])].sort(), [products]);
  const state = (product: Product) => {
    const quantities = stores.map((store) => product.stocks[store.id]?.quantity_available ?? 0);
    const minimum = quantities.length ? Math.min(...quantities) : 0;
    return minimum === 0 ? "out" : minimum <= product.minimum_stock ? "low" : "safe";
  };
  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.sku} ${product.barcode ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (!category || product.category === category) && (!condition || state(product) === condition)), [products, query, category, condition, stores]);
  const rows = filtered.flatMap((product) => stores.map((store) => { const stock = product.stocks[store.id]; return { Produk: product.name, SKU: product.sku, Toko: store.name, KodeToko: store.code, StokFisik: stock?.quantity_on_hand ?? 0, Dipesan: stock?.quantity_reserved ?? 0, Tersedia: stock?.quantity_available ?? 0, Minimum: product.minimum_stock, Satuan: product.unit, Kondisi: stock?.stock_status ?? "out" }; }));

  return <>
    <div className="toolbar-card"><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk atau SKU..."/></div><select className="select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua kategori</option>{categories.map((name) => <option key={name}>{name}</option>)}</select><select className="select" value={condition} onChange={(event) => setCondition(event.target.value)}><option value="">Semua kondisi stok</option><option value="safe">Aman</option><option value="low">Menipis</option><option value="out">Habis</option></select><CsvButton filename="stok-indotek-sukses" rows={rows} label="Ekspor stok"/></div>
    <div className="panel table-panel inventory-table"><table><thead><tr><th className="sticky-col">Produk</th><th>Minimum</th>{stores.map((store) => <th key={store.id}><div className="store-head"><strong>{store.name}</strong><span>{store.code}</span></div></th>)}<th>Total</th><th>Kondisi</th></tr></thead><tbody>{filtered.map((product) => {
      const quantities = stores.map((store) => product.stocks[store.id]?.quantity_available ?? 0);
      const conditionValue = state(product);
      const tone = conditionValue === "out" ? "danger" : conditionValue === "low" ? "warning" : "success";
      return <tr key={product.id}><td className="sticky-col"><div className="product-cell"><div className="product-thumb"><Boxes size={20}/></div><div><strong>{product.name}</strong><span>{product.sku}</span></div></div></td><td>{product.minimum_stock} {product.unit}</td>{stores.map((store) => { const row = product.stocks[store.id]; return <td key={store.id}><div className="stock-number"><strong>{row?.quantity_on_hand ?? 0}</strong><span>{product.unit}{row?.quantity_reserved ? ` · ${row.quantity_reserved} dipesan` : ""}</span></div></td>; })}<td><strong>{quantities.reduce((sum, value) => sum + value, 0)}</strong></td><td><StatusBadge tone={tone}>{conditionValue === "out" ? "Ada yang habis" : conditionValue === "low" ? "Perlu restok" : "Aman"}</StatusBadge></td></tr>;
    })}{!filtered.length ? <tr><td colSpan={stores.length + 4}><div className="empty-inline">Stok tidak ditemukan.</div></td></tr> : null}</tbody></table></div>
  </>;
}
