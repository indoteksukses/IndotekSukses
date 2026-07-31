"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Store } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export function ShiftManager({ stores, openShift }: { stores: Store[]; openShift?: any }) {
  const router = useRouter(); const [mode, setMode] = useState<"open"|"close"|null>(null); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  return <>
    <button className={`button ${openShift ? "danger" : "primary"}`} onClick={() => setMode(openShift ? "close" : "open")}>{openShift ? "Tutup shift" : "+ Buka shift"}</button>
    {mode ? <div className="modal-backdrop"><div className="modal-card"><div className="modal-header"><div><h2>{mode === "open" ? "Buka shift kasir" : "Tutup shift kasir"}</h2><p>{mode === "open" ? "Masukkan kas awal sebelum mulai transaksi." : `Shift dibuka dengan kas ${formatCurrency(Number(openShift?.opening_cash ?? 0))}.`}</p></div><button className="icon-button" onClick={() => setMode(null)}><X size={20}/></button></div>{error?<div className="alert error">{error}</div>:null}
      <form className="form-grid" onSubmit={async(event)=>{event.preventDefault();setSaving(true);setError("");const form=new FormData(event.currentTarget);try{const response=await fetch("/api/shifts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:mode,store_id:form.get("store_id"),opening_cash:Number(form.get("opening_cash")||0),shift_id:openShift?.id,actual_cash:Number(form.get("actual_cash")||0),notes:form.get("notes")})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Gagal memproses shift");setMode(null);router.refresh()}catch(err){setError(err instanceof Error?err.message:"Gagal memproses shift")}finally{setSaving(false)}}}>
        {mode === "open" ? <><label className="span-2">Toko<select name="store_id" required>{stores.map((store)=><option value={store.id} key={store.id}>{store.name}</option>)}</select></label><label className="span-2">Kas awal<input name="opening_cash" type="number" min="0" defaultValue="0" required/></label></> : <label className="span-2">Kas fisik saat ditutup<input name="actual_cash" type="number" min="0" required autoFocus/></label>}
        <label className="span-2">Catatan<textarea name="notes" rows={3}/></label><div className="modal-actions span-2"><button type="button" className="button secondary" onClick={()=>setMode(null)}>Batal</button><button className="button primary" disabled={saving}>{saving?"Memproses...":mode === "open"?"Buka shift":"Tutup shift"}</button></div>
      </form></div></div>:null}
  </>;
}
