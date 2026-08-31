import Link from "next/link";
import { notFound } from "next/navigation";
import { PurchasePrintButton } from "./print-button";
import { getPurchases, getSystemSettings } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const metadata={title:"Cetak Pesanan Pembelian"};
export default async function PurchasePrintPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const [rows,settings]=await Promise.all([getPurchases(),getSystemSettings()]);
  const purchase=rows.find((row:any)=>row.id===id);
  if(!purchase)notFound();
  return <div className="purchase-print-page"><div className="purchase-print-toolbar no-print"><Link className="button secondary" href="/purchases">Kembali</Link><PurchasePrintButton/></div><article className="purchase-print-document">
    <header><div className="purchase-print-brand">{settings.logo_url?<img src={settings.logo_url} alt={settings.company_name} decoding="async"/>:<span>IS</span>}<div><h1>{settings.company_name}</h1><p>{settings.address||settings.company_tagline}</p></div></div><div><h2>PESANAN PEMBELIAN</h2><strong>{purchase.po_number}</strong><span>{formatDateTime(purchase.created_at)}</span></div></header>
    <section className="purchase-print-info"><div><span>Supplier</span><strong>{purchase.supplier_name}</strong></div><div><span>Status</span><strong>{String(purchase.status).replaceAll("_"," ")}</strong></div><div><span>Cabang penerima</span><strong>{purchase.store_names?.join(", ")||purchase.store_name}</strong></div><div><span>Jumlah cabang</span><strong>{purchase.store_names?.length??1}</strong></div></section>
    <table><thead><tr><th>Produk</th><th>Alokasi cabang</th><th>Jumlah</th><th>Harga beli</th><th>Subtotal</th></tr></thead><tbody>{purchase.items.map((item:any)=><tr key={item.id}><td><strong>{item.name}</strong>{item.variant_name ? <em>{item.variant_name}</em> : null}<span>{item.variant_sku || item.sku}</span></td><td>{item.allocations?.length?item.allocations.map((allocation:any)=><div key={allocation.id}>{allocation.store_name}: <b>{allocation.quantity} {item.unit}</b></div>):<div>{purchase.store_name}: <b>{item.quantity_ordered} {item.unit}</b></div>}</td><td>{item.quantity_ordered} {item.unit}</td><td>{formatCurrency(item.unit_cost)}</td><td>{formatCurrency(item.subtotal)}</td></tr>)}</tbody></table>
    <footer><div><span>Catatan</span><p>{purchase.notes||"Tidak ada catatan."}</p></div><div className="purchase-print-total"><span>Subtotal <b>{formatCurrency(purchase.subtotal)}</b></span><span>Ongkir <b>{formatCurrency(purchase.shipping_cost)}</b></span><span>Diskon <b>- {formatCurrency(purchase.discount)}</b></span><strong>Total <b>{formatCurrency(purchase.total)}</b></strong></div></footer>
  </article></div>;
}
