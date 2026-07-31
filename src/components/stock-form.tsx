"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { demoProducts as fallbackProducts, demoStores } from "@/lib/demo-data";
import type { Product } from "@/lib/types";

export function StockForm({ products = fallbackProducts }: { products?: Product[] }) {
  const router=useRouter();
  const [type,setType]=useState<"in"|"out">("in");
  const [saving,setSaving]=useState(false); const [message,setMessage]=useState("");
  return <div className="panel stock-entry-panel"><div className="panel-header"><div><h2>Catat pergerakan stok</h2><p>Semua perubahan menjadi riwayat permanen.</p></div></div>
    <div className="movement-tabs"><button className={type==="in"?"active":""} onClick={()=>setType("in")}><ArrowDownToLine size={18}/> Stok masuk</button><button className={type==="out"?"active":""} onClick={()=>setType("out")}><ArrowUpFromLine size={18}/> Stok keluar</button></div>
    <form className="form-grid" onSubmit={async(e)=>{e.preventDefault();setSaving(true);setMessage("");const f=new FormData(e.currentTarget);try{const response=await fetch("/api/stock/movement",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({store_id:f.get("store_id"),product_id:f.get("product_id"),quantity:Number(f.get("quantity")),movement_type:f.get("movement_type"),reference_type:f.get("reference_type"),reason:f.get("reason"),notes:f.get("notes")})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Gagal menyimpan stok");setMessage("Pergerakan stok berhasil disimpan.");e.currentTarget.reset();router.refresh()}catch(err){setMessage(err instanceof Error?err.message:"Gagal menyimpan stok")}finally{setSaving(false)}}}>
      <label>Toko<select name="store_id">{demoStores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Produk<select name="product_id">{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Jumlah<input name="quantity" type="number" min="1" step="1" placeholder="0" required/></label>
      <label>Alasan<select name="movement_type">{(type==="in"?[{v:"purchase",l:"Pembelian supplier"},{v:"customer_return",l:"Retur pelanggan"},{v:"stocktake_adjustment",l:"Koreksi opname"},{v:"opening",l:"Stok awal"},{v:"manual_adjustment",l:"Penyesuaian lain"}]:[{v:"damage",l:"Barang rusak"},{v:"loss",l:"Barang hilang"},{v:"internal_use",l:"Pemakaian internal"},{v:"supplier_return",l:"Retur supplier"},{v:"stocktake_adjustment",l:"Koreksi opname"}]).map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></label>
      <label>Nomor referensi<input name="reference_type" placeholder="Nomor nota / dokumen"/></label><label>Tanggal<input type="date" defaultValue="2026-07-31"/></label>
      <label className="span-2">Catatan<textarea name="notes" rows={3} placeholder="Tambahkan keterangan yang dapat membantu proses audit..."/></label>
      <div className="span-2 form-footer"><span>{message||"Stok keluar nonpenjualan dapat memerlukan persetujuan kepala toko."}</span><button className="button primary" disabled={saving}>{saving?"Menyimpan...":"Simpan pergerakan"}</button></div>
    </form>
  </div>;
}
