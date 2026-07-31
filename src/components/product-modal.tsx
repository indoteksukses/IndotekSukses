"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Product } from "@/lib/types";

export function ProductModal({ categories, product, label }: { categories: Array<{ id: string; name: string }>; product?: Product; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return <>
    <button className={product ? "table-action" : "button primary"} onClick={() => setOpen(true)}>{label ?? (product ? "Edit" : "+ Tambah Produk")}</button>
    {open ? <div className="modal-backdrop"><div className="modal-card product-form-modal"><div className="modal-header"><div><h2>{product ? "Edit produk" : "Tambah produk"}</h2><p>Master produk dan harga berlaku untuk seluruh cabang.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      {error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError("");
        const values = Object.fromEntries(new FormData(event.currentTarget).entries());
        const payload = { ...values, id: product?.id, is_active: values.is_active === "on" };
        try {
          const response = await fetch("/api/products", { method: product ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal menyimpan produk");
          setOpen(false); router.refresh();
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan produk"); }
        finally { setSaving(false); }
      }}>
        <label className="span-2">Nama produk<input name="name" defaultValue={product?.name ?? ""} required placeholder="Contoh: Mouse Wireless Logitech"/></label>
        <label>SKU<input name="sku" defaultValue={product?.sku ?? ""} required placeholder="MSE-LOG-001"/></label><label>Barcode<input name="barcode" defaultValue={product?.barcode ?? ""} placeholder="Opsional"/></label>
        <label>Kategori<select name="category_id" defaultValue={product?.category_id ?? ""}><option value="">Tanpa kategori</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label>Merek<input name="brand" defaultValue={product?.brand ?? ""} placeholder="Opsional"/></label>
        <label>Harga modal<input name="cost_price" type="number" min="0" step="1" defaultValue={product?.cost_price ?? 0} required/></label><label>Harga jual<input name="selling_price" type="number" min="0" step="1" defaultValue={product?.selling_price ?? 0} required/></label>
        <label>Satuan<select name="unit" defaultValue={product?.unit ?? "pcs"}><option value="pcs">Pcs</option><option value="box">Box</option><option value="unit">Unit</option><option value="meter">Meter</option><option value="pack">Pack</option></select></label><label>Minimum stok<input name="minimum_stock" type="number" min="0" step="1" defaultValue={product?.minimum_stock ?? 5}/></label>
        <label className="checkbox-field span-2"><input name="is_active" type="checkbox" defaultChecked={product?.is_active ?? true}/><span>Produk aktif dan dapat dijual di semua toko</span></label>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan produk"}</button></div>
      </form>
    </div></div> : null}
  </>;
}
