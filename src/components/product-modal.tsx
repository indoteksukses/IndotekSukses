"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { createProduct } from "@/app/(protected)/products/actions";

export function ProductModal() {
  const [open, setOpen] = useState(false);
  return <>
    <button className="button primary" onClick={()=>setOpen(true)}>+ Tambah Produk</button>
    {open ? <div className="modal-backdrop"><div className="modal-card"><div className="modal-header"><div><h2>Tambah produk</h2><p>Data utama hanya dapat diubah admin.</p></div><button className="icon-button" onClick={()=>setOpen(false)}><X size={20}/></button></div>
      <form action={async (data)=>{ await createProduct(data); setOpen(false); }} className="form-grid">
        <label className="span-2">Nama produk<input name="name" required placeholder="Contoh: Mouse Wireless Logitech"/></label>
        <label>SKU<input name="sku" required placeholder="MSE-LOG-001"/></label><label>Barcode<input name="barcode" placeholder="Opsional"/></label>
        <label>Harga modal<input name="cost_price" type="number" min="0" required/></label><label>Harga jual<input name="selling_price" type="number" min="0" required/></label>
        <label>Satuan<select name="unit"><option value="pcs">Pcs</option><option value="box">Box</option><option value="unit">Unit</option></select></label><label>Minimum stok<input name="minimum_stock" type="number" min="0" defaultValue="5"/></label>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={()=>setOpen(false)}>Batal</button><button className="button primary">Simpan produk</button></div>
      </form>
    </div></div> : null}
  </>;
}
