"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Eye, FileText, PackageSearch, Pencil, Plus, Printer, ReceiptText, Trash2, X } from "lucide-react";
import { ProductSearchSelect } from "@/components/product-search-select";
import { SectionCard } from "@/components/section-card";
import { formatCurrency } from "@/lib/format";
import type { Product, Store } from "@/lib/types";
import { LoadingSpinner } from "@/components/loading-spinner";

type AllocationMap = Record<string, number>;
type PurchaseLine = { key: string; product_id: string; variant_id?: string | null; unit_cost: number; allocations: AllocationMap };


async function parsePurchaseResponse(response: Response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {
      error: raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")
        ? "Server pembelian mengembalikan halaman error. Pastikan migration v2.7.0 sudah dijalankan dan periksa log Vercel."
        : raw || "Respons penyimpanan PO tidak valid.",
    };
  }
}

const lineKey = () => `${Date.now()}-${Math.random()}`;
const blankLine = (storeIds: string[]): PurchaseLine => ({ key: lineKey(), product_id: "", variant_id: null, unit_cost: 0, allocations: Object.fromEntries(storeIds.map((id) => [id, 1])) });

function initialState(purchase: any | undefined, stores: Store[]) {
  const allocationStoreIds = purchase?.items?.flatMap((item: any) => item.allocations?.map((allocation: any) => allocation.store_id) ?? []) ?? [];
  const fallbackStores = purchase?.destination_store_id ? [purchase.destination_store_id] : [stores[0]?.id].filter(Boolean);
  const selected = [...new Set(allocationStoreIds.length ? allocationStoreIds : fallbackStores)] as string[];
  const lines: PurchaseLine[] = purchase?.items?.length ? purchase.items.map((item: any) => ({
    key: item.id ?? lineKey(), product_id: item.product_id, variant_id: item.variant_id ?? null, unit_cost: Number(item.unit_cost ?? 0),
    allocations: Object.fromEntries((item.allocations?.length ? item.allocations : [{ store_id: purchase.destination_store_id, quantity: item.quantity_ordered }]).map((allocation: any) => [allocation.store_id, Number(allocation.quantity ?? 0)])),
  })) : [blankLine(selected)];
  return { selected, lines };
}

