import { ArrowRightLeft } from "lucide-react";
import { InventoryTable } from "@/components/inventory-table";
import { PageHeader } from "@/components/ui";
import { getCurrentProfile, getProductsWithStocks, getStores } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Stok Semua Toko" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const params = await searchParams;
  const [products, allStores, profile] = await Promise.all([getProductsWithStocks(params.store), getStores(), getCurrentProfile()]);
  const stores = params.store ? allStores.filter((store) => store.id === params.store) : allStores;
  const canViewCosts = profile.role === "owner" || profile.role === "admin";
  const totalUnits = products.reduce((sum, product) => sum + stores.reduce((stock, store) => stock + (product.stocks[store.id]?.quantity_on_hand ?? 0), 0), 0);
  const stockValue = products.reduce((sum, product) => sum + stores.reduce((value, store) => value + (product.stocks[store.id]?.quantity_on_hand ?? 0) * product.cost_price, 0), 0);
  const lowCount = products.filter((product) => stores.some((store) => { const quantity = product.stocks[store.id]?.quantity_available ?? 0; return quantity > 0 && quantity <= product.minimum_stock; })).length;
  const outCount = products.filter((product) => stores.some((store) => (product.stocks[store.id]?.quantity_available ?? 0) === 0)).length;
  return <>
    <PageHeader title="Stok Semua Toko" description={params.store ? `Saldo stok cabang ${stores[0]?.name ?? "terpilih"}.` : "Saldo stok real-time untuk seluruh cabang yang aktif."} actions={<><a className="button secondary" href="/transfers"><ArrowRightLeft size={17}/> Transfer stok</a><a className="button primary" href="/stock-movements">+ Catat stok</a></>}/>
    <div className="mini-stats"><div><span>Total unit</span><strong>{totalUnits.toLocaleString("id-ID")}</strong></div><div><span>Nilai persediaan</span><strong>{canViewCosts ? formatCurrency(stockValue) : "Terlindungi"}</strong></div><div><span>Hampir habis</span><strong>{lowCount} produk</strong></div><div><span>Stok kosong</span><strong>{outCount} produk</strong></div></div>
    <InventoryTable products={products} stores={stores}/>
  </>;
}
