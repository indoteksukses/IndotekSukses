"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronUp, Image, Images, Link2, Plus, Save, Trash2, X } from "lucide-react";
import { ProductVisual } from "@/components/product-visual";
import { LoadingSpinner } from "@/components/loading-spinner";
import { formatCurrency } from "@/lib/format";
import type { Product, ProductVariant, ProductVisual as ProductVisualType, Store } from "@/lib/types";

type VisualMode = "image" | "visual" | "none";
type VariantDraft = {
  key: string;
  id?: string;
  name: string;
  sku: string;
  barcode: string;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
};

type SavedProduct = {
  id: string;
  category_id: string;
  brand: string;
  image_url?: string | null;
  visual_id?: string | null;
  variants?: ProductVariant[];
};

const makeVariant = (index = 0): VariantDraft => ({
  key: `${Date.now()}-${Math.random()}`,
  name: `Varian ${index + 1}`,
  sku: "",
  barcode: "",
  cost_price: 0,
  selling_price: 0,
  is_active: true,
});

const fromProduct = (product?: Product): VariantDraft[] => (product?.variants ?? []).map((variant) => ({
  key: variant.id,
  id: variant.id,
  name: variant.name,
  sku: variant.sku ?? "",
  barcode: variant.barcode ?? "",
  cost_price: Number(variant.cost_price ?? 0),
  selling_price: Number(variant.selling_price ?? 0),
  is_active: variant.is_active,
}));

function initialVisualMode(product?: Product): VisualMode {
  if (product?.image_url) return "image";
  if (product?.visual_id) return "visual";
  return "none";
}

function readResponse(raw: string) {
  try { return raw ? JSON.parse(raw) : {}; }
  catch { return { error: raw || "Respons server tidak valid" }; }
}