export function PurchaseManager({ stores, products, suppliers, purchase, label }: { stores: Store[]; products: Product[]; suppliers: any[]; purchase?: any; label?: string }) {
  const router = useRouter();
  const base = initialState(purchase, stores);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scope, setScope] = useState<"all" | "selected">(purchase?.receiving_scope === "all" ? "all" : "selected");
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(purchase?.receiving_scope === "all" ? stores.map((store) => store.id) : base.selected);
  const [lines, setLines] = useState<PurchaseLine[]>(base.lines);
  const [shipping, setShipping] = useState(Number(purchase?.shipping_cost ?? 0));
  const [discount, setDiscount] = useState(Number(purchase?.discount ?? 0));
  const selectedLines = lines.filter((line) => line.product_id);
  const lineQuantity = (line: PurchaseLine) => selectedStoreIds.reduce((sum, storeId) => sum + Math.max(0, Number(line.allocations[storeId] ?? 0)), 0);
  const subtotal = useMemo(() => selectedLines.reduce((sum, line) => sum + lineQuantity(line) * (line.unit_cost ?? 0), 0), [selectedLines, selectedStoreIds]);
  const totalUnits = useMemo(() => selectedLines.reduce((sum, line) => sum + lineQuantity(line), 0), [selectedLines, selectedStoreIds]);
  const total = Math.max(subtotal + shipping - discount, 0);
  const editing = Boolean(purchase?.id);

  const reset = () => {
    const next = initialState(purchase, stores);
    setScope(purchase?.receiving_scope === "all" ? "all" : "selected");
    setSelectedStoreIds(purchase?.receiving_scope === "all" ? stores.map((store) => store.id) : next.selected);
    setLines(next.lines); setShipping(Number(purchase?.shipping_cost ?? 0)); setDiscount(Number(purchase?.discount ?? 0)); setError(""); setSuccess("");
  };
  const close = () => { setOpen(false); reset(); };
  const setAll = () => {
    const allIds = stores.map((store) => store.id);
    setScope("all"); setSelectedStoreIds(allIds);
    setLines((current) => current.map((line) => ({ ...line, allocations: Object.fromEntries(allIds.map((id) => [id, line.allocations[id] > 0 ? line.allocations[id] : 1])) })));
  };
  const setSelected = () => { setScope("selected"); if (!selectedStoreIds.length) setSelectedStoreIds(stores[0] ? [stores[0].id] : []); };
  const toggleStore = (storeId: string) => setSelectedStoreIds((current) => {
    if (current.includes(storeId)) return current.length > 1 ? current.filter((id) => id !== storeId) : current;
    setLines((rows) => rows.map((line) => ({ ...line, allocations: { ...line.allocations, [storeId]: line.allocations[storeId] > 0 ? line.allocations[storeId] : 1 } })));
    return [...current, storeId];
  });
  const patchLine = (key: string, values: Partial<PurchaseLine>) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...values } : line));
  const patchAllocation = (key: string, storeId: string, quantity: number) => setLines((current) => current.map((line) => line.key === key ? { ...line, allocations: { ...line.allocations, [storeId]: Math.max(0, Math.floor(quantity)) } } : line));

  return <>
    <button className={editing ? "table-action" : "button primary"} onClick={() => { reset(); setOpen(true); }}>{editing ? <Pencil size={14}/> : <Plus size={17}/>} {label ?? (editing ? "Edit" : "Buat pembelian")}</button>
    {open ? <div className="modal-backdrop"><div className="modal-card purchase-multi-modal operational-modal">
      <div className="modal-header operational-modal-header"><div><h2>{editing ? `Edit ${purchase.po_number}` : "Pesanan pembelian"}</h2><p>Bagikan setiap produk ke satu, beberapa, atau seluruh cabang dalam satu PO.</p></div><button className="icon-button" onClick={close}><X size={20}/></button></div>
      {error ? <div className="alert error">{error}</div> : null}{success ? <div className="alert success"><CheckCircle2 size={17}/>{success}</div> : null}
      <form className="document-form operational-document-form purchase-multi-form" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError(""); setSuccess("");
        const form = new FormData(event.currentTarget);
        try {
          if (!selectedStoreIds.length) throw new Error("Pilih minimal satu cabang penerima.");
          const items = selectedLines.map((line) => ({
            product_id: line.product_id,
            variant_id: line.variant_id || null,
            unit_cost: Number(line.unit_cost ?? 0),
            allocations: selectedStoreIds.map((store_id) => ({ store_id, quantity: Math.floor(Number(line.allocations[store_id] ?? 0)) })).filter((allocation) => allocation.quantity > 0),
          }));
          if (!items.length) throw new Error("Tambahkan minimal satu produk.");
          if (items.some((item) => !item.allocations.length)) throw new Error("Setiap produk harus memiliki jumlah pada minimal satu cabang.");
          if (scope === "all" && items.some((item) => item.allocations.length !== stores.length)) throw new Error("Mode semua cabang membutuhkan jumlah lebih dari nol pada setiap cabang.");
          const response = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: editing ? "update" : "create", purchase_order_id: purchase?.id, supplier_id: form.get("supplier_id"), receiving_scope: scope, items, shipping_cost: shipping, discount, notes: form.get("notes") }) });
          const result = await parsePurchaseResponse(response); if (!response.ok) throw new Error(result.error || "Gagal menyimpan pembelian");
          if (!result.id) throw new Error("PO belum tersimpan. Server tidak mengembalikan ID pesanan.");
          setSuccess(`${result.po_number || purchase?.po_number || "PO"} berhasil ${editing ? "diperbarui" : "dibuat"}.`);
          window.setTimeout(() => { window.location.assign(`/purchases?po=${encodeURIComponent(String(result.id))}&updated=${Date.now()}`); }, 650);
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan pembelian"); } finally { setSaving(false); }
      }}>
        <SectionCard title="Supplier dan cabang penerima" description="Pilih seluruh cabang atau tentukan cabang tertentu." icon={<Building2 size={19}/>} tone="blue">
          <div className="purchase-top-grid"><label>Supplier<select name="supplier_id" required defaultValue={purchase?.supplier_id ?? ""}><option value="">Pilih supplier</option>{suppliers.filter((supplier) => supplier.is_active !== false || supplier.id === purchase?.supplier_id).map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select></label><div className="purchase-scope"><span>Tujuan penerimaan</span><div><button type="button" className={scope === "all" ? "active" : ""} onClick={setAll}>Semua cabang</button><button type="button" className={scope === "selected" ? "active" : ""} onClick={setSelected}>Cabang dipilih</button></div></div></div>
          <div className="purchase-store-grid">{stores.map((store) => <label className={`purchase-store-option ${selectedStoreIds.includes(store.id) ? "selected" : ""}`} key={store.id}><input type="checkbox" checked={selectedStoreIds.includes(store.id)} disabled={scope === "all"} onChange={() => toggleStore(store.id)}/><span><strong>{store.name}</strong><small>{store.code}</small></span></label>)}</div>
        </SectionCard>

        <SectionCard title="Produk, varian, dan pembagian jumlah" description="Pilih varian dan isi jumlah masing-masing cabang. Stok penerimaan disimpan per varian." icon={<PackageSearch size={19}/>} badge={<span className="document-count-badge">{selectedLines.length} produk · {totalUnits} unit</span>} actions={<button type="button" className="button secondary compact-button" onClick={() => setLines((current) => [...current, blankLine(selectedStoreIds)])}><Plus size={15}/> Tambah produk / varian</button>}>
          <div className="purchase-line-list">{lines.map((line, index) => {
            const product = products.find((item) => item.id === line.product_id);
            const variant = product?.variants?.find((item) => item.id === line.variant_id);
            const quantity = lineQuantity(line);
            return <article className="purchase-line-card" key={line.key}>
              <div className="purchase-line-head"><span>{index + 1}</span><div className="purchase-line-picker"><ProductSearchSelect products={products} value={line.product_id} variantValue={line.variant_id} onChange={(productId, variantId) => { const found = products.find((item) => item.id === productId); const foundVariant = found?.variants?.find((item) => item.id === variantId); patchLine(line.key, { product_id: productId, variant_id: variantId || null, unit_cost: foundVariant?.cost_price ?? found?.cost_price ?? 0 }); }}/></div><button type="button" className="document-remove-line" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}><Trash2 size={16}/><span>Hapus</span></button></div>
              <div className="purchase-cost-row"><label>Harga beli / {product?.unit ?? "unit"}{variant ? ` · ${variant.name}` : ""}<input type="number" min="0" step="1" value={line.unit_cost || ""} onChange={(event) => patchLine(line.key, { unit_cost: Math.max(0, Number(event.target.value || 0)) })}/></label><div><span>Total jumlah</span><strong>{quantity} {product?.unit ?? "unit"}</strong></div><div><span>Subtotal</span><strong>{formatCurrency(quantity * line.unit_cost)}</strong></div></div>
              <div className="purchase-allocation-grid">{selectedStoreIds.map((storeId) => { const store = stores.find((item) => item.id === storeId); return <label key={storeId}><span>{store?.name ?? "Cabang"}<small>{store?.code}</small></span><div><input type="number" min="0" step="1" value={line.allocations[storeId] || ""} onChange={(event) => patchAllocation(line.key, storeId, Number(event.target.value || 0))}/><b>{product?.unit ?? "unit"}</b></div></label>; })}</div>
            </article>;
          })}</div>
          <button type="button" className="document-add-line" onClick={() => setLines((current) => [...current, blankLine(selectedStoreIds)])}><Plus size={15}/> Tambah produk / varian lain</button>
        </SectionCard>

        <SectionCard title="Biaya dan total" description="Total dihitung dari seluruh alokasi cabang." icon={<ReceiptText size={19}/>} tone="green">
          <div className="document-cost-grid"><label>Ongkir<input type="number" min="0" value={shipping || ""} onChange={(event) => setShipping(Math.max(0, Number(event.target.value || 0)))}/></label><label>Diskon<input type="number" min="0" value={discount || ""} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value || 0)))}/></label><div className="document-total"><span>Total unit</span><strong>{totalUnits}</strong><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong><span>Ongkir</span><strong>{formatCurrency(shipping)}</strong><span>Diskon</span><strong>- {formatCurrency(discount)}</strong><span>Total akhir</span><b>{formatCurrency(total)}</b></div></div>
        </SectionCard>
        <SectionCard title="Catatan pembelian" description="Nomor invoice supplier, termin, atau keterangan penerimaan." icon={<FileText size={19}/>}><label className="document-notes">Catatan<textarea name="notes" rows={3} defaultValue={purchase?.notes ?? ""} placeholder="Nomor invoice supplier, termin, atau keterangan lain..."/></label></SectionCard>
        <div className="modal-actions document-actions sticky-modal-actions"><button type="button" className="button secondary" onClick={close}>Batal</button><button className="button primary" disabled={saving || !selectedLines.length}>{saving ? <><LoadingSpinner/><span>Menyimpan...</span></> : `${editing ? "Simpan perubahan" : "Buat PO"} · ${formatCurrency(total)}`}</button></div>
      </form>
    </div></div> : null}
  </>;
}

