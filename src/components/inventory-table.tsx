"use client";

import { Fragment, useEffect, useDeferredValue, useMemo, useState } from "react";
import { ArrowRightLeft, CheckCircle2, ChevronLeft, ChevronRight, FileText, Layers3, Loader2, PencilLine, Search, Sparkles, X } from "lucide-react";
import { CriticalStockModal } from "@/components/critical-stock-modal";
import { CsvButton } from "@/components/export-buttons";
import { ProductVisual } from "@/components/product-visual";
import { StockEditModal } from "@/components/stock-edit-button";
import { TransferRequestModal } from "@/components/transfer-request-button";
import { StatusBadge } from "@/components/ui";
import { executeAISearch } from "@/lib/ai-search-client";
import type { AIMatchItem, Product, ProductVariant, Store, SystemSettings, UserProfile } from "@/lib/types";

function calculateStockCondition(product: Product, stores: Store[]): "out" | "low" | "safe" {
  const variants = product.variants;
  let lowest = Infinity;
  if (variants && variants.length > 0) {
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.is_active) continue;
      for (let s = 0; s < stores.length; s++) {
        const qty = v.stocks?.[stores[s].id]?.quantity_available ?? 0;
        if (qty < lowest) lowest = qty;
        if (lowest === 0) return "out";
      }
    }
  } else {
    for (let s = 0; s < stores.length; s++) {
      const qty = product.stocks[stores[s].id]?.quantity_available ?? 0;
      if (qty < lowest) lowest = qty;
      if (lowest === 0) return "out";
    }
  }
  if (lowest === Infinity) return "out";
  return lowest <= product.minimum_stock ? "low" : "safe";
}

function calculateVariantCondition(variant: ProductVariant, stores: Store[], minimumStock: number): "out" | "low" | "safe" {
  let lowest = Infinity;
  for (let s = 0; s < stores.length; s++) {
    const qty = variant.stocks?.[stores[s].id]?.quantity_available ?? 0;
    if (qty < lowest) lowest = qty;
    if (lowest === 0) return "out";
  }
  if (lowest === Infinity) return "out";
  return lowest <= minimumStock ? "low" : "safe";
}

function tone(value: string): "danger" | "warning" | "success" {
  return value === "out" ? "danger" : value === "low" ? "warning" : "success";
}

function label(value: string) {
  return value === "out" ? "Ada yang habis" : value === "low" ? "Perlu restok" : "Aman";
}

