"use client";

import { useId, useMemo, useState } from "react";
import {
  Barcode,
  Check,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Layers3,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { ModalPortal } from "@/components/modal-portal";
import { BarcodeVisual } from "@/components/barcode-visual";
import {
  DEFAULT_PRINT_OPTIONS,
  downloadBarcodePng,
  downloadFileBlob,
  generateBarcodePdfBlob,
  generateEan13Barcode,
  generatePrintableHtml,
  type BarcodeLabelItem,
  type BarcodePrintOptions,
} from "@/lib/barcode";
import { formatCurrency } from "@/lib/format";
import type { Product, ProductVariant } from "@/lib/types";

export function BarcodePrintModal({
  open,
  onClose,
  products,
  initialProductId,
  initialVariantId,
  storeName = "INDOTEK SUKSES JAYA",
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  initialProductId?: string;
  initialVariantId?: string;
  storeName?: string;
}) {
  const searchInputId = useId();
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || products[0]?.id || ""
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    initialVariantId || "all"
  );
  const [copies, setCopies] = useState<number>(10);
  const [printOptions, setPrintOptions] = useState<BarcodePrintOptions>({
    ...DEFAULT_PRINT_OPTIONS,
    storeName: storeName || DEFAULT_PRINT_OPTIONS.storeName,
  });

  // Local state for dynamically generated or edited barcodes
  const [overrideBarcodes, setOverrideBarcodes] = useState<Record<string, string>>({});
  const [savingBarcode, setSavingBarcode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  const variants = useMemo(
    () => selectedProduct?.variants || [],
    [selectedProduct]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      `${p.name} ${p.sku} ${p.barcode || ""} ${p.brand || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [products, productSearch]);

  // Determine active barcode for selected context
  const currentBarcodeKey = useMemo(() => {
    if (!selectedProduct) return "";
    if (selectedVariantId !== "all" && variants.length > 0) {
      return `variant:${selectedVariantId}`;
    }
    return `product:${selectedProduct.id}`;
  }, [selectedProduct, selectedVariantId, variants]);

  const activeVariant = useMemo(() => {
    if (selectedVariantId === "all") return null;
    return variants.find((v) => v.id === selectedVariantId) || null;
  }, [variants, selectedVariantId]);

  const rawBarcode = useMemo(() => {
    if (overrideBarcodes[currentBarcodeKey]) {
      return overrideBarcodes[currentBarcodeKey];
    }
    if (activeVariant) {
      return activeVariant.barcode || "";
    }
    return selectedProduct?.barcode || "";
  }, [overrideBarcodes, currentBarcodeKey, activeVariant, selectedProduct]);

  // Construct label items list based on selected product and variant(s)
  const labelItems: BarcodeLabelItem[] = useMemo(() => {
    if (!selectedProduct) return [];

    if (variants.length > 0) {
      if (selectedVariantId === "all") {
        return variants.map((v) => {
          const code =
            overrideBarcodes[`variant:${v.id}`] ||
            v.barcode ||
            overrideBarcodes[`product:${selectedProduct.id}`] ||
            selectedProduct.barcode ||
            "2026101400010";

          return {
            id: v.id,
            productName: selectedProduct.name,
            variantName: v.name,
            brand: selectedProduct.brand,
            sku: v.sku || selectedProduct.sku,
            barcode: code,
            sellingPrice: Number(v.selling_price || 0),
            unit: selectedProduct.unit,
            copies,
          };
        });
      } else {
        const v = activeVariant || variants[0];
        const code = rawBarcode || "2026101400010";
        return [
          {
            id: v.id,
            productName: selectedProduct.name,
            variantName: v.name,
            brand: selectedProduct.brand,
            sku: v.sku || selectedProduct.sku,
            barcode: code,
            sellingPrice: Number(v.selling_price || 0),
            unit: selectedProduct.unit,
            copies,
          },
        ];
      }
    }

    const code = rawBarcode || "2026101400010";
    return [
      {
        id: selectedProduct.id,
        productName: selectedProduct.name,
        brand: selectedProduct.brand,
        sku: selectedProduct.sku,
        barcode: code,
        sellingPrice: Number(selectedProduct.selling_price || 0),
        unit: selectedProduct.unit,
        copies,
      },
    ];
  }, [
    selectedProduct,
    variants,
    selectedVariantId,
    activeVariant,
    rawBarcode,
    overrideBarcodes,
    copies,
  ]);

  const previewItem = labelItems[0] || {
    id: "demo",
    productName: "Contoh Produk",
    variantName: "Varian 1",
    brand: "INDOTEK",
    sku: "IDK-001",
    barcode: "2026101400124",
    sellingPrice: 50000,
  };

  const totalLabels = useMemo(() => {
    return labelItems.reduce((acc, it) => acc + (it.copies || copies), 0);
  }, [labelItems, copies]);

  // Handle generating a new unique barcode
  const handleGenerateBarcode = () => {
    const newCode = generateEan13Barcode("20");
    setOverrideBarcodes((prev) => ({
      ...prev,
      [currentBarcodeKey]: newCode,
    }));
    setSaveSuccess(null);
    setSaveError(null);
  };

  // Handle saving the generated barcode to the database via API
  const handleSaveToDatabase = async () => {
    if (!selectedProduct || !rawBarcode) return;
    setSavingBarcode(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      let payloadVariants = selectedProduct.variants || [];
      let productBarcode = selectedProduct.barcode;

      if (activeVariant) {
        payloadVariants = payloadVariants.map((v) =>
          v.id === activeVariant.id ? { ...v, barcode: rawBarcode } : v
        );
      } else {
        productBarcode = rawBarcode;
      }

      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProduct.id,
          name: selectedProduct.name,
          sku: selectedProduct.sku,
          barcode: productBarcode,
          category_id: selectedProduct.category_id,
          brand: selectedProduct.brand,
          unit: selectedProduct.unit,
          cost_price: selectedProduct.cost_price,
          selling_price: selectedProduct.selling_price,
          minimum_stock: selectedProduct.minimum_stock,
          image_url: selectedProduct.image_url,
          visual_id: selectedProduct.visual_id,
          is_active: selectedProduct.is_active,
          sales_scope: selectedProduct.sales_scope,
          sales_store_ids: selectedProduct.sales_store_ids,
          has_variants: (payloadVariants.length ?? 0) > 0,
          variants: payloadVariants.map((v, i) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            barcode: v.barcode,
            cost_price: v.cost_price,
            selling_price: v.selling_price,
            is_active: v.is_active,
            sort_order: i,
          })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menyimpan barcode ke database");
      }

      setSaveSuccess("Barcode berhasil disimpan ke produk!");
    } catch (err: any) {
      setSaveError(err.message || "Gagal menyimpan");
    } finally {
      setSavingBarcode(false);
    }
  };

  // Export handlers
  const handleDownloadPdf = () => {
    const blob = generateBarcodePdfBlob(labelItems, printOptions);
    const safeName = (selectedProduct?.name || "barcode")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const filename = `barcode-${safeName}-${totalLabels}pcs.pdf`;
    downloadFileBlob(blob, filename);
  };

  const handleDownloadPng = () => {
    const safeName = (selectedProduct?.name || "barcode")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    downloadBarcodePng(previewItem, printOptions, `barcode-${safeName}.png`);
  };

  const handleDirectPrint = () => {
    const html = generatePrintableHtml(labelItems, printOptions);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="modal-backdrop barcode-print-backdrop" onClick={onClose}>
        <div
          className="modal-card barcode-print-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="modal-header barcode-print-header">
            <div className="barcode-header-title">
              <div className="barcode-header-icon-wrap">
                <Barcode size={22} />
              </div>
              <div>
                <h2>Buat & Cetak Barcode</h2>
                <p>
                  Generate barcode, atur jumlah cetak, simpan ke file PDF/PNG, atau cetak ke printer kasir/stiker.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Tutup popup barcode"
            >
              <X size={20} />
            </button>
          </header>

          <div className="barcode-modal-body">
            {/* Left: Configuration Form */}
            <div className="barcode-config-column">
              {/* Product Picker */}
              <div className="barcode-form-group">
                <label className="barcode-form-label" htmlFor={searchInputId}>
                  <Tag size={15} />
                  <span>Pilih Produk</span>
                </label>
                <div className="barcode-product-search-wrap">
                  <Search size={15} className="search-icon-inside" />
                  <input
                    id={searchInputId}
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Cari produk lain..."
                    className="barcode-product-filter-input"
                  />
                </div>
                <select
                  className="select barcode-product-select"
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSelectedVariantId("all");
                    setSaveSuccess(null);
                    setSaveError(null);
                  }}
                >
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.brand ? `(${p.brand})` : ""} - {p.sku}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variant Picker (if product has variants) */}
              {variants.length > 0 ? (
                <div className="barcode-form-group">
                  <label className="barcode-form-label">
                    <Layers3 size={15} />
                    <span>Pilih Varian ({variants.length} Varian Tersedia)</span>
                  </label>
                  <div className="barcode-variant-pill-list">
                    <button
                      type="button"
                      className={`variant-pill ${selectedVariantId === "all" ? "active" : ""}`}
                      onClick={() => {
                        setSelectedVariantId("all");
                        setSaveSuccess(null);
                      }}
                    >
                      <span>Semua Varian ({variants.length})</span>
                    </button>
                    {variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={`variant-pill ${selectedVariantId === v.id ? "active" : ""}`}
                        onClick={() => {
                          setSelectedVariantId(v.id);
                          setSaveSuccess(null);
                        }}
                      >
                        <span>{v.name}</span>
                        {v.barcode ? <small className="has-code-dot" title="Sudah punya barcode">•</small> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Barcode Code & Auto-Generate Section */}
              <div className="barcode-code-box">
                <div className="barcode-code-box-head">
                  <div className="barcode-code-info">
                    <span className="barcode-code-caption">Kode Barcode Aktif:</span>
                    <strong className="barcode-code-display">
                      {rawBarcode || <span className="no-barcode-warn">Belum ada barcode</span>}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="button secondary compact-button barcode-generate-btn"
                    onClick={handleGenerateBarcode}
                    title="Buat barcode acak standar EAN-13"
                  >
                    <Sparkles size={14} />
                    <span>{rawBarcode ? "Ganti / Acak Baru" : "Buat Barcode"}</span>
                  </button>
                </div>

                {overrideBarcodes[currentBarcodeKey] ? (
                  <div className="barcode-override-notice">
                    <div className="override-text">
                      <span>Kode baru di-generate. Simpan ke database produk agar tersimpan permanen.</span>
                    </div>
                    <button
                      type="button"
                      className="button primary compact-button"
                      disabled={savingBarcode}
                      onClick={handleSaveToDatabase}
                    >
                      <Save size={13} />
                      <span>{savingBarcode ? "Menyimpan..." : "Simpan ke Produk"}</span>
                    </button>
                  </div>
                ) : null}

                {saveSuccess ? (
                  <div className="barcode-save-alert success">
                    <Check size={14} /> {saveSuccess}
                  </div>
                ) : null}

                {saveError ? (
                  <div className="barcode-save-alert error">
                    {saveError}
                  </div>
                ) : null}
              </div>

              {/* Quantity / Jumlah Barcode */}
              <div className="barcode-form-group">
                <div className="barcode-qty-header">
                  <label className="barcode-form-label">
                    <span>Jumlah Barcode yang Mau Dicetak</span>
                  </label>
                  <span className="barcode-qty-total-badge">
                    Total: <b>{totalLabels.toLocaleString("id-ID")}</b> label
                  </span>
                </div>

                <div className="barcode-qty-control-row">
                  <button
                    type="button"
                    className="qty-step-button"
                    onClick={() => setCopies((prev) => Math.max(1, prev - 1))}
                    aria-label="Kurangi jumlah cetak"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="barcode-qty-input"
                  />
                  <button
                    type="button"
                    className="qty-step-button"
                    onClick={() => setCopies((prev) => prev + 1)}
                    aria-label="Tambah jumlah cetak"
                  >
                    <Plus size={16} />
                  </button>

                  <div className="barcode-qty-presets">
                    {[1, 5, 10, 20, 50, 100].map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={`qty-preset-chip ${copies === num ? "active" : ""}`}
                        onClick={() => setCopies(num)}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Paper Layout Options */}
              <div className="barcode-form-group">
                <label className="barcode-form-label">
                  <Printer size={15} />
                  <span>Format Kertas / Ukuran Label</span>
                </label>
                <div className="barcode-paper-options">
                  <label className={`paper-option-card ${printOptions.paper === "thermal_40x30" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paper_type"
                      checked={printOptions.paper === "thermal_40x30"}
                      onChange={() => setPrintOptions((p) => ({ ...p, paper: "thermal_40x30" }))}
                    />
                    <div className="paper-card-info">
                      <strong>Thermal 40 × 30 mm</strong>
                      <small>Ukuran standar stiker kasir / retail (1 kolom)</small>
                    </div>
                  </label>
                  <label className={`paper-option-card ${printOptions.paper === "thermal_50x30" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paper_type"
                      checked={printOptions.paper === "thermal_50x30"}
                      onChange={() => setPrintOptions((p) => ({ ...p, paper: "thermal_50x30" }))}
                    />
                    <div className="paper-card-info">
                      <strong>Thermal 50 × 30 mm</strong>
                      <small>Stiker thermal lebar (1 kolom)</small>
                    </div>
                  </label>
                  <label className={`paper-option-card ${printOptions.paper === "a4_sheet" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paper_type"
                      checked={printOptions.paper === "a4_sheet"}
                      onChange={() => setPrintOptions((p) => ({ ...p, paper: "a4_sheet" }))}
                    />
                    <div className="paper-card-info">
                      <strong>Kertas Lembar A4 (Grid 30 Stiker)</strong>
                      <small>Kertas stiker Tom & Jerry / cetak via printer biasa</small>
                    </div>
                  </label>
                </div>
              </div>

              {/* Label Content Customization */}
              <div className="barcode-form-group">
                <label className="barcode-form-label">
                  <span>Informasi Label Stiker</span>
                </label>
                <div className="barcode-toggles-grid">
                  <label className="barcode-toggle-item">
                    <input
                      type="checkbox"
                      checked={printOptions.showStoreName}
                      onChange={(e) => setPrintOptions((p) => ({ ...p, showStoreName: e.target.checked }))}
                    />
                    <span>Nama Toko</span>
                  </label>
                  <label className="barcode-toggle-item">
                    <input
                      type="checkbox"
                      checked={printOptions.showProductName}
                      onChange={(e) => setPrintOptions((p) => ({ ...p, showProductName: e.target.checked }))}
                    />
                    <span>Nama Produk</span>
                  </label>
                  <label className="barcode-toggle-item">
                    <input
                      type="checkbox"
                      checked={printOptions.showPrice}
                      onChange={(e) => setPrintOptions((p) => ({ ...p, showPrice: e.target.checked }))}
                    />
                    <span>Harga Jual</span>
                  </label>
                  <label className="barcode-toggle-item">
                    <input
                      type="checkbox"
                      checked={printOptions.showBarcodeText}
                      onChange={(e) => setPrintOptions((p) => ({ ...p, showBarcodeText: e.target.checked }))}
                    />
                    <span>Angka Barcode</span>
                  </label>
                </div>
                {printOptions.showStoreName ? (
                  <input
                    type="text"
                    value={printOptions.storeName}
                    onChange={(e) => setPrintOptions((p) => ({ ...p, storeName: e.target.value }))}
                    placeholder="Nama Toko pada Stiker..."
                    className="barcode-store-input"
                  />
                ) : null}
              </div>
            </div>

            {/* Right: Realistic Live Sticker Preview */}
            <div className="barcode-preview-column">
              <div className="barcode-preview-sticky">
                <span className="barcode-preview-label">Pratinjau Hasil Stiker Barcode</span>

                <div className="barcode-realistic-sticker-card">
                  {printOptions.showStoreName && printOptions.storeName ? (
                    <div className="sticker-store-title">{printOptions.storeName}</div>
                  ) : null}

                  {printOptions.showProductName ? (
                    <div className="sticker-product-title">
                      {previewItem.productName}
                      {previewItem.variantName ? ` - ${previewItem.variantName}` : ""}
                    </div>
                  ) : null}

                  <div className="sticker-barcode-visual-wrap">
                    <BarcodeVisual
                      value={previewItem.barcode}
                      height={46}
                      showText={false}
                    />
                  </div>

                  <div className="sticker-footer-row">
                    {printOptions.showBarcodeText ? (
                      <span className="sticker-code-number">{previewItem.barcode}</span>
                    ) : <span />}
                    {printOptions.showPrice && previewItem.sellingPrice ? (
                      <span className="sticker-price-tag">
                        {formatCurrency(previewItem.sellingPrice)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="barcode-preview-summary-card">
                  <div className="summary-row">
                    <span>Produk</span>
                    <strong>{selectedProduct?.name}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Varian</span>
                    <strong>{selectedVariantId === "all" ? `Semua Varian (${variants.length || 1})` : activeVariant?.name || "Produk Utama"}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Ukuran Kertas</span>
                    <strong>{printOptions.paper === "thermal_40x30" ? "Thermal 40x30 mm" : printOptions.paper === "thermal_50x30" ? "Thermal 50x30 mm" : "A4 (30 label)"}</strong>
                  </div>
                  <div className="summary-row highlight">
                    <span>Total Barcode</span>
                    <strong>{totalLabels.toLocaleString("id-ID")} Label</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <footer className="modal-actions barcode-modal-footer">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Tutup
            </button>

            <div className="barcode-export-actions">
              <button
                type="button"
                className="button secondary barcode-action-btn"
                onClick={handleDownloadPng}
                title="Download 1 stiker barcode format gambar PNG"
              >
                <ImageIcon size={16} />
                <span>Simpan Gambar PNG</span>
              </button>

              <button
                type="button"
                className="button secondary barcode-action-btn"
                onClick={handleDirectPrint}
                title="Cetak langsung ke printer yang terhubung"
              >
                <Printer size={16} />
                <span>Cetak Langsung</span>
              </button>

              <button
                type="button"
                className="button primary barcode-action-btn-primary"
                onClick={handleDownloadPdf}
                title="Simpan semua label barcode ke file PDF siap cetak"
              >
                <FileText size={16} />
                <span>Simpan File PDF ({totalLabels} Label)</span>
              </button>
            </div>
          </footer>
        </div>
      </div>
    </ModalPortal>
  );
}
