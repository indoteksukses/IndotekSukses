"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Edit3, FolderPlus, Plus, Search, Tags, X } from "lucide-react";
import { StatusBadge } from "@/components/ui";

type Category = { id: string; name: string; description?: string | null; is_active?: boolean };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(categories);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const filtered = useMemo(() => rows.filter((category) => `${category.name} ${category.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);

  const show = () => {
    setEditing(null);
    setError("");
    setSuccess("");
    setOpen(true);
  };

  return <>
    <button className="button secondary" onClick={show}><Tags size={17}/> Kelola kategori</button>
    {open ? <div className="modal-backdrop"><div className="modal-card category-modal">
      <div className="modal-header"><div><h2>{editing ? (editing.id ? "Edit kategori" : "Tambah kategori") : "Kelola kategori"}</h2><p>Kategori dapat ditambah, diubah, dinonaktifkan, dan dipakai untuk pencarian produk.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success"><CheckCircle2 size={17}/>{success}</div> : null}
      {!editing ? <div className="category-manager-layout">
        <button className="category-add-card" onClick={() => { setEditing({ id: "", name: "", is_active: true }); setSuccess(""); }}><FolderPlus size={28}/><strong>Tambah kategori baru</strong><span>Buat kelompok produk baru tanpa meninggalkan halaman.</span></button>
        <div className="category-list-wrap">
          <div className="category-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kategori..."/></div>
          <div className="category-list">{filtered.map((category) => <div className="category-list-row" key={category.id}><div><strong>{category.name}</strong><span>{category.description || "Tanpa deskripsi"}</span></div><StatusBadge tone={category.is_active === false ? "neutral" : "success"}>{category.is_active === false ? "Nonaktif" : "Aktif"}</StatusBadge><button className="table-action" onClick={() => { setEditing(category); setSuccess(""); }}><Edit3 size={14}/> Edit</button></div>)}{!filtered.length ? <div className="empty-inline">Kategori tidak ditemukan.</div> : null}</div>
        </div>
      </div> : <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");
        const form = new FormData(event.currentTarget);
        const isNew = !editing.id;
        try {
          const response = await fetch("/api/categories", {
            method: isNew ? "POST" : "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editing.id || undefined, name: form.get("name"), description: form.get("description"), is_active: form.get("is_active") === "on" }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Gagal menyimpan kategori");
          const saved = result.category as Category;
          setRows((current) => isNew ? [...current, saved].sort((a, b) => a.name.localeCompare(b.name, "id")) : current.map((row) => row.id === saved.id ? saved : row));
          setEditing(null);
          setSuccess(isNew ? "Kategori berhasil ditambahkan." : "Kategori berhasil diperbarui.");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Gagal menyimpan kategori");
        } finally {
          setSaving(false);
        }
      }}>
        <label className="span-2">Nama kategori<input name="name" defaultValue={editing.name} autoFocus required placeholder="Contoh: Baut & Mur"/></label>
        <label className="span-2">Deskripsi<textarea name="description" defaultValue={editing.description ?? ""} rows={3} placeholder="Keterangan opsional"/></label>
        <label className="checkbox-field span-2"><input name="is_active" type="checkbox" defaultChecked={editing.is_active !== false}/><span>Kategori aktif dan dapat dipilih pada produk baru</span></label>
        <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={() => { setEditing(null); setError(""); }}>Kembali</button><button className="button primary" disabled={saving}><Plus size={16}/>{saving ? "Menyimpan..." : "Simpan kategori"}</button></div>
      </form>}
    </div></div> : null}
  </>;
}
