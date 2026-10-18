"use client";

import { memo, useCallback, useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, CreditCard, Flame, Layers3, Minus, Plus, Printer, QrCode, ReceiptText, ScanBarcode, Search, ShoppingCart, Tag, Trash2, X } from "lucide-react";
import type { CartItem, Product, ProductVariant, Store } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ProductVisual } from "@/components/product-visual";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ThermalPrinterButton } from "@/components/thermal-printer-button";

const payments = [
  { id: "cash", label: "Tunai", icon: Banknote },
  { id: "qris", label: "QRIS", icon: QrCode },
  { id: "bank_transfer", label: "Transfer", icon: CreditCard },
  { id: "debit_card", label: "Debit", icon: CreditCard },
] as const;

type BarcodeTarget = { product: Product; variant: ProductVariant | null };

function normalizeCode(value?: string | null) { return value?.trim().toLocaleLowerCase("id-ID") ?? ""; }
function activeVariants(product: Product) { return (product.variants ?? []).filter((variant) => variant.is_active); }
function availableStock(product: Product) {
  const variants = activeVariants(product);
  return variants.length
    ? variants.reduce((sum, variant) => sum + Number(variant.selected_stock ?? 0), 0)
    : Number(product.selected_stock ?? 0);
}
function productPriceLabel(product: Product) {
  const variants = activeVariants(product);
  if (!variants.length) return formatCurrency(product.selling_price);
  const prices = variants.map((variant) => Number(variant.selling_price ?? 0));
  const min = Math.min(...prices); const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

// Memoized Product Card: Tidak me-render ulang saat keranjang / diskon / pembayaran berubah
const PosProductCard = memo(function PosProductCard({
  product,
  onChoose,
}: {
  product: Product;
  onChoose: (product: Product) => void;
}) {
  const variants = activeVariants(product);
  const stock = availableStock(product);
  return (
    <button
      type="button"
      className="pos-product"
      onClick={() => onChoose(product)}
      disabled={stock <= 0}
    >
      <ProductVisual
        name={product.name}
        imageUrl={product.image_url}
        definition={product.visual?.code}
        size="card"
      />
      <strong title={product.name}>{product.name}</strong>
      <div className="pos-product-submeta">
        <span className={`pos-brand-pill ${!product.brand ? "muted" : ""}`}>
          {product.brand || "Tanpa Merek"}
        </span>
        <span className="pos-sku-text" title={product.sku}>{product.sku}</span>
      </div>
      {variants.length ? (
        <em className="pos-variant-badge">
          <Layers3 size={12} />
          {variants.length} varian
        </em>
      ) : null}
      <div>
        <b>{productPriceLabel(product)}</b>
        <small>Stok {stock}</small>
      </div>
    </button>
  );
});

export function PosTerminal({ products, store, shiftId = null }: { products: Product[]; store: Store; shiftId?: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState("");
  const [saleId, setSaleId] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(40);

  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("id-ID");

  const categories = useMemo(() => ["Semua", ...Array.from(new Set(products.map((product) => product.category).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "id"))], [products]);
  const indexedProducts = useMemo(() => products.map((product) => ({
    product,
    searchText: `${product.name} ${product.sku} ${product.barcode ?? ""} ${product.brand ?? ""} ${(product.variants ?? []).map((variant) => `${variant.name} ${variant.sku ?? ""} ${variant.barcode ?? ""}`).join(" ")}`.toLocaleLowerCase("id-ID"),
  })), [products]);
  const barcodeIndex = useMemo(() => {
    const index = new Map<string, BarcodeTarget>();
    for (const product of products) {
      for (const variant of activeVariants(product)) {
        for (const value of [variant.barcode, variant.sku]) {
          const code = normalizeCode(value);
          if (code && !index.has(code)) index.set(code, { product, variant });
        }
      }
    }
    for (const product of products) {
      for (const value of [product.barcode, product.sku]) {
        const code = normalizeCode(value);
        if (code && !index.has(code)) index.set(code, { product, variant: null });
      }
    }
    return index;
  }, [products]);
  const allFiltered = useMemo(() => indexedProducts.filter(({ product, searchText }) =>
    (!normalizedQuery || searchText.includes(normalizedQuery))
    && (category === "Semua" || product.category === category)
  ).map(({ product }) => product), [indexedProducts, normalizedQuery, category]);
  const filtered = allFiltered.slice(0, visibleLimit);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const grandTotal = Math.max(subtotal - Math.max(discount, 0), 0);
  const changeAmount = Math.max(cashReceived - grandTotal, 0);

  const addSelected = useCallback((product: Product, variant?: ProductVariant | null) => setCart((current) => {
    const stock = variant ? variant.selected_stock ?? 0 : product.selected_stock ?? 0;
    const key = `${product.id}:${variant?.id ?? "base"}`;
    const currentQuantity = current.find((item) => item.key === key)?.quantity ?? 0;
    if (stock <= 0 || currentQuantity >= stock) return current;
    const found = current.find((item) => item.key === key);
    if (found) return current.map((item) => item.key === key ? { ...item, quantity: item.quantity + 1 } : item);
    return [...current, {
      key,
      product_id: product.id,
      variant_id: variant?.id ?? null,
      variant_name: variant?.name ?? null,
      sku: variant?.sku || product.sku,
      name: product.name,
      price: Number(variant?.selling_price ?? product.selling_price),
      quantity: 1,
      stock,
    }];
  }), []);

  const chooseProduct = useCallback((product: Product) => {
    const variants = activeVariants(product);
    if (variants.length) { setVariantProduct(product); return; }
    addSelected(product, null);
  }, [addSelected]);

  const useBarcode = useCallback((rawCode: string) => {
    const target = barcodeIndex.get(normalizeCode(rawCode));
    if (!target) { setQuery(rawCode); setVisibleLimit(80); setError(`Barcode ${rawCode} belum terdaftar.`); searchRef.current?.focus(); return; }
    if (target.variant) {
      if ((target.variant.selected_stock ?? 0) <= 0) { setError(`${target.product.name} · ${target.variant.name} sedang tidak memiliki stok.`); return; }
      addSelected(target.product, target.variant); setQuery(""); setVisibleLimit(80); setError(""); searchRef.current?.focus(); return;
    }
    if (availableStock(target.product) <= 0) { setError(`${target.product.name} sedang tidak memiliki stok.`); return; }
    chooseProduct(target.product); setQuery(""); setVisibleLimit(80); setError(""); searchRef.current?.focus();
  }, [barcodeIndex, addSelected, chooseProduct]);

  const change = (key: string, delta: number) => setCart((current) => {
    const target = current.find((item) => item.key === key);
    if (!target) return current;
    const maximum = Math.max(1, target.stock);
    return current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, Math.min(item.quantity + delta, maximum)) } : item);
  });

  const checkout = async () => {
    if (!cart.length) return;
    if (paymentMethod === "cash" && cashReceived < grandTotal) { setError("Uang tunai yang diterima masih kurang."); return; }
    setProcessing(true); setError("");
    try {
      const response = await fetch("/api/pos/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: store.id, shift_id: shiftId, customer_name: customerName || null,
          items: cart.map((item) => ({ product_id: item.product_id, variant_id: item.variant_id ?? null, quantity: item.quantity })),
          payments: [{ method: paymentMethod, amount: grandTotal, reference_number: paymentReference || null }],
          discount, notes: paymentMethod === "cash" ? `Uang diterima ${cashReceived}; kembalian ${changeAmount}` : null }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Transaksi gagal");
      setInvoice(result.invoice_number || ""); setSaleId(result.sale_id || ""); setPaymentOpen(false); setMobileCartOpen(false); setPaid(true); startTransition(() => router.refresh());
    } catch (err) { setError(err instanceof Error ? err.message : "Transaksi gagal"); }
    finally { setProcessing(false); }
  };

  const reset = () => { setPaid(false); setCart([]); setCustomerName(""); setDiscount(0); setCashReceived(0); setPaymentReference(""); setQuery(""); setVisibleLimit(80); setSaleId(""); setInvoice(""); searchRef.current?.focus(); };
  const receiptUrl = saleId ? `/sales/${saleId}/receipt` : "";

  const cartContent = (mobile = false) => <>
    <div className="cart-head"><div><ShoppingCart size={20}/><h2>Keranjang</h2></div><span>{itemCount} item</span>{mobile ? <button className="icon-button mobile-cart-close" onClick={() => setMobileCartOpen(false)}><X size={20}/></button> : null}</div>
    <div className="cart-customer"><span>Pelanggan</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Pelanggan umum"/></div>
    <div className="cart-items">{cart.length === 0 ? <div className="cart-empty"><ShoppingCart size={36}/><strong>Keranjang masih kosong</strong><span>Pilih produk atau scan barcode.</span></div> : cart.map((item) => <div className="cart-item" key={item.key}>
      <div><strong>{item.name}</strong>{item.variant_name ? <b className="cart-variant-name">{item.variant_name}</b> : null}<span>{formatCurrency(item.price)} / item · stok {item.stock}</span></div><button className="trash" onClick={() => setCart((current) => current.filter((row) => row.key !== item.key))}><Trash2 size={16}/></button>
      <div className="quantity-control"><button onClick={() => change(item.key,-1)}><Minus size={14}/></button><span>{item.quantity}</span><button onClick={() => change(item.key,1)}><Plus size={14}/></button></div><strong>{formatCurrency(item.price * item.quantity)}</strong>
    </div>)}</div>
    <div className="cart-summary"><div><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div><div><span>Diskon</span><input className="discount-input" inputMode="numeric" type="number" min="0" max={subtotal} value={discount || ""} onChange={(event) => setDiscount(Number(event.target.value || 0))} placeholder="Rp0"/></div><div className="grand-total"><span>Total</span><strong>{formatCurrency(grandTotal)}</strong></div><button className="button primary pay-button" disabled={!cart.length} onClick={() => { setMobileCartOpen(false); setPaymentOpen(true); setCashReceived(grandTotal); setError(""); }}>Bayar {formatCurrency(grandTotal)}</button>{error ? <div className="pos-error">{error}</div> : null}</div>
  </>;

  return <div className="pos-layout pos-layout-v231">
    <section className="pos-products">
      <div className={`pos-search ${query !== deferredQuery ? "is-busy" : ""}`}><Search size={20}/><input ref={searchRef} autoFocus placeholder="Scan barcode atau cari produk / varian..." value={query} onChange={(event) => { setQuery(event.target.value); setVisibleLimit(40); }} onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); if (query.trim()) useBarcode(query); }}/><button type="button" className="pos-scan-btn" title="Buka kamera barcode" onClick={() => setScannerOpen(true)}><ScanBarcode size={20}/><span>Scan</span></button><ThermalPrinterButton variant="pos"/></div>
      <div className="category-chips">{categories.map((name) => <button className={category === name ? "active" : ""} key={name} onClick={() => { setCategory(name); setVisibleLimit(40); }}>{name}</button>)}</div>
      <div className="product-grid">{filtered.map((product) => <PosProductCard key={product.id} product={product} onChoose={chooseProduct} />)}</div>
      {!allFiltered.length ? <div className="empty-inline">Produk tidak ditemukan.</div> : null}
      {allFiltered.length ? <div className="catalog-status"><span>Menampilkan <strong>{filtered.length.toLocaleString("id-ID")}</strong> dari {allFiltered.length.toLocaleString("id-ID")} produk</span>{filtered.length < allFiltered.length ? <button type="button" className="button secondary" onClick={() => setVisibleLimit((current) => current + 40)}>Tampilkan lebih banyak</button> : null}</div> : null}
    </section>

    <aside className="cart-panel desktop-cart-panel">{cartContent()}</aside>
    <button type="button" className={`mobile-cart-dock ${itemCount ? "has-items" : ""}`} onClick={() => setMobileCartOpen(true)}><span className="mobile-cart-icon"><ShoppingCart size={21}/>{itemCount ? <b>{itemCount}</b> : null}</span><span><strong>{itemCount ? `${itemCount} item di keranjang` : "Keranjang kosong"}</strong><small>{itemCount ? "Sentuh untuk lihat dan bayar" : "Pilih produk untuk mulai transaksi"}</small></span><strong>{formatCurrency(grandTotal)}</strong></button>
    {mobileCartOpen ? <div className="mobile-cart-backdrop" onClick={() => setMobileCartOpen(false)}><section className="mobile-cart-sheet" onClick={(event) => event.stopPropagation()}>{cartContent(true)}</section></div> : null}
    {scannerOpen ? <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={useBarcode}/> : null}

    {variantProduct ? <div className="modal-backdrop variant-picker-backdrop"><div className="modal-card variant-picker-modal"><div className="modal-header"><div><h2>Pilih Varian Produk</h2><p>{variantProduct.name} · pilih varian yang ingin ditambahkan ke keranjang.</p></div><button className="icon-button" onClick={() => setVariantProduct(null)}><X size={20}/></button></div><div className="variant-picker-product"><ProductVisual name={variantProduct.name} imageUrl={variantProduct.image_url} definition={variantProduct.visual?.code} size="thumb" animated={false}/><div><strong>{variantProduct.name}</strong><div className="variant-picker-tags"><span className={`variant-brand-chip ${!variantProduct.brand ? "muted" : ""}`}><Tag size={12}/> {variantProduct.brand || "Tanpa Merek"}</span>{variantProduct.category ? <span className="variant-cat-chip">{variantProduct.category}</span> : null}<span className="variant-sku-chip">{variantProduct.sku}</span></div></div></div><div className="variant-picker-list">{activeVariants(variantProduct).map((variant) => <button type="button" key={variant.id} disabled={(variant.selected_stock ?? 0) <= 0} onClick={() => { addSelected(variantProduct, variant); setVariantProduct(null); setError(""); }}><div className="variant-item-leading"><ProductVisual name={`${variantProduct.name} - ${variant.name}`} imageUrl={variantProduct.image_url} definition={variantProduct.visual?.code} size="thumb" animated={false}/><div className="variant-item-meta"><strong className="variant-item-name">{variant.name}</strong><div className="variant-item-subtags"><span className={`variant-item-brand ${!variantProduct.brand ? "muted" : ""}`}>{variantProduct.brand || "Tanpa Merek"}</span><span className="variant-item-sku">{variant.sku || "Tanpa SKU"}{variant.barcode ? ` · ${variant.barcode}` : ""}</span></div><em className={(variant.selected_stock ?? 0) > 0 ? "stock-in" : "stock-out"}>Stok: {variant.selected_stock ?? 0} {variantProduct.unit}</em></div></div><div className="variant-item-trailing"><b className="variant-item-price">{formatCurrency(variant.selling_price)}</b><span className="variant-item-add-btn"><Plus size={16}/></span></div></button>)}</div></div></div> : null}

    {paymentOpen ? <div className="modal-backdrop payment-backdrop"><div className="modal-card payment-sheet"><div className="modal-header"><div><h2>Pembayaran</h2><p>{store.name} · {itemCount} item</p></div><button className="icon-button" onClick={() => setPaymentOpen(false)}><X size={20}/></button></div><div className="payment-total"><span>Total pembayaran</span><strong>{formatCurrency(grandTotal)}</strong></div><div className="payment-methods">{payments.map(({ id, label, icon: Icon }) => <button type="button" className={paymentMethod === id ? "active" : ""} key={id} onClick={() => { setPaymentMethod(id); setPaymentReference(""); if (id !== "cash") setCashReceived(grandTotal); }}><Icon size={22}/><span>{label}</span></button>)}</div>{paymentMethod === "cash" ? <div className="cash-payment"><label className="payment-field"><span>Uang diterima</span><input type="number" inputMode="numeric" min={grandTotal} value={cashReceived || ""} onChange={(event) => setCashReceived(Number(event.target.value || 0))}/><div className="cash-presets">{[grandTotal, Math.ceil(grandTotal/5000)*5000, Math.ceil(grandTotal/10000)*10000, Math.ceil(grandTotal/50000)*50000].filter((value,index,array)=>array.indexOf(value)===index).slice(0,4).map((value)=><button type="button" key={value} onClick={()=>setCashReceived(value)}>{value===grandTotal?"Uang pas":formatCurrency(value)}</button>)}</div></label><div className="change-card"><span>Kembalian</span><strong>{formatCurrency(changeAmount)}</strong></div></div> : <label className="payment-field"><span>Nomor referensi</span><input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Opsional: nomor transaksi pembayaran"/></label>}{error ? <div className="alert error">{error}</div> : null}<button className="button primary payment-submit" disabled={processing} onClick={checkout}>{processing ? <LoadingSpinner/> : null}<span>{processing ? "Memproses transaksi..." : `Selesaikan ${formatCurrency(grandTotal)}`}</span></button></div></div> : null}

    {paid ? <div className="modal-backdrop"><div className="modal-card payment-modal success-modal"><div className="success-check"><CheckCircle2 size={34}/></div><h2>Pembayaran berhasil</h2><p>Invoice <strong>{invoice}</strong> tersimpan. Varian dan harga transaksi tercatat pada invoice.</p><strong className="success-total">{formatCurrency(grandTotal)}</strong><div className="success-actions pos-success-actions"><Link className="button primary pos-thermal-print-btn" href={`${receiptUrl}?format=thermal58&print=1`} target="_blank" rel="noreferrer"><Flame size={16}/> Cetak Thermal (58mm)</Link><Link className="button secondary" href={`${receiptUrl}?format=thermal80&print=1`} target="_blank" rel="noreferrer"><Printer size={16}/> Thermal 80mm</Link><Link className="button secondary" href={receiptUrl}><ReceiptText size={16}/> Buka Invoice</Link><button className="button secondary" onClick={reset}>Transaksi baru</button></div></div></div> : null}
  </div>;
}
