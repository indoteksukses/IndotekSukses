"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Layers3, Loader2, Search, Sparkles, X } from "lucide-react";
import { executeAISearch } from "@/lib/ai-search-client";
import type { AIMatchItem, Product, ProductVariant } from "@/lib/types";

type PickerPosition = { mobile: boolean; top: number; left: number; width: number; maxHeight: number; placement: "up" | "down" };
type ItemOption = { product: Product; variant: ProductVariant | null; key: string; aiReason?: string };

export function ProductSearchSelect({
  products = [],
  value,
  variantValue = null,
  onChange,
  placeholder = "Cari produk, varian, SKU, atau barcode...",
  storeId,
}: {
  products: Product[];
  value: string;
  variantValue?: string | null;
  onChange: (productId: string, variantId?: string | null) => void;
  placeholder?: string;
  storeId?: string;
}) {
  const options = useMemo<ItemOption[]>(() => {
    if (!products || !Array.isArray(products) || products.length === 0) return [];
    return products.flatMap<ItemOption>((product) => {
      const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active);
      if (activeVariants.length > 0) {
        return activeVariants.map((variant) => ({
          product,
          variant,
          key: `${product.id}:${variant.id}`,
        }));
      }
      return [{ product, variant: null, key: `${product.id}:base` }];
    });
  }, [products]);

  const selected = useMemo(() => {
    return options.find(
      (option) =>
        option.product.id === value &&
        (option.variant?.id ?? null) === (variantValue ?? null)
    );
  }, [options, value, variantValue]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<PickerPosition>({
    mobile: false,
    top: 0,
    left: 0,
    width: 520,
    maxHeight: 440,
    placement: "down",
  });

  // AI Search states
  const [aiSearching, setAiSearching] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [aiMatches, setAiMatches] = useState<AIMatchItem[]>([]);
  const [aiInterpretation, setAiInterpretation] = useState("");
  const [aiError, setAiError] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Multi-term search or AI prioritized results
  const filtered = useMemo<ItemOption[]>(() => {
    if (aiActive && aiMatches.length > 0) {
      const optionMap = new Map<string, ItemOption>();
      for (const opt of options) {
        optionMap.set(opt.key, opt);
      }

      const prioritized: ItemOption[] = [];
      const seenKeys = new Set<string>();

      for (const m of aiMatches) {
        const specificKey = m.variant_id ? `${m.product_id}:${m.variant_id}` : null;
        if (specificKey && optionMap.has(specificKey) && !seenKeys.has(specificKey)) {
          seenKeys.add(specificKey);
          prioritized.push({ ...optionMap.get(specificKey)!, aiReason: m.reason });
        } else {
          const matchingOptions = options.filter((opt) => opt.product.id === m.product_id);
          for (const opt of matchingOptions) {
            if (!seenKeys.has(opt.key)) {
              seenKeys.add(opt.key);
              prioritized.push({ ...opt, aiReason: m.reason });
            }
          }
        }
      }

      return prioritized;
    }

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return options.slice(0, 150);

    const terms = trimmed.split(/\s+/).filter(Boolean);
    const rows = options.filter(({ product, variant }) => {
      const haystack = `${product.name} ${variant?.name ?? ""} ${product.sku ?? ""} ${variant?.sku ?? ""} ${product.barcode ?? ""} ${variant?.barcode ?? ""} ${product.category ?? ""} ${product.brand ?? ""}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
    return rows.slice(0, 150);
  }, [options, query, aiActive, aiMatches]);

  const handleAISearch = async () => {
    const q = query.trim();
    if (!q) return;

    setAiSearching(true);
    setAiError("");
    try {
      const res = await executeAISearch(q, { storeId });
      if (!res.success) {
        setAiError(res.error || "Pencarian AI gagal");
        return;
      }
      setAiInterpretation(res.interpretation || "");
      setAiMatches(res.matches || []);
      setAiActive(true);
      if (!res.matches || res.matches.length === 0) {
        setAiError(`AI tidak menemukan produk untuk "${q}".`);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Pencarian AI gagal");
    } finally {
      setAiSearching(false);
    }
  };

  const clearAISearch = () => {
    setAiActive(false);
    setAiMatches([]);
    setAiInterpretation("");
    setAiError("");
    setQuery("");
  };

  const calculatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      const margin = 12;
      const top = Math.max(64, Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-picker-top")) || 72);
      setPosition({
        mobile: true,
        top,
        left: margin,
        width: window.innerWidth - margin * 2,
        maxHeight: Math.max(260, window.innerHeight - top - margin - 16),
        placement: "down",
      });
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const pad = 12;
    const desired = Math.min(520, Math.max(320, window.innerHeight * 0.65));
    const below = window.innerHeight - rect.bottom - pad;
    const above = rect.top - pad;
    const placement: "up" | "down" = below >= 260 || below >= above ? "down" : "up";
    const maxHeight = Math.max(220, Math.min(desired, placement === "down" ? below : above));
    const width = Math.min(680, Math.max(rect.width, 500));
    const left = Math.min(Math.max(pad, rect.left), window.innerWidth - width - pad);
    const top = placement === "down" ? rect.bottom + 6 : Math.max(pad, rect.top - maxHeight - 6);

    setPosition({ mobile: false, top, left, width, maxHeight, placement });
  };

  const toggleOpen = () => {
    if (!open) {
      calculatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    calculatePosition();
    const update = () => calculatePosition();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", escape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const style = {
    "--picker-top": `${position.top}px`,
    "--picker-left": `${position.left}px`,
    "--picker-width": `${position.width}px`,
    "--picker-max-height": `${position.maxHeight}px`,
  } as CSSProperties;

  const stockFor = (option: ItemOption) => {
    if (option.variant) {
      return storeId
        ? option.variant.stocks?.[storeId]?.quantity_available ?? 0
        : option.variant.total_stock ?? 0;
    }
    return storeId
      ? option.product.stocks?.[storeId]?.quantity_available ?? 0
      : option.product.total_stock ?? 0;
  };

  const menu = open && mounted ? createPortal(
    <>
      <div
        className="product-picker-backdrop"
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
      <div
        ref={menuRef}
        className={`product-picker-portal ${position.mobile ? "is-mobile" : "is-desktop"} placement-${position.placement}`}
        style={style}
      >
        <div className="combobox-search">
          <Search size={18} />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (aiActive) {
                setAiActive(false);
                setAiMatches([]);
                setAiInterpretation("");
                setAiError("");
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && query.trim()) {
                event.preventDefault();
                handleAISearch();
              }
            }}
            placeholder={placeholder}
          />
          <button
            type="button"
            className={`combobox-ai-btn ${aiActive ? "is-active" : ""} ${aiSearching ? "is-searching" : ""}`}
            title="Pencarian Cerdas AI (Pahami sebutan tukang, istilah slang, fungsi barang)"
            onClick={handleAISearch}
            disabled={aiSearching}
          >
            {aiSearching ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
            <span>AI</span>
          </button>
          {query ? (
            <button
              type="button"
              className="combobox-clear-input"
              onClick={clearAISearch}
              aria-label="Bersihkan pencarian"
            >
              <X size={15} />
            </button>
          ) : null}
          <button
            type="button"
            className="product-picker-close"
            onClick={() => {
              setOpen(false);
              clearAISearch();
            }}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {aiError ? (
          <div className="combobox-ai-error">
            <span>{aiError}</span>
          </div>
        ) : null}

        <div className="combobox-results variant-aware-results">
          {filtered.map((option) => {
            const active =
              option.product.id === value &&
              (option.variant?.id ?? null) === (variantValue ?? null);
            const stockQty = stockFor(option);

            return (
              <button
                type="button"
                key={option.key}
                className={`${active ? "selected" : ""} ${option.aiReason ? "is-ai-matched" : ""}`}
                onClick={() => {
                  onChange(option.product.id, option.variant?.id ?? null);
                  setOpen(false);
                  setQuery("");
                  clearAISearch();
                }}
              >
                <div className="picker-item-copy">
                  <div className="picker-item-title">
                    <strong>{option.product.name}</strong>
                    {option.variant ? (
                      <span className="picker-variant-badge">
                        <Layers3 size={12} />
                        <span>{option.variant.name}</span>
                      </span>
                    ) : null}
                    {option.aiReason ? (
                      <span className="combobox-ai-badge" title={option.aiReason}>
                        <Sparkles size={10} />
                        <span>{option.aiReason}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="picker-item-meta">
                    <span className={`picker-brand ${!option.product.brand ? "muted" : ""}`}>{option.product.brand || "Tanpa Merek"}</span>
                    <span className="picker-sku">· {option.variant?.sku || option.product.sku}</span>
                    {option.product.category ? <span className="picker-cat">· {option.product.category}</span> : null}
                    {option.variant?.barcode || option.product.barcode ? (
                      <span className="picker-barcode">({option.variant?.barcode || option.product.barcode})</span>
                    ) : null}
                  </div>
                </div>

                <div className="combobox-stock">
                  <span className="stock-number">
                    <b>{stockQty}</b>
                    <small>{option.product.unit}</small>
                  </span>
                  {active ? <Check size={16} className="picker-check" /> : null}
                </div>
              </button>
            );
          })}

          {!filtered.length ? (
            <div className="empty-inline">
              <strong>Produk atau varian tidak ditemukan.</strong>
              <span>Coba kata kunci lain seperti nama produk, varian, SKU, atau barcode.</span>
            </div>
          ) : null}
        </div>

        <div className="combobox-hint">
          {options.length > 150 && !query
            ? `Menampilkan 150 produk/varian pertama dari ${options.length} total item. Ketik untuk mencari.`
            : query
            ? `Ditemukan ${filtered.length} produk/varian cocok.`
            : `Total ${options.length} item tersedia.`}
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="product-combobox" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`product-combobox-trigger ${open ? "is-open" : ""}`}
        onClick={toggleOpen}
        aria-expanded={open}
      >
        <div className="trigger-content">
          {selected ? (
            <>
              <div className="trigger-title">
                <strong>{selected.product.name}</strong>
                {selected.variant ? (
                  <span className="selected-variant-label">
                    <Layers3 size={11} />
                    <span>{selected.variant.name}</span>
                  </span>
                ) : null}
              </div>
              <span className="trigger-subtitle">
                {selected.variant?.sku || selected.product.sku}
                {storeId ? ` · Stok ${stockFor(selected)} ${selected.product.unit}` : ""}
              </span>
            </>
          ) : (
            <span className="trigger-placeholder">{placeholder}</span>
          )}
        </div>
        <div className="trigger-icons">
          {selected ? (
            <span
              className="combobox-clear"
              role="button"
              aria-label="Hapus pilihan"
              onClick={(event) => {
                event.stopPropagation();
                onChange("", null);
                setQuery("");
              }}
            >
              <X size={14} />
            </span>
          ) : null}
          <ChevronDown size={16} className={`chevron-icon ${open ? "rotated" : ""}`} />
        </div>
      </button>
      {menu}
    </div>
  );
}