export function PurchaseDetailButton({ purchase }: { purchase: any }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="table-action" onClick={() => setOpen(true)}><Eye size={14}/> Detail</button>
    {open ? <div className="modal-backdrop"><div className="modal-card purchase-detail-modal"><div className="modal-header"><div><h2>{purchase.po_number}</h2><p>{purchase.supplier_name} · {purchase.store_names?.join(", ")}</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <div className="purchase-detail-summary"><div><span>Status</span><strong>{String(purchase.status).replaceAll("_"," ")}</strong></div><div><span>Total unit</span><strong>{purchase.items.reduce((sum:number,item:any)=>sum+Number(item.quantity_ordered||0),0)}</strong></div><div><span>Total nilai</span><strong>{formatCurrency(Number(purchase.total||0))}</strong></div><div><span>Cabang</span><strong>{purchase.store_names?.length ?? 1}</strong></div></div>
      <div className="purchase-detail-items">{purchase.items.map((item:any)=><article key={item.id}><header><div><strong>{item.name}</strong>{item.variant_name ? <em className="purchase-variant-name">{item.variant_name}</em> : null}<span>{item.variant_sku || item.sku}</span></div><div><strong>{item.quantity_ordered} {item.unit}</strong><span>{formatCurrency(item.unit_cost)} / {item.unit}</span></div></header><div>{item.allocations?.length?item.allocations.map((allocation:any)=><span key={allocation.id}><b>{allocation.store_name}</b>{allocation.quantity} {item.unit}</span>):<span><b>{purchase.store_name}</b>{item.quantity_ordered} {item.unit}</span>}</div></article>)}</div>
      <div className="purchase-detail-totals"><span>Subtotal <b>{formatCurrency(purchase.subtotal)}</b></span><span>Ongkir <b>{formatCurrency(purchase.shipping_cost)}</b></span><span>Diskon <b>- {formatCurrency(purchase.discount)}</b></span><strong>Total <b>{formatCurrency(purchase.total)}</b></strong></div>
      <div className="modal-actions"><button className="button secondary" onClick={() => setOpen(false)}>Tutup</button><Link className="button primary" href={`/purchases/${purchase.id}/print`} target="_blank"><Printer size={16}/> Cetak / PDF</Link></div>
    </div></div> : null}
  </>;
}

export function ReceivePurchaseButton({ id }: { id: string }) {
  const router = useRouter(); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  return <div><button className="table-action" disabled={saving} onClick={async () => { if(!window.confirm("Terima seluruh barang dan tambahkan stok ke cabang yang dialokasikan?")) return; setSaving(true); setError(""); try { const response = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "receive", purchase_order_id: id }) }); const result = await parsePurchaseResponse(response); if (!response.ok) throw new Error(result.error || "Gagal menerima barang"); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Gagal"); } finally { setSaving(false); } }}>{saving ? <><LoadingSpinner size={14}/><span>Memproses...</span></> : "Terima barang"}</button>{error ? <small className="negative">{error}</small> : null}</div>;
}
