"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import type { Store, UserProfile } from "@/lib/types";
import { LoadingSpinner } from "@/components/loading-spinner";

async function parseResponse(response: Response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {
      error:
        raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")
          ? "Server mengembalikan halaman error, bukan JSON. Coba deploy ulang endpoint API admin/users atau periksa log Vercel."
          : raw || "Respons server tidak valid.",
    };
  }
}

const roleLabels = { admin: "Admin", manager: "Kepala Toko", cashier: "Kasir", warehouse: "Petugas Gudang" };

export function UserManager({ stores, users, canCreateAdmin }: { stores: Store[]; users: UserProfile[]; canCreateAdmin: boolean }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  return <>
    <button className="button primary" onClick={() => setOpen(true)}><Plus size={17}/> Tambah karyawan</button>
    {open ? <div className="modal-backdrop"><div className="modal-card"><div className="modal-header"><div><h2>Tambah karyawan</h2><p>Tentukan role dan cabang yang dapat diakses.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>{error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); const payload = { full_name: form.get("full_name"), email: form.get("email"), phone: form.get("phone"), password: form.get("password"), role: form.get("role"), primary_store_id: form.get("primary_store_id"), store_ids: form.getAll("store_ids") }; try { const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await parseResponse(response); if (!response.ok) throw new Error(result.error || "Gagal membuat karyawan"); setOpen(false); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat karyawan"); } finally { setSaving(false); } }}>
        <label>Nama lengkap<input name="full_name" required/></label><label>Nomor telepon<input name="phone"/></label><label>Email<input name="email" type="email" required/></label><label>Password awal<input name="password" type="password" minLength={8} required/></label>
        <label>Role<select name="role">{Object.entries(roleLabels).filter(([role]) => canCreateAdmin || role !== "admin").map(([role,label]) => <option value={role} key={role}>{label}</option>)}</select></label><label>Toko utama<select name="primary_store_id"><option value="">Tanpa toko utama</option>{stores.map((store) => <option value={store.id} key={store.id}>{store.name}</option>)}</select></label>
        <fieldset className="span-2 store-access-field"><legend>Akses toko</legend><div>{stores.map((store) => <label className="checkbox-field" key={store.id}><input type="checkbox" name="store_ids" value={store.id}/><span>{store.name} <small>{store.code}</small></span></label>)}</div></fieldset>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? <><LoadingSpinner/><span>Membuat akun...</span></> : "Buat akun"}</button></div>
      </form>
    </div></div> : null}
  </>;
}

export function EditUserButton({ stores, user, canAssignAdmin }: { stores: Store[]; user: UserProfile; canAssignAdmin: boolean }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  if (user.role === "owner" || (!canAssignAdmin && user.role === "admin")) return null;
  return <>
    <button className="table-action" onClick={() => setOpen(true)}>Edit</button>
    {open ? <div className="modal-backdrop"><div className="modal-card"><div className="modal-header"><div><h2>Edit karyawan</h2><p>Ubah role, status, dan cabang yang dapat diakses.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>{error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); const payload = { id: user.id, full_name: form.get("full_name"), phone: form.get("phone"), role: form.get("role"), primary_store_id: form.get("primary_store_id"), store_ids: form.getAll("store_ids"), is_active: form.get("is_active") === "on" }; try { const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await parseResponse(response); if (!response.ok) throw new Error(result.error || "Gagal memperbarui karyawan"); setOpen(false); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Gagal memperbarui karyawan"); } finally { setSaving(false); } }}>
        <label>Nama lengkap<input name="full_name" defaultValue={user.full_name} required/></label><label>Nomor telepon<input name="phone" defaultValue={user.phone ?? ""}/></label>
        <label>Role<select name="role" defaultValue={user.role}>{Object.entries(roleLabels).filter(([role]) => canAssignAdmin || role !== "admin").map(([role, label]) => <option value={role} key={role}>{label}</option>)}</select></label><label>Toko utama<select name="primary_store_id" defaultValue={user.primary_store_id ?? ""}><option value="">Tanpa toko utama</option>{stores.map((store) => <option value={store.id} key={store.id}>{store.name}</option>)}</select></label>
        <fieldset className="span-2 store-access-field"><legend>Akses toko</legend><div>{stores.map((store) => <label className="checkbox-field" key={store.id}><input type="checkbox" name="store_ids" value={store.id} defaultChecked={user.store_ids?.includes(store.id)}/><span>{store.name} <small>{store.code}</small></span></label>)}</div></fieldset>
        <label className="checkbox-field span-2"><input type="checkbox" name="is_active" defaultChecked={user.is_active}/><span>Akun aktif dan dapat login</span></label>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? <><LoadingSpinner/><span>Menyimpan...</span></> : "Simpan perubahan"}</button></div>
      </form>
    </div></div> : null}
  </>;
}
