"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Download, FileSpreadsheet, FileText, Filter, Layers, PackageX, Printer, RotateCcw, Search, X } from "lucide-react";
import type { Product, ProductVariant, Store, SystemSettings, UserProfile } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

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

function extractCriticalItems(products: Product[], stores: Store[], storeScopeId: string): CriticalItem[] {
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
  const [statusFilter, setStatusFilter] = useState<"all" | "out" | "low">("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [brandFilter, setBrandFilter] = useState<string>(initialBrand);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "name" | "deficit">("severity");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [showSignatures, setShowSignatures] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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

  // Print function
  const handlePrint = () => {
    setIsPrinting(true);
    const root = document.documentElement;
    root.dataset.printCriticalStock = "1";

    const styleId = "critical-stock-dynamic-page-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@media print { @page { size: A4 ${orientation}; margin: 8mm; } }`;

    const cleanup = () => {
      delete root.dataset.printCriticalStock;
      const el = document.getElementById(styleId);
      if (el) el.remove();
      setIsPrinting(false);
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.setTimeout(() => {
      window.print();
      // Safety fallback cleanup after 2 seconds
      window.setTimeout(cleanup, 2000);
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

  const nowFormatted = formatDateTime(new Date());

  return (
    <div className="modal-backdrop critical-stock-modal-backdrop" role="dialog" aria-modal="true" aria-label="Ekspor PDF Stok Kritis">
      <div className="modal-card critical-stock-modal">
        {/* Modal Header */}
        <div className="modal-header critical-stock-modal-header no-print">
          <div>
            <div className="critical-stock-modal-badge">
              <AlertTriangle size={14} /> Dokumen Stok Kritis
            </div>
            <h2>Ekspor PDF Stok Menipis & Habis</h2>
            <p>Atur filter, tinjau pratinjau dokumen cetak resmi, lalu simpan sebagai PDF atau cetak.</p>
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

            <label className="critical-stock-search-field">
              <span>Cari Item</span>
              <div className="critical-stock-search-input">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Cari nama, SKU, atau varian..."
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

            <label>
              <span>Urutkan</span>
              <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="severity">Tingkat Kritis (Habis dahulu)</option>
                <option value="deficit">Defisit Restok Terbanyak</option>
                <option value="name">Nama Produk (A–Z)</option>
              </select>
            </label>
          </div>

          <div className="critical-stock-options-bar">
            <div className="critical-stock-toggle-group">
              <span className="critical-stock-opt-label">Tata Letak PDF:</span>
              <button
                type="button"
                className={`button-toggle ${orientation === "landscape" ? "active" : ""}`}
                onClick={() => setOrientation("landscape")}
              >
                Landscape (Lebar)
              </button>
              <button
                type="button"
                className={`button-toggle ${orientation === "portrait" ? "active" : ""}`}
                onClick={() => setOrientation("portrait")}
              >
                Portrait (Tegak)
              </button>
            </div>

            <div className="critical-stock-checkbox-group">
              <label className="critical-stock-check">
                <input type="checkbox" checked={showSignatures} onChange={(e) => setShowSignatures(e.target.checked)} />
                <span>Kolom Tanda Tangan & Verifikasi</span>
              </label>
              <label className="critical-stock-check">
                <input type="checkbox" checked={showBarcode} onChange={(e) => setShowBarcode(e.target.checked)} />
                <span>Tampilkan Barcode</span>
              </label>
            </div>
          </div>
        </div>

        {/* Live KPI Metric Strip */}
        <div className="critical-stock-kpi-bar no-print">
          <div className="critical-stock-kpi-card tone-total">
            <span className="kpi-label">Total Item Kritis</span>
            <strong className="kpi-value">{metrics.totalCount} <small>SKU / Varian</small></strong>
          </div>
          <div className="critical-stock-kpi-card tone-danger">
            <span className="kpi-label">Stok Habis (Kosong)</span>
            <strong className="kpi-value">{metrics.outCount} <small>Item</small></strong>
          </div>
          <div className="critical-stock-kpi-card tone-warning">
            <span className="kpi-label">Stok Menipis</span>
            <strong className="kpi-value">{metrics.lowCount} <small>Item</small></strong>
          </div>
          <div className="critical-stock-kpi-card tone-info">
            <span className="kpi-label">Total Defisit Restok</span>
            <strong className="kpi-value">+{metrics.totalDeficit.toLocaleString("id-ID")} <small>Unit</small></strong>
          </div>
        </div>

        {/* Preview Scroll Container */}
        <div className="critical-stock-preview-viewport">
          <div className="critical-stock-preview-header-hint no-print">
            <FileText size={15} />
            <span>Pratinjau Hasil Cetak / PDF (A4 {orientation === "landscape" ? "Landscape" : "Portrait"}):</span>
          </div>

          {/* Printable Document (Rendered for both Screen Preview & Print Media) */}
          <article className={`critical-stock-document layout-${orientation}`}>
            {/* Header / Letterhead */}
            <header className="critical-doc-header">
              <div className="critical-doc-brand">
                {companyLogo ? (
                  <img src={companyLogo} alt={companyName} className="critical-doc-logo-img" decoding="async" />
                ) : (
                  <div className="critical-doc-logo-placeholder">IS</div>
                )}
                <div className="critical-doc-brand-text">
                  <h1 className="critical-doc-company">{companyName}</h1>
                  <p className="critical-doc-tagline">{companyTagline}</p>
                  <p className="critical-doc-contact">
                    {companyAddress} {companyPhone ? `· Telp: ${companyPhone}` : ""}
                  </p>
                </div>
              </div>

              <div className="critical-doc-meta">
                <div className="critical-doc-title-pill">LAPORAN STOK KRITIS</div>
                <div className="critical-doc-subtitle">Daftar Produk Menipis & Habis</div>
                <div className="critical-doc-meta-table">
                  <div><span>Tanggal Cetak</span><strong>: {nowFormatted}</strong></div>
                  <div><span>Cakupan Cabang</span><strong>: {selectedStoreObj ? `${selectedStoreObj.name} (${selectedStoreObj.code})` : "Semua Cabang Jaringan"}</strong></div>
                  <div><span>Filter Status</span><strong>: {statusFilter === "out" ? "Hanya Habis" : statusFilter === "low" ? "Hanya Menipis" : "Menipis & Habis"}</strong></div>
                  <div><span>Dicetak Oleh</span><strong>: {profile?.full_name || "Petugas"} ({profile?.role ? profile.role.toUpperCase() : "STAFF"})</strong></div>
                </div>
              </div>
            </header>

            {/* Document KPI Summary Bar */}
            <div className="critical-doc-summary-strip">
              <div className="summary-item">
                <span className="summary-label">Total Item Kritis</span>
                <span className="summary-val">{metrics.totalCount} SKU</span>
              </div>
              <div className="summary-item item-danger">
                <span className="summary-label">Stok Habis</span>
                <span className="summary-val">{metrics.outCount} SKU</span>
              </div>
              <div className="summary-item item-warning">
                <span className="summary-label">Stok Menipis</span>
                <span className="summary-val">{metrics.lowCount} SKU</span>
              </div>
              <div className="summary-item item-primary">
                <span className="summary-label">Estimasi Kebutuhan Restok</span>
                <span className="summary-val">+{metrics.totalDeficit.toLocaleString("id-ID")} Unit</span>
              </div>
            </div>

            {/* Critical Stock Table */}
            <table className="critical-doc-table">
              <thead>
                <tr>
                  <th style={{ width: "28px", textAlign: "center" }}>No</th>
                  <th>Produk & Varian</th>
                  <th style={{ width: showBarcode ? "110px" : "90px" }}>SKU {showBarcode ? "/ Barcode" : ""}</th>
                  <th style={{ width: "95px" }}>Kategori / Merek</th>
                  <th style={{ width: "55px", textAlign: "right" }}>Min.</th>
                  {activeStores.map((store) => (
                    <th key={store.id} style={{ width: "65px", textAlign: "right" }}>
                      <div className="doc-th-store">
                        <span>{store.code}</span>
                        <small>{store.name.replace("Toko ", "")}</small>
                      </div>
                    </th>
                  ))}
                  <th style={{ width: "65px", textAlign: "right" }}>Total</th>
                  <th style={{ width: "75px", textAlign: "center" }}>Status</th>
                  <th style={{ width: "65px", textAlign: "right" }}>Defisit</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const isOut = item.condition === "out";
                  return (
                    <tr key={item.key} className={isOut ? "row-out" : "row-low"}>
                      <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                      <td>
                        <div className="doc-item-title">
                          <strong>{item.productName}</strong>
                          {item.variantName ? <span className="doc-variant-name">Varian: {item.variantName}</span> : null}
                        </div>
                      </td>
                      <td>
                        <div className="doc-code-block">
                          <code className="doc-sku">{item.sku}</code>
                          {showBarcode && item.barcode ? <small className="doc-barcode">{item.barcode}</small> : null}
                        </div>
                      </td>
                      <td>
                        <div className="doc-meta-block">
                          <span className="doc-cat">{item.category}</span>
                          <span className="doc-brand">{item.brand}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {item.minimumStock} <small className="doc-unit">{item.unit}</small>
                      </td>

                      {activeStores.map((store) => {
                        const sAvail = item.storeStocks[store.id]?.available ?? 0;
                        const sCond = item.storeConditions[store.id] ?? "out";
                        return (
                          <td key={store.id} style={{ textAlign: "right" }}>
                            <span className={`store-qty-tag cond-${sCond}`}>
                              {sAvail}
                            </span>
                          </td>
                        );
                      })}

                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        <span className={item.totalAvailable === 0 ? "qty-out" : "qty-val"}>
                          {item.totalAvailable} <small className="doc-unit">{item.unit}</small>
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span className={`doc-status-badge ${isOut ? "status-out" : "status-low"}`}>
                          {isOut ? "HABIS" : "MENIPIS"}
                        </span>
                      </td>

                      <td style={{ textAlign: "right", fontWeight: 700, color: item.deficit > 0 ? "#b91c1c" : "#0f172a" }}>
                        {item.deficit > 0 ? `+${item.deficit} ${item.unit}` : "—"}
                      </td>
                    </tr>
                  );
                })}

                {!filteredItems.length ? (
                  <tr>
                    <td colSpan={activeStores.length + 7} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                      Tidak ada produk menipis atau habis yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>

              {filteredItems.length > 0 ? (
                <tfoot>
                  <tr className="critical-doc-tfoot">
                    <td colSpan={4} style={{ textAlign: "left", fontWeight: 700 }}>
                      TOTAL: {filteredItems.length} ITEM KRITIS
                    </td>
                    <td>—</td>
                    {activeStores.map((store) => {
                      const colSum = filteredItems.reduce((acc, it) => acc + (it.storeStocks[store.id]?.available ?? 0), 0);
                      return (
                        <td key={store.id} style={{ textAlign: "right", fontWeight: 700 }}>
                          {colSum}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {filteredItems.reduce((acc, it) => acc + it.totalAvailable, 0)}
                    </td>
                    <td style={{ textAlign: "center" }}>—</td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#b91c1c" }}>
                      +{metrics.totalDeficit.toLocaleString("id-ID")}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>

            {/* Sign-off / Signature section */}
            {showSignatures ? (
              <section className="critical-doc-signatures">
                <div className="signature-col">
                  <span className="signature-title">Dibuat Oleh:</span>
                  <div className="signature-space" />
                  <strong className="signature-name">{profile?.full_name || "Petugas Inventaris"}</strong>
                  <span className="signature-role">Staff / Gudang</span>
                </div>
                <div className="signature-col">
                  <span className="signature-title">Diperiksa Oleh:</span>
                  <div className="signature-space" />
                  <strong className="signature-name">..................................................</strong>
                  <span className="signature-role">Kepala Toko / Supervisor</span>
                </div>
                <div className="signature-col">
                  <span className="signature-title">Disetujui Oleh:</span>
                  <div className="signature-space" />
                  <strong className="signature-name">..................................................</strong>
                  <span className="signature-role">Pimpinan / Manager Cabang</span>
                </div>
              </section>
            ) : null}

            {/* Document Footer */}
            <footer className="critical-doc-footer">
              <div>
                Dicetak dari Sistem Manajemen Persediaan & Kasir <strong>{companyName}</strong> · Tanggal: {nowFormatted}
              </div>
              <div>Halaman Dokumen Stok Kritis</div>
            </footer>
          </article>
        </div>

        {/* Modal Actions Footer */}
        <div className="modal-actions critical-stock-modal-footer no-print">
          <div className="critical-stock-footer-info">
            <span>Menampilkan <strong>{filteredItems.length}</strong> item siap cetak/ekspor</span>
          </div>
          <div className="critical-stock-footer-buttons">
            <button type="button" className="button secondary" onClick={onClose} disabled={isPrinting}>
              Tutup
            </button>
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
  );
}
