import { demoMovements, demoProducts, demoProfile, demoSettings, demoStores } from "@/lib/demo-data";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FinancialReport, Movement, Product, SaleSummary, Store, SystemSettings, UserProfile } from "@/lib/types";

const demo = isDemoMode || !hasSupabaseEnv;

export async function getCurrentProfile(): Promise<UserProfile> {
  if (demo) return demoProfile;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,phone,role,primary_store_id,is_active").eq("id", user.id).single(),
    supabase.from("user_store_access").select("store_id").eq("user_id", user.id),
  ]);
  if (!profile) {
    return {
      id: user.id,
      full_name: String(user.user_metadata?.full_name ?? user.email ?? "Pengguna"),
      email: user.email ?? null,
      phone: null,
      role: "cashier",
      primary_store_id: null,
      is_active: true,
      store_ids: [],
    };
  }
  return { ...profile, store_ids: (access ?? []).map((row: any) => String(row.store_id)) } as UserProfile;
}

export async function getStores(includeInactive = false): Promise<Store[]> {
  if (demo) return includeInactive ? demoStores : demoStores.filter((store) => store.is_active !== false);
  const supabase = await createClient();
  let query = supabase.from("stores").select("id,code,name,address,phone,manager_name,is_active").order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as Store[];
}

export async function getSystemSettings(): Promise<SystemSettings> {
  if (demo) return demoSettings;
  const supabase = await createClient();
  const { data } = await supabase.from("system_settings").select("company_name,company_tagline,phone,address,receipt_footer").eq("id", 1).maybeSingle();
  return data ? { ...demoSettings, ...data } : demoSettings;
}

export async function getAppContext() {
  const [profile, stores, settings] = await Promise.all([getCurrentProfile(), getStores(), getSystemSettings()]);
  return { profile, stores, settings };
}

export async function getProductsWithStocks(storeId?: string | null): Promise<Product[]> {
  if (demo) {
    return demoProducts.map((product) => ({
      ...product,
      selected_stock: storeId ? product.stocks[storeId]?.quantity_available ?? 0 : undefined,
    }));
  }

  const supabase = await createClient();
  const [{ data: catalog, error }, { data: financials }, { data: productRows }] = await Promise.all([
    supabase.from("inventory_overview").select("product_id,sku,barcode,name,unit,minimum_stock,selling_price,store_id,store_code,store_name,quantity_on_hand,quantity_reserved,quantity_available,stock_status"),
    supabase.rpc("admin_product_financials"),
    supabase.from("products").select("id,category_id,brand,is_active,categories(name)").eq("is_active", true),
  ]);

  if (error || !catalog) return [];
  const finance = new Map<string, number>();
  for (const row of (financials ?? []) as any[]) finance.set(String(row.product_id), Number(row.cost_price ?? 0));
  const meta = new Map<string, any>();
  for (const row of (productRows ?? []) as any[]) meta.set(String(row.id), row);
  const grouped = new Map<string, Product>();

  for (const row of catalog as any[]) {
    const id = String(row.product_id);
    const productMeta = meta.get(id);
    const current: Product = grouped.get(id) ?? {
      id,
      sku: String(row.sku),
      barcode: row.barcode ? String(row.barcode) : null,
      name: String(row.name),
      category: productMeta?.categories?.name ?? null,
      category_id: productMeta?.category_id ?? null,
      brand: productMeta?.brand ?? null,
      unit: String(row.unit),
      cost_price: finance.get(id) ?? 0,
      selling_price: Number(row.selling_price ?? 0),
      minimum_stock: Number(row.minimum_stock ?? 0),
      is_active: productMeta?.is_active ?? true,
      stocks: {},
      total_stock: 0,
    };
    const rowStoreId = String(row.store_id);
    current.stocks[rowStoreId] = {
      store_id: rowStoreId,
      store_code: String(row.store_code),
      store_name: String(row.store_name),
      quantity_on_hand: Number(row.quantity_on_hand ?? 0),
      quantity_reserved: Number(row.quantity_reserved ?? 0),
      quantity_available: Number(row.quantity_available ?? 0),
      stock_status: row.stock_status as "safe" | "low" | "out",
    };
    if (!storeId || storeId === rowStoreId) current.total_stock += Number(row.quantity_on_hand ?? 0);
    if (storeId === rowStoreId) current.selected_stock = Number(row.quantity_available ?? 0);
    grouped.set(id, current);
  }
  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function getStoreCatalog(storeId: string): Promise<Product[]> {
  const products = await getProductsWithStocks(storeId);
  return products.map((product) => ({ ...product, selected_stock: product.stocks[storeId]?.quantity_available ?? 0 }));
}

export async function getRecentMovements(storeId?: string | null, limit = 30): Promise<Movement[]> {
  if (demo) return storeId ? demoMovements.filter((row) => demoStores.find((store) => store.id === storeId)?.name === row.store) : demoMovements;
  const supabase = await createClient();
  let query = supabase
    .from("stock_movements")
    .select("id,created_at,quantity,movement_type,reason,stores(name),products(name),profiles!stock_movements_created_by_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (storeId) query = query.eq("store_id", storeId);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    time: String(row.created_at),
    store: row.stores?.name ?? "Toko",
    product: row.products?.name ?? "Produk",
    type: String(row.movement_type).replaceAll("_", " "),
    quantity: Number(row.quantity),
    user: row.profiles?.full_name ?? "Pengguna",
    reason: row.reason,
  }));
}

