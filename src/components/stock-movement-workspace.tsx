"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Search, X } from "lucide-react";
import { StockForm } from "@/components/stock-form";
import { StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { Movement, Product, Store } from "@/lib/types";

const nonReversible = new Set(["sale", "sale_reversal", "transfer_out", "transfer_in"]);

export function StockMovementWorkspace({ initialMovements, products, stores, defaultStoreId, canCorrect }: { initialMovements: Movement[]; products: Product[]; stores: Store[]; defaultStoreId?: string; canCorrect: boolean }) {
  const [movements, setMovements] = useState(initialMovements);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [correcting, setCorrecting] = useState<Movement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const filtered = useMemo(() => movements.filter((row) => `${row.product} ${row.store} ${row.type} ${row.reason ?? ""}`.toLowerCase().includes(query.toLowerCase())), [movements, query]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3500); };
  const onSaved = (movement: Movement) => { setMovements((rows) => [movement, ...rows].slice(0, 50)); notify(`Stok ${movement.product} berhasil diperbarui.`); };

  return <>
    <div className="split-layout stock-workspace"><StockForm products={products} stores={stores} defaultStoreId={defaultStoreId} onSaved={onSaved}/>
      <div className="panel stock-activity-panel"><div className="panel-header"><div><h2>Aktivitas terbaru</h2><p>Perubahan baru langsung muncul tanpa memuat ulang halaman.</p></div><StatusBadge tone="info">Audit aktif</StatusBadge></div>
        <div className="activity-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk, toko, atau alasan..."/></div>
        <div className="activity-list">{filtered.map((movement) => <div className={`activity-row ${movement.reversed_at ? "reversed" : ""}`} key={movement.id}>
          <div className={`movement-dot ${movement.quantity > 0 ? "green" : "red"}`}/>
          <div className="activity-main"><strong>{movement.product}</strong><span>{movement.store} · {movement.type}{movement.reason ? ` · ${movement.reason}` : ""}</span><small>Stok {movement.stock_before ?? "—"} → {movement.stock_after ?? "—"} · oleh {movement.user}</small>{movement.reversed_at ? <em>Sudah diralat{movement.correction_reason ? `: ${movement.correction_reason}` : ""}</em> : null}</div>
          <div className="activity-value"><strong className={movement.quantity > 0 ? "positive" : "negative"}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</strong><span>{formatDateTime(movement.time)}</span>{canCorrect && !movement.reversed_at && !nonReversible.has(movement.movement_type ?? "") ? <button className="activity-correct" onClick={() => { setCorrecting(movement); setError(""); }}><RotateCcw size={13}/> Ralat</button> : null}</div>
        </div>)}{!filtered.length ? <div className="empty-inline">Aktivitas tidak ditemukan.</div> : null}</div>
        <div className="panel-footer"><span>Ralat tidak menghapus riwayat; sistem membuat transaksi pembalik agar audit tetap utuh.</span></div>
      </div>
    </div>

    {toast ? <div className="toast success"><CheckCircle2 size={20}/><div><strong>Berhasil disimpan</strong><span>{toast}</span></div><button onClick={() => setToast("")}><X size={16}/></button></div> : null}

    {correcting ? <div className="modal-backdrop"><div className="modal-card small-modal"><div className="modal-header"><div><h2>Ralat pergerakan stok</h2><p>Sistem akan membuat pergerakan kebalikan, bukan menghapus riwayat.</p></div><button className="icon-button" onClick={() => setCorrecting(null)}><X size={20}/></button></div>
      <div className="correction-summary"><strong>{correcting.product}</strong><span>{correcting.store} · {correcting.quantity > 0 ? "+" : ""}{correcting.quantity}</span><small>Stok {correcting.stock_before} → {correcting.stock_after}</small></div>
      {error ? <div className="alert error">{error}</div> : null}
      <form onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); try { const response = await fetch("/api/stock/movement", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ movement_id: correcting.id, reason: form.get("reason") }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal meralat stok"); setMovements((rows) => { const updated = rows.map((row) => row.id === correcting.id ? { ...row, reversed_at: new Date().toISOString(), correction_reason: String(form.get("reason")) } : row); return result.movement ? [result.movement as Movement, ...updated].slice(0, 50) : updated; }); setCorrecting(null); notify("Ralat stok berhasil dibuat dan saldo telah disesuaikan."); } catch (err) { setError(err instanceof Error ? err.message : "Gagal meralat stok"); } finally { setSaving(false); } }}>
        <label>Alasan ralat<textarea name="reason" rows={4} required autoFocus placeholder="Contoh: Salah input jumlah, seharusnya 10 bukan 100"/></label>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setCorrecting(null)}>Batal</button><button className="button danger" disabled={saving}>{saving ? "Memproses..." : "Buat ralat"}</button></div>
      </form>
    </div></div> : null}
  </>;
}
