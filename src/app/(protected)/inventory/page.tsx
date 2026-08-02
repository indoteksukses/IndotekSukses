import { ArrowRightLeft } from "lucide-react";
import { InventoryTable } from "@/components/inventory-table";
import { PageHeader } from "@/components/ui";
import { getCurrentProfile, getNetworkInventoryStores, getProductsWithNetworkStocks } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Stok Semua Toko" };

export default async function InventoryPage() {
  const [stores, products, profile] = await Promise.all([getNetworkInventoryStores(), getProductsWithNetworkStocks(), getCurrentProfile()]);
  const canViewCosts = profile.role === "owner" || profile.role === "admin";
  const ownStoreIds = profile.role === "owner" || profile.role === "admin" ? stores.map((store) => store.id) : [...new Set([...(profile.store_ids ?? []), ...(profile.primary_store_id ? [profile.primary_store_id] : [])])];
  const editableStoreIds = ["owner", "admin"].includes(profile.role) ? stores.map((store) => store.id) : ["manager", "warehouse"].includes(profile.role) ? ownStoreIds : [];
  const requestDestinationStoreIds = ["cashier", "manager", "warehouse"].includes(profile.role) ? ownStoreIds : [];
  const totalUnits = products.reduce((sum, product) => sum + stores.reduce((stock, store) => stock + (product.stocks[store.id]?.quantity_on_hand ?? 0), 0), 0);
  const stockValue = products.reduce((sum, product) => sum + stores.reduce((value, store) => value + (product.stocks[store.id]?.quantity_on_hand ?? 0) * product.cost_price, 0), 0);
  const lowCount = products.filter((product) => stores.some((store) => { const quantity = product.stocks[store.id]?.quantity_available ?? 0; return quantity > 0 && quantity <= product.minimum_stock; })).length;
  const outCount = products.filter((product) => stores.some((store) => (product.stocks[store.id]?.quantity_available ?? 0) === 0)).length;
  return <>
    <PageHeader title="Stok Semua Toko" description="Stok seluruh jaringan dapat dilihat untuk membantu merekomendasikan cabang dan mengajukan permintaan transfer. Perubahan stok tetap dibatasi sesuai hak akses cabang." actions={profile.role !== "cashier" ? <><a className="button secondary" href="/transfers"><ArrowRightLeft size={17}/> Transfer stok</a><a className="button primary" href="/stock-movements">+ Catat stok</a></> : undefined}/>
    <div className="mini-stats"><div><span>Total unit jaringan</span><strong>{totalUnits.toLocaleString("id-ID")}</strong></div><div><span>Nilai persediaan</span><strong>{canViewCosts ? formatCurrency(stockValue) : "Terlindungi"}</strong></div><div><span>Hampir habis</span><strong>{lowCount} produk</strong></div><div><span>Stok kosong</span><strong>{outCount} produk</strong></div></div>
    <InventoryTable products={products} stores={stores} editableStoreIds={editableStoreIds} requestDestinationStoreIds={requestDestinationStoreIds}/>
  </>;
}