export async function getSales(storeId?: string | null, limit = 100): Promise<SaleSummary[]> {
  if (demo) return [
    { id: "sale-1", invoice_number: "IDS-20260731-000001", store_name: demoStores[0].name, cashier_name: "Rina Kasir", grand_total: 255000, status: "completed", completed_at: "2026-07-31T13:20:00+07:00", customer_name: "Pelanggan Umum" },
    { id: "sale-2", invoice_number: "IDS-20260731-000002", store_name: demoStores[1].name, cashier_name: "Dedi Kasir", grand_total: 155000, status: "completed", completed_at: "2026-07-31T14:10:00+07:00" },
  ];
  const supabase = await createClient();
  let query = supabase.from("sales").select("id,invoice_number,grand_total,status,completed_at,customer_name,stores(name),profiles!sales_cashier_id_fkey(full_name)").order("completed_at", { ascending: false }).limit(limit);
  if (storeId) query = query.eq("store_id", storeId);
  const { data } = await query;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    invoice_number: row.invoice_number,
    store_name: row.stores?.name ?? "Toko",
    cashier_name: row.profiles?.full_name ?? "Kasir",
    grand_total: Number(row.grand_total),
    status: row.status,
    completed_at: row.completed_at,
    customer_name: row.customer_name,
  }));
}

export async function getDashboardSnapshot(storeId?: string | null) {
  const [products, movements, stores] = await Promise.all([
    getProductsWithStocks(storeId),
    getRecentMovements(storeId, 8),
    getStores(),
  ]);
  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (6 - index));
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(date);
  });
  if (demo) {
    const scoped = storeId ? demoProducts.map((p) => ({ ...p, total_stock: p.stocks[storeId]?.quantity_on_hand ?? 0 })) : demoProducts;
    const storeStats = stores.map((store, index) => ({ store, revenue: [2_500_000, 1_850_000, 1_125_000][index] ?? 0, transactions: [35, 27, 16][index] ?? 0, units: [58, 39, 21][index] ?? 0 }));
    const dailyTrend = dayKeys.map((date, index) => ({ date, revenue: [1_200_000, 1_750_000, 1_450_000, 2_350_000, 1_900_000, 2_800_000, 4_350_000][index] }));
    return { products: scoped, movements, stores, storeStats, dailyTrend, revenue: storeId ? storeStats.find((row) => row.store.id === storeId)?.revenue ?? 0 : storeStats.reduce((sum, row) => sum + row.revenue, 0), transactions: storeId ? storeStats.find((row) => row.store.id === storeId)?.transactions ?? 0 : storeStats.reduce((sum, row) => sum + row.transactions, 0), units: storeId ? storeStats.find((row) => row.store.id === storeId)?.units ?? 0 : storeStats.reduce((sum, row) => sum + row.units, 0) };
  }

  const supabase = await createClient();
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const trendStart = `${dayKeys[0]}T00:00:00+07:00`;
  let salesQuery = supabase.from("sales").select("store_id,grand_total,completed_at,sale_items(quantity)").gte("completed_at", trendStart).in("status", ["completed", "partially_refunded"]);
  if (storeId) salesQuery = salesQuery.eq("store_id", storeId);
  const { data: sales } = await salesQuery;
  const todaySales = (sales ?? []).filter((sale: any) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(sale.completed_at)) === todayKey);
  const revenue = todaySales.reduce((sum: number, sale: any) => sum + Number(sale.grand_total), 0);
  const units = todaySales.reduce((sum: number, sale: any) => sum + (sale.sale_items ?? []).reduce((itemSum: number, item: any) => itemSum + Number(item.quantity), 0), 0);
  const storeStats = stores.map((store) => {
    const rows = todaySales.filter((sale: any) => sale.store_id === store.id);
    return {
      store,
      revenue: rows.reduce((sum: number, sale: any) => sum + Number(sale.grand_total), 0),
      transactions: rows.length,
      units: rows.reduce((sum: number, sale: any) => sum + (sale.sale_items ?? []).reduce((itemSum: number, item: any) => itemSum + Number(item.quantity), 0), 0),
    };
  });
  const dailyTrend = dayKeys.map((date) => ({
    date,
    revenue: (sales ?? []).filter((sale: any) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(sale.completed_at)) === date).reduce((sum: number, sale: any) => sum + Number(sale.grand_total), 0),
  }));
  return { products, movements, stores, storeStats, dailyTrend, revenue, transactions: todaySales.length, units };
}

