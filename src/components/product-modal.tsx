"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Image, Save, X } from "lucide-react";
import { ProductVisual } from "@/components/product-visual";
import { LoadingSpinner } from "@/components/loading-spinner";
import type { Product, ProductVisual as ProductVisualType, Store } from "@/lib/types";

export function ProductModal({ categories, visuals, stores, product, label }: { categories: Array<{ id: string; name: string }>; visuals: ProductVisualType[]; stores: Store[]; product?: Product; label?: string }) {
  const router = useRouter();
  const initialScope = product?.sales_scope === "selected" ? "selected" : "all";
  const initialStoreIds = product?.sales_store_ids?.length ? product.sales_store_ids : stores.map((store) => store.id);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [visualId, setVisualId] = useState(product?.visual_id ?? visuals[0]?.id ?? "");
  const [salesScope, setSalesScope] = useState<"all" | "selected">(initialScope);
  const [salesStoreIds, setSalesStoreIds] = useState<string[]>(initialStoreIds);
  const selectedVisual = useMemo(() => visuals.find((visual) => visual.id === visualId), [visuals, visualId]);

  const toggleStore = (storeId: string) => {
    setSalesStoreIds((current) => current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId]);
  };

  return <>
    <button className={product ? "table-action" : "button primary"} onClick={() => setOpen(true)}>{label ?? (product ? "Edit" : "+ Tambah Produk")}</button>
    {open ? <div className="modal-backdrop"><div className="modal-card product-form-modal"><div className="modal-header"><div><h2>{product ? "Edit produk" : "Tambah produk"}</h2><p>Master produk dan harga berlaku secara terpusat, sedangkan cabang penjualan dapat dipilih.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      {error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError("");
        const values = Object.fromEntries(new FormData(event.currentTarget).entries());
        try {
          if (salesScope === "selected" && !salesStoreIds.length) throw new Error("Pilih minimal satu cabang tempat produk dijual.");
          const payload = { ...values, id: product?.id, image_url: imageUrl, visual_id: visualId || null, is_active: values.is_active === "on", sales_scope: salesScope, sales_store_ids: salesScope === "selected" ? salesStoreIds : [] };
          const response = await fetch("/api/products", { method: product ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const raw = await response.text();
          let result: any = {};
          try { result = raw ? JSON.parse(raw) : {}; } catch { result = { error: raw || "Respons server tidak valid" }; }
          if (!response.ok) throw new Error(result.error || "Gagal menyimpan produk");
          setOpen(false); router.refresh();
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan produk"); }
        finally { setSaving(false); }
      }}>
        <label className="span-2">Nama produk<input name="name" defaultValue={product?.name ?? ""} required placeholder="Contoh: Baut Hexagonal M8 x 40"/></label>
        <label>SKU<input name="sku" defaultValue={product?.sku ?? ""} required placeholder="BAUT-M8X40"/></label><label>Barcode<input name="barcode" defaultValue={product?.barcode ?? ""} placeholder="Scan atau ketik barcode"/></label>
        <label>Kategori<select name="category_id" defaultValue={product?.category_id ?? ""}><option value="">Tanpa kategori</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label>Merek<input name="brand" defaultValue={product?.brand ?? ""} placeholder="Opsional"/></label>
        <label>Harga modal<input name="cost_price" type="number" min="0" step="1" defaultValue={product?.cost_price ?? 0} required/></label><label>Harga jual<input name="selling_price" type="number" min="0" step="1" defaultValue={product?.selling_price ?? 0} required/></label>
        <label>Satuan<select name="unit" defaultValue={product?.unit ?? "pcs"}><option value="pcs">Pcs</option><option value="box">Box</option><option value="unit">Unit</option><option value="meter">Meter</option><option value="pack">Pack</option><option value="set">Set</option><option value="kg">Kg</option></select></label><label>Minimum stok<input name="minimum_stock" type="number" min="0" step="1" defaultValue={product?.minimum_stock ?? 5}/></label>

        <section className="span-2 product-sales-availability">
          <div className="product-sales-heading"><Building2 size={18}/><div><strong>Cabang penjualan</strong><span>Tentukan apakah produk tersedia di seluruh cabang atau hanya cabang tertentu.</span></div></div>
          <div className="product-sales-scope-buttons"><button type="button" className={salesScope === "all" ? "active" : ""} onClick={() => { setSalesScope("all"); setSalesStoreIds(stores.map((store) => store.id)); }}>Semua cabang</button><button type="button" className={salesScope === "selected" ? "active" : ""} onClick={() => setSalesScope("selected")}>Cabang tertentu</button></div>
          {salesScope === "selected" ? <div className="product-sales-store-grid">{stores.map((store) => <label className={salesStoreIds.includes(store.id) ? "selected" : ""} key={store.id}><input type="checkbox" checked={salesStoreIds.includes(store.id)} onChange={() => toggleStore(store.id)}/><span><strong>{store.name}</strong><small>{store.code}</small></span></label>)}</div> : <div className="product-sales-all-note">Produk akan muncul di kasir seluruh cabang aktif.</div>}
        </section>

        <section className="span-2 product-appearance-editor-v231">
          <div className="product-appearance-fields-v231">
            <div className="appearance-heading"><Image size={17}/><div><strong>Gambar & visual produk</strong><span>Gunakan URL gambar atau ilustrasi ringan bawaan.</span></div></div>
            <label>URL gambar produk<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://... (opsional)"/></label>
            <label>Visual ringan berbasis kode<select value={visualId} onChange={(event) => setVisualId(event.target.value)}><option value="">Tanpa visual</option>{visuals.map((visual) => <option key={visual.id} value={visual.id}>{visual.name}</option>)}</select></label>
            <small><Image size={13}/> URL gambar diprioritaskan. Jika kosong, sistem memakai ilustrasi kode yang ringan.</small>
          </div>
          <div className="product-preview-panel-v231"><span>Pratinjau</span><ProductVisual name={product?.name || "Produk"} imageUrl={imageUrl || null} definition={selectedVisual?.code} size="preview"/><small>{imageUrl ? "Menggunakan URL gambar" : selectedVisual?.name ?? "Visual umum"}</small></div>
        </section>
        <label className="checkbox-field span-2"><input name="is_active" type="checkbox" defaultChecked={product?.is_active ?? true}/><span>Produk aktif dan dapat digunakan dalam sistem</span></label>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? <LoadingSpinner/> : <Save size={16}/>}<span>{saving ? "Menyimpan..." : "Simpan produk"}</span></button></div>
      </form>
    </div></div> : null}
  </>;
}
