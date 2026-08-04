"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText, PackageSearch, Plus, Send, X } from "lucide-react";
import { createDocumentLine, DocumentItemLines, type DocumentLine } from "@/components/document-item-lines";
import { SectionCard } from "@/components/section-card";
import { LoadingSpinner } from "@/components/loading-spinner";
import type { Product, Store } from "@/lib/types";

export function TransferManager({ stores, products }: { stores: Store[]; products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sourceStoreId, setSourceStoreId] = useState(stores[0]?.id ?? "");
  const [destinationStoreId, setDestinationStoreId] = useState(stores.find((store) => store.id !== stores[0]?.id)?.id ?? "");
  const [lines, setLines] = useState<DocumentLine[]>([createDocumentLine()]);
  const selectedLines = lines.filter((line) => line.product_id);
  const totalQuantity = useMemo(() => selectedLines.reduce((sum, line) => sum + line.quantity, 0), [selectedLines]);
  const source = stores.find((store) => store.id === sourceStoreId);
  const destination = stores.find((store) => store.id === destinationStoreId);

  const close = () => { setOpen(false); setError(""); setSuccess(""); };
  return <>
    <button className="button primary" onClick={() => setOpen(true)}><Plus size={17}/> Buat transfer</button>
    {open ? <div className="modal-backdrop"><div className="modal-card document-modal operational-modal">
      <div className="modal-header operational-modal-header"><div><h2>Transfer stok antartoko</h2><p>Pindahkan beberapa produk dalam satu dokumen yang aman dan terlacak.</p></div><button className="icon-button" onClick={close}><X size={20}/></button></div>
      {error ? <div className="alert error">{error}</div> : null}{success ? <div className="alert success"><CheckCircle2 size={17}/>{success}</div> : null}
      <form className="document-form operational-document-form" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError(""); setSuccess("");
        const form = new FormData(event.currentTarget);
        const items = selectedLines.map((line) => ({ product_id: line.product_id, variant_id: line.variant_id || null, quantity: line.quantity }));
        try {
          if (sourceStoreId === destinationStoreId) throw new Error("Toko asal dan tujuan harus berbeda.");
          if (!items.length) throw new Error("Tambahkan minimal satu produk.");
          const insufficient = selectedLines.find((line) => { const product = products.find((item) => item.id === line.product_id); const variant = product?.variants?.find((item) => item.id === line.variant_id); return line.quantity > (variant ? variant.stocks?.[sourceStoreId]?.quantity_available ?? 0 : product?.stocks[sourceStoreId]?.quantity_available ?? 0); });
          if (insufficient) throw new Error(`Stok ${products.find((product) => product.id === insufficient.product_id)?.name ?? "produk"} tidak mencukupi.`);
          const response = await fetch("/api/transfers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", source_store_id: sourceStoreId, destination_store_id: destinationStoreId, items, notes: form.get("notes") }) });
          const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal membuat transfer");
          setSuccess(`Transfer ${result.transfer_number || "baru"} berhasil dibuat.`); setLines([createDocumentLine()]); router.refresh(); window.setTimeout(close, 1400);
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat transfer"); } finally { setSaving(false); }
      }}>
        <SectionCard title="Rute transfer" description="Tentukan lokasi asal dan cabang penerima barang." icon={<ArrowRight size={19}/>} tone="blue">
          <div className="document-header-fields"><label>Toko asal<select value={sourceStoreId} onChange={(event) => { setSourceStoreId(event.target.value); if (event.target.value === destinationStoreId) setDestinationStoreId(stores.find((store) => store.id !== event.target.value)?.id ?? ""); }} required>{stores.map((store) => <option value={store.id} key={store.id}>{store.name} ({store.code})</option>)}</select></label><label>Toko tujuan<select value={destinationStoreId} onChange={(event) => setDestinationStoreId(event.target.value)} required>{stores.map((store) => <option value={store.id} key={store.id} disabled={store.id === sourceStoreId}>{store.name} ({store.code})</option>)}</select></label></div>
        </SectionCard>
        <SectionCard title="Barang yang dipindahkan" description="Pilih varian agar stok yang dipindahkan berasal dari varian yang tepat." icon={<PackageSearch size={19}/>} badge={<span className="document-count-badge">{selectedLines.length} produk · {totalQuantity} unit</span>} actions={<button type="button" className="button secondary compact-button" onClick={() => setLines((current) => [...current, createDocumentLine()])}><Plus size={15}/> Tambah produk / varian</button>}>
          <DocumentItemLines products={products} lines={lines} onChange={setLines} storeId={sourceStoreId} hideAddButton/>
        </SectionCard>
        <SectionCard title="Catatan dokumen" description="Tambahkan tujuan atau keterangan operasional transfer." icon={<FileText size={19}/>}>
          <label className="document-notes">Catatan<textarea name="notes" rows={3} placeholder="Contoh: Pemenuhan stok cabang pusat"/></label>
        </SectionCard>
        <div className="document-route-summary"><div><span>Asal</span><strong>{source?.name ?? "—"}</strong></div><ArrowRight size={20}/><div><span>Tujuan</span><strong>{destination?.name ?? "—"}</strong></div><div><span>Total</span><strong>{selectedLines.length} produk / {totalQuantity} unit</strong></div></div>
        <div className="modal-actions document-actions sticky-modal-actions"><button type="button" className="button secondary" onClick={close}>Batal</button><button className="button primary" disabled={saving || !selectedLines.length}>{saving ? <LoadingSpinner/> : <Send size={16}/>}<span>{saving ? "Membuat..." : "Buat transfer"}</span></button></div>
      </form>
    </div></div> : null}
  </>;
}

export function TransferAction({ id, action, label }: { id: string; action: "send" | "receive"; label: string }) {
  const router = useRouter(); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  return <div><button className="table-action" disabled={saving} onClick={async () => { setSaving(true); setError(""); try { const response = await fetch("/api/transfers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, transfer_id: id }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Gagal memproses transfer"); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Gagal"); } finally { setSaving(false); } }}>{saving ? <><LoadingSpinner size={14}/><span>Memproses...</span></> : label}</button>{error ? <small className="negative">{error}</small> : null}</div>;
}

export function ApproveTransferRequestButton({ id }: { id: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return <div><button className="table-action" disabled={saving} onClick={async()=>{
    if(!window.confirm("Buat dokumen transfer dari permintaan ini?"))return;
    setSaving(true);setError("");
    try{const response=await fetch("/api/transfer-requests",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action:"approve"})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Gagal memproses permintaan");router.refresh();}
    catch(err){setError(err instanceof Error?err.message:"Gagal memproses permintaan");}finally{setSaving(false);}
  }}>{saving?<><LoadingSpinner size={14}/><span>Memproses...</span></>:"Buat transfer"}</button>{error?<small className="negative">{error}</small>:null}</div>;
}
