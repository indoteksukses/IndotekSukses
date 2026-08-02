"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Product } from "@/lib/types";

type PickerPosition = {
  mobile: boolean;
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "up" | "down";
};

export function ProductSearchSelect({ products, value, onChange, placeholder = "Cari nama, SKU, atau barcode...", storeId }: { products: Product[]; value: string; onChange: (id: string) => void; placeholder?: string; storeId?: string }) {
  const selected = products.find((product) => product.id === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<PickerPosition>({ mobile: false, top: 0, left: 0, width: 420, maxHeight: 420, placement: "down" });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const rows = keyword ? products.filter((product) => `${product.name} ${product.sku} ${product.barcode ?? ""} ${product.category ?? ""}`.toLowerCase().includes(keyword)) : products;
    return rows.slice(0, 100);
  }, [products, query]);

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
    const viewportPadding = 12;
    const desiredHeight = Math.min(470, Math.max(300, window.innerHeight * 0.62));
    const below = window.innerHeight - rect.bottom - viewportPadding;
    const above = rect.top - viewportPadding;
    const placement: "up" | "down" = below >= Math.min(340, desiredHeight) || below >= above ? "down" : "up";
    const maxHeight = Math.max(220, Math.min(desiredHeight, placement === "down" ? below : above));
    const width = Math.min(560, Math.max(rect.width, 430));
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
    const top = placement === "down" ? rect.bottom + 7 : Math.max(viewportPadding, rect.top - maxHeight - 7);
    setPosition({ mobile: false, top, left, width, maxHeight, placement });
  };

  useEffect(() => setMounted(true), []);

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
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const style = {
    "--picker-top": `${position.top}px`,
    "--picker-left": `${position.left}px`,
    "--picker-width": `${position.width}px`,
    "--picker-max-height": `${position.maxHeight}px`,
  } as CSSProperties;

  const menu = open && mounted ? createPortal(
    <>
      {position.mobile ? <button type="button" className="product-picker-backdrop" aria-label="Tutup pilihan produk" onClick={() => setOpen(false)} /> : null}
      <div ref={menuRef} className={`product-picker-portal ${position.mobile ? "is-mobile" : "is-desktop"} placement-${position.placement}`} style={style}>
        <div className="combobox-search"><Search size={18}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder}/><button type="button" className="product-picker-close" onClick={() => setOpen(false)} aria-label="Tutup"><X size={18}/></button></div>
        <div className="combobox-results">{filtered.map((product) => <button type="button" key={product.id} className={product.id === value ? "selected" : ""} onClick={() => { onChange(product.id); setOpen(false); setQuery(""); }}>
          <div><strong>{product.name}</strong><span>{product.sku} · {product.category || "Tanpa kategori"}</span></div>
          <div className="combobox-stock">{storeId ? `${product.stocks[storeId]?.quantity_on_hand ?? 0} ${product.unit}` : `${product.total_stock} ${product.unit}`}{product.id === value ? <Check size={15}/> : null}</div>
        </button>)}{!filtered.length ? <div className="empty-inline">Produk tidak ditemukan.</div> : null}</div>
        {products.length > 100 && !query ? <div className="combobox-hint">Menampilkan 100 produk pertama. Ketik nama, SKU, atau barcode untuk pencarian cepat.</div> : null}
      </div>
    </>, document.body) : null;

  return <div className="product-combobox" ref={rootRef}>
    <button ref={triggerRef} type="button" className="product-combobox-trigger" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <div>{selected ? <><strong>{selected.name}</strong><span>{selected.sku}{storeId ? ` · stok ${selected.stocks[storeId]?.quantity_on_hand ?? 0}` : ""}</span></> : <span>{placeholder}</span>}</div>
      {selected ? <span className="combobox-clear" onClick={(event) => { event.stopPropagation(); onChange(""); setQuery(""); }}><X size={15}/></span> : <ChevronDown size={17}/>} 
    </button>
    {menu}
  </div>;
}
