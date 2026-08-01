"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Braces, CheckCircle2, Copy, Plus, X } from "lucide-react";
import { ProductVisual } from "@/components/product-visual";
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState(JSON.stringify(template, null, 2));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const preview = useMemo(() => parseCode(code), [code]);

  const save = async () => {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/product-visuals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, code }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan visual");
      setMessage("Visual baru berhasil disimpan dan siap dipilih pada produk.");
      setName(""); setCode(JSON.stringify(template, null, 2));
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan visual"); }
    finally { setSaving(false); }
  };

  return <>
    <button className="button secondary" onClick={() => setOpen(true)}><Braces size={16}/> Visual Produk</button>
    {open ? <div className="modal-backdrop"><div className="modal-card visual-manager-modal">
      <div className="modal-header"><div><h2>Galeri visual produk</h2><p>Ilustrasi ringan berbasis kode JSON. Mendukung preset alat teknik dan elemen vector custom tanpa menjalankan HTML atau script.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <div className="visual-manager-layout">
        <section className="visual-library"><div className="visual-section-title"><strong>Pilihan tersimpan</strong><span>{visuals.length} visual aktif</span></div><div className="visual-library-grid">{visuals.map((visual) => <article key={visual.id} className="visual-library-card"><ProductVisual name={visual.name} definition={visual.code} size="preview"/><div><strong>{visual.name}</strong><span>{visual.is_builtin ? "Bawaan sistem" : "Visual buatan admin"}</span></div></article>)}</div></section>
        <section className="visual-code-editor"><div className="visual-section-title"><strong>Tambah visual dari kode</strong><span>Gunakan bentuk perkakas yang tersedia.</span></div>
          <label>Nama visual<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Baut Stainless"/></label>
          <label>Kode JSON<textarea rows={12} value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false}/></label>
          <div className="visual-code-help"><span>Bentuk cepat: bolt, nut, screw, wrench, drill, grinder, saw, hammer, pliers, bearing, tape, generic. Gunakan shape custom + elements bila Anda meminta kode visual produk khusus.</span><div className="visual-code-actions"><button type="button" onClick={() => { setCode(JSON.stringify(template, null, 2)); setMessage("Contoh preset dimuat ke editor."); }}><Copy size={13}/> Contoh preset</button><button type="button" onClick={() => { setCode(JSON.stringify(customTemplate, null, 2)); setMessage("Contoh vector custom dimuat ke editor."); }}><Copy size={13}/> Contoh custom</button></div></div>
          <div className="visual-live-preview"><ProductVisual name={name || "Pratinjau"} definition={preview ?? undefined} size="preview"/><div>{preview ? <><CheckCircle2 size={16}/><strong>Kode dapat dipratinjau</strong></> : <><X size={16}/><strong>JSON belum valid</strong></>}<span>Warna hanya menerima format hex 6 digit, misalnya #2563eb.</span></div></div>
          {message ? <div className={`alert ${message.includes("berhasil") || message.includes("disalin") ? "success" : "error"}`}>{message}</div> : null}
          <button type="button" className="button primary visual-save-button" disabled={saving || !name.trim() || !preview} onClick={save}><Plus size={16}/>{saving ? "Menyimpan..." : "Simpan sebagai pilihan"}</button>
        </section>
      </div>
    </div></div> : null}
  </>;
}
