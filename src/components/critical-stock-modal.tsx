"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, FileSpreadsheet, FileText, Filter, Printer, Search, X } from "lucide-react";
import type { Product, Store, SystemSettings, UserProfile } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { CriticalStockDocument } from "@/components/critical-stock-document";

export type CriticalItem = {
  key: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  fullName: string;
  sku: string;
  barcode?: string | null;
  category: string;
  brand: string;
  unit: string;
  minimumStock: number;
  totalOnHand: number;
  totalAvailable: number;
  storeStocks: Record<string, { onHand: number; reserved: number; available: number }>;
  storeConditions: Record<string, "out" | "low" | "safe">;
  condition: "out" | "low" | "safe";
  deficit: number;
};

export function extractCriticalItems(products: Product[], stores: Store[], storeScopeId: string): CriticalItem[] {
  const items: CriticalItem[] = [];

  for (const product of products) {
    const variants = (product.variants ?? []).filter((v) => v.is_active);

    if (variants.length > 0) {
      for (const variant of variants) {
        const storeStocks: Record<string, { onHand: number; reserved: number; available: number }> = {};
        const storeConditions: Record<string, "out" | "low" | "safe"> = {};
        let totalOnHand = 0;
        let totalAvailable = 0;
        let lowest = Infinity;

        for (const store of stores) {
          const stock = variant.stocks?.[store.id];
          const onHand = stock?.quantity_on_hand ?? 0;
          const reserved = stock?.quantity_reserved ?? 0;
          const available = stock?.quantity_available ?? 0;
          totalOnHand += onHand;
          totalAvailable += available;
          storeStocks[store.id] = { onHand, reserved, available };

          const cond = available === 0 ? "out" : available <= product.minimum_stock ? "low" : "safe";
          storeConditions[store.id] = cond;
          if (available < lowest) lowest = available;
        }

        if (lowest === Infinity) lowest = 0;

        let condition: "out" | "low" | "safe";
        let deficit = 0;

        if (storeScopeId && storeScopeId !== "all") {
          condition = storeConditions[storeScopeId] ?? "out";
          const avail = storeStocks[storeScopeId]?.available ?? 0;
          deficit = Math.max(0, product.minimum_stock - avail);
        } else {
          condition = lowest === 0 ? "out" : lowest <= product.minimum_stock ? "low" : "safe";
          deficit = Math.max(0, product.minimum_stock - totalAvailable);
        }

        if (condition === "out" || condition === "low") {
          items.push({
            key: `v-${variant.id}`,
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            fullName: `${product.name} — ${variant.name}`,
            sku: variant.sku || product.sku,
            barcode: variant.barcode || product.barcode || null,
            category: product.category || "Tanpa Kategori",
            brand: product.brand || "Tanpa Merek",
            unit: product.unit || "Pcs",
            minimumStock: product.minimum_stock,
            totalOnHand,
            totalAvailable,
            storeStocks,
            storeConditions,
            condition,
            deficit,
          });
        }
      }
    } else {
      const storeStocks: Record<string, { onHand: number; reserved: number; available: number }> = {};
      const storeConditions: Record<string, "out" | "low" | "safe"> = {};
      let totalOnHand = 0;
      let totalAvailable = 0;
      let lowest = Infinity;

      for (const store of stores) {
        const stock = product.stocks[store.id];
        const onHand = stock?.quantity_on_hand ?? 0;
        const reserved = stock?.quantity_reserved ?? 0;
        const available = stock?.quantity_available ?? 0;
        totalOnHand += onHand;
        totalAvailable += available;
        storeStocks[store.id] = { onHand, reserved, available };

        const cond = available === 0 ? "out" : available <= product.minimum_stock ? "low" : "safe";
        storeConditions[store.id] = cond;
        if (available < lowest) lowest = available;
      }

      if (lowest === Infinity) lowest = 0;

      let condition: "out" | "low" | "safe";
      let deficit = 0;

      if (storeScopeId && storeScopeId !== "all") {
        condition = storeConditions[storeScopeId] ?? "out";
        const avail = storeStocks[storeScopeId]?.available ?? 0;
        deficit = Math.max(0, product.minimum_stock - avail);
      } else {
        condition = lowest === 0 ? "out" : lowest <= product.minimum_stock ? "low" : "safe";
        deficit = Math.max(0, product.minimum_stock - totalAvailable);
      }

      if (condition === "out" || condition === "low") {
        items.push({
          key: `p-${product.id}`,
          productId: product.id,
          variantId: null,
          productName: product.name,
          variantName: null,
          fullName: product.name,
          sku: product.sku,
          barcode: product.barcode || null,
          category: product.category || "Tanpa Kategori",
          brand: product.brand || "Tanpa Merek",
          unit: product.unit || "Pcs",
          minimumStock: product.minimum_stock,
          totalOnHand,
          totalAvailable,
          storeStocks,
          storeConditions,
          condition,
          deficit,
        });
      }
    }
  }

  return items;
}

