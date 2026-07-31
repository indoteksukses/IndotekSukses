import { PageHeader } from "@/components/ui";
import { ProductModal } from "@/components/product-modal";
import { CategoryManager } from "@/components/category-manager";
import { ProductTable } from "@/components/product-table";
import { getCategories, getCurrentProfile, getProductsWithStocks } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Master Produk" };

export default async function ProductsPage() {
  const [products, categories, allCategories, profile] = await Promise.all([getProductsWithStocks(), getCategories(), getCategories(true), getCurrentProfile()]);
  const categoryRows = categories as Array<{ id: string; name: string; description?: string | null; is_active?: boolean }>;
  const allCategoryRows = allCategories as Array<{ id: string; name: string; description?: string | null; is_active?: boolean }>;
  const canEdit = profile.role === "owner" || profile.role === "admin";
  return <>
    <PageHeader title="Master Produk" description="Satu data produk dan harga pusat untuk seluruh cabang." actions={canEdit ? <><CategoryManager categories={allCategoryRows}/><ProductModal categories={categoryRows}/></> : undefined}/>
    <div className="mini-stats"><div><span>Produk aktif</span><strong>{products.filter((product) => product.is_active).length}</strong></div><div><span>Total stok</span><strong>{products.reduce((sum, product) => sum + product.total_stock, 0).toLocaleString("id-ID")}</strong></div><div><span>Nilai persediaan</span><strong>{canEdit ? formatCurrency(products.reduce((sum, product) => sum + product.total_stock * product.cost_price, 0)) : "Terlindungi"}</strong></div><div><span>Kategori</span><strong>{categories.length}</strong></div></div>
    <ProductTable products={products} categories={categoryRows} canEdit={canEdit}/>
  </>;
}
