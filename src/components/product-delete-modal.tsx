"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, Layers3, Tag, Trash2, X } from "lucide-react";
import { ProductVisual } from "@/components/product-visual";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ModalPortal } from "@/components/modal-portal";
import type { Product } from "@/lib/types";

export function ProductDeleteModal({
  product,
  isOpen,
  onClose,
  onDeleted,
}: {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: (productId: string, message: string) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !product) return null;

  const variants = product.variants ?? [];
  const activeVariants = variants.filter((v) => v.is_active);

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Gagal menghapus produk");
      }

      const successMsg = result.message || `Produk "${product.name}" berhasil dihapus.`;
      onDeleted?.(product.id, successMsg);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus produk");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="modal-backdrop" onClick={deleting ? undefined : onClose}>
        <div
          className="modal-card small-modal product-delete-modal-card"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-product-title"
        >
          <div className="modal-header">
            <div className="product-delete-head-lead">
              <div className="product-delete-icon-wrap" aria-hidden="true">
                <Trash2 size={20} />
              </div>
              <div>
                <h2 id="delete-product-title">Hapus Produk</h2>
                <p>Konfirmasi penghapusan produk dari katalog</p>
              </div>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              disabled={deleting}
              aria-label="Tutup dialog"
            >
              <X size={20} />
            </button>
          </div>

          <div className="product-delete-body">
            {error ? <div className="alert error">{error}</div> : null}

            <div className="product-delete-preview-card">
              <ProductVisual
                name={product.name}
                imageUrl={product.image_url}
                definition={product.visual?.code}
                size="thumb"
              />
              <div className="product-delete-preview-info">
                <strong>{product.name}</strong>
                <div className="product-delete-preview-meta">
                  <span>SKU: <b>{product.sku}</b></span>
                  {product.barcode ? <span>Barcode: <b>{product.barcode}</b></span> : null}
                </div>
                <div className="product-delete-preview-badges">
                  <span className={`product-brand-tag ${!product.brand ? "muted" : ""}`}>
                    <Tag size={11} />
                    {product.brand || "Tanpa Merek"}
                  </span>
                  {product.category ? <span className="product-cat-badge">{product.category}</span> : null}
                  {variants.length > 0 ? (
                    <span className="product-variants-badge">
                      <Layers3 size={11} />
                      {activeVariants.length} varian aktif
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {product.total_stock > 0 ? (
              <div className="product-delete-stock-warning">
                <AlertTriangle size={17} />
                <div>
                  <strong>Perhatian: Masih ada stok fisik</strong>
                  <span>Produk ini tercatat memiliki total stok <b>{product.total_stock} {product.unit}</b> di jaringan toko.</span>
                </div>
              </div>
            ) : null}

            <p className="product-delete-explainer">
              Produk yang <strong>belum memiliki riwayat transaksi</strong> (penjualan, pembelian, transfer) akan <strong>dihapus permanen</strong> dari database.
              Jika sudah pernah ditransaksikan, sistem akan <strong>mengarsipkan</strong> produk secara aman agar riwayat laporan keuangan tetap utuh.
            </p>
          </div>

          <div className="modal-actions product-delete-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              disabled={deleting}
            >
              Batal
            </button>
            <button
              type="button"
              className="button danger product-delete-submit-btn"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <LoadingSpinner size={16} />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Ya, hapus produk</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
