"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";

export function VoidSaleButton({ saleId, invoice }: { saleId: string; invoice: string }) {
  const router=useRouter();const[open,setOpen]=useState(false);const[saving,setSaving]=useState(false);const[error,setError]=useState("");
  return <><button className="table-action danger-text" onClick={()=>setOpen(true)}>Batalkan</button>{open?<div className="modal-backdrop"><div className="modal-card small-modal"><div className="modal-header"><div><h2>Batalkan transaksi</h2><p>{invoice} tidak akan dihapus. Sistem membuat pembalikan stok.</p></div><button className="icon-button" onClick={()=>setOpen(false)}><X size={20}/></button></div>{error?<div className="alert error">{error}</div>:null}<form onSubmit={async(event)=>{event.preventDefault();setSaving(true);setError("");const form=new FormData(event.currentTarget);try{const response=await fetch("/api/sales/void",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sale_id:saleId,reason:form.get("reason")})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Gagal membatalkan transaksi");setOpen(false);router.refresh()}catch(err){setError(err instanceof Error?err.message:"Gagal membatalkan transaksi")}finally{setSaving(false)}}}><label>Alasan pembatalan<textarea name="reason" rows={4} required placeholder="Jelaskan alasan pembatalan untuk audit..."/></label><div className="modal-actions"><button type="button" className="button secondary" onClick={()=>setOpen(false)}>Tidak jadi</button><button className="button danger" disabled={saving}>{saving?<><LoadingSpinner/><span>Memproses...</span></>:"Ya, batalkan"}</button></div></form></div></div>:null}</>;
}
