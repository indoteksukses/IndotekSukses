"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Minus, Plus, QrCode, ScanBarcode, Search, ShoppingCart, Trash2, X, ReceiptText, CheckCircle2 } from "lucide-react";
import type { CartItem, Product, Store } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ProductVisual } from "@/components/product-visual";

const payments = [
  { id: "cash", label: "Tunai", icon: Banknote },
  { id: "qris", label: "QRIS", icon: QrCode },
  { id: "bank_transfer", label: "Transfer", icon: CreditCard },
  { id: "debit_card", label: "Debit", icon: CreditCard },
] as const;

export function PosTerminal({ products, store, shiftId = null }: { products: Product[]; store: Store; shiftId?: string | null }) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState(0);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState("");
  const [saleId, setSaleId] = useState("");

  const categories = useMemo(() => ["Semua", ...Array.from(new Set(products.map((product) => product.category).filter(Boolean) as string[]))], [products]);
  const filtered = useMemo(() => products.filter((product) => {
    const matchesQuery = `${product.name} ${product.sku} ${product.barcode ?? ""}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === "Semua" || product.category === category);
  }).slice(0, 160), [products, query, category]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const grandTotal = Math.max(subtotal - Math.max(discount, 0), 0);
  const changeAmount = Math.max(cashReceived - grandTotal, 0);

  const add = useCallback((product: Product) => setCart((current) => {
    const stock = product.selected_stock ?? 0;
    if (stock <= 0) return current;
    const found = current.find((item) => item.product_id === product.id);
    if (found) return current.map((item) => item.product_id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) } : item);
    return [...current, { product_id: product.id, sku: product.sku, name: product.name, price: product.selling_price, quantity: 1, stock }];
  }), []);

  const useBarcode = useCallback((rawCode: string) => {
    const code = rawCode.trim().toLowerCase();
    const matched = products.find((product) => product.barcode?.trim().toLowerCase() === code || product.sku.trim().toLowerCase() === code);
    if (!matched) { setQuery(rawCode); setError(`Barcode ${rawCode} belum terdaftar pada produk.`); searchRef.current?.focus(); return; }
    if ((matched.selected_stock ?? 0) <= 0) { setError(`${matched.name} sedang tidak memiliki stok.`); return; }
    add(matched); setQuery(""); setError(""); searchRef.current?.focus();
  }, [products, add]);

  const change = (id: string, delta: number) => setCart((current) => current.map((item) => item.product_id === id ? { ...item, quantity: Math.max(1, Math.min(item.quantity + delta, item.stock)) } : item));

  const checkout = async () => {
    if (!cart.length) return;
    if (paymentMethod === "cash" && cashReceived < grandTotal) { setError("Uang tunai yang diterima masih kurang."); return; }
    setProcessing(true); setError("");
    try {
      const response = await fetch("/api/pos/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: store.id, shift_id: shiftId, customer_name: customerName || null,
          items: cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
          payments: [{ method: paymentMethod, amount: grandTotal, reference_number: paymentReference || null }],
          discount, notes: paymentMethod === "cash" ? `Uang diterima ${cashReceived}; kembalian ${changeAmount}` : null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Transaksi gagal");
      setInvoice(result.invoice_number || ""); setSaleId(result.sale_id || ""); setPaymentOpen(false); setPaid(true); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Transaksi gagal"); }
    finally { setProcessing(false); }
  };

  const reset = () => { setPaid(false); setCart([]); setCustomerName(""); setDiscount(0); setCashReceived(0); setPaymentReference(""); setQuery(""); setSaleId(""); setInvoice(""); searchRef.current?.focus(); };
  const receiptUrl = saleId ? `/sales/${saleId}/receipt` : "";

  return <div className="pos-layout">
    <section className="pos-products">
      <div className="pos-search"><Search size={20}/><input ref={searchRef} autoFocus placeholder="Scan barcode atau cari produk..." value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); if (query.trim()) useBarcode(query); }}/><button type="button" title="Buka kamera barcode" onClick={() => setScannerOpen(true)}><ScanBarcode size={21}/><span>Scan</span></button></div>
      <div className="category-chips">{categories.map((name) => <button className={category === name ? "active" : ""} key={name} onClick={() => setCategory(name)}>{name}</button>)}</div>
      <div className="product-grid">{filtered.map((product) => <button className="pos-product" key={product.id} onClick={() => add(product)} disabled={(product.selected_stock ?? 0) <= 0}>
        <ProductVisual name={product.name} imageUrl={product.image_url} definition={product.visual?.code} size="card"/><strong title={product.name}>{product.name}</strong><span title={product.sku}>{product.sku}</span><div><b>{formatCurrency(product.selling_price)}</b><small>Stok {product.selected_stock ?? 0}</small></div>
      </button>)}</div>
      {!filtered.length ? <div className="empty-inline">Produk tidak ditemukan.</div> : null}
      {products.length > 160 && !query ? <div className="catalog-hint">Gunakan pencarian untuk menemukan produk dari katalog besar.</div> : null}
    </section>

    <aside className="cart-panel">
      <div className="cart-head"><div><ShoppingCart size={20}/><h2>Keranjang</h2></div><span>{cart.reduce((sum, item) => sum + item.quantity, 0)} item</span></div>
      <div className="cart-customer"><span>Pelanggan</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Pelanggan umum"/></div>
      <div className="cart-items">{cart.length === 0 ? <div className="cart-empty"><ShoppingCart size={36}/><strong>Keranjang masih kosong</strong><span>Pilih produk atau scan barcode.</span></div> : cart.map((item) => <div className="cart-item" key={item.product_id}>
        <div><strong>{item.name}</strong><span>{formatCurrency(item.price)} / item · stok {item.stock}</span></div><button className="trash" onClick={() => setCart((current) => current.filter((row) => row.product_id !== item.product_id))}><Trash2 size={16}/></button>
        <div className="quantity-control"><button onClick={() => change(item.product_id,-1)}><Minus size={14}/></button><span>{item.quantity}</span><button onClick={() => change(item.product_id,1)}><Plus size={14}/></button></div><strong>{formatCurrency(item.price * item.quantity)}</strong>
      </div>)}</div>
      <div className="cart-summary"><div><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div><div><span>Diskon</span><input className="discount-input" inputMode="numeric" type="number" min="0" max={subtotal} value={discount || ""} onChange={(event) => setDiscount(Number(event.target.value || 0))} placeholder="Rp0"/></div><div className="grand-total"><span>Total</span><strong>{formatCurrency(grandTotal)}</strong></div><button className="button primary pay-button" disabled={!cart.length} onClick={() => { setPaymentOpen(true); setCashReceived(grandTotal); setError(""); }}>Bayar {formatCurrency(grandTotal)}</button>{error ? <div className="pos-error">{error}</div> : null}</div>
    </aside>

    <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={useBarcode}/>

    {paymentOpen ? <div className="modal-backdrop payment-backdrop"><div className="modal-card payment-sheet"><div className="modal-header"><div><h2>Pembayaran</h2><p>{store.name} · {cart.reduce((sum, item) => sum + item.quantity, 0)} item</p></div><button className="icon-button" onClick={() => setPaymentOpen(false)}><X size={20}/></button></div>
      <div className="payment-total"><span>Total pembayaran</span><strong>{formatCurrency(grandTotal)}</strong></div>
      <div className="payment-methods">{payments.map(({ id, label, icon: Icon }) => <button type="button" className={paymentMethod === id ? "active" : ""} key={id} onClick={() => { setPaymentMethod(id); setPaymentReference(""); if (id !== "cash") setCashReceived(grandTotal); }}><Icon size={22}/><span>{label}</span></button>)}</div>
      {paymentMethod === "cash" ? <div className="cash-payment"><label className="payment-field"><span>Uang diterima</span><input type="number" inputMode="numeric" min={grandTotal} value={cashReceived || ""} onChange={(event) => setCashReceived(Number(event.target.value || 0))}/><div className="cash-presets">{[grandTotal, Math.ceil(grandTotal/5000)*5000, Math.ceil(grandTotal/10000)*10000, Math.ceil(grandTotal/50000)*50000].filter((value,index,array)=>array.indexOf(value)===index).slice(0,4).map((value)=><button type="button" key={value} onClick={()=>setCashReceived(value)}>{value===grandTotal?"Uang pas":formatCurrency(value)}</button>)}</div></label><div className="change-card"><span>Kembalian</span><strong>{formatCurrency(changeAmount)}</strong></div></div> : <label className="payment-field"><span>Nomor referensi</span><input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Opsional: nomor transaksi pembayaran"/></label>}
      {error ? <div className="alert error">{error}</div> : null}
      <button className="button primary payment-submit" disabled={processing} onClick={checkout}>{processing ? "Memproses transaksi..." : `Selesaikan ${formatCurrency(grandTotal)}`}</button>
    </div></div> : null}

    {paid ? <div className="modal-backdrop"><div className="modal-card payment-modal success-modal"><div className="success-check"><CheckCircle2 size={34}/></div><h2>Pembayaran berhasil</h2><p>Invoice <strong>{invoice}</strong> tersimpan. Rincian barang, pembayaran, kasir, dan toko tersedia pada invoice.</p><strong className="success-total">{formatCurrency(grandTotal)}</strong><div className="success-actions"><a className="button secondary" href={receiptUrl}><ReceiptText size={16}/> Lihat invoice</a><a className="button secondary" href={`${receiptUrl}?print=1`} target="_blank" rel="noreferrer">Cetak / PDF</a><button className="button primary" onClick={reset}>Transaksi baru</button></div></div></div> : null}
  </div>;
}
