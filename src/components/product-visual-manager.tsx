"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Braces, CheckCircle2, Copy, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { ProductVisual } from "@/components/product-visual";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ModalPortal } from "@/components/modal-portal";
import type { ProductVisual as ProductVisualType, ProductVisualDefinition } from "@/lib/types";

const template: ProductVisualDefinition = { shape: "bolt", primary: "#334155", secondary: "#94a3b8", accent: "#f59e0b", background: "#eff6ff" };
const customTemplate: ProductVisualDefinition = {
  shape: "custom", primary: "#334155", secondary: "#94a3b8", accent: "#f59e0b", background: "#eff6ff",
  elements: [
    { type: "rect", x: 33, y: 20, width: 14, height: 52, rx: 5, fill: "primary", stroke: "secondary", strokeWidth: 2 },
    { type: "polygon", points: "25,18 55,18 62,28 55,38 25,38 18,28", fill: "secondary", stroke: "primary", strokeWidth: 3 },
    { type: "line", x1: 31, y1: 50, x2: 49, y2: 50, stroke: "accent", strokeWidth: 3 },
    { type: "line", x1: 31, y1: 60, x2: 49, y2: 60, stroke: "accent", strokeWidth: 3 },
  ],
};

function parseCode(code: string): ProductVisualDefinition | null {
  try {
    const value = JSON.parse(code) as ProductVisualDefinition;
    return value && typeof value === "object" && typeof value.shape === "string" ? value : null;
  } catch { return null; }
}

