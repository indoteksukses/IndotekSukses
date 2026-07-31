"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Product } from "@/lib/types";

export function ProductSearchSelect({ products, value, onChange, placeholder = "Cari nama, SKU, atau barcode...", storeId }: { products: Product[]; value: string; onChange: (id: string) => void; placeholder?: string; storeId?: string }) {
  const selected = products.find((product) => product.id === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const rows = keyword ? products.filter((product) => `${product.name} ${product.sku} ${product.barcode ?? ""} ${product.category ?? ""}`.toLowerCase().includes(keyword)) : products;
    return rows.slice(0, 80);
  }, [products, query]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);

  return <div className="product-combobox" ref={rootRef}>
    <button type="button" className="product-combobox-trigger" onClick={() => setOpen((current) => !current)}>
      <div>{selected ? <><strong>{selected.name}</strong><span>{selected.sku}{storeId ? ` · stok ${selected.stocks[storeId]?.quantity_on_hand ?? 0}` : ""}</span></> : <span>{placeholder}</span>}</div>
      {selected ? <span className="combobox-clear" onClick={(event) => { event.stopPropagation(); onChange(""); setQuery(""); }}><X size={15}/></span> : <ChevronDown size={17}/>} 
    </button>
    {open ? <div className="product-combobox-menu">
      <div className="combobox-search"><Search size={17}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder}/></div>
      <div className="combobox-results">{filtered.map((product) => <button type="button" key={product.id} className={product.id === value ? "selected" : ""} onClick={() => { onChange(product.id); setOpen(false); setQuery(""); }}>
        <div><strong>{product.name}</strong><span>{product.sku} · {product.category || "Tanpa kategori"}</span></div>
        <div className="combobox-stock">{storeId ? `${product.stocks[storeId]?.quantity_on_hand ?? 0} ${product.unit}` : `${product.total_stock} ${product.unit}`}{product.id === value ? <Check size={15}/> : null}</div>
      </button>)}{!filtered.length ? <div className="empty-inline">Produk tidak ditemukan.</div> : null}</div>
      {products.length > 80 && !query ? <div className="combobox-hint">Menampilkan 80 produk pertama. Ketik nama, SKU, atau barcode untuk pencarian cepat.</div> : null}
    </div> : null}
  </div>;
}
