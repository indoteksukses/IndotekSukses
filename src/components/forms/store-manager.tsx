"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Edit3, MapPin, Phone, Plus, X } from "lucide-react";
import type { Store } from "@/lib/types";

export function StoreManager({ stores }: { stores: Store[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const showForm = (store?: Store) => { setEditing(store ?? null); setError(""); setOpen(true); };

  return <>
    <div className="store-grid">
      {stores.map((store) => <article className={`store-card ${store.is_active === false ? "inactive" : ""}`} key={store.id}>
        <div className="store-card-top"><div className="store-card-icon"><Building2 size={23}/></div><span className={`status-dot ${store.is_active === false ? "off" : ""}`}>{store.is_active === false ? "Nonaktif" : "Aktif"}</span></div>
        <h2>{store.name}</h2><strong className="store-code">{store.code}</strong>
        <div className="store-meta"><span><MapPin size={15}/>{store.address || "Alamat belum diisi"}</span><span><Phone size={15}/>{store.phone || "Telepon belum diisi"}</span></div>
        <div className="store-card-actions"><a className="button secondary" href={`/inventory?store=${store.id}`}>Lihat stok</a><button className="button ghost" onClick={() => showForm(store)}><Edit3 size={16}/> Edit</button></div>
      </article>)}
      <button className="add-store-card" onClick={() => showForm()}><Plus size={32}/><strong>Tambah toko baru</strong><span>Cabang baru otomatis tersedia di stok, kasir, laporan, dan transfer.</span></button>
    </div>
    {open ? <div className="modal-backdrop"><div className="modal-card store-modal">
      <div className="modal-header"><div><h2>{editing ? "Edit toko" : "Tambah toko"}</h2><p>Nama dan kode toko dapat disesuaikan dengan cabang Anda.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      {error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError("");
        const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
        try {
          const response = await fetch("/api/stores", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, id: editing?.id, is_active: payload.is_active === "on" }) });
          const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal menyimpan toko");
          setOpen(false); router.refresh();
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan toko"); }
        finally { setSaving(false); }
      }}>
        <label>Nama toko<input name="name" defaultValue={editing?.name ?? ""} placeholder="Indotek Sukses Cabang Kota" required/></label>
        <label>Kode toko<input name="code" defaultValue={editing?.code ?? ""} placeholder="IDS-03" required/></label>
        <label className="span-2">Alamat<input name="address" defaultValue={editing?.address ?? ""} placeholder="Alamat lengkap cabang"/></label>
        <label>Nomor telepon<input name="phone" defaultValue={editing?.phone ?? ""} placeholder="08xxxxxxxxxx"/></label>
        <label>Penanggung jawab<input name="manager_name" defaultValue={editing?.manager_name ?? ""} placeholder="Nama kepala toko"/></label>
        {editing ? <label className="checkbox-field span-2"><input name="is_active" type="checkbox" defaultChecked={editing.is_active !== false}/><span>Toko aktif dan dapat digunakan untuk transaksi</span></label> : <input type="hidden" name="is_active" value="on"/>}
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan toko"}</button></div>
      </form>
    </div></div> : null}
  </>;
}