export async function getFinancialReport(storeId: string | null | undefined, from: string, to: string): Promise<FinancialReport> {
  if (demo) return { gross_sales: 54_500_000, refunds: 850_000, net_sales: 53_650_000, cogs: 37_400_000, gross_profit: 16_250_000, transactions: 642, net_units: 913, inventory_value: 28_750_000 };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("financial_report", {
    p_store_id: storeId || null,
    p_from: `${from}T00:00:00+07:00`,
    p_to: `${to}T23:59:59.999+07:00`,
  });
  if (error || !data?.[0]) return { gross_sales: 0, refunds: 0, net_sales: 0, cogs: 0, gross_profit: 0, transactions: 0, net_units: 0, inventory_value: 0 };
  const row = data[0] as any;
  return {
    gross_sales: Number(row.gross_sales ?? 0), refunds: Number(row.refunds ?? 0), net_sales: Number(row.net_sales ?? 0),
    cogs: Number(row.cogs ?? 0), gross_profit: Number(row.gross_profit ?? 0), transactions: Number(row.transactions ?? 0), net_units: Number(row.net_units ?? 0), inventory_value: Number(row.inventory_value ?? 0),
  };
}

export async function getSalesForPeriod(storeId: string | null | undefined, from: string, to: string): Promise<SaleSummary[]> {
  if (demo) return getSales(storeId, 500);
  const supabase = await createClient();
  let query = supabase.from("sales").select("id,invoice_number,grand_total,status,completed_at,customer_name,stores(name),profiles!sales_cashier_id_fkey(full_name)")
    .gte("completed_at", `${from}T00:00:00+07:00`).lte("completed_at", `${to}T23:59:59.999+07:00`).order("completed_at", { ascending: false }).limit(5000);
  if (storeId) query = query.eq("store_id", storeId);
  const { data } = await query;
  return (data ?? []).map((row: any) => ({ id: row.id, invoice_number: row.invoice_number, store_name: row.stores?.name ?? "Toko", cashier_name: row.profiles?.full_name ?? "Kasir", grand_total: Number(row.grand_total), status: row.status, completed_at: row.completed_at, customer_name: row.customer_name }));
}

export async function getSuppliers() {
  if (demo) return [{ id: "sup-1", name: "PT Sumber Teknologi", contact_name: "Bapak Arif", phone: "0812-1111-2222", email: "sales@sumber.test", is_active: true }];
  const supabase = await createClient();
  const { data } = await supabase.from("suppliers").select("*").order("name");
  return data ?? [];
}

export async function getUsers(): Promise<UserProfile[]> {
  if (demo) return [demoProfile, { id: "u2", full_name: "Rina Kasir", email: "rina@example.com", phone: null, role: "cashier", primary_store_id: demoStores[0].id, is_active: true, store_ids: [demoStores[0].id] } as UserProfile];
  const supabase = await createClient();
  const [{ data: profiles }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,phone,role,primary_store_id,is_active").order("full_name"),
    supabase.from("user_store_access").select("user_id,store_id"),
  ]);
  return (profiles ?? []).map((profile: any) => ({ ...profile, store_ids: (access ?? []).filter((row: any) => row.user_id === profile.id).map((row: any) => row.store_id) })) as UserProfile[];
}

