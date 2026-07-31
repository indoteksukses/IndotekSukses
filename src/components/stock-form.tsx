"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { Product, Store } from "@/lib/types";

export function StockForm({ products, stores, defaultStoreId }: { products: Product[]; stores: Store[]; defaultStoreId?: string }) {
  const router = useRouter();
  const [type, setType] = useState<"in" | "out">("in");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  return <div className="panel stock-entry-panel"><div className="panel-header"><div><h2>Catat pergerakan stok</h2><p>Semua perubahan menjadi riwayat permanen.</p></div></div>
    <div className="movement-tabs"><button type="button" className={type === "in" ? "active" : ""} onClick={() => setType("in")}><ArrowDownToLine size={18}/> Stok masuk</button><button type="button" className={type === "out" ? "active" : ""} onClick={() => setType("out")}><ArrowUpFromLine size={18}/> Stok keluar</button></div>
    <form className="form-grid" onSubmit={async (event) => {
      event.preventDefault(); setSaving(true); setMessage(""); setSuccess(false);
      const form = new FormData(event.currentTarget);
      try {
        const response = await fetch("/api/stock/movement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ store_id: form.get("store_id"), product_id: form.get("product_id"), quantity: Number(form.get("quantity")), movement_type: form.get("movement_type"), reference_type: form.get("reference_type"), reason: form.get("reason"), notes: form.get("notes") }) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal menyimpan stok");
        setSuccess(true); setMessage("Pergerakan stok berhasil disimpan."); event.currentTarget.reset(); router.refresh();
      } catch (err) { setMessage(err instanceof Error ? err.message : "Gagal menyimpan stok"); }
      finally { setSaving(false); }
    }}>
      <label>Toko<select name="store_id" defaultValue={defaultStoreId ?? stores[0]?.id}>{stores.map((store) => <option key={store.id} value={store.id}>{store.name} ({store.code})</option>)}</select></label>
      <label>Produk<select name="product_id">{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label>
      <label>Jumlah<input name="quantity" type="number" min="0.001" step="0.001" placeholder="0" required/></label>
      <label>Alasan<select name="movement_type">{(type === "in" ? [{v:"purchase",l:"Pembelian supplier"},{v:"customer_return",l:"Retur pelanggan"},{v:"stocktake_adjustment",l:"Koreksi opname"},{v:"opening",l:"Stok awal"},{v:"manual_adjustment",l:"Penyesuaian lain"}] : [{v:"damage",l:"Barang rusak"},{v:"loss",l:"Barang hilang"},{v:"internal_use",l:"Pemakaian internal"},{v:"supplier_return",l:"Retur supplier"},{v:"stocktake_adjustment",l:"Koreksi opname"}]).map((option) => <option key={option.v} value={option.v}>{option.l}</option>)}</select></label>
      <label>Nomor referensi<input name="reference_type" placeholder="Nomor nota / dokumen"/></label><label>Alasan singkat<input name="reason" placeholder="Contoh: Nota INV-123"/></label>
      <label className="span-2">Catatan<textarea name="notes" rows={3} placeholder="Keterangan tambahan untuk audit..."/></label>
      <div className="span-2 form-footer"><span className={success ? "positive" : message ? "negative" : ""}>{message || "Stok keluar nonpenjualan hanya dapat dilakukan oleh pengguna berwenang."}</span><button className="button primary" disabled={saving || !stores.length || !products.length}>{saving ? "Menyimpan..." : "Simpan pergerakan"}</button></div>
    </form>
  </div>;
}
