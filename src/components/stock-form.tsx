"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, FileText, PackageSearch, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import type { Movement, Product, Store } from "@/lib/types";
import { ProductSearchSelect } from "@/components/product-search-select";
import { QuantityStepper } from "@/components/quantity-stepper";
import { SectionCard } from "@/components/section-card";

const inReasons = [
  { v: "purchase", l: "Pembelian supplier" },
  { v: "customer_return", l: "Retur pelanggan" },
  { v: "stocktake_adjustment", l: "Koreksi opname" },
  { v: "opening", l: "Stok awal" },
  { v: "manual_adjustment", l: "Penyesuaian lain" },
];
const outReasons = [
  { v: "damage", l: "Barang rusak" },
  { v: "loss", l: "Barang hilang" },
  { v: "internal_use", l: "Pemakaian internal" },
  { v: "supplier_return", l: "Retur supplier" },
  { v: "stocktake_adjustment", l: "Koreksi opname" },
  { v: "manual_adjustment", l: "Penyesuaian lain" },
];

type Line = { key: string; product_id: string; quantity: number };
const newLine = (): Line => ({ key: `${Date.now()}-${Math.random()}`, product_id: "", quantity: 1 });

export function StockForm({
  products,
  stores,
  defaultStoreId,
  onSaved,
}: {
  products: Product[];
  stores: Store[];
  defaultStoreId?: string;
  onSaved?: (movements: Movement[]) => void;
}) {
  const [type, setType] = useState<"in" | "out">("in");
  const [storeId, setStoreId] = useState(defaultStoreId ?? stores[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [movementType, setMovementType] = useState(inReasons[0].v);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const selectedIds = useMemo(() => new Set(lines.map((line) => line.product_id).filter(Boolean)), [lines]);
  const validLines = lines.filter((line) => line.product_id && line.quantity > 0);
  const totalQuantity = validLines.reduce((sum, line) => sum + line.quantity, 0);

  const switchType = (next: "in" | "out") => {
    setType(next);
    setMovementType((next === "in" ? inReasons : outReasons)[0].v);
    setMessage("");
  };
  const updateLine = (key: string, patch: Partial<Line>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const reset = () => {
    setLines([newLine()]);
    setMessage("");
  };

  return (
    <div className="stock-entry-workspace">
      <form
        className="operational-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setMessage("");
          const formElement = event.currentTarget;
          const form = new FormData(formElement);
          if (!validLines.length) {
            setMessage("Tambahkan minimal satu produk.");
            setSaving(false);
            return;
          }
          if (new Set(validLines.map((line) => line.product_id)).size !== validLines.length) {
            setMessage("Produk yang sama tidak boleh ditambahkan dua kali.");
            setSaving(false);
            return;
          }
          if (type === "out") {
            const unavailable = validLines.find((line) => line.quantity > (products.find((product) => product.id === line.product_id)?.stocks[storeId]?.quantity_available ?? 0));
            if (unavailable) {
              const product = products.find((item) => item.id === unavailable.product_id);
              setMessage(`Stok ${product?.name ?? "produk"} tidak mencukupi.`);
              setSaving(false);
              return;
            }
          }
          try {
            const response = await fetch("/api/stock/movement", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                store_id: storeId,
                direction: type,
                items: validLines.map(({ product_id, quantity }) => ({ product_id, quantity })),
                movement_type: movementType,
                reference_label: form.get("reference_label"),
                reason: form.get("reason"),
                notes: form.get("notes"),
              }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Gagal menyimpan stok");
            onSaved?.((result.movements ?? []) as Movement[]);
            reset();
            formElement.reset();
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Gagal menyimpan stok");
          } finally {
            setSaving(false);
          }
        }}
      >
        <SectionCard
          title="Jenis pergerakan"
          description="Pilih apakah barang menambah atau mengurangi stok toko."
          icon={type === "in" ? <ArrowDownToLine size={19}/> : <ArrowUpFromLine size={19}/>}
          tone={type === "in" ? "green" : "red"}
        >
          <div className="movement-segmented-control">
            <button type="button" className={type === "in" ? "active incoming" : ""} onClick={() => switchType("in")}>
              <ArrowDownToLine size={18}/> <span><strong>Stok masuk</strong><small>Barang diterima atau koreksi tambah</small></span>
            </button>
            <button type="button" className={type === "out" ? "active outgoing" : ""} onClick={() => switchType("out")}>
              <ArrowUpFromLine size={18}/> <span><strong>Stok keluar</strong><small>Rusak, hilang, atau pemakaian</small></span>
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Informasi dokumen" description="Data ini digunakan pada riwayat dan audit stok." icon={<FileText size={19}/>} tone="blue">
          <div className="operational-field-grid">
            <label>Toko<select value={storeId} onChange={(event) => setStoreId(event.target.value)} required>{stores.map((store) => <option key={store.id} value={store.id}>{store.name} ({store.code})</option>)}</select></label>
            <label>Alasan pergerakan<select value={movementType} onChange={(event) => setMovementType(event.target.value)}>{(type === "in" ? inReasons : outReasons).map((option) => <option key={option.v} value={option.v}>{option.l}</option>)}</select></label>
            <label>Nomor referensi<input name="reference_label" placeholder="Nota / dokumen (opsional)"/></label>
            <label>Alasan singkat<input name="reason" placeholder="Contoh: Pembelian nota INV-123" required/></label>
            <label className="span-2">Catatan<textarea name="notes" rows={3} placeholder="Keterangan tambahan untuk seluruh produk dalam dokumen ini..."/></label>
          </div>
        </SectionCard>

        <SectionCard
          title="Daftar produk"
          description="Cari produk berdasarkan nama, SKU, atau barcode. Beberapa produk dapat disimpan sekaligus."
          icon={<PackageSearch size={19}/>}
          badge={<span className="document-count-badge">{validLines.length} produk · {totalQuantity} unit</span>}
          actions={<button type="button" className="button secondary compact-button" onClick={() => setLines((current) => [...current, newLine()])}><Plus size={15}/> Tambah produk</button>}
        >
          <div className="stock-line-head" aria-hidden="true"><span>#</span><span>Produk</span><span>Stok saat ini</span><span>Jumlah</span><span>Aksi</span></div>
          <div className="stock-line-list">
            {lines.map((line, index) => {
              const product = products.find((item) => item.id === line.product_id);
              const available = product?.stocks[storeId]?.quantity_available ?? 0;
              return (
                <div className="stock-line-card" key={line.key}>
                  <span className="stock-line-number">{index + 1}</span>
                  <div className="stock-line-product"><ProductSearchSelect products={products.filter((item) => item.id === line.product_id || !selectedIds.has(item.id))} value={line.product_id} onChange={(product_id) => updateLine(line.key, { product_id })} storeId={storeId}/></div>
                  <div className="stock-line-current"><small>Stok saat ini</small><strong>{product ? `${available} ${product.unit}` : "—"}</strong>{type === "out" && product && line.quantity > available ? <em>Jumlah melebihi stok</em> : null}</div>
                  <QuantityStepper value={line.quantity} max={type === "out" && product ? Math.max(available, 1) : undefined} unit={product?.unit} ariaLabel={`Jumlah ${product?.name ?? `produk ${index + 1}`}`} onChange={(quantity) => updateLine(line.key, { quantity })}/>
                  <button type="button" className="stock-line-remove" aria-label="Hapus produk" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}><Trash2 size={17}/><span>Hapus</span></button>
                </div>
              );
            })}
          </div>
          <button type="button" className="stock-add-row-mobile" onClick={() => setLines((current) => [...current, newLine()])}><Plus size={16}/> Tambah produk lain</button>
        </SectionCard>

        <section className="document-summary-bar">
          <div><span>Jenis</span><strong>{type === "in" ? "Stok masuk" : "Stok keluar"}</strong></div>
          <div><span>Produk</span><strong>{validLines.length}</strong></div>
          <div><span>Total jumlah</span><strong>{totalQuantity} unit</strong></div>
          <div className="document-summary-message"><span>Status</span><strong className={message ? "negative" : "positive"}>{message || "Siap disimpan secara atomik"}</strong></div>
          <div className="stock-form-actions">
            <button type="button" className="button secondary" onClick={reset}><RotateCcw size={16}/> Reset</button>
            <button className="button primary" disabled={saving || !stores.length || !validLines.length}><Save size={16}/>{saving ? "Menyimpan..." : "Simpan pergerakan"}</button>
          </div>
        </section>
      </form>
    </div>
  );
}
