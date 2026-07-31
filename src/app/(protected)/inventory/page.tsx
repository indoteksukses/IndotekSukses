import { Boxes, ArrowRightLeft } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getProductsWithStocks } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Stok Semua Toko" };
export default async function InventoryPage() {
  const demoProducts = await getProductsWithStocks();
  const totalUnits = demoProducts.reduce((s,p)=>s+(p.stock_store_1??0)+(p.stock_store_2??0),0);
  const stockValue = demoProducts.reduce((s,p)=>s+((p.stock_store_1??0)+(p.stock_store_2??0))*p.cost_price,0);
  return <>
    <PageHeader title="Stok Semua Toko" description="Saldo stok real-time yang terpisah untuk setiap cabang." actions={<><a className="button secondary" href="/transfers"><ArrowRightLeft size={17}/> Transfer stok</a><a className="button primary" href="/stock-movements">+ Catat stok</a></>}/>
    <div className="mini-stats"><div><span>Total unit</span><strong>{totalUnits.toLocaleString("id-ID")}</strong></div><div><span>Nilai persediaan</span><strong>{formatCurrency(stockValue)}</strong></div><div><span>Hampir habis</span><strong>4 produk</strong></div><div><span>Stok kosong</span><strong>0 produk</strong></div></div>
    <div className="toolbar-card"><div className="search-box"><span>⌕</span><input placeholder="Cari produk atau SKU..."/></div><select className="select"><option>Semua kategori</option></select><select className="select"><option>Semua kondisi stok</option><option>Menipis</option><option>Habis</option></select></div>
    <div className="panel table-panel"><table><thead><tr><th>Produk</th><th>Minimum</th><th>Indotek Toko 1</th><th>Indotek Toko 2</th><th>Total</th><th>Kondisi</th></tr></thead><tbody>{demoProducts.map(p=>{
      const min=Math.min(p.stock_store_1??0,p.stock_store_2??0); const tone=min<=3?"danger":min<=p.minimum_stock?"warning":"success"; return <tr key={p.id}><td><div className="product-cell"><div className="product-thumb"><Boxes size={20}/></div><div><strong>{p.name}</strong><span>{p.sku}</span></div></div></td><td>{p.minimum_stock} {p.unit}</td><td><div className="stock-number"><strong>{p.stock_store_1}</strong><span>{p.unit}</span></div></td><td><div className="stock-number"><strong>{p.stock_store_2}</strong><span>{p.unit}</span></div></td><td><strong>{(p.stock_store_1??0)+(p.stock_store_2??0)}</strong></td><td><StatusBadge tone={tone}>{tone==="danger"?"Kritis":tone==="warning"?"Menipis":"Aman"}</StatusBadge></td></tr>})}</tbody></table></div>
  </>;
}
