"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Plus, Trash2, X } from "lucide-react";
import type { Store, UserProfile } from "@/lib/types";
import { LoadingSpinner } from "@/components/loading-spinner";

async function parseResponse(response: Response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {
      error: raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")
        ? "Server mengembalikan halaman error. Periksa log Vercel dan pastikan migration v2.5.0 sudah dijalankan."
        : raw || "Respons server tidak valid.",
    };
  }
}

const roleLabels = { admin: "Admin", manager: "Kepala Toko", cashier: "Kasir", warehouse: "Petugas Gudang" };

function PasswordField({ name, label, required = false, placeholder = "Minimal 8 karakter" }: { name: string; label: string; required?: boolean; placeholder?: string }) {
  const [visible, setVisible] = useState(false);
  return <label>{label}<div className="password-field-wrap"><input name={name} type={visible ? "text" : "password"} minLength={8} required={required} placeholder={placeholder}/><button type="button" aria-label={visible ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>;
}

export function UserManager({ stores, canCreateAdmin }: { stores: Store[]; canCreateAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return <>
    <button className="button primary" onClick={() => { setError(""); setOpen(true); }}><Plus size={17}/> Tambah karyawan</button>
    {open ? <div className="modal-backdrop"><div className="modal-card employee-modal"><div className="modal-header"><div><h2>Tambah karyawan</h2><p>Buat username, email, password awal, role, dan cabang yang dapat diakses.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>{error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError("");
        const form = new FormData(event.currentTarget);
        const payload = { full_name: form.get("full_name"), username: form.get("username"), email: form.get("email"), phone: form.get("phone"), password: form.get("password"), role: form.get("role"), primary_store_id: form.get("primary_store_id"), store_ids: form.getAll("store_ids") };
        try {
          const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const result = await parseResponse(response);
          if (!response.ok) throw new Error(result.error || "Gagal membuat karyawan");
          setOpen(false); router.refresh();
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat karyawan"); }
        finally { setSaving(false); }
      }}>
        <label>Nama lengkap<input name="full_name" required/></label><label>Nomor telepon<input name="phone"/></label>
        <label>Username<input name="username" minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" required placeholder="contoh: kasir.grabag"/><small>Huruf, angka, titik, garis bawah, atau tanda minus.</small></label>
        <label>Email<input name="email" type="email" required placeholder="nama@perusahaan.com"/></label>
        <PasswordField name="password" label="Password awal" required/>
        <label>Role<select name="role">{Object.entries(roleLabels).filter(([role]) => canCreateAdmin || role !== "admin").map(([role,label]) => <option value={role} key={role}>{label}</option>)}</select></label>
        <label>Toko utama<select name="primary_store_id"><option value="">Tanpa toko utama</option>{stores.map((store) => <option value={store.id} key={store.id}>{store.name}</option>)}</select></label>
        <fieldset className="span-2 store-access-field"><legend>Akses toko</legend><div>{stores.map((store) => <label className="checkbox-field" key={store.id}><input type="checkbox" name="store_ids" value={store.id}/><span>{store.name} <small>{store.code}</small></span></label>)}</div></fieldset>
        <div className="credential-security-note span-2"><KeyRound size={17}/><div><strong>Password hanya terlihat saat dibuat atau diketik ulang</strong><span>Sistem tidak menyimpan password dalam bentuk yang dapat dibaca kembali.</span></div></div>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? <><LoadingSpinner/><span>Membuat akun...</span></> : "Buat akun"}</button></div>
      </form>
    </div></div> : null}
  </>;
}

export function EditUserButton({ stores, user, canAssignAdmin, canManageCredentials, canDelete }: { stores: Store[]; user: UserProfile; canAssignAdmin: boolean; canManageCredentials: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  if (user.role === "owner" || (!canAssignAdmin && user.role === "admin")) return null;

  const remove = async () => {
    if (!window.confirm(`Hapus ${user.full_name} dari daftar karyawan? Login akan dinonaktifkan, sedangkan riwayat transaksi tetap dipertahankan.`)) return;
    setDeleting(true); setError("");
    try {
      const response = await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id }) });
      const result = await parseResponse(response);
      if (!response.ok) throw new Error(result.error || "Gagal menghapus karyawan");
      setOpen(false); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menghapus karyawan"); }
    finally { setDeleting(false); }
  };

  return <>
    <button className="table-action" onClick={() => { setError(""); setOpen(true); }}>Edit</button>
    {open ? <div className="modal-backdrop"><div className="modal-card employee-modal"><div className="modal-header"><div><h2>Edit karyawan</h2><p>Ubah profil, login, role, status, dan cabang yang dapat diakses.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>{error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError("");
        const form = new FormData(event.currentTarget);
        const payload = { id: user.id, full_name: form.get("full_name"), username: form.get("username"), email: form.get("email"), new_password: form.get("new_password"), phone: form.get("phone"), role: form.get("role"), primary_store_id: form.get("primary_store_id"), store_ids: form.getAll("store_ids"), is_active: form.get("is_active") === "on" };
        try {
          const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const result = await parseResponse(response);
          if (!response.ok) throw new Error(result.error || "Gagal memperbarui karyawan");
          setOpen(false); router.refresh();
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal memperbarui karyawan"); }
        finally { setSaving(false); }
      }}>
        <label>Nama lengkap<input name="full_name" defaultValue={user.full_name} required/></label><label>Nomor telepon<input name="phone" defaultValue={user.phone ?? ""}/></label>
        {canManageCredentials ? <><label>Username<input name="username" minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" defaultValue={user.username ?? ""} required/></label><label>Email<input name="email" type="email" defaultValue={user.email ?? ""} required/></label><PasswordField name="new_password" label="Password baru (opsional)" placeholder="Kosongkan jika tidak diubah"/></> : null}
        <label>Role<select name="role" defaultValue={user.role}>{Object.entries(roleLabels).filter(([role]) => canAssignAdmin || role !== "admin").map(([role, label]) => <option value={role} key={role}>{label}</option>)}</select></label><label>Toko utama<select name="primary_store_id" defaultValue={user.primary_store_id ?? ""}><option value="">Tanpa toko utama</option>{stores.map((store) => <option value={store.id} key={store.id}>{store.name}</option>)}</select></label>
        <fieldset className="span-2 store-access-field"><legend>Akses toko</legend><div>{stores.map((store) => <label className="checkbox-field" key={store.id}><input type="checkbox" name="store_ids" value={store.id} defaultChecked={user.store_ids?.includes(store.id)}/><span>{store.name} <small>{store.code}</small></span></label>)}</div></fieldset>
        <label className="checkbox-field span-2"><input type="checkbox" name="is_active" defaultChecked={user.is_active}/><span>Akun aktif dan dapat login</span></label>
        {canManageCredentials ? <div className="credential-security-note span-2"><KeyRound size={17}/><div><strong>Password lama tidak dapat ditampilkan</strong><span>Owner dapat menetapkan password baru tanpa mengetahui password sebelumnya.</span></div></div> : null}
        <div className="modal-actions employee-modal-actions span-2">{canDelete ? <button type="button" className="button danger" disabled={deleting || saving} onClick={remove}>{deleting ? <LoadingSpinner/> : <Trash2 size={16}/>}<span>{deleting ? "Menghapus..." : "Hapus karyawan"}</span></button> : <span/>}<div><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving || deleting}>{saving ? <><LoadingSpinner/><span>Menyimpan...</span></> : "Simpan perubahan"}</button></div></div>
      </form>
    </div></div> : null}
  </>;
}
