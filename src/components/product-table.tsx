"use client";

import { useMemo, useState } from "react";
import { Boxes } from "lucide-react";
import { CsvButton } from "@/components/export-buttons";
import { ProductModal } from "@/components/product-modal";
import { StatusBadge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

type Category = { id: string; name: string };

export function ProductTable({ products, categories, canEdit }: { products: Product[]; categories: Category[]; canEdit: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const filtered = useMemo(() => products.filter((product) => {
    const text = `${product.name} ${product.sku} ${product.barcode ?? ""} ${product.brand ?? ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (!category || product.category === category) && (!status || (status === "active" ? product.is_active : !product.is_active));
  }), [products, query, category, status]);
  const rows = filtered.map((product) => ({ Nama: product.name, SKU: product.sku, Barcode: product.barcode ?? "", Kategori: product.category ?? "", Merek: product.brand ?? "", Satuan: product.unit, HargaJual: product.selling_price, StokTotal: product.total_stock, Status: product.is_active ? "Aktif" : "Nonaktif", ...(canEdit ? { HargaModal: product.cost_price } : {}) }));

  return <>
    <div className="toolbar-card"><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, SKU, atau barcode..."/></div><select className="select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua kategori</option>{categories.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select><select className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select><CsvButton filename="master-produk-indotek" rows={rows} label="Ekspor produk"/></div>
    <div className="panel table-panel"><table><thead><tr><th>Produk</th><th>SKU / Barcode</th><th>Kategori</th><th>Modal</th><th>Harga jual</th><th>Stok total</th><th>Status</th><th/></tr></thead><tbody>
      {filtered.map((product) => <tr key={product.id}><td><div className="product-cell"><div className="product-thumb"><Boxes size={20}/></div><div><strong>{product.name}</strong><span>{product.brand || `Satuan: ${product.unit}`}</span></div></div></td><td><strong>{product.sku}</strong><small>{product.barcode || "Tanpa barcode"}</small></td><td>{product.category || "—"}</td><td className="restricted-value">{canEdit ? formatCurrency(product.cost_price) : "Terkunci"}</td><td><strong>{formatCurrency(product.selling_price)}</strong></td><td><strong>{product.total_stock}</strong> {product.unit}</td><td><StatusBadge tone={product.is_active ? "success" : "neutral"}>{product.is_active ? "Aktif" : "Nonaktif"}</StatusBadge></td><td>{canEdit ? <ProductModal categories={categories} product={product}/> : null}</td></tr>)}
      {!filtered.length ? <tr><td colSpan={8}><div className="empty-inline">Produk tidak ditemukan.</div></td></tr> : null}
    </tbody></table></div>
  </>;
}