export function InventoryTable({
  products,
  stores,
  editableStoreIds = [],
  requestDestinationStoreIds = [],
  settings,
  profile,
}: {
  products: Product[];
  stores: Store[];
  editableStoreIds?: string[];
  requestDestinationStoreIds?: string[];
  settings?: SystemSettings | null;
  profile?: UserProfile | null;
}) {
  const [items, setItems] = useState<Product[]>(products);

  useEffect(() => {
    setItems(products);
  }, [products]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [condition, setCondition] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [toast, setToast] = useState("");
  const [editingStock, setEditingStock] = useState<{ product: Product; variant?: ProductVariant | null; store: Store } | null>(null);
  const [requestProduct, setRequestProduct] = useState<Product | null>(null);
  const [showCriticalPdfModal, setShowCriticalPdfModal] = useState(false);

  // AI Search states
  const [aiSearching, setAiSearching] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [aiMatches, setAiMatches] = useState<AIMatchItem[]>([]);
  const [aiInterpretation, setAiInterpretation] = useState("");
  const [aiError, setAiError] = useState("");

  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("id-ID");

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  };

  const categories = useMemo(
    () => [...new Set(items.map((product) => product.category).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "id")),
    [items],
  );
  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const p of items) {
      const b = p.brand?.trim();
      if (b) set.add(b);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [items]);
  const editable = useMemo(() => new Set(editableStoreIds), [editableStoreIds]);
  const aiMatchMap = useMemo(() => new Map(aiMatches.map((m) => [m.product_id, m])), [aiMatches]);

  const indexedProducts = useMemo(() => items.map((product) => {
    const variants = (product.variants ?? []).filter((variant) => variant.is_active);
    const state = calculateStockCondition(product, stores);
    const variantText = variants.map((variant) => `${variant.name} ${variant.sku ?? ""} ${variant.barcode ?? ""}`).join(" ");
    return {
      product,
      state,
      searchText: `${product.name} ${product.sku} ${product.barcode ?? ""} ${product.brand ?? ""} ${variantText}`.toLocaleLowerCase("id-ID"),
    };
  }), [items, stores]);

  const filteredEntries = useMemo(() => {
    if (aiActive && aiMatches.length > 0) {
      const entryMap = new Map(indexedProducts.map((entry) => [entry.product.id, entry]));
      const list: typeof indexedProducts = [];
      for (const m of aiMatches) {
        const entry = entryMap.get(m.product_id);
        if (entry && !list.includes(entry)) {
          if ((!category || entry.product.category === category)
            && (!brandFilter || (entry.product.brand?.trim() || "Tanpa Merek") === brandFilter)
            && (!condition || entry.state === condition)) {
            list.push(entry);
          }
        }
      }
      return list;
    }

    return indexedProducts.filter(({ product, searchText, state }) =>
      (!normalizedQuery || searchText.includes(normalizedQuery))
      && (!category || product.category === category)
      && (!brandFilter || (product.brand?.trim() || "Tanpa Merek") === brandFilter)
      && (!condition || state === condition)
    );
  }, [aiActive, aiMatches, indexedProducts, normalizedQuery, category, brandFilter, condition]);

  const filtered = useMemo(() => filteredEntries.map(({ product }) => product), [filteredEntries]);
  const stateByProductId = useMemo(() => new Map(filteredEntries.map(({ product, state }) => [product.id, state])), [filteredEntries]);

  const handleAISearch = async (manualQuery?: string) => {
    const q = (typeof manualQuery === "string" ? manualQuery : query).trim();
    if (!q) return;

    setAiSearching(true);
    setAiError("");
    try {
      const res = await executeAISearch(q);
      if (!res.success) {
        setAiError(res.error || "Pencarian AI gagal");
        return;
      }
      setAiInterpretation(res.interpretation || "");
      setAiMatches(res.matches || []);
      setAiActive(true);
      setPage(1);
      if (!res.matches || res.matches.length === 0) {
        setAiError(`AI tidak menemukan produk yang pas untuk "${q}". Coba jelaskan fungsinya dengan kalimat lain.`);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Pencarian AI gagal");
    } finally {
      setAiSearching(false);
    }
  };

  const clearAISearch = () => {
    setAiActive(false);
    setAiMatches([]);
    setAiInterpretation("");
    setAiError("");
    setQuery("");
    setPage(1);
  };

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const pagedProducts = filtered.slice(pageStart, pageStart + pageSize);

  const getRows = () => filtered.flatMap((product) => {
    const variants = (product.variants ?? []).filter((variant) => variant.is_active);
    const items: Array<{ variant: ProductVariant | null; name: string; sku: string }> = variants.length
      ? variants.map((variant) => ({ variant, name: `${product.name} · ${variant.name}`, sku: variant.sku || product.sku }))
      : [{ variant: null, name: product.name, sku: product.sku }];
    return items.flatMap(({ variant, name, sku }) => stores.map((store) => {
      const stock = variant ? variant.stocks?.[store.id] : product.stocks[store.id];
      return {
        Produk: name,
        SKU: sku,
        Merek: product.brand || "",
        Toko: store.name,
        KodeToko: store.code,
        StokFisik: stock?.quantity_on_hand ?? 0,
        Dipesan: stock?.quantity_reserved ?? 0,
        Tersedia: stock?.quantity_available ?? 0,
        Minimum: product.minimum_stock,
        Satuan: product.unit,
        Kondisi: stock?.stock_status ?? "out",
      };
    }));
  });

  const variantStoreRows = (product: Product, variant: ProductVariant) => stores.map((store) => {
    const row = variant.stocks?.[store.id];
    return (
      <div className="inventory-mobile-branch" key={store.id}>
        <div><strong>{store.name}</strong><span>{store.code}</span></div>
        <div className="inventory-mobile-stock"><strong>{row?.quantity_on_hand ?? 0} <small>{product.unit}</small></strong><span>{row?.quantity_reserved ? `${row.quantity_reserved} dipesan` : "Stok tersedia"}</span></div>
        {editable.has(store.id) ? (
          <button
            type="button"
            className="stock-edit-button"
            title={`Edit stok ${product.name} · ${variant.name} di ${store.name}`}
            onClick={() => setEditingStock({ product, variant, store })}
          >
            <PencilLine size={14}/>
          </button>
        ) : null}
      </div>
    );
  });

  return <>
    <div className="toolbar-card inventory-toolbar">
      <div className="inventory-toolbar-top">
        <div className={`search-box ${query !== deferredQuery ? "is-busy" : ""}`}>
          <Search size={18}/>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
              if (aiActive) {
                setAiActive(false);
                setAiMatches([]);
                setAiInterpretation("");
                setAiError("");
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && query.trim()) {
                event.preventDefault();
                handleAISearch();
              }
            }}
            placeholder="Cari produk, varian, barcode, SKU, merek, atau sebutan apa saja..."
          />
          <button
            type="button"
            className={`table-ai-btn ${aiActive ? "is-active" : ""} ${aiSearching ? "is-searching" : ""}`}
            title="Pencarian Cerdas AI (Pahami istilah slang, fungsi barang, atau sebutan pembeli)"
            onClick={() => handleAISearch()}
            disabled={aiSearching}
          >
            {aiSearching ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
            <span>{aiSearching ? "AI..." : "AI"}</span>
          </button>
        </div>
        <div className="inventory-toolbar-filters">
          <select className="select" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">Semua kategori</option>{categories.map((name) => <option key={name}>{name}</option>)}</select>
          <select className="select" value={brandFilter} onChange={(event) => { setBrandFilter(event.target.value); setPage(1); }}><option value="">Semua merek</option>{brands.map((name) => <option key={name}>{name}</option>)}</select>
          <select className="select" value={condition} onChange={(event) => { setCondition(event.target.value); setPage(1); }}><option value="">Semua kondisi stok</option><option value="safe">Aman</option><option value="low">Menipis</option><option value="out">Habis</option></select>
        </div>
      </div>
      <div className="inventory-toolbar-bottom">
        <label className="product-page-size"><span>Per halaman</span><select className="select compact" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
        <div className="inventory-toolbar-actions">
          <button
            type="button"
            className="button primary inventory-pdf-button"
            onClick={() => setShowCriticalPdfModal(true)}
            title="Buka pratinjau dan ekspor laporan PDF stok produk menipis & habis"
          >
            <FileText size={16}/> Ekspor PDF Stok Kritis
          </button>
          <CsvButton filename="stok-indotek-sukses" getRows={getRows} disabled={!filtered.length} label="Ekspor stok (CSV)"/>
        </div>
      </div>
    </div>

    {aiError ? (
      <div className="alert error table-ai-error" style={{ margin: "10px 0" }}>
        {aiError}
      </div>
    ) : null}

    <div className="product-result-summary inventory-result-summary"><strong>{filtered.length.toLocaleString("id-ID")}</strong><span>dari {products.length.toLocaleString("id-ID")} produk · menampilkan {filtered.length ? pageStart + 1 : 0}–{Math.min(pageStart + pageSize, filtered.length)}</span></div>

    <div className="inventory-mobile-list">
      {pagedProducts.map((product) => {
        const variants = (product.variants ?? []).filter((variant) => variant.is_active);
        const total = stores.reduce((sum, store) => sum + (product.stocks[store.id]?.quantity_available ?? 0), 0);
        const conditionValue = stateByProductId.get(product.id) ?? "out";
        const aiMatch = aiMatchMap.get(product.id);
        return <article className={`inventory-mobile-card ${aiMatch ? "is-ai-matched" : ""}`} key={product.id}>
          <header><ProductVisual name={product.name} imageUrl={product.image_url} definition={product.visual?.code} size="thumb"/><div><strong>{product.name}</strong>{aiMatch?.variant_name ? <span className="table-row-ai-badge" title={`Varian: ${aiMatch.variant_name}`}><Sparkles size={11} /><span>Varian: {aiMatch.variant_name}</span></span> : null}<div className="inventory-mobile-tags"><span className={`inventory-brand-pill ${!product.brand ? "muted" : ""}`}>{product.brand || "Tanpa Merek"}</span><span>{product.sku}{variants.length ? ` · ${variants.length} varian` : ""}</span></div></div></header>
          <div className="inventory-mobile-metrics"><div><span>Minimum</span><strong>{product.minimum_stock} <small>{product.unit}</small></strong></div><div><span>Total</span><strong>{total} <small>{product.unit}</small></strong></div><div className="inventory-condition"><span>Kondisi</span><StatusBadge tone={tone(conditionValue)}>{label(conditionValue)}</StatusBadge></div></div>
          {variants.length ? <div className="variant-inventory-mobile-list">{variants.map((variant) => {
            const variantTotal = stores.reduce((sum, store) => sum + (variant.stocks?.[store.id]?.quantity_on_hand ?? 0), 0);
            const variantCondition = calculateVariantCondition(variant, stores, product.minimum_stock);
            return <section className="variant-inventory-mobile-card" key={variant.id}><header><div className="variant-mobile-title-wrap"><ProductVisual name={`${product.name} - ${variant.name}`} imageUrl={product.image_url} definition={product.visual?.code} size="thumb" animated={false}/><span><strong>{variant.name}</strong><div className="variant-mobile-meta-tags"><span className={`inventory-brand-pill variant ${!product.brand ? "muted" : ""}`}>{product.brand || "Tanpa Merek"}</span><small>{variant.sku || "Tanpa SKU varian"}</small></div></span></div><div><b>{variantTotal} {product.unit}</b><StatusBadge tone={tone(variantCondition)}>{label(variantCondition)}</StatusBadge></div></header><div className="inventory-mobile-branches">{variantStoreRows(product, variant)}</div></section>;
          })}</div> : <div className="inventory-mobile-branches">{stores.map((store) => {
            const row = product.stocks[store.id];
            return <div className="inventory-mobile-branch" key={store.id}><div><strong>{store.name}</strong><span>{store.code}</span></div><div className="inventory-mobile-stock"><strong>{row?.quantity_on_hand ?? 0} <small>{product.unit}</small></strong><span>{row?.quantity_reserved ? `${row.quantity_reserved} dipesan` : "Stok tersedia"}</span></div>{editable.has(store.id) ? (
              <button
                type="button"
                className="stock-edit-button"
                title={`Edit stok ${product.name} di ${store.name}`}
                onClick={() => setEditingStock({ product, store })}
              >
                <PencilLine size={14}/>
              </button>
            ) : null}</div>;
          })}</div>}
          {requestDestinationStoreIds.length ? (
            <div className="inventory-mobile-request">
              <button type="button" className="inventory-request-button" onClick={() => setRequestProduct(product)}>
                <ArrowRightLeft size={14}/> Minta stok
              </button>
            </div>
          ) : null}
        </article>;
      })}
      {!filtered.length ? <div className="empty-inline">Stok tidak ditemukan.</div> : null}
    </div>

    <div className="panel table-panel inventory-table variant-inventory-table"><table><thead><tr><th className="sticky-col">Produk / varian</th><th>Minimum</th>{stores.map((store) => <th key={store.id}><div className="store-head"><strong>{store.name}</strong><span>{store.code}</span></div></th>)}<th>Total</th><th>Kondisi</th><th>Permintaan</th></tr></thead><tbody>
      {pagedProducts.map((product) => {
        const variants = (product.variants ?? []).filter((variant) => variant.is_active);
        const productCondition = stateByProductId.get(product.id) ?? "out";
        const aiMatch = aiMatchMap.get(product.id);
        return <Fragment key={product.id}>
          <tr className={`${variants.length ? "inventory-product-summary-row" : ""} ${aiMatch ? "table-row-ai-match" : ""}`}><td className="sticky-col" data-label="Produk"><div className="product-cell"><ProductVisual name={product.name} imageUrl={product.image_url} definition={product.visual?.code} size="thumb"/><div><strong>{product.name}</strong>{aiMatch?.variant_name ? <span className="table-row-ai-badge" title={`Varian: ${aiMatch.variant_name}`}><Sparkles size={11} /><span>Varian: {aiMatch.variant_name}</span></span> : null}<div className="inventory-product-meta"><span className={`inventory-brand-pill ${!product.brand ? "muted" : ""}`}>{product.brand || "Tanpa Merek"}</span><span>{product.sku}{variants.length ? ` · ${variants.length} varian` : ""}</span></div></div></div></td><td data-label="Minimum">{product.minimum_stock} {product.unit}</td>{stores.map((store) => {
            const row = product.stocks[store.id];
            return <td key={store.id} data-label={store.name}><div className="stock-number stock-number-editable"><div><strong>{row?.quantity_on_hand ?? 0}</strong><span>{product.unit}</span></div>{!variants.length && editable.has(store.id) ? (
              <button
                type="button"
                className="stock-edit-button"
                title={`Edit stok ${product.name} di ${store.name}`}
                onClick={() => setEditingStock({ product, store })}
              >
                <PencilLine size={14}/>
              </button>
            ) : null}</div></td>;
          })}<td data-label="Total"><strong>{product.total_stock}</strong></td><td data-label="Kondisi"><StatusBadge tone={tone(productCondition)}>{label(productCondition)}</StatusBadge></td><td data-label="Permintaan">{requestDestinationStoreIds.length ? (
            <button type="button" className="inventory-request-button" onClick={() => setRequestProduct(product)}>
              <ArrowRightLeft size={14}/> Minta stok
            </button>
          ) : "—"}</td></tr>
          {variants.map((variant) => {
            const variantCondition = calculateVariantCondition(variant, stores, product.minimum_stock);
            return <tr className="inventory-variant-row" key={variant.id}><td className="sticky-col" data-label="Varian"><div className="inventory-variant-name"><ProductVisual name={`${product.name} - ${variant.name}`} imageUrl={product.image_url} definition={product.visual?.code} size="thumb" animated={false}/><div><strong>{variant.name}</strong><div className="inventory-variant-meta"><span className={`inventory-brand-pill variant ${!product.brand ? "muted" : ""}`}>{product.brand || "Tanpa Merek"}</span><span>{variant.sku || "Tanpa SKU varian"}</span></div></div></div></td><td data-label="Minimum">{product.minimum_stock} {product.unit}</td>{stores.map((store) => {
              const row = variant.stocks?.[store.id];
              return <td key={store.id} data-label={store.name}><div className="stock-number stock-number-editable"><div><strong>{row?.quantity_on_hand ?? 0}</strong><span>{product.unit}</span></div>{editable.has(store.id) ? (
                <button
                  type="button"
                  className="stock-edit-button"
                  title={`Edit stok ${product.name} · ${variant.name} di ${store.name}`}
                  onClick={() => setEditingStock({ product, variant, store })}
                >
                  <PencilLine size={14}/>
                </button>
              ) : null}</div></td>;
            })}<td data-label="Total"><strong>{variant.total_stock}</strong></td><td data-label="Kondisi"><StatusBadge tone={tone(variantCondition)}>{label(variantCondition)}</StatusBadge></td><td data-label="Permintaan">—</td></tr>;
          })}
        </Fragment>;
      })}
      {!filtered.length ? <tr><td colSpan={stores.length + 5}><div className="empty-inline">Stok tidak ditemukan.</div></td></tr> : null}
    </tbody></table></div>

    <nav className="product-pagination inventory-pagination" aria-label="Navigasi halaman stok">
      <button type="button" className="button secondary" disabled={safePage <= 1} onClick={() => setPage(Math.max(1, safePage - 1))}><ChevronLeft size={17}/>Sebelumnya</button>
      <div><strong>Halaman {safePage.toLocaleString("id-ID")}</strong><span>dari {pageCount.toLocaleString("id-ID")}</span></div>
      <button type="button" className="button secondary" disabled={safePage >= pageCount} onClick={() => setPage(Math.min(pageCount, safePage + 1))}>Selanjutnya<ChevronRight size={17}/></button>
    </nav>

    {toast ? <div className="toast success"><CheckCircle2 size={20}/><div><strong>Stok berhasil diperbarui</strong><span>{toast}</span></div><button onClick={() => setToast("")}><X size={16}/></button></div> : null}

    {editingStock ? (
      <StockEditModal
        product={editingStock.product}
        variant={editingStock.variant}
        store={editingStock.store}
        isOpen={Boolean(editingStock)}
        onClose={() => setEditingStock(null)}
        onSaved={(quantity) => {
          const itemLabel = editingStock.variant ? `${editingStock.product.name} · ${editingStock.variant.name}` : editingStock.product.name;
          notify(`Stok ${itemLabel} di ${editingStock.store.name} menjadi ${quantity} ${editingStock.product.unit}.`);
          setItems((current) => current.map((p) => {
            if (p.id !== editingStock.product.id) return p;
            if (editingStock.variant) {
              const updatedVariants = (p.variants ?? []).map((v) => {
                if (v.id !== editingStock.variant!.id) return v;
                const prev = v.stocks?.[editingStock.store.id] ?? { quantity_on_hand: 0, quantity_reserved: 0, quantity_available: 0 };
                const diff = quantity - prev.quantity_on_hand;
                return {
                  ...v,
                  total_stock: v.total_stock + diff,
                  stocks: {
                    ...v.stocks,
                    [editingStock.store.id]: {
                      ...prev,
                      quantity_on_hand: quantity,
                      quantity_available: Math.max(0, quantity - (prev.quantity_reserved ?? 0)),
                    },
                  },
                };
              });
              const newTotalStock = updatedVariants.reduce((sum, v) => sum + v.total_stock, 0);
              return { ...p, variants: updatedVariants, total_stock: newTotalStock };
            } else {
              const prev = p.stocks[editingStock.store.id] ?? { quantity_on_hand: 0, quantity_reserved: 0, quantity_available: 0 };
              const diff = quantity - prev.quantity_on_hand;
              return {
                ...p,
                total_stock: p.total_stock + diff,
                stocks: {
                  ...p.stocks,
                  [editingStock.store.id]: {
                    ...prev,
                    quantity_on_hand: quantity,
                    quantity_available: Math.max(0, quantity - (prev.quantity_reserved ?? 0)),
                  },
                },
              };
            }
          }));
          setEditingStock(null);
        }}
      />
    ) : null}

    {requestProduct ? (
      <TransferRequestModal
        product={requestProduct}
        stores={stores}
        destinationStoreIds={requestDestinationStoreIds}
        isOpen={Boolean(requestProduct)}
        onClose={() => setRequestProduct(null)}
      />
    ) : null}

    {showCriticalPdfModal ? (
      <CriticalStockModal
        isOpen={showCriticalPdfModal}
        onClose={() => setShowCriticalPdfModal(false)}
        products={items}
        stores={stores}
        settings={settings}
        profile={profile}
        initialCategory={category}
        initialBrand={brandFilter}
      />
    ) : null}
  </>;
}
