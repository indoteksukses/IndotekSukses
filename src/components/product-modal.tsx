"use client";

import { useMemo, useState } from "react";
import { Building2, Image, Images, Link2, Save, X } from "lucide-react";
import { ProductVisual } from "@/components/product-visual";
import { LoadingSpinner } from "@/components/loading-spinner";
import type { Product, ProductVisual as ProductVisualType, Store } from "@/lib/types";

type VisualMode = "image" | "visual" | "none";

type SavedProduct = {
  id: string;
  category_id: string;
  category_name?: string | null;
  brand: string;
  image_url?: string | null;
  visual_id?: string | null;
  visual_name?: string | null;
};

function initialVisualMode(product?: Product): VisualMode {
  if (product?.image_url) return "image";
  if (product?.visual_id) return "visual";
  return "none";
}

function readResponse(raw: string) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { error: raw || "Respons server tidak valid" };
  }
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
  const selectedVisual = useMemo(() => visuals.find((visual) => visual.id === visualId), [visuals, visualId]);

  const openEditor = () => {
    setError("");
    setCategoryId(product?.category_id ?? "");
    setBrand(product?.brand || "Tanpa Merek");
    setImageUrl(product?.image_url ?? "");
    setVisualId(product?.visual_id ?? visuals[0]?.id ?? "");
    setVisualMode(initialVisualMode(product));
    setSalesScope(product?.sales_scope === "selected" ? "selected" : "all");
    setSalesStoreIds(product?.sales_store_ids?.length ? product.sales_store_ids : stores.map((store) => store.id));
    setOpen(true);
  };

  const toggleStore = (storeId: string) => {
    setSalesStoreIds((current) => current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId]);
  };

  const chooseMode = (mode: VisualMode) => {
    setVisualMode(mode);
    if (mode === "visual" && !visualId) setVisualId(visuals[0]?.id ?? "");
  };

  const previewImage = visualMode === "image" ? imageUrl.trim() || null : null;
  const previewDefinition = visualMode === "visual" ? selectedVisual?.code : undefined;

  return <>
    <button className={product ? "table-action" : "button primary"} onClick={openEditor}>{label ?? (product ? "Edit" : "+ Tambah Produk")}</button>
    {open ? <div className="modal-backdrop"><div className="modal-card product-form-modal"><div className="modal-header"><div><h2>{product ? "Edit produk" : "Tambah produk"}</h2><p>Kategori, merek, harga, cabang penjualan, dan visual disimpan langsung pada data produk.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      {error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        const values = Object.fromEntries(new FormData(event.currentTarget).entries());
        try {
          if (!categoryId) throw new Error("Pilih kategori produk.");
          if (!brand.trim()) throw new Error("Merek produk wajib diisi. Gunakan “Tanpa Merek” jika tidak diketahui.");
          if (salesScope === "selected" && !salesStoreIds.length) throw new Error("Pilih minimal satu cabang tempat produk dijual.");
          if (visualMode === "image" && !imageUrl.trim()) throw new Error("Masukkan URL gambar atau pilih sumber visual lain.");
          if (visualMode === "visual" && !visualId) throw new Error("Pilih visual produk.");

          const expectedVisualId = visualMode === "visual" ? visualId : null;
          const payload = {
            ...values,
            id: product?.id,
            category_id: categoryId,
            brand: brand.trim(),
            image_url: visualMode === "image" ? imageUrl.trim() : null,
            visual_id: expectedVisualId,
            is_active: values.is_active === "on",
            sales_scope: salesScope,
            sales_store_ids: salesScope === "selected" ? salesStoreIds : [],
          };

          const response = await fetch("/api/products", {
            method: product ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            cache: "no-store",
            body: JSON.stringify(payload),
          });
          const result = readResponse(await response.text());
          if (!response.ok) throw new Error(result.error || "Gagal menyimpan produk");

          const saved = result.product as SavedProduct | undefined;
          if (!saved?.id) throw new Error("Server tidak mengembalikan produk yang tersimpan.");
          if (String(saved.category_id) !== categoryId) throw new Error("Kategori belum tersimpan ke database.");
          if (String(saved.brand ?? "").trim() !== brand.trim()) throw new Error("Merek belum tersimpan dengan benar.");
          if ((saved.visual_id ?? null) !== expectedVisualId) throw new Error("Visual kode belum tersimpan ke database.");
          if (visualMode !== "image" && saved.image_url) throw new Error("Gambar URL lama masih tersimpan dan menimpa visual kode.");

          setOpen(false);
          window.location.replace(`/products?saved=${encodeURIComponent(saved.id)}&updated=${Date.now()}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Gagal menyimpan produk");
        } finally {
          setSaving(false);
        }
      }}>
        <label className="span-2">Nama produk<input name="name" defaultValue={product?.name ?? ""} required placeholder="Contoh: Baut Hexagonal M8 x 40"/></label>
        <label>SKU<input name="sku" defaultValue={product?.sku ?? ""} required placeholder="BAUT-M8X40"/></label><label>Barcode<input name="barcode" defaultValue={product?.barcode ?? ""} placeholder="Scan atau ketik barcode"/></label>
        <label>Kategori<select name="category_id" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required><option value="" disabled>Pilih kategori</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label>Merek<input name="brand" value={brand} onChange={(event) => setBrand(event.target.value)} required placeholder="Contoh: Modern"/></label>
        <label>Harga modal<input name="cost_price" type="number" min="0" step="1" defaultValue={product?.cost_price ?? 0} required/></label><label>Harga jual<input name="selling_price" type="number" min="0" step="1" defaultValue={product?.selling_price ?? 0} required/></label>
        <label>Satuan<select name="unit" defaultValue={product?.unit ?? "pcs"}><option value="pcs">Pcs</option><option value="box">Box</option><option value="unit">Unit</option><option value="meter">Meter</option><option value="pack">Pack</option><option value="set">Set</option><option value="kg">Kg</option></select></label><label>Minimum stok<input name="minimum_stock" type="number" min="0" step="1" defaultValue={product?.minimum_stock ?? 5}/></label>

        <section className="span-2 product-sales-availability">
          <div className="product-sales-heading"><Building2 size={18}/><div><strong>Cabang penjualan</strong><span>Tentukan apakah produk tersedia di seluruh cabang atau hanya cabang tertentu.</span></div></div>
          <div className="product-sales-scope-buttons"><button type="button" className={salesScope === "all" ? "active" : ""} onClick={() => { setSalesScope("all"); setSalesStoreIds(stores.map((store) => store.id)); }}>Semua cabang</button><button type="button" className={salesScope === "selected" ? "active" : ""} onClick={() => setSalesScope("selected")}>Cabang tertentu</button></div>
          {salesScope === "selected" ? <div className="product-sales-store-grid">{stores.map((store) => <label className={salesStoreIds.includes(store.id) ? "selected" : ""} key={store.id}><input type="checkbox" checked={salesStoreIds.includes(store.id)} onChange={() => toggleStore(store.id)}/><span><strong>{store.name}</strong><small>{store.code}</small></span></label>)}</div> : <div className="product-sales-all-note">Produk akan muncul di kasir seluruh cabang aktif.</div>}
        </section>

        <section className="span-2 product-appearance-editor-v231">
          <div className="product-appearance-fields-v231">
            <div className="appearance-heading"><Image size={17}/><div><strong>Gambar & visual produk</strong><span>Pilih satu sumber. Sumber lain otomatis dikosongkan agar tampilan mengikuti pilihan terbaru.</span></div></div>
            <div className="product-visual-source-tabs">
              <button type="button" className={visualMode === "image" ? "active" : ""} onClick={() => chooseMode("image")}><Link2 size={15}/> URL gambar</button>
              <button type="button" className={visualMode === "visual" ? "active" : ""} onClick={() => chooseMode("visual")}><Images size={15}/> Visual kode</button>
              <button type="button" className={visualMode === "none" ? "active" : ""} onClick={() => chooseMode("none")}><X size={15}/> Tanpa pilihan</button>
            </div>
            {visualMode === "image" ? <label>URL gambar produk<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..."/></label> : null}
            {visualMode === "visual" ? <label>Visual ringan berbasis kode<select value={visualId} onChange={(event) => setVisualId(event.target.value)}><option value="" disabled>Pilih visual</option>{visuals.map((visual) => <option key={visual.id} value={visual.id}>{visual.name}</option>)}</select></label> : null}
            <small><Image size={13}/> Pilihan akan diverifikasi kembali dari database setelah tombol Simpan ditekan.</small>
          </div>
          <div className="product-preview-panel-v231"><span>Pratinjau</span><ProductVisual name={product?.name || "Produk"} imageUrl={previewImage} definition={previewDefinition} size="preview"/><small>{visualMode === "image" ? "Sumber: URL gambar" : visualMode === "visual" ? `Sumber: ${selectedVisual?.name ?? "Visual kode"}` : "Sumber: visual umum"}</small></div>
        </section>
        <label className="checkbox-field span-2"><input name="is_active" type="checkbox" defaultChecked={product?.is_active ?? true}/><span>Produk aktif dan dapat digunakan dalam sistem</span></label>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? <LoadingSpinner/> : <Save size={16}/>}<span>{saving ? "Menyimpan & memverifikasi..." : "Simpan produk"}</span></button></div>
      </form>
    </div></div> : null}
  </>;
}
