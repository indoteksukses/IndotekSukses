"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Image, X } from "lucide-react";
import { ProductVisual } from "@/components/product-visual";
import type { Product, ProductVisual as ProductVisualType } from "@/lib/types";

export function ProductModal({ categories, visuals, product, label }: { categories: Array<{ id: string; name: string }>; visuals: ProductVisualType[]; product?: Product; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [visualId, setVisualId] = useState(product?.visual_id ?? visuals[0]?.id ?? "");
  const selectedVisual = useMemo(() => visuals.find((visual) => visual.id === visualId), [visuals, visualId]);

  return <>
    <button className={product ? "table-action" : "button primary"} onClick={() => setOpen(true)}>{label ?? (product ? "Edit" : "+ Tambah Produk")}</button>
    {open ? <div className="modal-backdrop"><div className="modal-card product-form-modal"><div className="modal-header"><div><h2>{product ? "Edit produk" : "Tambah produk"}</h2><p>Master produk, harga, dan visual berlaku untuk seluruh cabang.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      {error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError("");
        const values = Object.fromEntries(new FormData(event.currentTarget).entries());
        const payload = { ...values, id: product?.id, image_url: imageUrl, visual_id: visualId || null, is_active: values.is_active === "on" };
        try {
          const response = await fetch("/api/products", { method: product ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal menyimpan produk");
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
        <div className="span-2 product-appearance-editor"><div className="product-appearance-fields"><label>URL gambar produk<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://... (opsional)"/></label><label>Visual ringan berbasis kode<select value={visualId} onChange={(event) => setVisualId(event.target.value)}><option value="">Tanpa visual</option>{visuals.map((visual) => <option key={visual.id} value={visual.id}>{visual.name}</option>)}</select></label><small><Image size={13}/> URL gambar diprioritaskan. Bila kosong, sistem memakai ilustrasi kode yang ringan dan memiliki bayangan lembut.</small></div><ProductVisual name={product?.name || "Produk"} imageUrl={imageUrl || null} definition={selectedVisual?.code} size="preview"/></div>
        <label className="checkbox-field span-2"><input name="is_active" type="checkbox" defaultChecked={product?.is_active ?? true}/><span>Produk aktif dan dapat dijual di semua toko</span></label>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan produk"}</button></div>
      </form>
    </div></div> : null}
  </>;
}
