import { Boxes, MoreHorizontal } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { ProductModal } from "@/components/product-modal";
import { getProductsWithStocks } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Master Produk" };

export default async function ProductsPage() {
  const demoProducts = await getProductsWithStocks();
  return <>
    <PageHeader title="Master Produk" description="Satu data produk dan harga pusat untuk seluruh cabang." actions={<ProductModal/>}/>
    <div className="toolbar-card"><div className="search-box"><span>⌕</span><input placeholder="Cari nama, SKU, atau barcode..."/></div><select className="select"><option>Semua kategori</option><option>Aksesori Komputer</option><option>Kabel</option></select><select className="select"><option>Produk aktif</option><option>Produk nonaktif</option></select><button className="button secondary">Ekspor produk</button></div>
    <div className="panel table-panel"><table><thead><tr><th>Produk</th><th>SKU / Barcode</th><th>Kategori</th><th>Modal</th><th>Harga jual</th><th>Stok total</th><th>Status</th><th/></tr></thead><tbody>
      {demoProducts.map((p)=><tr key={p.id}><td><div className="product-cell"><div className="product-thumb"><Boxes size={20}/></div><div><strong>{p.name}</strong><span>Satuan: {p.unit}</span></div></div></td><td><strong>{p.sku}</strong><small>{p.barcode}</small></td><td>{p.category}</td><td className="restricted-value">{formatCurrency(p.cost_price)}</td><td><strong>{formatCurrency(p.selling_price)}</strong></td><td><strong>{(p.stock_store_1 ?? 0)+(p.stock_store_2 ?? 0)}</strong> unit</td><td><StatusBadge tone="success">Aktif</StatusBadge></td><td><button className="icon-button"><MoreHorizontal size={19}/></button></td></tr>)}
    </tbody></table></div>
  </>;
}
