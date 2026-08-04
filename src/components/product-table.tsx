"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Layers3 } from "lucide-react";
import { CsvButton } from "@/components/export-buttons";
import { ProductModal } from "@/components/product-modal";
import { ProductVisual } from "@/components/product-visual";
import { StatusBadge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { Product, ProductVisual as ProductVisualType, Store } from "@/lib/types";

type Category = { id: string; name: string };

function priceRange(product: Product, field: "cost_price" | "selling_price") {
  const active = (product.variants ?? []).filter((variant) => variant.is_active);
  if (!active.length) return { min: Number(product[field] ?? 0), max: Number(product[field] ?? 0) };
  const values = active.map((variant) => Number(variant[field] ?? 0));
  return { min: Math.min(...values), max: Math.max(...values) };
}

function rangeLabel(product: Product, field: "cost_price" | "selling_price") {
  const range = priceRange(product, field);
  return range.min === range.max ? formatCurrency(range.min) : `${formatCurrency(range.min)} – ${formatCurrency(range.max)}`;
}

export function ProductTable({ products, categories, visuals, stores, canEdit }: { products: Product[]; categories: Category[]; visuals: ProductVisualType[]; stores: Store[]; canEdit: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = useMemo(() => products.filter((product) => {
    const variantText = (product.variants ?? []).map((variant) => `${variant.name} ${variant.sku ?? ""} ${variant.barcode ?? ""}`).join(" ");
    const text = `${product.name} ${product.sku} ${product.barcode ?? ""} ${product.brand ?? ""} ${variantText}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (!category || product.category === category) && (!status || (status === "active" ? product.is_active : !product.is_active));
  }), [products, query, category, status]);
  const rows = filtered.map((product) => ({
    Nama: product.name,
    SKU: product.sku,
    Barcode: product.barcode ?? "",
    Kategori: product.category ?? "",
    Merek: product.brand ?? "",
    Satuan: product.unit,
    JumlahVarian: product.variants?.length ?? 0,
    HargaJual: rangeLabel(product, "selling_price"),
    StokTotal: product.total_stock,
    Status: product.is_active ? "Aktif" : "Nonaktif",
    CabangJual: product.sales_scope === "selected" ? (product.sales_store_ids ?? []).map((id) => stores.find((store) => store.id === id)?.name).filter(Boolean).join(", ") : "Semua cabang",
    ...(canEdit ? { HargaModal: rangeLabel(product, "cost_price") } : {}),
  }));

  return <>
    <div className="toolbar-card"><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk, varian, SKU, barcode, atau merek..."/></div><select className="select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua kategori</option>{categories.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select><select className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select><CsvButton filename="master-produk-indotek" rows={rows} label="Ekspor produk"/></div>
    <div className="panel table-panel mobile-card-table product-master-table"><table><thead><tr><th>Produk</th><th>SKU / Barcode</th><th>Kategori</th><th>Modal</th><th>Harga jual</th><th>Stok total</th><th>Dijual di</th><th>Status</th><th/></tr></thead><tbody>
      {filtered.map((product) => {
        const variants = product.variants ?? [];
        const isExpanded = expanded === product.id;
        return <Fragment key={product.id}>
          <tr><td data-label="Produk"><div className="product-cell"><ProductVisual name={product.name} imageUrl={product.image_url} definition={product.visual?.code} size="thumb"/><div><strong>{product.name}</strong><span>{product.brand || `Satuan: ${product.unit}`}</span>{variants.length ? <button type="button" className="variant-count-button" onClick={() => setExpanded(isExpanded ? null : product.id)}><Layers3 size={13}/>{variants.length} varian {isExpanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</button> : null}</div></div></td><td data-label="SKU / Barcode"><strong>{product.sku}</strong><small>{product.barcode || (variants.length ? "Barcode per varian" : "Tanpa barcode")}</small></td><td data-label="Kategori">{product.category || "—"}</td><td data-label="Modal" className="restricted-value">{canEdit ? rangeLabel(product, "cost_price") : "Terkunci"}</td><td data-label="Harga jual"><strong>{rangeLabel(product, "selling_price")}</strong></td><td data-label="Stok total"><strong>{product.total_stock}</strong> {product.unit}</td><td data-label="Dijual di"><span className="product-sales-branch-label">{product.sales_scope === "selected" ? `${product.sales_store_ids?.length ?? 0} cabang` : "Semua cabang"}</span></td><td data-label="Status"><StatusBadge tone={product.is_active ? "success" : "neutral"}>{product.is_active ? "Aktif" : "Nonaktif"}</StatusBadge></td><td data-label="Aksi">{canEdit ? <ProductModal categories={categories} visuals={visuals} stores={stores} product={product}/> : null}</td></tr>
          {variants.length && isExpanded ? <tr className="product-variant-detail-row"><td colSpan={9}><div className="product-variant-detail"><header><div><strong>Varian {product.name}</strong><span>Stok menggunakan saldo produk induk.</span></div><small>{variants.filter((variant) => variant.is_active).length} aktif dari {variants.length}</small></header><div className="product-variant-detail-list">{variants.map((variant) => <article key={variant.id}><div><strong>{variant.name}</strong><span>{variant.sku || "Tanpa SKU"}{variant.barcode ? ` · ${variant.barcode}` : ""}</span></div>{canEdit ? <div><span>Modal</span><strong>{formatCurrency(variant.cost_price)}</strong></div> : null}<div><span>Jual</span><strong>{formatCurrency(variant.selling_price)}</strong></div><StatusBadge tone={variant.is_active ? "success" : "neutral"}>{variant.is_active ? "Aktif" : "Nonaktif"}</StatusBadge></article>)}</div></div></td></tr> : null}
        </Fragment>;
      })}
      {!filtered.length ? <tr><td colSpan={9}><div className="empty-inline">Produk tidak ditemukan.</div></td></tr> : null}
    </tbody></table></div>
  </>;
}
