"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Layers3, PackageOpen, Search } from "lucide-react";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("id-ID");
  const indexedProducts = useMemo(() => products.map((product) => ({
    product,
    searchText: `${product.name} ${product.sku} ${product.barcode ?? ""} ${product.brand ?? ""} ${(product.variants ?? []).map((variant) => `${variant.name} ${variant.sku ?? ""} ${variant.barcode ?? ""}`).join(" ")}`.toLocaleLowerCase("id-ID"),
  })), [products]);
  const filtered = useMemo(() => indexedProducts.filter(({ product, searchText }) =>
    (!normalizedQuery || searchText.includes(normalizedQuery))
    && (!category || product.category === category)
    && (!status || (status === "active" ? product.is_active : !product.is_active))
  ).map(({ product }) => product), [indexedProducts, normalizedQuery, category, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const pagedProducts = filtered.slice(pageStart, pageStart + pageSize);

  const storeNamesById = useMemo(() => new Map(stores.map((store) => [store.id, store.name])), [stores]);
  const rows = useMemo(() => filtered.map((product) => ({
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
    CabangJual: product.sales_scope === "selected" ? (product.sales_store_ids ?? []).map((id) => storeNamesById.get(id)).filter(Boolean).join(", ") : "Semua cabang",
    ...(canEdit ? { HargaModal: rangeLabel(product, "cost_price") } : {}),
  })), [filtered, storeNamesById, canEdit]);

  const resetView = () => { setPage(1); setExpanded(null); };
  const toggleExpanded = (productId: string) => setExpanded((current) => current === productId ? null : productId);

  return <>
    <div className="toolbar-card product-toolbar"><div className={`search-box ${query !== deferredQuery ? "is-busy" : ""}`}><Search size={18}/><input value={query} onChange={(event) => { setQuery(event.target.value); resetView(); }} placeholder="Cari produk, varian, SKU, barcode, atau merek..."/></div><select className="select" value={category} onChange={(event) => { setCategory(event.target.value); resetView(); }}><option value="">Semua kategori</option>{categories.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select><select className="select" value={status} onChange={(event) => { setStatus(event.target.value); resetView(); }}><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select><label className="product-page-size"><span>Per halaman</span><select className="select" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); resetView(); }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><CsvButton filename="master-produk-indotek" rows={rows} label="Ekspor produk"/></div><div className="product-result-summary"><strong>{filtered.length.toLocaleString("id-ID")}</strong><span>dari {products.length.toLocaleString("id-ID")} produk · menampilkan {filtered.length ? pageStart + 1 : 0}–{Math.min(pageStart + pageSize, filtered.length)}</span></div>

    <div className="product-mobile-list">
      {pagedProducts.map((product) => {
        const variants = product.variants ?? [];
        const isExpanded = expanded === product.id;
        return <article className="product-mobile-card" key={product.id}>
          <header className="product-mobile-card-head">
            <ProductVisual name={product.name} imageUrl={product.image_url} definition={product.visual?.code} size="thumb"/>
            <div className="product-mobile-title"><strong>{product.name}</strong><span>{product.brand || "Tanpa Merek"}</span></div>
            <div className="product-mobile-head-actions"><StatusBadge tone={product.is_active ? "success" : "neutral"}>{product.is_active ? "Aktif" : "Nonaktif"}</StatusBadge>{canEdit ? <div className="product-mobile-edit"><ProductModal categories={categories} visuals={visuals} stores={stores} product={product} label="Edit"/></div> : null}</div>
          </header>

          <div className="product-mobile-meta-grid">
            <div><span>SKU</span><strong>{product.sku}</strong><small>{product.barcode || (variants.length ? "Barcode per varian" : "Tanpa barcode")}</small></div>
            <div><span>Kategori</span><strong>{product.category || "Tanpa kategori"}</strong></div>
            {canEdit ? <div><span>Harga modal</span><strong>{rangeLabel(product, "cost_price")}</strong></div> : null}
            <div><span>Harga jual</span><strong className="product-mobile-selling">{rangeLabel(product, "selling_price")}</strong></div>
            <div><span>Stok total</span><strong>{product.total_stock.toLocaleString("id-ID")} {product.unit}</strong></div>
            <div><span>Dijual di</span><strong>{product.sales_scope === "selected" ? `${product.sales_store_ids?.length ?? 0} cabang` : "Semua cabang"}</strong></div>
          </div>

          {variants.length ? <button type="button" className="product-mobile-variant-toggle" onClick={() => toggleExpanded(product.id)}><span><Layers3 size={16}/><b>{variants.length} varian</b><small>{variants.filter((variant) => variant.is_active).length} aktif · stok terpisah per cabang</small></span>{isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button> : <div className="product-mobile-single-note"><PackageOpen size={15}/> Produk tunggal</div>}

          {variants.length && isExpanded ? <div className="product-mobile-variant-list">{variants.map((variant) => <article className="product-mobile-variant-card" key={variant.id}>
            <header><div><strong>{variant.name}</strong><span>{variant.sku || "Tanpa SKU"}{variant.barcode ? ` · ${variant.barcode}` : ""}</span></div><StatusBadge tone={variant.is_active ? "success" : "neutral"}>{variant.is_active ? "Aktif" : "Nonaktif"}</StatusBadge></header>
            <div className="product-mobile-variant-metrics">{canEdit ? <div><span>Modal</span><strong>{formatCurrency(variant.cost_price)}</strong></div> : null}<div><span>Harga jual</span><strong>{formatCurrency(variant.selling_price)}</strong></div><div><span>Stok total</span><strong>{variant.total_stock} {product.unit}</strong></div></div>
            <div className="product-mobile-branch-chips">{stores.map((store) => <span key={store.id}><b>{store.code}</b>{variant.stocks?.[store.id]?.quantity_available ?? 0} {product.unit}</span>)}</div>
          </article>)}</div> : null}
        </article>;
      })}
      {!filtered.length ? <div className="empty-inline product-mobile-empty">Produk tidak ditemukan.</div> : null}
    </div>

    <div className="panel table-panel product-master-table product-desktop-table"><table><thead><tr><th>Produk</th><th>SKU / Barcode</th><th>Kategori</th><th>Modal</th><th>Harga jual</th><th>Stok total</th><th>Dijual di</th><th>Status</th><th/></tr></thead><tbody>
      {pagedProducts.map((product) => {
        const variants = product.variants ?? [];
        const isExpanded = expanded === product.id;
        return <Fragment key={product.id}>
          <tr><td data-label="Produk"><div className="product-cell"><ProductVisual name={product.name} imageUrl={product.image_url} definition={product.visual?.code} size="thumb"/><div><strong>{product.name}</strong><span>{product.brand || `Satuan: ${product.unit}`}</span>{variants.length ? <button type="button" className="variant-count-button" onClick={() => toggleExpanded(product.id)}><Layers3 size={13}/>{variants.length} varian {isExpanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</button> : null}</div></div></td><td data-label="SKU / Barcode"><strong>{product.sku}</strong><small>{product.barcode || (variants.length ? "Barcode per varian" : "Tanpa barcode")}</small></td><td data-label="Kategori">{product.category || "—"}</td><td data-label="Modal" className="restricted-value">{canEdit ? rangeLabel(product, "cost_price") : "Terkunci"}</td><td data-label="Harga jual"><strong>{rangeLabel(product, "selling_price")}</strong></td><td data-label="Stok total"><strong>{product.total_stock}</strong> {product.unit}</td><td data-label="Dijual di"><span className="product-sales-branch-label">{product.sales_scope === "selected" ? `${product.sales_store_ids?.length ?? 0} cabang` : "Semua cabang"}</span></td><td data-label="Status"><StatusBadge tone={product.is_active ? "success" : "neutral"}>{product.is_active ? "Aktif" : "Nonaktif"}</StatusBadge></td><td data-label="Aksi">{canEdit ? <ProductModal categories={categories} visuals={visuals} stores={stores} product={product}/> : null}</td></tr>
          {variants.length && isExpanded ? <tr className="product-variant-detail-row"><td colSpan={9}><div className="product-variant-detail"><header><div><strong>Varian {product.name}</strong><span>Setiap varian memiliki stok terpisah pada setiap cabang.</span></div><small>{variants.filter((variant) => variant.is_active).length} aktif dari {variants.length}</small></header><div className="product-variant-detail-list">{variants.map((variant) => <article key={variant.id}><div><strong>{variant.name}</strong><span>{variant.sku || "Tanpa SKU"}{variant.barcode ? ` · ${variant.barcode}` : ""}</span></div>{canEdit ? <div><span>Modal</span><strong>{formatCurrency(variant.cost_price)}</strong></div> : null}<div><span>Jual</span><strong>{formatCurrency(variant.selling_price)}</strong></div><div className="variant-detail-stock"><span>Stok total</span><strong>{variant.total_stock} {product.unit}</strong></div><StatusBadge tone={variant.is_active ? "success" : "neutral"}>{variant.is_active ? "Aktif" : "Nonaktif"}</StatusBadge><div className="variant-detail-branches">{stores.map((store) => <span key={store.id}><b>{store.code}</b>{variant.stocks?.[store.id]?.quantity_available ?? 0} {product.unit}</span>)}</div></article>)}</div></div></td></tr> : null}
        </Fragment>;
      })}
      {!filtered.length ? <tr><td colSpan={9}><div className="empty-inline">Produk tidak ditemukan.</div></td></tr> : null}
    </tbody></table></div>

    <nav className="product-pagination" aria-label="Navigasi halaman produk">
      <button type="button" className="button secondary" disabled={safePage <= 1} onClick={() => setPage(Math.max(1, safePage - 1))}><ChevronLeft size={17}/>Sebelumnya</button>
      <div><strong>Halaman {safePage.toLocaleString("id-ID")}</strong><span>dari {pageCount.toLocaleString("id-ID")}</span></div>
      <button type="button" className="button secondary" disabled={safePage >= pageCount} onClick={() => setPage(Math.min(pageCount, safePage + 1))}>Selanjutnya<ChevronRight size={17}/></button>
    </nav>
  </>;
}
