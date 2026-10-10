"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, CheckCircle2, Layers3, X } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ModalPortal } from "@/components/modal-portal";
import type { Product, ProductVariant, Store } from "@/lib/types";

export function TransferRequestModal({
  product,
  stores,
  destinationStoreIds,
  isOpen,
  onClose,
}: {
  product: Product;
  stores: Store[];
  destinationStoreIds: string[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const variants = (product.variants ?? []).filter((variant) => variant.is_active);
  const destinations = stores.filter((store) => destinationStoreIds.includes(store.id));
  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const selectedVariant = variants.find((variant) => variant.id === variantId) ?? null;
  const stockAt = (storeId: string, variant: ProductVariant | null = selectedVariant) => variant ? variant.stocks?.[storeId]?.quantity_available ?? 0 : product.stocks[storeId]?.quantity_available ?? 0;
  const sourceCandidates = useMemo(() => stores
    .filter((store) => !destinationStoreIds.includes(store.id) && stockAt(store.id) > 0)
    .sort((a, b) => stockAt(b.id) - stockAt(a.id)), [stores, destinationStoreIds, product, selectedVariant]);
  const [destinationId, setDestinationId] = useState(destinations[0]?.id ?? "");
  const [sourceId, setSourceId] = useState(sourceCandidates[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const ownStock = destinationId ? stockAt(destinationId) : 0;

  useEffect(() => {
    if (!sourceCandidates.some((store) => store.id === sourceId)) setSourceId(sourceCandidates[0]?.id ?? "");
    const maximum = sourceCandidates[0] ? stockAt(sourceCandidates[0].id) : 1;
    setQuantity((current) => Math.max(1, Math.min(current, Math.max(1, maximum))));
  }, [variantId, sourceCandidates.length]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="modal-backdrop">
        <div className="modal-card transfer-request-modal">
          <div className="modal-header">
            <div>
              <h2>Permintaan transfer stok</h2>
              <p>Pilih varian dan cabang sumber yang masih memiliki stok.</p>
            </div>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup permintaan transfer">
              <X size={20}/>
            </button>
          </div>
          <div className="transfer-request-product">
            <strong>{product.name}</strong>
            <span>{selectedVariant ? `${selectedVariant.name} · ${selectedVariant.sku || product.sku}` : product.sku} · stok tujuan {ownStock} {product.unit}</span>
          </div>
          {message ? <div className={message.includes("berhasil") ? "alert success" : "alert error"}>{message.includes("berhasil") ? <CheckCircle2 size={17}/> : null}{message}</div> : null}
          <form className="form-grid" onSubmit={async (event) => {
            event.preventDefault(); setSaving(true); setMessage("");
            try {
              if (variants.length && !variantId) throw new Error("Pilih varian yang akan diminta.");
              if (!sourceId) throw new Error("Tidak ada cabang sumber dengan stok tersedia untuk varian ini.");
              const response = await fetch("/api/transfer-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: product.id, variant_id: variantId, source_store_id: sourceId, destination_store_id: destinationId, quantity, notes }) });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error || "Gagal membuat permintaan transfer.");
              setMessage(`Permintaan ${result.request_number ?? "transfer"} berhasil dikirim.`);
              window.setTimeout(() => onClose(), 1200);
            } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal membuat permintaan transfer."); }
            finally { setSaving(false); }
          }}>
            {variants.length ? <label className="span-2">Varian produk<select value={variantId ?? ""} onChange={(event) => setVariantId(event.target.value || null)}>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name} · stok jaringan {variant.total_stock} {product.unit}</option>)}</select><small className="transfer-variant-help"><Layers3 size={13}/> Stok sumber dan tujuan dihitung khusus untuk varian yang dipilih.</small></label> : null}
            <label>Cabang tujuan<select value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>{destinations.map((store) => <option key={store.id} value={store.id}>{store.name} ({stockAt(store.id)} {product.unit})</option>)}</select></label>
            <label>Cabang sumber<select value={sourceId} onChange={(event) => { setSourceId(event.target.value); setQuantity((current) => Math.min(current, Math.max(1, stockAt(event.target.value)))); }}>{sourceCandidates.length ? sourceCandidates.map((store) => <option key={store.id} value={store.id}>{store.name} · tersedia {stockAt(store.id)} {product.unit}</option>) : <option value="">Tidak ada stok tersedia</option>}</select></label>
            <label>Jumlah diminta<input type="number" min="1" max={Math.max(1, stockAt(sourceId))} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(Number(event.target.value || 1), Math.max(1, stockAt(sourceId)))))}/></label>
            <label>Catatan<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Contoh: stok habis, kebutuhan pelanggan"/></label>
            <div className="modal-actions span-2"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button type="submit" className="button primary" disabled={saving || !sourceId}>{saving ? <><LoadingSpinner/><span>Mengirim...</span></> : "Kirim permintaan"}</button></div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

export function TransferRequestButton({ product, stores, destinationStoreIds }: { product: Product; stores: Store[]; destinationStoreIds: string[] }) {
  const [open, setOpen] = useState(false);
  const hasDest = stores.some((s) => destinationStoreIds.includes(s.id));
  if (!hasDest) return null;

  return <>
    <button type="button" className="inventory-request-button" onClick={() => setOpen(true)}><ArrowRightLeft size={14}/> Minta stok</button>
    <TransferRequestModal product={product} stores={stores} destinationStoreIds={destinationStoreIds} isOpen={open} onClose={() => setOpen(false)} />
  </>;
}
