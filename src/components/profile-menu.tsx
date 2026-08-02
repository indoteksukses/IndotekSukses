"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, MapPin, Phone, ShieldCheck, X } from "lucide-react";
import { UserAvatar, avatarPresets } from "@/components/user-avatar";
import type { Store, UserProfile } from "@/lib/types";
import { LoadingSpinner } from "@/components/loading-spinner";

const roleLabels: Record<string, string> = { owner: "Owner", admin: "Admin", manager: "Kepala Toko", cashier: "Kasir", warehouse: "Gudang" };

export function ProfileMenu({ profile, stores, className = "" }: { profile: UserProfile; stores: Store[]; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [avatarKey, setAvatarKey] = useState(profile.avatar_key ?? "ocean");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const assignedStores = useMemo(() => stores.filter((store) => profile.store_ids?.includes(store.id) || store.id === profile.primary_store_id), [stores, profile.store_ids, profile.primary_store_id]);
  const canEditDetails = profile.role === "owner" || profile.role === "admin";

  return <>
    <button className={`profile-trigger ${className}`} onClick={() => { setOpen(true); setMessage(""); }} title="Lihat profil"><UserAvatar name={profile.full_name} avatarKey={avatarKey} size="md"/></button>
    {open ? <div className="modal-backdrop"><div className="modal-card profile-modal">
      <div className="modal-header"><div><h2>Profil pengguna</h2><p>Lihat informasi akun dan pilih avatar bawaan.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <div className="profile-hero"><UserAvatar name={profile.full_name} avatarKey={avatarKey} size="xl"/><div><strong>{profile.full_name}</strong><span>{roleLabels[profile.role] ?? profile.role}</span><small>{profile.is_active ? "Akun aktif" : "Akun nonaktif"}</small></div></div>
      <form onSubmit={async (event) => { event.preventDefault(); setSaving(true); setMessage(""); const form = new FormData(event.currentTarget); try { const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar_key: avatarKey, full_name: canEditDetails ? form.get("full_name") : undefined, phone: canEditDetails ? form.get("phone") : undefined }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal menyimpan profil"); setMessage("Profil berhasil diperbarui."); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan profil"); } finally { setSaving(false); } }}>
        <div className="profile-details">
          <label>Nama lengkap<input name="full_name" defaultValue={profile.full_name} readOnly={!canEditDetails}/></label>
          <label>Nomor telepon<input name="phone" defaultValue={profile.phone ?? ""} readOnly={!canEditDetails} placeholder="Belum diisi"/></label>
          <div><Mail size={16}/><span>Email</span><strong>{profile.email || "—"}</strong></div>
          <div><ShieldCheck size={16}/><span>Role</span><strong>{roleLabels[profile.role] ?? profile.role}</strong></div>
          <div className="profile-stores"><MapPin size={16}/><span>Akses toko</span><strong>{assignedStores.length ? assignedStores.map((store) => store.name).join(", ") : "Belum ditetapkan"}</strong></div>
        </div>
        {!canEditDetails ? <div className="profile-readonly"><Phone size={16}/><span>Detail akun hanya dapat diubah oleh owner atau admin. Anda tetap dapat mengganti avatar sendiri.</span></div> : null}
        <div className="avatar-section"><div><strong>Pilih avatar</strong><span>Avatar tersimpan pada akun dan tampil di semua perangkat.</span></div><div className="avatar-grid">{avatarPresets.map((preset) => <button type="button" key={preset.key} className={avatarKey === preset.key ? "selected" : ""} onClick={() => setAvatarKey(preset.key)}><UserAvatar name={profile.full_name} avatarKey={preset.key}/><span>{preset.label}</span>{avatarKey === preset.key ? <Check size={14}/> : null}</button>)}</div></div>
        {message ? <div className={message.includes("berhasil") ? "alert success" : "alert error"}>{message}</div> : null}
        <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Tutup</button><button className="button primary" disabled={saving}>{saving ? <><LoadingSpinner/><span>Menyimpan...</span></> : "Simpan profil"}</button></div>
      </form>
    </div></div> : null}
  </>;
}
