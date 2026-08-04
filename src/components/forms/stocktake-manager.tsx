"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck, Eye, Filter, Plus, Search, X } from "lucide-react";
import { QuantityStepper } from "@/components/quantity-stepper";
import { LoadingSpinner } from "@/components/loading-spinner";
import type { Product, ProductVariant, Store } from "@/lib/types";

 type CountState = Record<string, { physical: number; note: string }>;
 type DetailItem = {
  id: string; product_id: string; variant_id?: string | null; name: string; sku: string; variant_name?: string | null; variant_sku?: string | null; unit: string;
  system_quantity: number; physical_quantity: number | null; variance: number | null; notes: string;
};

export function CreateStocktake({ stores }: { stores: Store[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  return <>
    <button className="button primary" onClick={() => setOpen(true)}><Plus size={17}/> Mulai stok opname</button>
    {open ? <div className="modal-backdrop"><div className="modal-card small-modal operational-modal stocktake-create-modal">
      <div className="modal-header operational-modal-header"><div><h2>Mulai stok opname</h2><p>Buat snapshot stok sebelum karyawan melakukan hitung fisik.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <div className="operation-stepper compact"><span className="active"><b>1</b>Pilih toko</span><i/><span><b>2</b>Hitung fisik</span><i/><span><b>3</b>Finalisasi</span></div>
      {error ? <div className="alert error">{error}</div> : null}{success ? <div className="alert success"><CheckCircle2 size={17}/>{success}</div> : null}
      <form className="operational-dialog-form" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError("");
        const form = new FormData(event.currentTarget);
        try {
          const response = await fetch("/api/stocktakes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", store_id: form.get("store_id"), notes: form.get("notes") }) });
          const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal membuat opname");
          setSuccess(`Stok opname ${result.stocktake_number || "baru"} berhasil dibuat.`); router.refresh(); window.setTimeout(() => setOpen(false), 1100);
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat opname"); } finally { setSaving(false); }
      }}>
        <section className="operation-form-block"><div className="operation-form-block-title"><span><ClipboardCheck size={18}/></span><div><strong>Informasi opname</strong><small>Pilih satu toko yang akan dihitung.</small></div></div><label>Toko<select name="store_id" required>{stores.map((store) => <option value={store.id} key={store.id}>{store.name} ({store.code})</option>)}</select></label><label>Catatan<textarea name="notes" rows={3} placeholder="Contoh: Opname bulanan gudang utama"/></label></section>
        <div className="modal-actions sticky-modal-actions"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? <LoadingSpinner/> : null}<span>{saving ? "Membuat..." : "Mulai opname"}</span></button></div>
      </form>
    </div></div> : null}
  </>;
}