export function CriticalStockModal({
  isOpen,
  onClose,
  products,
  stores,
  settings,
  profile,
  initialCategory = "",
  initialBrand = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  stores: Store[];
  settings?: SystemSettings | null;
  profile?: UserProfile | null;
  initialCategory?: string;
  initialBrand?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "out" | "low">("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [brandFilter, setBrandFilter] = useState<string>(initialBrand);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "name" | "deficit">("severity");
  // Default to portrait (tegak) as requested
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("portrait");
  const [showSignatures, setShowSignatures] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showExtraFilters, setShowExtraFilters] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Support Ctrl+P while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handleBeforePrint = () => {
      document.body.classList.add("printing-critical-stock");
    };
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-critical-stock");
      setIsPrinting(false);
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("printing-critical-stock");
    };
  }, [isOpen]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.brand?.trim()) set.add(p.brand.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [products]);

  // Extract critical items for current store filter
  const allCriticalItems = useMemo(() => {
    return extractCriticalItems(products, stores, storeFilter);
  }, [products, stores, storeFilter]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("id-ID");

    const list = allCriticalItems.filter((item) => {
      if (statusFilter !== "all" && item.condition !== statusFilter) return false;
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (brandFilter && item.brand !== brandFilter) return false;
      if (q) {
        const text = `${item.fullName} ${item.sku} ${item.barcode ?? ""} ${item.brand} ${item.category}`.toLocaleLowerCase("id-ID");
        if (!text.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "severity") {
        if (a.condition !== b.condition) {
          return a.condition === "out" ? -1 : 1;
        }
        return b.deficit - a.deficit || a.fullName.localeCompare(b.fullName, "id-ID");
      }
      if (sortBy === "deficit") {
        return b.deficit - a.deficit || a.fullName.localeCompare(b.fullName, "id-ID");
      }
      return a.fullName.localeCompare(b.fullName, "id-ID");
    });
  }, [allCriticalItems, statusFilter, categoryFilter, brandFilter, searchQuery, sortBy]);

  // Metrics
  const metrics = useMemo(() => {
    let outCount = 0;
    let lowCount = 0;
    let totalDeficit = 0;

    for (const item of filteredItems) {
      if (item.condition === "out") outCount++;
      if (item.condition === "low") lowCount++;
      totalDeficit += item.deficit;
    }

    return {
      totalCount: filteredItems.length,
      outCount,
      lowCount,
      totalDeficit,
    };
  }, [filteredItems]);

  const selectedStoreObj = useMemo(() => {
    if (storeFilter === "all") return null;
    return stores.find((s) => s.id === storeFilter) ?? null;
  }, [stores, storeFilter]);

  const activeStores = useMemo(() => {
    if (storeFilter !== "all") {
      const s = stores.find((st) => st.id === storeFilter);
      return s ? [s] : stores;
    }
    return stores;
  }, [stores, storeFilter]);

  const companyName = settings?.company_name || "CV Indotek Sukses Maju";
  const companyTagline = settings?.company_tagline || "Distributor Perkakas, Alat Teknik & Perlengkapan Industri";
  const companyAddress = settings?.address || "Jl. Raya Industri No. 88, Sidoarjo, Jawa Timur";
  const companyPhone = settings?.phone || "0812-3456-7890";
  const companyLogo = settings?.logo_url;
  const nowFormatted = formatDateTime(new Date());

  // Print function
  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add("printing-critical-stock");

    const styleId = "critical-stock-dynamic-page-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@media print { @page { size: A4 ${orientation}; margin: 8mm; } }`;

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove("printing-critical-stock");
      const el = document.getElementById(styleId);
      if (el) el.remove();
      setIsPrinting(false);
      window.removeEventListener("afterprint", cleanup);
      window.removeEventListener("focus", handleFocus);
    };

    const handleFocus = () => {
      window.setTimeout(cleanup, 500);
    };

    window.addEventListener("afterprint", cleanup);
    window.addEventListener("focus", handleFocus, { once: true });

    // Allow browser 150ms to mount portal & apply styles before opening print dialog
    window.setTimeout(() => {
      window.print();
    }, 150);
  };

  // CSV download function
  const handleDownloadCsv = () => {
    if (!filteredItems.length) return;

    const headers = [
      "No",
      "Nama Produk",
      "Varian",
      "SKU",
      "Barcode",
      "Kategori",
      "Merek",
      "Stok Minimum",
      "Satuan",
      ...activeStores.map((s) => `Stok ${s.name} (${s.code})`),
      "Total Tersedia",
      "Kondisi",
      "Defisit Restok",
    ];

    const rows = filteredItems.map((item, idx) => {
      const storeVals = activeStores.map((s) => item.storeStocks[s.id]?.available ?? 0);
      return [
        idx + 1,
        `"${item.productName.replaceAll('"', '""')}"`,
        item.variantName ? `"${item.variantName.replaceAll('"', '""')}"` : '""',
        `"${item.sku.replaceAll('"', '""')}"`,
        item.barcode ? `"${item.barcode.replaceAll('"', '""')}"` : '""',
        `"${item.category.replaceAll('"', '""')}"`,
        `"${item.brand.replaceAll('"', '""')}"`,
        item.minimumStock,
        `"${item.unit}"`,
        ...storeVals,
        item.totalAvailable,
        item.condition === "out" ? "HABIS" : "MENIPIS",
        item.deficit,
      ].join(",");
    });

    const csvContent = "\ufeff" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `laporan-stok-kritis-${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const docProps = {
    filteredItems,
    activeStores,
    metrics,
    companyName,
    companyTagline,
    companyAddress,
    companyPhone,
    companyLogo,
    nowFormatted,
    selectedStoreObj,
    statusFilter,
    profile,
    orientation,
    showSignatures,
    showBarcode,
  };

  return (
    <>
      <div className="modal-backdrop critical-stock-modal-backdrop no-print" role="dialog" aria-modal="true" aria-label="Ekspor PDF Stok Kritis">
        <div className="modal-card critical-stock-modal">
          {/* Modal Header */}
          <div className="modal-header critical-stock-modal-header no-print">
            <div>
              <div className="critical-stock-modal-badge">
                <AlertTriangle size={14} /> Dokumen Stok Kritis
              </div>
              <h2>Ekspor PDF Stok Menipis & Habis</h2>
              <p>Format resmi A4 siap cetak & simpan PDF.</p>
            </div>
            <button type="button" className="icon-button" onClick={onClose} title="Tutup modal">
              <X size={20} />
            </button>
          </div>

          {/* Modal Controls / Filter Bar */}
          <div className="critical-stock-controls-panel no-print">
            <div className="critical-stock-controls-grid">
              <label>
                <span>Status Stok</span>
                <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                  <option value="all">Semua Kritis (Menipis & Habis)</option>
                  <option value="out">Hanya Stok Habis (0)</option>
                  <option value="low">Hanya Stok Menipis (≤ Batas Min)</option>
                </select>
              </label>

              <label>
                <span>Cakupan Cabang</span>
                <select className="select" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
                  <option value="all">Semua Cabang (Lengkap)</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </label>

              <label className="critical-stock-search-field">
                <span>Cari Item</span>
                <div className="critical-stock-search-input">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Nama, SKU, varian..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery ? (
                    <button type="button" onClick={() => setSearchQuery("")} title="Bersihkan">
                      <X size={13} />
                    </button>
                  ) : null}
                </div>
              </label>

              <div className="critical-stock-extra-toggle-wrap">
                <button
                  type="button"
                  className="button secondary critical-stock-filter-toggle-btn"
                  onClick={() => setShowExtraFilters(!showExtraFilters)}
                >
                  <Filter size={14} />
                  <span>{showExtraFilters ? "Tutup Filter Tambahan" : "Filter Lebih Lengkap"}</span>
                  {showExtraFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {showExtraFilters ? (
                <>
                  <label>
                    <span>Kategori</span>
                    <select className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                      <option value="">Semua Kategori</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Merek</span>
                    <select className="select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
                      <option value="">Semua Merek</option>
                      {brands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Urutkan</span>
                    <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                      <option value="severity">Tingkat Kritis (Habis dahulu)</option>
                      <option value="deficit">Defisit Restok Terbanyak</option>
                      <option value="name">Nama Produk (A–Z)</option>
                    </select>
                  </label>
                </>
              ) : null}
            </div>

            <div className="critical-stock-options-bar">
              <div className="critical-stock-toggle-group">
                <span className="critical-stock-opt-label">Tata Letak:</span>
                <button
                  type="button"
                  className={`button-toggle ${orientation === "portrait" ? "active" : ""}`}
                  onClick={() => setOrientation("portrait")}
                >
                  Portrait (Tegak - Default)
                </button>
                <button
                  type="button"
                  className={`button-toggle ${orientation === "landscape" ? "active" : ""}`}
                  onClick={() => setOrientation("landscape")}
                >
                  Landscape (Lebar)
                </button>
              </div>

              <div className="critical-stock-checkbox-group">
                <label className="critical-stock-check">
                  <input type="checkbox" checked={showSignatures} onChange={(e) => setShowSignatures(e.target.checked)} />
                  <span>Kolom Tanda Tangan</span>
                </label>
                <label className="critical-stock-check">
                  <input type="checkbox" checked={showBarcode} onChange={(e) => setShowBarcode(e.target.checked)} />
                  <span>Barcode</span>
                </label>
              </div>
            </div>
          </div>

          {/* Live KPI Metric Strip */}
          <div className="critical-stock-kpi-bar no-print">
            <div className="critical-stock-kpi-card tone-total">
              <span className="kpi-label">Total Kritis</span>
              <strong className="kpi-value">{metrics.totalCount} <small>SKU</small></strong>
            </div>
            <div className="critical-stock-kpi-card tone-danger">
              <span className="kpi-label">Stok Habis</span>
              <strong className="kpi-value">{metrics.outCount} <small>SKU</small></strong>
            </div>
            <div className="critical-stock-kpi-card tone-warning">
              <span className="kpi-label">Stok Menipis</span>
              <strong className="kpi-value">{metrics.lowCount} <small>SKU</small></strong>
            </div>
            <div className="critical-stock-kpi-card tone-info">
              <span className="kpi-label">Defisit Restok</span>
              <strong className="kpi-value">+{metrics.totalDeficit.toLocaleString("id-ID")} <small>Unit</small></strong>
            </div>
          </div>

          {/* Preview Scroll Container (Screen view) */}
          <div className="critical-stock-preview-viewport no-print">
            <div className="critical-stock-preview-header-hint no-print">
              <div className="preview-hint-left">
                <FileText size={15} />
                <span>Pratinjau Dokumen (A4 {orientation === "portrait" ? "Portrait / Tegak" : "Landscape / Lebar"}):</span>
              </div>
              <span className="mobile-scroll-tip">Geser ke kanan untuk melihat kolom tabel →</span>
            </div>

            <div className="critical-stock-document-scroll-wrap">
              <CriticalStockDocument {...docProps} />
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="modal-actions critical-stock-modal-footer no-print">
            <div className="critical-stock-footer-info">
              <span>Menampilkan <strong>{filteredItems.length}</strong> item siap cetak</span>
            </div>
            <div className="critical-stock-footer-buttons">
              <button type="button" className="button secondary" onClick={onClose} disabled={isPrinting}>
                Tutup
              </button>
              <a
                href={`/inventory/print?status=${statusFilter}&store=${storeFilter}&orientation=${orientation}`}
                target="_blank"
                rel="noopener noreferrer"
                className="button secondary"
                title="Buka dokumen di tab baru dengan tampilan penuh"
              >
                <ExternalLink size={15} /> Layar Penuh
              </a>
              <button
                type="button"
                className="button secondary"
                onClick={handleDownloadCsv}
                disabled={!filteredItems.length || isPrinting}
                title="Unduh data dalam format CSV untuk Excel"
              >
                <FileSpreadsheet size={16} /> Unduh CSV
              </button>
              <button
                type="button"
                className="button primary critical-stock-print-btn"
                onClick={handlePrint}
                disabled={!filteredItems.length || isPrinting}
              >
                <Printer size={16} /> {isPrinting ? "Membuka Cetak..." : "Cetak / Simpan PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Direct-to-body print portal: completely isolated from app-shell, dialogs, and overflow containers */}
      {mounted ? createPortal(
        <div id="critical-stock-print-portal" className="critical-stock-print-portal">
          <CriticalStockDocument {...docProps} />
        </div>,
        document.body
      ) : null}
    </>
  );
}