export function ProductModal({ categories, visuals, stores, product, label }: { categories: Array<{ id: string; name: string }>; visuals: ProductVisualType[]; stores: Store[]; product?: Product; label?: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [brand, setBrand] = useState(product?.brand || "Tanpa Merek");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [visualId, setVisualId] = useState(product?.visual_id ?? visuals[0]?.id ?? "");
  const [visualMode, setVisualMode] = useState<VisualMode>(initialVisualMode(product));
  const [salesScope, setSalesScope] = useState<"all" | "selected">(product?.sales_scope === "selected" ? "selected" : "all");
  const [salesStoreIds, setSalesStoreIds] = useState<string[]>(product?.sales_store_ids?.length ? product.sales_store_ids : stores.map((store) => store.id));
  const [variantMode, setVariantMode] = useState((product?.variants?.length ?? 0) > 0);
  const [variants, setVariants] = useState<VariantDraft[]>(fromProduct(product));
  const [variantDetailsOpen, setVariantDetailsOpen] = useState(true);
  const [baseCost, setBaseCost] = useState(Number(product?.cost_price ?? 0));
  const [baseSelling, setBaseSelling] = useState(Number(product?.selling_price ?? 0));
  const selectedVisual = useMemo(() => visuals.find((visual) => visual.id === visualId), [visuals, visualId]);

  const resetEditor = () => {
    setError("");
    setCategoryId(product?.category_id ?? "");
    setBrand(product?.brand || "Tanpa Merek");
    setImageUrl(product?.image_url ?? "");
    setVisualId(product?.visual_id ?? visuals[0]?.id ?? "");
    setVisualMode(initialVisualMode(product));
    setSalesScope(product?.sales_scope === "selected" ? "selected" : "all");
    setSalesStoreIds(product?.sales_store_ids?.length ? product.sales_store_ids : stores.map((store) => store.id));
    const existing = fromProduct(product);
    setVariantMode(existing.length > 0);
    setVariants(existing);
    setVariantDetailsOpen(true);
    setBaseCost(Number(product?.cost_price ?? 0));
    setBaseSelling(Number(product?.selling_price ?? 0));
  };

  const openEditor = () => { resetEditor(); setOpen(true); };
  const toggleStore = (storeId: string) => setSalesStoreIds((current) => current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId]);
  const chooseMode = (mode: VisualMode) => { setVisualMode(mode); if (mode === "visual" && !visualId) setVisualId(visuals[0]?.id ?? ""); };
  const patchVariant = (key: string, patch: Partial<VariantDraft>) => setVariants((current) => current.map((variant) => variant.key === key ? { ...variant, ...patch } : variant));
  const addVariant = () => { setVariants((current) => [...current, makeVariant(current.length)]); setVariantDetailsOpen(true); };
  const removeVariant = (key: string) => setVariants((current) => current.filter((variant) => variant.key !== key));
  const activeVariants = variants.filter((variant) => variant.is_active);
  const priceSummary = activeVariants.length ? {
    min: Math.min(...activeVariants.map((variant) => Number(variant.selling_price || 0))),
    max: Math.max(...activeVariants.map((variant) => Number(variant.selling_price || 0))),
  } : null;

  const previewImage = visualMode === "image" ? imageUrl.trim() || null : null;
  const previewDefinition = visualMode === "visual" ? selectedVisual?.code : undefined;

  return <>
    <button className={product ? "table-action" : "button primary"} onClick={openEditor}>{label ?? (product ? "Edit" : "+ Tambah Produk")}</button>
    {open ? <div className="modal-backdrop"><div className="modal-card product-form-modal product-form-modal-variants"><div className="modal-header"><div><h2>{product ? "Edit produk" : "Tambah produk"}</h2><p>Kelola produk tunggal atau beberapa varian dalam satu tampilan yang ringkas.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      {error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError("");
        const values = Object.fromEntries(new FormData(event.currentTarget).entries());
        try {
          if (!categoryId) throw new Error("Pilih kategori produk.");
          if (!brand.trim()) throw new Error("Merek produk wajib diisi. Gunakan “Tanpa Merek” jika tidak diketahui.");
          if (salesScope === "selected" && !salesStoreIds.length) throw new Error("Pilih minimal satu cabang tempat produk dijual.");
          if (visualMode === "image" && !imageUrl.trim()) throw new Error("Masukkan URL gambar atau pilih sumber visual lain.");
          if (visualMode === "visual" && !visualId) throw new Error("Pilih visual produk.");
          if (variantMode) {
            if (!variants.length) throw new Error("Tambahkan minimal satu varian.");
            if (!activeVariants.length) throw new Error("Minimal satu varian harus aktif.");
            if (variants.some((variant) => !variant.name.trim())) throw new Error("Nama setiap varian wajib diisi.");
            if (variants.some((variant) => variant.cost_price < 0 || variant.selling_price < 0)) throw new Error("Harga varian tidak boleh negatif.");
            const names = variants.map((variant) => variant.name.trim().toLowerCase());
            if (new Set(names).size !== names.length) throw new Error("Nama varian tidak boleh sama.");
            const skus = variants.map((variant) => variant.sku.trim().toUpperCase()).filter(Boolean);
            if (new Set(skus).size !== skus.length) throw new Error("SKU varian tidak boleh sama.");
            const barcodes = variants.map((variant) => variant.barcode.trim()).filter(Boolean);
            if (new Set(barcodes).size !== barcodes.length) throw new Error("Barcode varian tidak boleh sama.");
          }

          const expectedVisualId = visualMode === "visual" ? visualId : null;
          const fallbackVariant = activeVariants[0];
          const payload = {
            ...values,
            id: product?.id,
            category_id: categoryId,
            brand: brand.trim(),
            cost_price: variantMode ? Number(fallbackVariant?.cost_price ?? 0) : baseCost,
            selling_price: variantMode ? Number(fallbackVariant?.selling_price ?? 0) : baseSelling,
            image_url: visualMode === "image" ? imageUrl.trim() : null,
            visual_id: expectedVisualId,
            is_active: values.is_active === "on",
            sales_scope: salesScope,
            sales_store_ids: salesScope === "selected" ? salesStoreIds : [],
            has_variants: variantMode,
            variants: variantMode ? variants.map((variant, index) => ({
              id: variant.id,
              name: variant.name.trim(),
              sku: variant.sku.trim().toUpperCase() || null,
              barcode: variant.barcode.trim() || null,
              cost_price: Number(variant.cost_price || 0),
              selling_price: Number(variant.selling_price || 0),
              is_active: variant.is_active,
              sort_order: index,
            })) : [],
          };

          const response = await fetch("/api/products", { method: product ? "PATCH" : "POST", headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, cache: "no-store", body: JSON.stringify(payload) });
          const result = readResponse(await response.text());
          if (!response.ok) throw new Error(result.error || "Gagal menyimpan produk");
          const saved = result.product as SavedProduct | undefined;
          if (!saved?.id) throw new Error("Server tidak mengembalikan produk yang tersimpan.");
          if (String(saved.category_id) !== categoryId) throw new Error("Kategori belum tersimpan ke database.");
          if (String(saved.brand ?? "").trim() !== brand.trim()) throw new Error("Merek belum tersimpan dengan benar.");
          if ((saved.visual_id ?? null) !== expectedVisualId) throw new Error("Visual kode belum tersimpan ke database.");
          if ((saved.variants?.length ?? 0) !== (variantMode ? variants.length : 0)) throw new Error("Daftar varian belum tersimpan lengkap.");
          setOpen(false);
          window.location.replace(`/products?saved=${encodeURIComponent(saved.id)}&updated=${Date.now()}`);
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan produk"); }
        finally { setSaving(false); }
      }}>
        <label className="span-2">Nama produk<input name="name" defaultValue={product?.name ?? ""} required placeholder="Contoh: Gerinda Tangan Modern"/></label>
        <label>SKU produk<input name="sku" defaultValue={product?.sku ?? ""} required placeholder="GRD-MOD-001"/></label><label>Barcode produk<input name="barcode" defaultValue={product?.barcode ?? ""} placeholder="Opsional jika barcode ada pada varian"/></label>
        <label>Kategori<select name="category_id" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required><option value="" disabled>Pilih kategori</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label>Merek<input name="brand" value={brand} onChange={(event) => setBrand(event.target.value)} required placeholder="Contoh: Modern"/></label>

        <section className="span-2 product-variant-editor">
          <div className="product-variant-header"><div><strong>Harga dan varian</strong><span>Pilih produk tunggal atau beberapa varian dengan harga masing-masing.</span></div><div className="product-variant-mode"><button type="button" className={!variantMode ? "active" : ""} onClick={() => setVariantMode(false)}>Produk tunggal</button><button type="button" className={variantMode ? "active" : ""} onClick={() => { setVariantMode(true); if (!variants.length) setVariants([makeVariant(0)]); }}>Memiliki varian</button></div></div>
          {!variantMode ? <div className="product-single-price-grid"><label>Harga modal<input type="number" min="0" step="1" value={baseCost || ""} onChange={(event) => setBaseCost(Math.max(0, Number(event.target.value || 0)))}/></label><label>Harga jual<input type="number" min="0" step="1" value={baseSelling || ""} onChange={(event) => setBaseSelling(Math.max(0, Number(event.target.value || 0)))}/></label></div> : <>
            <div className="variant-summary-bar"><button type="button" onClick={() => setVariantDetailsOpen((current) => !current)}>{variantDetailsOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}<span><strong>{variants.length} varian</strong><small>{priceSummary ? `${formatCurrency(priceSummary.min)}${priceSummary.min !== priceSummary.max ? ` – ${formatCurrency(priceSummary.max)}` : ""}` : "Belum ada harga aktif"}</small></span></button><button type="button" className="button secondary compact-button" onClick={addVariant}><Plus size={15}/> Tambah varian</button></div>
            {variantDetailsOpen ? <div className="variant-editor-list">{variants.map((variant, index) => <article className="variant-editor-row" key={variant.key}><span className="variant-order">{index + 1}</span><label className="variant-name">Nama varian<input value={variant.name} onChange={(event) => patchVariant(variant.key, { name: event.target.value })} placeholder="Contoh: 4 inch"/></label><label>SKU varian<input value={variant.sku} onChange={(event) => patchVariant(variant.key, { sku: event.target.value })} placeholder="Opsional"/></label><label>Barcode<input value={variant.barcode} onChange={(event) => patchVariant(variant.key, { barcode: event.target.value })} placeholder="Opsional"/></label><label>Harga modal<input type="number" min="0" step="1" value={variant.cost_price || ""} onChange={(event) => patchVariant(variant.key, { cost_price: Math.max(0, Number(event.target.value || 0)) })}/></label><label>Harga jual<input type="number" min="0" step="1" value={variant.selling_price || ""} onChange={(event) => patchVariant(variant.key, { selling_price: Math.max(0, Number(event.target.value || 0)) })}/></label><label className="variant-active"><input type="checkbox" checked={variant.is_active} onChange={(event) => patchVariant(variant.key, { is_active: event.target.checked })}/><span>Aktif</span></label><button type="button" className="variant-remove" disabled={variants.length === 1} onClick={() => removeVariant(variant.key)} title="Hapus varian"><Trash2 size={16}/></button></article>)}</div> : null}
            <div className="variant-stock-note">Stok tetap mengikuti produk induk agar pengelolaan stok dan transfer tetap ringkas. Harga transaksi mengikuti varian yang dipilih.</div>
          </>}
        </section>

        <label>Satuan<select name="unit" defaultValue={product?.unit ?? "pcs"}><option value="pcs">Pcs</option><option value="box">Box</option><option value="unit">Unit</option><option value="meter">Meter</option><option value="pack">Pack</option><option value="set">Set</option><option value="kg">Kg</option></select></label><label>Minimum stok<input name="minimum_stock" type="number" min="0" step="1" defaultValue={product?.minimum_stock ?? 5}/></label>

        <section className="span-2 product-sales-availability"><div className="product-sales-heading"><Building2 size={18}/><div><strong>Cabang penjualan</strong><span>Tentukan apakah produk tersedia di seluruh cabang atau cabang tertentu.</span></div></div><div className="product-sales-scope-buttons"><button type="button" className={salesScope === "all" ? "active" : ""} onClick={() => { setSalesScope("all"); setSalesStoreIds(stores.map((store) => store.id)); }}>Semua cabang</button><button type="button" className={salesScope === "selected" ? "active" : ""} onClick={() => setSalesScope("selected")}>Cabang tertentu</button></div>{salesScope === "selected" ? <div className="product-sales-store-grid">{stores.map((store) => <label className={salesStoreIds.includes(store.id) ? "selected" : ""} key={store.id}><input type="checkbox" checked={salesStoreIds.includes(store.id)} onChange={() => toggleStore(store.id)}/><span><strong>{store.name}</strong><small>{store.code}</small></span></label>)}</div> : <div className="product-sales-all-note">Produk akan muncul di kasir seluruh cabang aktif.</div>}</section>

        <section className="span-2 product-appearance-editor-v231"><div className="product-appearance-fields-v231"><div className="appearance-heading"><Image size={17}/><div><strong>Gambar & visual produk</strong><span>Pilih satu sumber gambar.</span></div></div><div className="product-visual-source-tabs"><button type="button" className={visualMode === "image" ? "active" : ""} onClick={() => chooseMode("image")}><Link2 size={15}/> URL gambar</button><button type="button" className={visualMode === "visual" ? "active" : ""} onClick={() => chooseMode("visual")}><Images size={15}/> Visual kode</button><button type="button" className={visualMode === "none" ? "active" : ""} onClick={() => chooseMode("none")}><X size={15}/> Tanpa pilihan</button></div>{visualMode === "image" ? <label>URL gambar produk<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..."/></label> : null}{visualMode === "visual" ? <label>Visual ringan berbasis kode<select value={visualId} onChange={(event) => setVisualId(event.target.value)}><option value="" disabled>Pilih visual</option>{visuals.map((visual) => <option key={visual.id} value={visual.id}>{visual.name}</option>)}</select></label> : null}</div><div className="product-preview-panel-v231"><span>Pratinjau</span><ProductVisual name={product?.name || "Produk"} imageUrl={previewImage} definition={previewDefinition} size="preview"/><small>{visualMode === "image" ? "URL gambar" : visualMode === "visual" ? selectedVisual?.name ?? "Visual kode" : "Visual umum"}</small></div></section>
        <label className="checkbox-field span-2"><input name="is_active" type="checkbox" defaultChecked={product?.is_active ?? true}/><span>Produk aktif dan dapat digunakan dalam sistem</span></label>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? <LoadingSpinner/> : <Save size={16}/>}<span>{saving ? "Menyimpan..." : "Simpan produk"}</span></button></div>
      </form>
    </div></div> : null}
  </>;
}
