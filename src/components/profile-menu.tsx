"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, MapPin, Phone, ShieldCheck, X } from "lucide-react";
import {
  UserAvatar,
  avatarPresets,
  normalizeAvatarKey,
  type AvatarPresetKey,
} from "@/components/user-avatar";
import type { Store, UserProfile } from "@/lib/types";
import { LoadingSpinner } from "@/components/loading-spinner";

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Kepala Toko",
  cashier: "Kasir",
  warehouse: "Gudang",
};

export function ProfileMenu({
  profile,
  stores,
  className = "",
}: {
  profile: UserProfile;
  stores: Store[];
  className?: string;
}) {
  const initialAvatarKey = normalizeAvatarKey(profile.avatar_key);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [savedAvatarKey, setSavedAvatarKey] = useState<AvatarPresetKey>(initialAvatarKey);
  const [avatarKey, setAvatarKey] = useState<AvatarPresetKey>(initialAvatarKey);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const assignedStores = useMemo(
    () => stores.filter((store) => profile.store_ids?.includes(store.id) || store.id === profile.primary_store_id),
    [stores, profile.store_ids, profile.primary_store_id],
  );
  const canEditDetails = profile.role === "owner" || profile.role === "admin";

  useEffect(() => {
    const nextAvatarKey = normalizeAvatarKey(profile.avatar_key);
    setSavedAvatarKey(nextAvatarKey);
    setAvatarKey(nextAvatarKey);
  }, [profile.avatar_key]);

  const openDialog = useCallback(() => {
    setAvatarKey(savedAvatarKey);
    setMessage("");
    setOpen(true);
  }, [savedAvatarKey]);

  const closeDialog = useCallback(() => {
    if (saving) return;
    setAvatarKey(savedAvatarKey);
    setMessage("");
    setOpen(false);
  }, [savedAvatarKey, saving]);

  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const html = document.documentElement;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const previousHtmlOverflow = html.style.overflow;
    const hadModalOpenClass = body.classList.contains("modal-open");
    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
    const currentPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.classList.add("modal-open");
    if (scrollbarWidth > 0) body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;

    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      html.style.overflow = previousHtmlOverflow;
      if (!hadModalOpenClass) body.classList.remove("modal-open");
      triggerRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        event.preventDefault();
        setAvatarKey(savedAvatarKey);
        setMessage("");
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, savedAvatarKey, saving]);

  const dialog = open ? (
    <div
      className="modal-backdrop profile-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <section
        ref={modalRef}
        className="modal-card profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={saving}
      >
        <div className="modal-header">
          <div>
            <h2 id={titleId}>Profil pengguna</h2>
            <p id={descriptionId}>Lihat informasi akun dan pilih avatar bawaan.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            onClick={closeDialog}
            disabled={saving}
            aria-label="Tutup profil"
          >
            <X size={20}/>
          </button>
        </div>

        <div className="profile-hero">
          <UserAvatar name={profile.full_name} avatarKey={avatarKey} size="xl"/>
          <div>
            <strong>{profile.full_name}</strong>
            <span>{roleLabels[profile.role] ?? profile.role}</span>
            <small>{profile.is_active ? "Akun aktif" : "Akun nonaktif"}</small>
          </div>
        </div>

        <form
          key={`${profile.id}:${profile.full_name}:${profile.phone ?? ""}`}
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setMessage("");
            const form = new FormData(event.currentTarget);

            try {
              const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  avatar_key: avatarKey,
                  full_name: canEditDetails ? form.get("full_name") : undefined,
                  phone: canEditDetails ? form.get("phone") : undefined,
                }),
              });
              const result = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(result.error || "Gagal menyimpan profil");

              setSavedAvatarKey(avatarKey);
              setMessage("Profil berhasil diperbarui.");
              router.refresh();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Gagal menyimpan profil");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="profile-details">
            <label>
              Nama lengkap
              <input name="full_name" defaultValue={profile.full_name} readOnly={!canEditDetails} autoComplete="name"/>
            </label>
            <label>
              Nomor telepon
              <input name="phone" type="tel" defaultValue={profile.phone ?? ""} readOnly={!canEditDetails} placeholder="Belum diisi" autoComplete="tel"/>
            </label>
            <div><Mail size={16}/><span>Email</span><strong>{profile.email || "-"}</strong></div>
            <div><ShieldCheck size={16}/><span>Role</span><strong>{roleLabels[profile.role] ?? profile.role}</strong></div>
            <div className="profile-stores"><MapPin size={16}/><span>Akses toko</span><strong>{assignedStores.length ? assignedStores.map((store) => store.name).join(", ") : "Belum ditetapkan"}</strong></div>
          </div>

          {!canEditDetails ? (
            <div className="profile-readonly">
              <Phone size={16}/>
              <span>Detail akun hanya dapat diubah oleh owner atau admin. Anda tetap dapat mengganti avatar sendiri.</span>
            </div>
          ) : null}

          <div className="avatar-section">
            <div>
              <strong>Pilih avatar</strong>
              <span>Avatar tersimpan pada akun dan tampil di semua perangkat.</span>
            </div>
            <div className="avatar-grid" role="group" aria-label="Pilihan avatar">
              {avatarPresets.map((preset) => {
                const selected = avatarKey === preset.key;
                return (
                  <button
                    type="button"
                    key={preset.key}
                    className={selected ? "selected" : ""}
                    aria-pressed={selected}
                    onClick={() => setAvatarKey(preset.key)}
                  >
                    <UserAvatar name={profile.full_name} avatarKey={preset.key}/>
                    <span>{preset.label}</span>
                    {selected ? <Check size={14} aria-hidden="true"/> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {message ? (
            <div className={message.includes("berhasil") ? "alert success" : "alert error"} role={message.includes("berhasil") ? "status" : "alert"}>
              {message}
            </div>
          ) : null}

          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={closeDialog} disabled={saving}>Tutup</button>
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? <><LoadingSpinner/><span>Menyimpan...</span></> : "Simpan profil"}
            </button>
          </div>
        </form>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`profile-trigger ${className}`}
        onClick={openDialog}
        title="Lihat profil"
        aria-label={`Buka profil ${profile.full_name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <UserAvatar name={profile.full_name} avatarKey={savedAvatarKey} size="md"/>
      </button>
      {dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
