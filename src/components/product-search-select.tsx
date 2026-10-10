"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Layers3, Search, X } from "lucide-react";
import type { Product, ProductVariant } from "@/lib/types";

type PickerPosition = { mobile: boolean; top: number; left: number; width: number; maxHeight: number; placement: "up" | "down" };
type ItemOption = { product: Product; variant: ProductVariant | null; key: string };

export function ProductSearchSelect({
  products,
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
  const options = useMemo<ItemOption[]>(() => products.flatMap<ItemOption>((product) => {
    const variants = (product.variants ?? []).filter((variant) => variant.is_active);
    return variants.length
      ? variants.map((variant) => ({ product, variant, key: `${product.id}:${variant.id}` }))
      : [{ product, variant: null, key: `${product.id}:base` }];
  }), [products]);
  const selected = options.find((option) => option.product.id === value && (option.variant?.id ?? null) === (variantValue ?? null));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<PickerPosition>({ mobile: false, top: 0, left: 0, width: 480, maxHeight: 440, placement: "down" });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const rows = keyword ? options.filter(({ product, variant }) => `${product.name} ${product.sku} ${product.barcode ?? ""} ${product.category ?? ""} ${product.brand ?? ""} ${variant?.name ?? ""} ${variant?.sku ?? ""} ${variant?.barcode ?? ""}`.toLowerCase().includes(keyword)) : options;
    return rows.slice(0, 150);
  }, [options, query]);

  const calculatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;
    const mobile = window.innerWidth < 1180;
    if (mobile) {
      const margin = window.innerWidth <= 480 ? 8 : 16;
      const top = Math.max(68, Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-picker-top")) || 76);
      setPosition({ mobile: true, top, left: margin, width: window.innerWidth - margin * 2, maxHeight: Math.max(260, window.innerHeight - top - margin), placement: "down" });
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const pad = 12;
    const desired = Math.min(520, Math.max(320, window.innerHeight * .68));
    const below = window.innerHeight - rect.bottom - pad;
    const above = rect.top - pad;
    const placement: "up" | "down" = below >= Math.min(360, desired) || below >= above ? "down" : "up";
    const maxHeight = Math.max(240, Math.min(desired, placement === "down" ? below : above));
    const width = Math.min(620, Math.max(rect.width, 470));
    const left = Math.min(Math.max(pad, rect.left), window.innerWidth - width - pad);
    const top = placement === "down" ? rect.bottom + 7 : Math.max(pad, rect.top - maxHeight - 7);
    setPosition({ mobile: false, top, left, width, maxHeight, placement });
  };

  useEffect(() => setMounted(true), []);
  useLayoutEffect(() => {
    if (!open) return;
    calculatePosition();
    const update = () => calculatePosition();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { const target = event.target as Node; if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  const style = { "--picker-top": `${position.top}px`, "--picker-left": `${position.left}px`, "--picker-width": `${position.width}px`, "--picker-max-height": `${position.maxHeight}px` } as CSSProperties;
  const stockFor = (option: ItemOption) => {
    if (option.variant) return storeId ? option.variant.stocks?.[storeId]?.quantity_available ?? 0 : option.variant.total_stock ?? 0;
    return storeId ? option.product.stocks[storeId]?.quantity_available ?? 0 : option.product.total_stock;
  };

  const menu = open && mounted ? createPortal(<>
    {position.mobile ? <button type="button" className="product-picker-backdrop" aria-label="Tutup pilihan produk" onClick={() => setOpen(false)}/> : null}
    <div ref={menuRef} className={`product-picker-portal ${position.mobile ? "is-mobile" : "is-desktop"} placement-${position.placement}`} style={style}>
      <div className="combobox-search"><Search size={18}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder}/><button type="button" className="product-picker-close" onClick={() => setOpen(false)} aria-label="Tutup"><X size={18}/></button></div>
      <div className="combobox-results variant-aware-results">{filtered.map((option) => {
        const active = option.product.id === value && (option.variant?.id ?? null) === (variantValue ?? null);
        return <button type="button" key={option.key} className={active ? "selected" : ""} onClick={() => { onChange(option.product.id, option.variant?.id ?? null); setOpen(false); setQuery(""); }}>
          <div className="picker-item-copy"><strong>{option.product.name}</strong>{option.variant ? <em><Layers3 size={13}/>{option.variant.name}</em> : null}<span>{option.variant?.sku || option.product.sku} · {option.product.category || "Tanpa kategori"}</span></div>
          <div className="combobox-stock"><b>{stockFor(option)}</b> {option.product.unit}{active ? <Check size={15}/> : null}</div>
        </button>;
      })}{!filtered.length ? <div className="empty-inline">Produk atau varian tidak ditemukan.</div> : null}</div>
      {options.length > 150 && !query ? <div className="combobox-hint">Menampilkan 150 pilihan pertama. Gunakan pencarian untuk menemukan varian lebih cepat.</div> : null}
    </div>
  </>, document.body) : null;

  return <div className="product-combobox" ref={rootRef}>
    <button ref={triggerRef} type="button" className="product-combobox-trigger" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <div>{selected ? <><strong>{selected.product.name}</strong>{selected.variant ? <em className="selected-variant-label"><Layers3 size={12}/>{selected.variant.name}</em> : null}<span>{selected.variant?.sku || selected.product.sku}{storeId ? ` · stok ${stockFor(selected)} ${selected.product.unit}` : ""}</span></> : <span>{placeholder}</span>}</div>
      {selected ? <span className="combobox-clear" onClick={(event) => { event.stopPropagation(); onChange("", null); setQuery(""); }}><X size={15}/></span> : <ChevronDown size={17}/>} 
    </button>
    {menu}
  </div>;
}
