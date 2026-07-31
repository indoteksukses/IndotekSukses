"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Store as StoreIcon, X } from "lucide-react";
import type { Store, UserRole } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export function ShiftManager({ stores, shifts, defaultStoreId, profileId, role }: { stores: Store[]; shifts: any[]; defaultStoreId?: string; profileId: string; role: UserRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [storeId, setStoreId] = useState(defaultStoreId ?? stores[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const activeShift = useMemo(() => shifts.find((shift) => shift.store_id === storeId && shift.status === "open"), [shifts, storeId]);
  const canClose = activeShift && (activeShift.cashier_id === profileId || ["owner", "admin", "manager"].includes(role));

  return <>
    <button className="button primary" onClick={() => { setOpen(true); setError(""); }}><StoreIcon size={17}/> Kelola shift toko</button>
    {open ? <div className="modal-backdrop"><div className="modal-card shift-modal"><div className="modal-header"><div><h2>Shift kasir toko</h2><p>Satu toko hanya memiliki satu shift aktif yang dapat dipakai bersama oleh seluruh kasir berizin.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      {error ? <div className="alert error">{error}</div> : null}
      <label className="shift-store-select">Pilih toko<select value={storeId} onChange={(event) => { setStoreId(event.target.value); setError(""); }}>{stores.map((store) => <option value={store.id} key={store.id}>{store.name} ({store.code})</option>)}</select></label>
      {activeShift ? <div className="active-shift-card"><div><span>Shift aktif</span><strong>{activeShift.store_name}</strong><small>Dibuka oleh {activeShift.cashier_name} · kas awal {formatCurrency(Number(activeShift.opening_cash ?? 0))}</small></div><span className="status-dot">Aktif</span></div> : <div className="empty-shift-card"><strong>Belum ada shift aktif</strong><span>Satu karyawan cukup membuka shift. Karyawan lain di toko yang sama dapat langsung memakai kasir.</span></div>}
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget);
        const action = activeShift ? "close" : "open";
        try {
          const response = await fetch("/api/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, store_id: storeId, opening_cash: Number(form.get("opening_cash") || 0), shift_id: activeShift?.id, actual_cash: Number(form.get("actual_cash") || 0), notes: form.get("notes") }) });
          const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal memproses shift"); setOpen(false); router.refresh();
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal memproses shift"); }
        finally { setSaving(false); }
      }}>
        {!activeShift ? <label className="span-2">Kas awal<input name="opening_cash" type="number" min="0" step="1" defaultValue="0" required/></label> : canClose ? <label className="span-2">Kas fisik saat ditutup<input name="actual_cash" type="number" min="0" step="1" required/></label> : <div className="alert info span-2">Shift ini dibuka oleh {activeShift.cashier_name}. Hanya pembuka shift, kepala toko, admin, atau owner yang dapat menutupnya.</div>}
        <label className="span-2">Catatan<textarea name="notes" rows={3} placeholder="Opsional"/></label>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button>{!activeShift || canClose ? <button className={`button ${activeShift ? "danger" : "primary"}`} disabled={saving}>{saving ? "Memproses..." : activeShift ? "Tutup shift toko" : "Buka shift toko"}</button> : null}</div>
      </form>
    </div></div> : null}
  </>;
}
