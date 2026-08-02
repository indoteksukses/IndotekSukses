"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";

async function readJson(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { error: text || "Respons server tidak valid." }; }
}

export function SupplierManager({ supplier, label }: { supplier?: any; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(supplier?.id);
  return <>
    <button className={editing ? "table-action" : "button primary"} onClick={() => setOpen(true)}>{editing ? <Pencil size={14}/> : <Plus size={17}/>} {label ?? (editing ? "Edit" : "Tambah supplier")}</button>
    {open ? <div className="modal-backdrop"><div className="modal-card supplier-modal"><div className="modal-header"><div><h2>{editing ? "Edit supplier" : "Tambah supplier"}</h2><p>Simpan kontak dan informasi pemasok untuk pembelian.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>{error ? <div className="alert error">{error}</div> : null}<form className="form-grid" onSubmit={async(event)=>{event.preventDefault();setSaving(true);setError("");const values=Object.fromEntries(new FormData(event.currentTarget).entries());try{const response=await fetch("/api/suppliers",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...values,id:supplier?.id,is_active:values.is_active==="on"})});const result=await readJson(response);if(!response.ok)throw new Error(result.error||"Gagal menyimpan supplier");setOpen(false);router.refresh()}catch(err){setError(err instanceof Error?err.message:"Gagal menyimpan supplier")}finally{setSaving(false)}}}>
      <label className="span-2">Nama supplier<input name="name" required defaultValue={supplier?.name ?? ""}/></label><label>Nama kontak<input name="contact_name" defaultValue={supplier?.contact_name ?? ""}/></label><label>Telepon<input name="phone" defaultValue={supplier?.phone ?? ""}/></label><label>Email<input name="email" type="email" defaultValue={supplier?.email ?? ""}/></label><label>Rekening / bank<input name="bank_details" defaultValue={supplier?.bank_details ?? ""}/></label><label className="span-2">Alamat<textarea name="address" rows={2} defaultValue={supplier?.address ?? ""}/></label><label className="span-2">Catatan<textarea name="notes" rows={2} defaultValue={supplier?.notes ?? ""}/></label><label className="checkbox-field span-2"><input type="checkbox" name="is_active" defaultChecked={supplier?.is_active !== false}/><span>Supplier aktif dan dapat dipilih pada pembelian</span></label><div className="modal-actions span-2"><button type="button" className="button secondary" onClick={()=>setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving?<><LoadingSpinner/><span>Menyimpan...</span></>:editing?"Simpan perubahan":"Simpan supplier"}</button></div></form></div></div>:null}
  </>;
}

export function DeleteSupplierButton({ supplier }: { supplier: any }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return <div className="supplier-delete-wrap"><button className="table-action danger-text" disabled={saving} onClick={async()=>{
    if (!window.confirm(`Hapus supplier “${supplier.name}”? Jika sudah memiliki transaksi, supplier akan diarsipkan agar riwayat tetap aman.`)) return;
    setSaving(true); setError("");
    try { const response=await fetch("/api/suppliers",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:supplier.id})}); const result=await readJson(response); if(!response.ok)throw new Error(result.error||"Gagal menghapus supplier"); router.refresh(); }
    catch(err){setError(err instanceof Error?err.message:"Gagal menghapus supplier");} finally{setSaving(false);}
  }}>{saving?<LoadingSpinner size={14}/>:<Trash2 size={14}/>}<span>{saving?"Memproses...":"Hapus"}</span></button>{error?<small className="negative">{error}</small>:null}</div>;
}