export function ProductVisualManager({ visuals }: { visuals: ProductVisualType[] }) {
  const router = useRouter();
  const [items, setItems] = useState<ProductVisualType[]>(visuals);

  useEffect(() => {
    setItems(visuals);
  }, [visuals]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState(JSON.stringify(template, null, 2));
  const [editing, setEditing] = useState<ProductVisualType | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const preview = useMemo(() => parseCode(code), [code]);
  const filteredVisuals = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((visual) => `${visual.name} ${visual.code?.shape ?? ""} ${visual.is_builtin ? "bawaan" : "custom admin"}`.toLowerCase().includes(normalized));
  }, [items, query]);

  const resetEditor = () => {
    setEditing(null);
    setName("");
    setCode(JSON.stringify(template, null, 2));
  };

  const startEdit = (visual: ProductVisualType) => {
    setEditing(visual);
    setName(visual.name);
    setCode(JSON.stringify(visual.code, null, 2));
    setMessage(visual.is_builtin ? "Visual bawaan tidak dapat diedit, tetapi dapat dihapus dari galeri." : "Mode edit visual aktif.");
  };

  const save = async () => {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/product-visuals", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing?.id, name, code, is_active: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan visual");
      setMessage(editing ? "Perubahan visual berhasil disimpan." : "Visual baru berhasil disimpan dan siap dipilih pada produk.");
      if (result.visual) {
        setItems((current) => editing
          ? current.map((v) => v.id === result.visual.id ? result.visual : v)
          : [result.visual, ...current]
        );
      }
      resetEditor();
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan visual"); }
    finally { setSaving(false); }
  };

  const remove = async (visual: ProductVisualType) => {
    const text = `Hapus visual “${visual.name}”? Produk yang menggunakannya akan kembali ke visual umum.`;
    if (!window.confirm(text)) return;
    setDeletingId(visual.id); setMessage("");
    try {
      const response = await fetch("/api/product-visuals", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: visual.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menghapus visual");
      setItems((current) => current.filter((v) => v.id !== visual.id));
      if (editing?.id === visual.id) resetEditor();
      setMessage("Visual berhasil dihapus dari galeri.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menghapus visual"); }
    finally { setDeletingId(null); }
  };



  return <>
    <button className="button secondary product-master-action-button" onClick={() => setOpen(true)}><Braces size={16}/><span className="action-label-full">Visual Produk</span><span className="action-label-short">Visual</span></button>
    {open ? <ModalPortal><div className="modal-backdrop"><div className="modal-card visual-manager-modal">
      <div className="modal-header"><div><h2>Galeri visual produk</h2><p>Edit visual buatan admin atau hapus visual apa pun dari galeri. Produk yang memakai visual terhapus otomatis kembali ke visual umum.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <div className="visual-manager-layout">
        <section className="visual-library"><div className="visual-section-title"><strong>Pilihan tersimpan</strong><span>{items.filter((visual) => visual.is_active).length} aktif · {items.length} total</span></div>
          <div className="visual-library-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau bentuk Visual Code..."/><b>{filteredVisuals.length}</b></div>
          <div className="visual-library-grid">{filteredVisuals.map((visual) => <article key={visual.id} className={`visual-library-card ${visual.is_active ? "" : "is-inactive"}`}>
            <ProductVisual name={visual.name} definition={visual.code} size="preview"/>
            <div className="visual-library-meta"><strong>{visual.name}</strong><span>{visual.is_builtin ? "Bawaan sistem" : "Visual buatan admin"}{visual.is_active ? "" : " · disembunyikan"}</span></div>
            <div className="visual-card-actions">
              {!visual.is_builtin ? <button type="button" title="Edit visual" onClick={() => startEdit(visual)}><Pencil size={13}/><span>Edit</span></button> : <span className="visual-builtin-label" title="Visual bawaan sistem (tidak dapat diedit)">Bawaan</span>}
              <button type="button" className="danger" title="Hapus visual" onClick={() => remove(visual)} disabled={deletingId === visual.id}>{deletingId === visual.id ? <LoadingSpinner size={13}/> : <Trash2 size={13}/>}<span>Hapus</span></button>
            </div>
          </article>)}{!filteredVisuals.length ? <div className="visual-library-empty">Visual tidak ditemukan. Coba kata kunci lain.</div> : null}</div>
        </section>
        <section className="visual-code-editor"><div className="visual-section-title"><strong>{editing ? `Edit ${editing.name}` : "Tambah visual dari kode"}</strong><span>{editing ? "Simpan untuk memperbarui pilihan visual." : "Gunakan bentuk perkakas yang tersedia."}</span></div>
          <label>Nama visual<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Baut Stainless" disabled={Boolean(editing?.is_builtin)}/></label>
          <label>Kode JSON<textarea rows={12} value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} disabled={Boolean(editing?.is_builtin)}/></label>
          <div className="visual-code-help"><span>Bentuk cepat: bolt, nut, screw, wrench, drill, grinder, saw, hammer, pliers, bearing, tape, generic. Gunakan shape custom + elements untuk visual khusus.</span><div className="visual-code-actions"><button type="button" onClick={() => { setCode(JSON.stringify(template, null, 2)); setMessage("Contoh preset dimuat ke editor."); }} disabled={Boolean(editing?.is_builtin)}><Copy size={13}/> Contoh preset</button><button type="button" onClick={() => { setCode(JSON.stringify(customTemplate, null, 2)); setMessage("Contoh vector custom dimuat ke editor."); }} disabled={Boolean(editing?.is_builtin)}><Copy size={13}/> Contoh custom</button></div></div>
          <div className="visual-live-preview"><ProductVisual name={name || "Pratinjau"} definition={preview ?? undefined} size="preview"/><div>{preview ? <><CheckCircle2 size={16}/><strong>Kode dapat dipratinjau</strong></> : <><X size={16}/><strong>JSON belum valid</strong></>}<span>Mendukung warna palet (primary, secondary, accent, background), hex (#2563eb, #eff6ff), atau transparent.</span></div></div>
          {message ? <div className={`alert ${message.includes("berhasil") || message.includes("ditampilkan") || message.includes("disembunyikan") ? "success" : "error"}`}>{message}</div> : null}
          <div className="visual-editor-actions">{editing ? <button type="button" className="button secondary" onClick={resetEditor}>Batal edit</button> : null}<button type="button" className="button primary visual-save-button" disabled={saving || !name.trim() || !preview || Boolean(editing?.is_builtin)} onClick={save}>{saving ? <LoadingSpinner/> : <Plus size={16}/>}<span>{saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan sebagai pilihan"}</span></button></div>
        </section>
      </div>
    </div></div></ModalPortal> : null}
  </>;
}