export async function getShifts(storeId?: string | null) {
  if (demo) return [{ id: "shift-1", store_id: demoStores[0].id, cashier_id: demoProfile.id, store_name: demoStores[0].name, cashier_name: demoProfile.full_name, opening_cash: 500000, status: "open", opened_at: "2026-07-31T08:00:00+07:00", expected_cash: null, actual_cash: null, cash_difference: null }];
  const supabase = await createClient();
  let query = supabase.from("cashier_shifts").select("id,store_id,cashier_id,opening_cash,expected_cash,actual_cash,cash_difference,status,opened_at,closed_at,stores(name),profiles!cashier_shifts_cashier_id_fkey(full_name)").order("opened_at", { ascending: false }).limit(100);
  if (storeId) query = query.eq("store_id", storeId);
  const { data } = await query;
  return (data ?? []).map((row: any) => ({ ...row, store_name: row.stores?.name, cashier_name: row.profiles?.full_name }));
}

export async function getTransfers(storeId?: string | null) {
  if (demo) return [{ id: "tr-1", transfer_number: "TRF-20260731-001", source_name: demoStores[0].name, destination_name: demoStores[1].name, status: "in_transit", requested_at: "2026-07-31T10:00:00+07:00", notes: "Restok cabang timur" }];
  const supabase = await createClient();
  let query = supabase.from("stock_transfers").select("id,transfer_number,status,requested_at,notes,source_store_id,destination_store_id,source:stores!stock_transfers_source_store_id_fkey(name),destination:stores!stock_transfers_destination_store_id_fkey(name)").order("requested_at", { ascending: false });
  if (storeId) query = query.or(`source_store_id.eq.${storeId},destination_store_id.eq.${storeId}`);
  const { data } = await query;
  return (data ?? []).map((row: any) => ({ ...row, source_name: row.source?.name, destination_name: row.destination?.name }));
}

export async function getPurchases(storeId?: string | null) {
  if (demo) return [{ id: "po-1", po_number: "PO-20260731-001", supplier_name: "PT Sumber Teknologi", store_name: demoStores[0].name, status: "pending", total: 3250000, created_at: "2026-07-31T09:00:00+07:00" }];
  const supabase = await createClient();
  let query = supabase.from("purchase_orders").select("id,po_number,status,total,created_at,destination_store_id,suppliers(name),stores(name)").order("created_at", { ascending: false });
  if (storeId) query = query.eq("destination_store_id", storeId);
  const { data } = await query;
  return (data ?? []).map((row: any) => ({ ...row, supplier_name: row.suppliers?.name, store_name: row.stores?.name }));
}

export async function getStocktakes(storeId?: string | null) {
  if (demo) return [{ id: "st-1", stocktake_number: "SO-20260731-001", store_id: demoStores[0].id, store_name: demoStores[0].name, status: "draft", created_at: "2026-07-31T18:00:00+07:00" }];
  const supabase = await createClient();
  let query = supabase.from("stocktakes").select("id,stocktake_number,status,created_at,store_id,stores(name)").order("created_at", { ascending: false });
  if (storeId) query = query.eq("store_id", storeId);
  const { data } = await query;
  return (data ?? []).map((row: any) => ({ ...row, store_name: row.stores?.name }));
}

export async function getReturns(storeId?: string | null) {
  if (demo) return [{ id: "ret-1", return_number: "RET-20260731-001", store_name: demoStores[0].name, return_type: "customer", resolution: "refund", status: "completed", refund_amount: 85000, created_at: "2026-07-31T15:30:00+07:00" }];
  const supabase = await createClient();
  let query = supabase.from("returns").select("id,return_number,return_type,resolution,status,refund_amount,created_at,store_id,stores(name)").order("created_at", { ascending: false });
  if (storeId) query = query.eq("store_id", storeId);
  const { data } = await query;
  return (data ?? []).map((row: any) => ({ ...row, store_name: row.stores?.name }));
}

export async function getAuditLogs(limit = 100) {
  if (demo) return [{ id: 1, created_at: "2026-07-31T16:00:00+07:00", action: "UPDATE", table_name: "products", record_id: "p1", user_name: "Owner Indotek Sukses", store_name: null }];
  const supabase = await createClient();
  const { data } = await supabase.from("audit_logs").select("id,created_at,action,table_name,record_id,profiles(full_name),stores(name)").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map((row: any) => ({ ...row, user_name: row.profiles?.full_name, store_name: row.stores?.name }));
}

export async function getCategories() {
  if (demo) return [{ id: "cat-1", name: "Aksesori Komputer" }, { id: "cat-2", name: "Kabel" }, { id: "cat-3", name: "Jaringan" }, { id: "cat-4", name: "Power" }];
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id,name").eq("is_active", true).order("name");
  return data ?? [];
}
