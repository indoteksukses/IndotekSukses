import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { ProductModal } from "@/components/product-modal";
import { ProductVisualManager } from "@/components/product-visual-manager";
import { CategoryManager } from "@/components/category-manager";
import { ProductTable } from "@/components/product-table";
import { getCategories, getCurrentProfile, getProductsWithStocks, getProductVisuals, getStores } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Master Produk" };
export const dynamic = "force-dynamic";

function ProductsSkeleton() {
  return (
    <>
      <div className="mini-stats">
        <div><span>Produk aktif</span><strong>...</strong></div>
        <div><span>Total stok</span><strong>...</strong></div>
        <div><span>Nilai persediaan</span><strong>...</strong></div>
        <div><span>Visual produk</span><strong>...</strong></div>
      </div>
      <div className="toolbar-card" style={{ height: "56px", opacity: 0.6 }} />
      <div className="panel table-panel" style={{ minHeight: "260px", opacity: 0.6 }} />
    </>
  );
}

async function ProductsContent() {
  const [products, allCategories, allVisuals, profile, stores] = await Promise.all([
    getProductsWithStocks(null, true),
    getCategories(true),
    getProductVisuals(true),
    getCurrentProfile(),
    getStores(),
  ]);
  const allCategoryRows = allCategories as Array<{ id: string; name: string; description?: string | null; is_active?: boolean }>;
  const categoryRows = allCategoryRows.filter((category) => category.is_active !== false);
  const visuals = allVisuals.filter((visual) => visual.is_active);
  const canEdit = profile.role === "owner" || profile.role === "admin";

  return (
    <>
      <div className="mini-stats">
        <div><span>Produk aktif</span><strong>{products.filter((product) => product.is_active).length.toLocaleString("id-ID")}</strong></div>
        <div><span>Total stok</span><strong>{products.reduce((sum, product) => sum + product.total_stock, 0).toLocaleString("id-ID")}</strong></div>
        <div><span>Nilai persediaan</span><strong>{canEdit ? formatCurrency(products.reduce((sum, product) => sum + ((product.variants?.length ? product.variants.reduce((variantSum, variant) => variantSum + variant.total_stock * variant.cost_price, 0) : product.total_stock * product.cost_price)), 0)) : "Terlindungi"}</strong></div>
        <div><span>Visual produk</span><strong>{visuals.length}</strong></div>
      </div>
      <ProductTable products={products} categories={categoryRows} visuals={visuals} stores={stores} canEdit={canEdit} />
    </>
  );
}

export default async function ProductsPage() {
  const [allCategories, allVisuals, profile, stores] = await Promise.all([
    getCategories(true),
    getProductVisuals(true),
    getCurrentProfile(),
    getStores(),
  ]);
  const allCategoryRows = allCategories as Array<{ id: string; name: string; description?: string | null; is_active?: boolean }>;
  const categoryRows = allCategoryRows.filter((category) => category.is_active !== false);
  const visuals = allVisuals.filter((visual) => visual.is_active);
  const canEdit = profile.role === "owner" || profile.role === "admin";

  return (
    <>
      <PageHeader
        title="Master Produk"
        description="Kelola produk tunggal atau produk bervarian dengan harga modal dan harga jual masing-masing."
        actions={canEdit ? (
          <div className="product-master-actions">
            <CategoryManager categories={allCategoryRows} />
            <ProductVisualManager visuals={allVisuals} />
            <ProductModal categories={categoryRows} visuals={visuals} stores={stores} />
          </div>
        ) : undefined}
      />
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsContent />
      </Suspense>
    </>
  );
}
