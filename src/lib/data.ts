import { demoMovements, demoProducts } from "@/lib/demo-data";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export async function getProductsWithStocks(): Promise<Product[]> {
  if (isDemoMode || !hasSupabaseEnv) return demoProducts;

  const supabase = await createClient();
  const [{ data: catalog, error }, { data: financials }] = await Promise.all([
    supabase.from("inventory_overview").select("product_id,sku,barcode,name,unit,minimum_stock,selling_price,store_code,quantity_on_hand"),
    supabase.rpc("admin_product_financials"),
  ]);

  if (error || !catalog) return demoProducts;
  const financeRows = (financials ?? []) as unknown as Array<{
    product_id: string;
    cost_price: number | string | null;
  }>;
  const finance = new Map<string, number>(
    financeRows.map((row): [string, number] => [row.product_id, Number(row.cost_price ?? 0)]),
  );
  const grouped = new Map<string, Product>();

  for (const row of catalog) {
    const current: Product = grouped.get(row.product_id) ?? {
      id: row.product_id,
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      category: null,
      unit: row.unit,
      cost_price: finance.get(row.product_id) ?? 0,
      selling_price: Number(row.selling_price),
      minimum_stock: Number(row.minimum_stock),
      is_active: true,
      stock_store_1: 0,
      stock_store_2: 0,
    };
    if (row.store_code === "IDS-01") current.stock_store_1 = Number(row.quantity_on_hand);
    if (row.store_code === "IDS-02") current.stock_store_2 = Number(row.quantity_on_hand);
    grouped.set(row.product_id, current);
  }
  return [...grouped.values()];
}

export async function getStoreCatalog(storeId = "11111111-1111-1111-1111-111111111111"): Promise<Product[]> {
  const products = await getProductsWithStocks();
  return products.map((product) => ({
    ...product,
    stock_store_1: storeId === "11111111-1111-1111-1111-111111111111" ? product.stock_store_1 : product.stock_store_2,
  }));
}

export async function getRecentMovements() {
  if (isDemoMode || !hasSupabaseEnv) return demoMovements;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("id,created_at,quantity,movement_type,stores(name),products(name),profiles!stock_movements_created_by_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error || !data) return demoMovements;
  return data.map((row: any) => ({
    id: row.id,
    time: row.created_at,
    store: row.stores?.name ?? "Toko",
    product: row.products?.name ?? "Produk",
    type: String(row.movement_type).replaceAll("_", " "),
    quantity: Number(row.quantity),
    user: row.profiles?.full_name ?? "Pengguna",
  }));
}

export async function getDashboardSnapshot() {
  const products = await getProductsWithStocks();
  const movements = await getRecentMovements();
  if (isDemoMode || !hasSupabaseEnv) {
    return { products, movements, revenue: 4_350_000, transactions: 62, units: 97 };
  }

  const supabase = await createClient();
  const now = new Date();
  const jakartaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
  const start = `${jakartaDate}T00:00:00+07:00`;
  const { data: sales } = await supabase.from("sales").select("grand_total,sale_items(quantity)").gte("completed_at", start).eq("status", "completed");
  const revenue = (sales ?? []).reduce((sum: number, sale: any) => sum + Number(sale.grand_total), 0);
  const units = (sales ?? []).reduce((sum: number, sale: any) => sum + (sale.sale_items ?? []).reduce((a: number, i: any) => a + Number(i.quantity), 0), 0);
  return { products, movements, revenue, transactions: sales?.length ?? 0, units };
}