export function CompleteStocktake({ stocktake, products }: { stocktake: any; products: Product[] }) {
  const router = useRouter();
  const rows = useMemo(() => products.flatMap((product) => {
    const variants = (product.variants ?? []).filter((variant) => variant.is_active);
    return variants.length
      ? variants.map((variant) => ({ key: `${product.id}:${variant.id}`, product, variant }))
      : [{ key: `${product.id}:base`, product, variant: null as ProductVariant | null }];
  }), [products]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [counts, setCounts] = useState<CountState>(() => Object.fromEntries(rows.map(({ key, product, variant }) => [key, { physical: variant ? variant.stocks?.[stocktake.store_id]?.quantity_on_hand ?? 0 : product.stocks[stocktake.store_id]?.quantity_on_hand ?? 0, note: "" }])));
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category).filter(Boolean) as string[])).sort(), [products]);
  const filtered = useMemo(() => rows.filter(({ product, variant }) => {
    const matchesQuery = `${product.name} ${product.sku} ${product.barcode ?? ""} ${variant?.name ?? ""} ${variant?.sku ?? ""} ${variant?.barcode ?? ""}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!category || product.category === category);
  }), [rows, query, category]);
  const varianceCount = useMemo(() => rows.filter(({ key, product, variant }) => {
    const system = variant ? variant.stocks?.[stocktake.store_id]?.quantity_on_hand ?? 0 : product.stocks[stocktake.store_id]?.quantity_on_hand ?? 0;
    return (counts[key]?.physical ?? system) !== system;
  }).length, [rows, counts, stocktake.store_id]);

  return <>
    <button className="table-action" onClick={() => setOpen(true)}>Input fisik</button>
    {open ? <div className="modal-backdrop"><div className="modal-card stocktake-modal operational-modal">
      <div className="modal-header operational-modal-header"><div><h2>Hitung stok fisik</h2><p>{stocktake.stocktake_number} · {stocktake.store_name} · stok dihitung per varian.</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <div className="operation-stepper"><span><b>1</b>Toko dipilih</span><i className="done"/><span className="active"><b>2</b>Hitung fisik</span><i/><span><b>3</b>Review selisih</span><i/><span><b>4</b>Finalisasi</span></div>
      {error ? <div className="alert error">{error}</div> : null}
      <form onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError("");
        const payload = rows.map(({ key, product, variant }) => ({ product_id: product.id, variant_id: variant?.id ?? null, physical_quantity: counts[key]?.physical ?? 0, notes: counts[key]?.note ?? "" }));
        try {
          const response = await fetch("/api/stocktakes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", stocktake_id: stocktake.id, counts: payload }) });
          const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal menyelesaikan opname"); setOpen(false); router.refresh();
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyelesaikan opname"); } finally { setSaving(false); }
      }}>
        <div className="stocktake-toolbar"><div className="activity-search-v23"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk, varian, SKU, atau barcode..."/></div><label><Filter size={15}/><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua kategori</option>{categories.map((name) => <option value={name} key={name}>{name}</option>)}</select></label><span>{filtered.length} baris · {varianceCount} berselisih</span></div>
        <div className="stocktake-table-head"><span>Produk / varian</span><span>Stok sistem</span><span>Stok fisik</span><span>Selisih</span><span>Catatan</span></div>
        <div className="stocktake-list-v23">
          {filtered.map(({ key, product, variant }) => {
            const system = variant ? variant.stocks?.[stocktake.store_id]?.quantity_on_hand ?? 0 : product.stocks[stocktake.store_id]?.quantity_on_hand ?? 0;
            const physical = counts[key]?.physical ?? system;
            const variance = physical - system;
            const displayName = variant ? `${product.name} · ${variant.name}` : product.name;
            return <article className={`stocktake-card-v23 ${variance < 0 ? "short" : variance > 0 ? "over" : "match"}`} key={key}>
              <div className="stocktake-product"><span><ClipboardCheck size={18}/></span><div><strong>{displayName}</strong><small>{variant?.sku || product.sku} · {product.category || "Tanpa kategori"}</small></div></div>
              <div className="stocktake-system"><small>Stok sistem</small><strong>{system} {product.unit}</strong></div>
              <QuantityStepper value={physical} min={0} unit={product.unit} ariaLabel={`Stok fisik ${displayName}`} onChange={(value) => setCounts((current) => ({ ...current, [key]: { ...(current[key] ?? { note: "" }), physical: value } }))}/>
              <div className="stocktake-variance"><small>Selisih</small><strong>{variance > 0 ? "+" : ""}{variance} {product.unit}</strong><span>{variance === 0 ? "Sesuai" : variance > 0 ? "Stok lebih" : "Stok kurang"}</span></div>
              <input className="stocktake-note" value={counts[key]?.note ?? ""} onChange={(event) => setCounts((current) => ({ ...current, [key]: { ...(current[key] ?? { physical: system }), note: event.target.value } }))} placeholder="Catatan (opsional)"/>
            </article>;
          })}
          {!filtered.length ? <div className="empty-inline">Produk atau varian tidak ditemukan.</div> : null}
        </div>
        <div className="stocktake-final-summary"><div><span>Total baris</span><strong>{rows.length}</strong></div><div><span>Sesuai</span><strong>{rows.length - varianceCount}</strong></div><div><span>Berselisih</span><strong className={varianceCount ? "negative" : "positive"}>{varianceCount}</strong></div></div>
        <div className="modal-actions sticky-modal-actions"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? <LoadingSpinner/> : null}<span>{saving ? "Menyelesaikan..." : "Finalkan opname"}</span></button></div>
      </form>
    </div></div> : null}
  </>;
}

export function StocktakeDetails({ stocktake }: { stocktake: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DetailItem[]>([]);
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    setOpen(true);
    if (detail) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/stocktakes?id=${encodeURIComponent(stocktake.id)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal memuat rincian opname");
      setDetail(result.stocktake); setItems(result.items ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat rincian opname"); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return keyword ? items.filter((item) => `${item.name} ${item.sku} ${item.variant_name ?? ""} ${item.variant_sku ?? ""} ${item.notes}`.toLowerCase().includes(keyword)) : items;
  }, [items, query]);
  const changed = items.filter((item) => Number(item.variance ?? 0) !== 0).length;

  return <>
    <button className="table-action" onClick={load}><Eye size={14}/> Rincian</button>
    {open ? <div className="modal-backdrop"><div className="modal-card stocktake-detail-modal operational-modal">
      <div className="modal-header operational-modal-header"><div><h2>Rincian stok opname</h2><p>{stocktake.stocktake_number} · {stocktake.store_name}</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      {loading ? <div className="stocktake-detail-loading"><LoadingSpinner size={28}/><strong>Memuat rincian opname...</strong></div> : null}
      {error ? <div className="alert error">{error}</div> : null}
      {!loading && detail ? <>
        <div className="stocktake-detail-summary"><div><span>Status</span><strong>{detail.status}</strong></div><div><span>Total produk</span><strong>{items.length}</strong></div><div><span>Berselisih</span><strong className={changed ? "negative" : "positive"}>{changed}</strong></div><div><span>Toko</span><strong>{detail.store_name}</strong></div></div>
        <div className="stocktake-detail-toolbar"><div className="activity-search-v23"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk atau SKU..."/></div><span>{filtered.length} dari {items.length} produk</span></div>
        <div className="stocktake-detail-list">{filtered.map((item) => {
          const variance = Number(item.variance ?? 0);
          return <article key={item.id} className={`stocktake-detail-row ${variance < 0 ? "short" : variance > 0 ? "over" : "match"}`}>
            <div><strong>{item.name}{item.variant_name ? ` · ${item.variant_name}` : ""}</strong><span>{item.variant_sku || item.sku}</span></div>
            <div><small>Stok sistem</small><strong>{item.system_quantity} {item.unit}</strong></div>
            <div><small>Stok fisik</small><strong>{item.physical_quantity ?? "Belum diisi"}{item.physical_quantity != null ? ` ${item.unit}` : ""}</strong></div>
            <div><small>Selisih</small><strong>{variance > 0 ? "+" : ""}{variance} {item.unit}</strong></div>
            <div><small>Catatan</small><span>{item.notes || "—"}</span></div>
          </article>;
        })}</div>
        <div className="modal-actions sticky-modal-actions"><button type="button" className="button primary" onClick={() => setOpen(false)}>Tutup rincian</button></div>
      </> : null}
    </div></div> : null}
  </>;
}
