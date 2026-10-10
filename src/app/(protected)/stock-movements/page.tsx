import { StockMovementWorkspace } from "@/components/stock-movement-workspace";
import { PageHeader } from "@/components/ui";
import { getCurrentProfile, getProductsWithStocks, getRecentMovements, getStores } from "@/lib/data";

export const metadata = { title: "Stok Masuk dan Keluar" };

export default async function StockMovementsPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const params = await searchParams;
  const [movements, products, stores, profile] = await Promise.all([getRecentMovements(params.store, 50), getProductsWithStocks(), getStores(), getCurrentProfile()]);
  const canCorrect = ["owner", "admin", "manager"].includes(profile.role);
  return <><PageHeader title="Stok Masuk & Keluar" description="Pencarian cepat produk, riwayat langsung, dan ralat stok dengan jejak audit permanen."/><StockMovementWorkspace initialMovements={movements} products={products} stores={stores} defaultStoreId={params.store} canCorrect={canCorrect}/></>;
}
