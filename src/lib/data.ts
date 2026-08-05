import { demoMovements, demoProducts, demoProfile, demoSettings, demoStores } from "@/lib/demo-data";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/pagination";
import type { FinancialReport, Movement, Product, ProductVisual, SaleDetail, SaleSummary, Store, SystemSettings, UserProfile } from "@/lib/types";

const demo = isDemoMode || !hasSupabaseEnv;

export async function getCurrentProfile(): Promise<UserProfile> {
  if (demo) return demoProfile;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,username,phone,role,primary_store_id,is_active,avatar_key,deleted_at").eq("id", user.id).single(),
    supabase.from("user_store_access").select("store_id").eq("user_id", user.id),
  ]);
  if (!profile) {
    return {
      id: user.id,
      full_name: String(user.user_metadata?.full_name ?? user.email ?? "Pengguna"),
      email: user.email ?? null,
      username: user.email ? user.email.split("@")[0] : null,
      phone: null,
      role: "cashier",
      primary_store_id: null,
      is_active: true,
      avatar_key: "ocean",
      store_ids: [],
    };
  }
  return { ...profile, store_ids: (access ?? []).map((row: any) => String(row.store_id)) } as UserProfile;
}

function permittedStoreIds(profile: UserProfile) {
  if (profile.role === "owner" || profile.role === "admin") return null;
  const ids = new Set((profile.store_ids ?? []).filter(Boolean));
  if (profile.primary_store_id) ids.add(profile.primary_store_id);
  return ids;
}

async function loadProductMetadata(sessionClient?: any, includeVariantCosts = false, includeInactive = false) {
  let reader = sessionClient;
  try { reader = createAdminClient(); } catch { /* Fall back to the authenticated server client. */ }
  if (!reader) reader = await createClient();

  const [productsResult, categoriesResult, visualsResult, salesResult, variantsResult, variantInventoryResult] = await Promise.all([
    fetchAllRows<any>((from, to) => {
      let query = reader.from("products")
        .select("id,sku,barcode,name,category_id,brand,unit,cost_price,selling_price,minimum_stock,image_url,visual_id,is_active,sales_scope")
        .order("id")
        .range(from, to);
      if (!includeInactive) query = query.eq("is_active", true);
      return query;
    }),
    fetchAllRows<any>((from, to) => reader.from("categories").select("id,name,is_active").order("id").range(from, to)),
    fetchAllRows<any>((from, to) => reader.from("product_visuals").select("id,name,code,is_builtin,is_active").order("id").range(from, to)),
    fetchAllRows<any>((from, to) => reader.from("product_store_sales").select("product_id,store_id").order("product_id").order("store_id").range(from, to)),
    fetchAllRows<any>((from, to) => reader.from("product_variants")
      .select("id,product_id,name,sku,barcode,cost_price,selling_price,is_active,sort_order")
      .is("archived_at", null)
      .order("product_id")
      .order("sort_order")
      .order("id")
      .range(from, to)),
    fetchAllRows<any>((from, to) => reader.from("product_variant_inventory")
      .select("variant_id,store_id,quantity_on_hand,quantity_reserved,quantity_damaged,quantity_in_transit")
      .order("variant_id")
      .order("store_id")
      .range(from, to)),
  ]);

  const metadataError = [productsResult, categoriesResult, visualsResult, salesResult, variantsResult, variantInventoryResult]
    .map((result) => result.error?.message)
    .find(Boolean);
  if (metadataError) throw new Error(`Gagal memuat katalog lengkap: ${metadataError}`);

  const categories = new Map<string, any>();
  for (const row of (categoriesResult.data ?? []) as any[]) categories.set(String(row.id), row);
  const visuals = new Map<string, any>();
  for (const row of (visualsResult.data ?? []) as any[]) visuals.set(String(row.id), row);
  const salesByProduct = new Map<string, string[]>();
  for (const row of (salesResult.data ?? []) as any[]) {
    const productId = String(row.product_id);
    salesByProduct.set(productId, [...(salesByProduct.get(productId) ?? []), String(row.store_id)]);
  }

  const stockByVariant = new Map<string, Map<string, any>>();
  for (const row of (variantInventoryResult.data ?? []) as any[]) {
    const variantId = String(row.variant_id);
    const storeId = String(row.store_id);
    const storeRows = stockByVariant.get(variantId) ?? new Map<string, any>();
    storeRows.set(storeId, {
      quantity_on_hand: Number(row.quantity_on_hand ?? 0),
      quantity_reserved: Number(row.quantity_reserved ?? 0),
      quantity_available: Math.max(Number(row.quantity_on_hand ?? 0) - Number(row.quantity_reserved ?? 0), 0),
      quantity_damaged: Number(row.quantity_damaged ?? 0),
      quantity_in_transit: Number(row.quantity_in_transit ?? 0),
    });
    stockByVariant.set(variantId, storeRows);
  }

  const variantsByProduct = new Map<string, any[]>();
  for (const row of (variantsResult.data ?? []) as any[]) {
    const productId = String(row.product_id);
    const id = String(row.id);
    variantsByProduct.set(productId, [...(variantsByProduct.get(productId) ?? []), {
      id,
      product_id: productId,
      name: String(row.name),
      sku: row.sku ? String(row.sku) : null,
      barcode: row.barcode ? String(row.barcode) : null,
      cost_price: includeVariantCosts ? Number(row.cost_price ?? 0) : 0,
      selling_price: Number(row.selling_price ?? 0),
      is_active: Boolean(row.is_active),
      sort_order: Number(row.sort_order ?? 0),
      stock_rows: stockByVariant.get(id) ?? new Map<string, any>(),
      stocks: {},
      total_stock: 0,
    }]);
  }

  const metadata = new Map<string, any>();
  for (const row of (productsResult.data ?? []) as any[]) {
    const category = row.category_id ? categories.get(String(row.category_id)) : null;
    const visual = row.visual_id ? visuals.get(String(row.visual_id)) : null;
    metadata.set(String(row.id), {
      ...row,
      id: String(row.id),
      sku: String(row.sku),
      barcode: row.barcode ? String(row.barcode) : null,
      name: String(row.name),
      unit: String(row.unit),
      cost_price: includeVariantCosts ? Number(row.cost_price ?? 0) : 0,
      selling_price: Number(row.selling_price ?? 0),
      minimum_stock: Number(row.minimum_stock ?? 0),
      category_name: category?.name ?? null,
      visual: visual ? {
        id: String(visual.id),
        name: String(visual.name),
        code: visual.code,
        is_builtin: Boolean(visual.is_builtin),
        is_active: Boolean(visual.is_active),
      } : null,
      sales_store_ids: salesByProduct.get(String(row.id)) ?? [],
      variants: variantsByProduct.get(String(row.id)) ?? [],
    });
  }
  return metadata;
}

export async function getStores(includeInactive = false): Promise<Store[]> {
  if (demo) {
    const rows = includeInactive ? demoStores : demoStores.filter((store) => store.is_active !== false);
    const allowed = permittedStoreIds(demoProfile);
    return allowed ? rows.filter((store) => allowed.has(store.id)) : rows;
  }
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  let query = supabase.from("stores").select("id,code,name,address,phone,manager_name,image_url,is_active").order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return [];
  const rows = (data ?? []) as Store[];
  const allowed = permittedStoreIds(profile);
  return allowed ? rows.filter((store) => allowed.has(store.id)) : rows;
}

export async function getNetworkInventoryStores(): Promise<Store[]> {
  if (demo) return demoStores.filter((store) => store.is_active !== false);
  const supabase = await createClient();
  const { data, error } = await fetchAllRows<any>((from, to) => supabase
    .rpc("inventory_network_stores")
    .order("name")
    .range(from, to));
  if (error) return [];
  return (data ?? []).map((row: any) => ({
    id: String(row.id), code: String(row.code), name: String(row.name),
    address: row.address ?? null, phone: row.phone ?? null,
    manager_name: row.manager_name ?? null, image_url: row.image_url ?? null,
    is_active: Boolean(row.is_active),
  })) as Store[];
}

export async function getProductsWithNetworkStocks(): Promise<Product[]> {
  if (demo) return demoProducts;
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  const canViewCosts = profile.role === "owner" || profile.role === "admin";
  const [catalogResult, meta] = await Promise.all([
    fetchAllRows<any>((from, to) => supabase
      .rpc("inventory_network_snapshot")
      .order("product_id")
      .order("store_id")
      .range(from, to)),
    loadProductMetadata(supabase, canViewCosts),
  ]);
  if (catalogResult.error || !catalogResult.data) return [];

  const grouped = new Map<string, Product>();
  for (const row of catalogResult.data as any[]) {
    const id = String(row.product_id);
    const rowStoreId = String(row.store_id);
    const productMeta = meta.get(id);
    if (!productMeta) continue;
    const current: Product = grouped.get(id) ?? {
      id,
      sku: productMeta.sku ?? String(row.sku),
      barcode: productMeta.barcode ?? (row.barcode ? String(row.barcode) : null),
      name: productMeta.name ?? String(row.name),
      category: productMeta.category_name ?? null,
      category_id: productMeta.category_id ?? null,
      brand: productMeta.brand ?? null,
      unit: productMeta.unit ?? String(row.unit),
      cost_price: Number(productMeta.cost_price ?? 0),
      selling_price: Number(productMeta.selling_price ?? row.selling_price ?? 0),
      minimum_stock: Number(productMeta.minimum_stock ?? row.minimum_stock ?? 0),
      image_url: productMeta.image_url ?? null,
      visual_id: productMeta.visual_id ?? null,
      visual: productMeta.visual ?? null,
      is_active: Boolean(productMeta.is_active),
      sales_scope: productMeta.sales_scope === "selected" ? "selected" : "all",
      sales_store_ids: productMeta.sales_store_ids ?? [],
      variants: (productMeta.variants ?? []).map(({ stock_rows: _stockRows, ...variant }: any) => ({ ...variant, stocks: {}, total_stock: 0 })),
      stocks: {},
      total_stock: 0,
    };
    current.stocks[rowStoreId] = {
      store_id: rowStoreId,
      store_code: String(row.store_code),
      store_name: String(row.store_name),
      quantity_on_hand: Number(row.quantity_on_hand ?? 0),
      quantity_reserved: Number(row.quantity_reserved ?? 0),
      quantity_available: Number(row.quantity_available ?? 0),
      stock_status: row.stock_status as "safe" | "low" | "out",
    };
    for (const variant of current.variants ?? []) {
      const variantRow = productMeta.variants?.find((entry: any) => entry.id === variant.id)?.stock_rows?.get?.(rowStoreId);
      const onHand = Number(variantRow?.quantity_on_hand ?? 0);
      const reserved = Number(variantRow?.quantity_reserved ?? 0);
      const available = Math.max(onHand - reserved, 0);
      variant.stocks[rowStoreId] = {
        store_id: rowStoreId,
        store_code: String(row.store_code),
        store_name: String(row.store_name),
        quantity_on_hand: onHand,
        quantity_reserved: reserved,
        quantity_available: available,
        stock_status: available === 0 ? "out" : available <= current.minimum_stock ? "low" : "safe",
      };
      variant.total_stock += onHand;
    }
    current.total_stock += Number(row.quantity_on_hand ?? 0);
    grouped.set(id, current);
  }
  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function getSystemSettings(): Promise<SystemSettings> {
  if (demo) return demoSettings;
  const supabase = await createClient();
  const { data } = await supabase.from("system_settings").select("company_name,company_tagline,phone,address,receipt_footer,logo_url").eq("id", 1).maybeSingle();
  return data ? { ...demoSettings, ...data } : demoSettings;
}

export async function getAppContext() {
  const [profile, stores, settings] = await Promise.all([getCurrentProfile(), getStores(), getSystemSettings()]);
  return { profile, stores, settings };
}

export async function getProductsWithStocks(storeId?: string | null, includeInactive = false): Promise<Product[]> {
  if (demo) {
    return demoProducts
      .filter((product) => includeInactive || product.is_active)
      .map((product) => ({
        ...product,
        selected_stock: storeId ? product.stocks[storeId]?.quantity_available ?? 0 : undefined,
      }));
  }

  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  const allowedStoreIds = permittedStoreIds(profile);
  if (storeId && allowedStoreIds && !allowedStoreIds.has(storeId)) return [];
  const canViewCosts = profile.role === "owner" || profile.role === "admin";

  if (includeInactive) {
    const [meta, storesResult, inventoryResult] = await Promise.all([
      loadProductMetadata(supabase, canViewCosts, true),
      fetchAllRows<any>((from, to) => supabase.from("stores")
        .select("id,code,name,is_active")
        .eq("is_active", true)
        .order("id")
        .range(from, to)),
      fetchAllRows<any>((from, to) => supabase.from("store_inventory")
        .select("product_id,store_id,quantity_on_hand,quantity_reserved")
        .order("product_id")
        .order("store_id")
        .range(from, to)),
    ]);

    if (storesResult.error || inventoryResult.error) return [];

    const stores = (storesResult.data ?? [])
      .filter((row: any) => !allowedStoreIds || allowedStoreIds.has(String(row.id)))
      .map((row: any) => ({ id: String(row.id), code: String(row.code), name: String(row.name) }));
    const inventoryByProduct = new Map<string, Map<string, any>>();
    for (const row of (inventoryResult.data ?? []) as any[]) {
      const productId = String(row.product_id);
      const storeKey = String(row.store_id);
      if (allowedStoreIds && !allowedStoreIds.has(storeKey)) continue;
      const productRows = inventoryByProduct.get(productId) ?? new Map<string, any>();
      productRows.set(storeKey, row);
      inventoryByProduct.set(productId, productRows);
    }

    const products: Product[] = [];
    for (const productMeta of meta.values()) {
      const product: Product = {
        id: String(productMeta.id),
        sku: String(productMeta.sku),
        barcode: productMeta.barcode ? String(productMeta.barcode) : null,
        name: String(productMeta.name),
        category: productMeta.category_name ?? null,
        category_id: productMeta.category_id ? String(productMeta.category_id) : null,
        brand: productMeta.brand ?? null,
        unit: String(productMeta.unit),
        cost_price: Number(productMeta.cost_price ?? 0),
        selling_price: Number(productMeta.selling_price ?? 0),
        minimum_stock: Number(productMeta.minimum_stock ?? 0),
        image_url: productMeta.image_url ?? null,
        visual_id: productMeta.visual_id ? String(productMeta.visual_id) : null,
        visual: productMeta.visual ?? null,
        is_active: Boolean(productMeta.is_active),
        sales_scope: productMeta.sales_scope === "selected" ? "selected" : "all",
        sales_store_ids: productMeta.sales_store_ids ?? [],
        variants: (productMeta.variants ?? []).map(({ stock_rows: _stockRows, ...variant }: any) => ({ ...variant, stocks: {}, total_stock: 0 })),
        stocks: {},
        total_stock: 0,
      };

      for (const store of stores) {
        const row = inventoryByProduct.get(product.id)?.get(store.id);
        const onHand = Number(row?.quantity_on_hand ?? 0);
        const reserved = Number(row?.quantity_reserved ?? 0);
        const available = Math.max(onHand - reserved, 0);
        product.stocks[store.id] = {
          store_id: store.id,
          store_code: store.code,
          store_name: store.name,
          quantity_on_hand: onHand,
          quantity_reserved: reserved,
          quantity_available: available,
          stock_status: available === 0 ? "out" : available <= product.minimum_stock ? "low" : "safe",
        };
        if (!storeId || storeId === store.id) product.total_stock += onHand;
        if (storeId === store.id) product.selected_stock = available;

        for (const variant of product.variants ?? []) {
          const sourceVariant = productMeta.variants?.find((entry: any) => entry.id === variant.id);
          const variantRow = sourceVariant?.stock_rows?.get?.(store.id);
          const variantOnHand = Number(variantRow?.quantity_on_hand ?? 0);
          const variantReserved = Number(variantRow?.quantity_reserved ?? 0);
          const variantAvailable = Math.max(variantOnHand - variantReserved, 0);
          variant.stocks[store.id] = {
            store_id: store.id,
            store_code: store.code,
            store_name: store.name,
            quantity_on_hand: variantOnHand,
            quantity_reserved: variantReserved,
            quantity_available: variantAvailable,
            stock_status: variantAvailable === 0 ? "out" : variantAvailable <= product.minimum_stock ? "low" : "safe",
          };
          variant.total_stock += variantOnHand;
          if (storeId === store.id) variant.selected_stock = variantAvailable;
        }
      }
      products.push(product);
    }
    return products.sort((a, b) => a.name.localeCompare(b.name, "id"));
  }

  const [catalogResult, meta] = await Promise.all([
    fetchAllRows<any>((from, to) => supabase.from("inventory_overview")
      .select("product_id,sku,barcode,name,unit,minimum_stock,selling_price,store_id,store_code,store_name,quantity_on_hand,quantity_reserved,quantity_available,stock_status")
      .order("product_id")
      .order("store_id")
      .range(from, to)),
    loadProductMetadata(supabase, canViewCosts),
  ]);

  if (catalogResult.error || !catalogResult.data) return [];
  const grouped = new Map<string, Product>();

  for (const row of catalogResult.data as any[]) {
    const rowStoreId = String(row.store_id);
    if (allowedStoreIds && !allowedStoreIds.has(rowStoreId)) continue;
    const id = String(row.product_id);
    const productMeta = meta.get(id);
    if (!productMeta) continue;
    const current: Product = grouped.get(id) ?? {
      id,
      sku: productMeta.sku ?? String(row.sku),
      barcode: productMeta.barcode ?? (row.barcode ? String(row.barcode) : null),
      name: productMeta.name ?? String(row.name),
      category: productMeta.category_name ?? null,
      category_id: productMeta.category_id ?? null,
      brand: productMeta.brand ?? null,
      unit: productMeta.unit ?? String(row.unit),
      cost_price: Number(productMeta.cost_price ?? 0),
      selling_price: Number(productMeta.selling_price ?? row.selling_price ?? 0),
      minimum_stock: Number(productMeta.minimum_stock ?? row.minimum_stock ?? 0),
      image_url: productMeta.image_url ?? null,
      visual_id: productMeta.visual_id ?? null,
      visual: productMeta.visual ?? null,
      is_active: Boolean(productMeta.is_active),
      sales_scope: productMeta.sales_scope === "selected" ? "selected" : "all",
      sales_store_ids: productMeta.sales_store_ids ?? [],
      variants: (productMeta.variants ?? []).map(({ stock_rows: _stockRows, ...variant }: any) => ({ ...variant, stocks: {}, total_stock: 0 })),
      stocks: {},
      total_stock: 0,
    };
    current.stocks[rowStoreId] = {
      store_id: rowStoreId,
      store_code: String(row.store_code),
      store_name: String(row.store_name),
      quantity_on_hand: Number(row.quantity_on_hand ?? 0),
      quantity_reserved: Number(row.quantity_reserved ?? 0),
      quantity_available: Number(row.quantity_available ?? 0),
      stock_status: row.stock_status as "safe" | "low" | "out",
    };
    for (const variant of current.variants ?? []) {
      const variantRow = productMeta.variants?.find((entry: any) => entry.id === variant.id)?.stock_rows?.get?.(rowStoreId);
      const onHand = Number(variantRow?.quantity_on_hand ?? 0);
      const reserved = Number(variantRow?.quantity_reserved ?? 0);
      const available = Math.max(onHand - reserved, 0);
      variant.stocks[rowStoreId] = {
        store_id: rowStoreId,
        store_code: String(row.store_code),
        store_name: String(row.store_name),
        quantity_on_hand: onHand,
        quantity_reserved: reserved,
        quantity_available: available,
        stock_status: available === 0 ? "out" : available <= current.minimum_stock ? "low" : "safe",
      };
      variant.total_stock += onHand;
      if (storeId === rowStoreId) variant.selected_stock = available;
    }
    if (!storeId || storeId === rowStoreId) current.total_stock += Number(row.quantity_on_hand ?? 0);
    if (storeId === rowStoreId) current.selected_stock = Number(row.quantity_available ?? 0);
    grouped.set(id, current);
  }
  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function getStoreCatalog(storeId: string): Promise<Product[]> {
  const products = await getProductsWithStocks(storeId);
  return products
    .filter((product) => product.sales_scope !== "selected" || (product.sales_store_ids ?? []).includes(storeId))
    .map((product) => ({ ...product, selected_stock: product.stocks[storeId]?.quantity_available ?? 0 }));
}

export async function getRecentMovements(storeId?: string | null, limit = 30): Promise<Movement[]> {
  if (demo) return storeId ? demoMovements.filter((row) => demoStores.find((store) => store.id === storeId)?.name === row.store) : demoMovements;
  const supabase = await createClient();
  let query = supabase
    .from("stock_movements")
    .select("id,store_id,product_id,variant_id,created_at,quantity,movement_type,reason,stock_before,stock_after,reversed_at,correction_reason,stores(name),products(name),product_variants(name),profiles!stock_movements_created_by_fkey(full_name)")
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
    variant_id: row.variant_id ? String(row.variant_id) : null,
    variant_name: row.product_variants?.name ?? null,
    type: String(row.movement_type).replaceAll("_", " "),
    quantity: Number(row.quantity),
    user: row.profiles?.full_name ?? "Pengguna",
    reason: row.reason,
    movement_type: String(row.movement_type),
    product_id: String(row.product_id),
    store_id: String(row.store_id),
    stock_before: Number(row.stock_before ?? 0),
    stock_after: Number(row.stock_after ?? 0),
    reversed_at: row.reversed_at,
    correction_reason: row.correction_reason,
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
    const dailyTrend = dayKeys.map((date, index) => ({
      date,
      revenue: [1_200_000, 1_750_000, 1_450_000, 2_350_000, 1_900_000, 2_800_000, 4_350_000][index],
      transactions: [12, 17, 15, 24, 20, 29, 42][index],
      units: [18, 25, 21, 39, 31, 48, 67][index],
    }));
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
  const dailyTrend = dayKeys.map((date) => {
    const rows = (sales ?? []).filter((sale: any) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(sale.completed_at)) === date);
    return {
      date,
      revenue: rows.reduce((sum: number, sale: any) => sum + Number(sale.grand_total), 0),
      transactions: rows.length,
      units: rows.reduce((sum: number, sale: any) => sum + (sale.sale_items ?? []).reduce((itemSum: number, item: any) => itemSum + Number(item.quantity), 0), 0),
    };
  });
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

export async function getSaleDetail(saleId: string): Promise<SaleDetail | null> {
  if (demo) {
    const sale = (await getSales()).find((row) => row.id === saleId) ?? (await getSales())[0];
    if (!sale) return null;
    return {
      ...sale,
      store_code: demoStores[0]?.code ?? "IDS",
      store_address: demoStores[0]?.address ?? null,
      store_phone: demoStores[0]?.phone ?? null,
      store_image_url: demoStores[0]?.image_url ?? null,
      subtotal: sale.grand_total,
      discount: 0,
      tax: 0,
      notes: null,
      items: [{ id: "demo-item", product_id: demoProducts[0].id, name: demoProducts[0].name, sku: demoProducts[0].sku, quantity: 1, unit_price: demoProducts[0].selling_price, discount: 0, subtotal: demoProducts[0].selling_price }],
      payments: [{ id: "demo-pay", method: "cash", amount: sale.grand_total, reference_number: null }],
    };
  }
  const supabase = await createClient();
  const { data: sale, error } = await supabase
    .from("sales")
    .select("id,invoice_number,customer_name,subtotal,discount,tax,grand_total,status,notes,completed_at,stores(code,name,address,phone,image_url),profiles!sales_cashier_id_fkey(full_name),sale_items(id,product_id,variant_id,variant_name_snapshot,variant_sku_snapshot,product_name_snapshot,sku_snapshot,quantity,selling_price_snapshot,discount,subtotal),payments(id,method,amount,reference_number)")
    .eq("id", saleId)
    .maybeSingle();
  if (error || !sale) return null;
  const row = sale as any;
  return {
    id: String(row.id),
    invoice_number: String(row.invoice_number),
    store_name: row.stores?.name ?? "Toko",
    store_code: row.stores?.code ?? null,
    store_address: row.stores?.address ?? null,
    store_phone: row.stores?.phone ?? null,
    store_image_url: row.stores?.image_url ?? null,
    cashier_name: row.profiles?.full_name ?? "Kasir",
    grand_total: Number(row.grand_total ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    discount: Number(row.discount ?? 0),
    tax: Number(row.tax ?? 0),
    status: String(row.status),
    completed_at: String(row.completed_at),
    customer_name: row.customer_name,
    notes: row.notes,
    items: (row.sale_items ?? []).map((item: any) => ({
      id: String(item.id), product_id: String(item.product_id), variant_id: item.variant_id ? String(item.variant_id) : null,
      variant_name: item.variant_name_snapshot ? String(item.variant_name_snapshot) : null,
      variant_sku: item.variant_sku_snapshot ? String(item.variant_sku_snapshot) : null,
      name: String(item.product_name_snapshot), sku: String(item.sku_snapshot),
      quantity: Number(item.quantity ?? 0), unit_price: Number(item.selling_price_snapshot ?? 0), discount: Number(item.discount ?? 0), subtotal: Number(item.subtotal ?? 0),
    })),
    payments: (row.payments ?? []).map((payment: any) => ({ id: String(payment.id), method: String(payment.method), amount: Number(payment.amount ?? 0), reference_number: payment.reference_number })),
  };
}

export async function getUsers(): Promise<UserProfile[]> {
  if (demo) return [demoProfile, { id: "u2", full_name: "Rina Kasir", email: "rina@example.com", username: "rina", phone: null, role: "cashier", primary_store_id: demoStores[0].id, is_active: true, store_ids: [demoStores[0].id] } as UserProfile];
  const supabase = await createClient();
  const [{ data: profiles }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,username,phone,role,primary_store_id,is_active,avatar_key,deleted_at").is("deleted_at", null).order("full_name"),
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
  return (data ?? []).map((row: any) => ({ ...row, store_name: row.stores?.name ?? "Toko", cashier_name: row.profiles?.full_name ?? "Karyawan toko" }));
}

export async function getTransfers(storeId?: string | null) {
  if (demo) return [{ id: "tr-1", transfer_number: "TRF-20260731-001", source_name: demoStores[0].name, destination_name: demoStores[1].name, status: "in_transit", requested_at: "2026-07-31T10:00:00+07:00", notes: "Restok cabang timur" }];
  const supabase = await createClient();
  let query = supabase.from("stock_transfers").select("id,transfer_number,status,requested_at,notes,source_store_id,destination_store_id,source:stores!stock_transfers_source_store_id_fkey(name),destination:stores!stock_transfers_destination_store_id_fkey(name)").order("requested_at", { ascending: false });
  if (storeId) query = query.or(`source_store_id.eq.${storeId},destination_store_id.eq.${storeId}`);
  const { data } = await query;
  return (data ?? []).map((row: any) => ({ ...row, source_name: row.source?.name, destination_name: row.destination?.name }));
}

export async function getTransferRequests(storeId?: string | null) {
  if (demo) return [];
  const supabase = await createClient();
  let query = supabase.from("stock_transfer_requests").select("id,request_number,status,quantity,notes,created_at,source_store_id,destination_store_id,product_id,variant_id,products(name,sku,unit),product_variants(name,sku),source:stores!stock_transfer_requests_source_store_id_fkey(name,code),destination:stores!stock_transfer_requests_destination_store_id_fkey(name,code),profiles!stock_transfer_requests_requested_by_fkey(full_name)").order("created_at", { ascending: false }).limit(100);
  if (storeId) query = query.or(`source_store_id.eq.${storeId},destination_store_id.eq.${storeId}`);
  const { data } = await query;
  return (data ?? []).map((row: any) => ({
    ...row,
    product_name: row.products?.name ?? "Produk",
    product_sku: row.products?.sku ?? "",
    variant_id: row.variant_id ? String(row.variant_id) : null,
    variant_name: row.product_variants?.name ?? null,
    variant_sku: row.product_variants?.sku ?? null,
    product_unit: row.products?.unit ?? "pcs",
    source_name: row.source?.name ?? "Toko asal",
    destination_name: row.destination?.name ?? "Toko tujuan",
    requester_name: row.profiles?.full_name ?? "Karyawan",
  }));
}

export async function getPurchases(storeId?: string | null) {
  if (demo) return [{ id: "po-1", po_number: "PO-20260731-001", supplier_id: "sup-1", supplier_name: "PT Sumber Teknologi", store_name: demoStores[0].name, store_names: [demoStores[0].name], receiving_scope: "single", status: "pending", subtotal: 3250000, discount: 0, shipping_cost: 0, total: 3250000, notes: null, created_at: "2026-07-31T09:00:00+07:00", items: [] }];
  const supabase = await createClient();

  const normalize = (row: any) => {
    const value = row?.payload ?? row;
    const items = Array.isArray(value?.items) ? value.items.map((item: any) => ({
      ...item,
      id: String(item.id),
      product_id: String(item.product_id),
      variant_id: item.variant_id ? String(item.variant_id) : null,
      variant_name: item.variant_name ? String(item.variant_name) : null,
      variant_sku: item.variant_sku ? String(item.variant_sku) : null,
      quantity_ordered: Number(item.quantity_ordered ?? 0),
      quantity_received: Number(item.quantity_received ?? 0),
      unit_cost: Number(item.unit_cost ?? 0),
      subtotal: Number(item.subtotal ?? 0),
      allocations: Array.isArray(item.allocations) ? item.allocations.map((allocation: any) => ({
        ...allocation,
        id: String(allocation.id),
        store_id: String(allocation.store_id),
        quantity: Number(allocation.quantity ?? 0),
        quantity_received: Number(allocation.quantity_received ?? 0),
      })) : [],
    })) : [];
    return {
      ...value,
      id: String(value.id),
      supplier_id: String(value.supplier_id),
      destination_store_id: value.destination_store_id ? String(value.destination_store_id) : null,
      store_names: Array.isArray(value.store_names) ? value.store_names.map(String) : [String(value.store_name ?? "Toko")],
      items,
      subtotal: Number(value.subtotal ?? 0),
      discount: Number(value.discount ?? 0),
      shipping_cost: Number(value.shipping_cost ?? 0),
      total: Number(value.total ?? 0),
    };
  };

  const { data: overview, error: overviewError } = await supabase.rpc("purchase_orders_overview", { p_store_id: storeId || null });
  if (!overviewError && overview) return (overview as any[]).map(normalize);

  // Compatibility fallback for databases where migration 009 has not yet run.
  let query = supabase.from("purchase_orders").select("id,po_number,supplier_id,destination_store_id,receiving_scope,status,subtotal,discount,shipping_cost,total,notes,created_at,received_at,suppliers(name),stores(name,code),purchase_order_items(id,product_id,variant_id,quantity_ordered,quantity_received,unit_cost,subtotal,products(name,sku,unit),product_variants(name,sku),purchase_order_allocations(id,store_id,quantity,quantity_received,stores(name,code)))").order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row: any) => {
    const items = (row.purchase_order_items ?? []).map((item: any) => ({
      id: String(item.id), product_id: String(item.product_id), variant_id: item.variant_id ? String(item.variant_id) : null, name: item.products?.name ?? "Produk",
      variant_name: item.product_variants?.name ?? null, variant_sku: item.product_variants?.sku ?? null, sku: item.products?.sku ?? "", unit: item.products?.unit ?? "pcs",
      quantity_ordered: Number(item.quantity_ordered ?? 0), quantity_received: Number(item.quantity_received ?? 0),
      unit_cost: Number(item.unit_cost ?? 0), subtotal: Number(item.subtotal ?? 0),
      allocations: (item.purchase_order_allocations ?? []).map((allocation: any) => ({
        id: String(allocation.id), store_id: String(allocation.store_id), store_name: allocation.stores?.name ?? "Toko",
        store_code: allocation.stores?.code ?? "", quantity: Number(allocation.quantity ?? 0), quantity_received: Number(allocation.quantity_received ?? 0),
      })),
    }));
    const storeNames = [...new Set(items.flatMap((item: any) => item.allocations.map((allocation: any) => allocation.store_name)))] as string[];
    return normalize({
      ...row,
      supplier_name: row.suppliers?.name ?? "Supplier",
      store_name: row.stores?.name ?? storeNames[0] ?? "Toko",
      store_names: storeNames.length ? storeNames : [row.stores?.name ?? "Toko"],
      items,
    });
  });
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


export async function getProductVisuals(includeInactive = false): Promise<ProductVisual[]> {
  if (demo) return [
    { id: "visual-bolt", name: "Baut Hexagonal", code: { shape: "bolt", primary: "#334155", secondary: "#94a3b8", accent: "#f59e0b", background: "#eff6ff" }, is_builtin: true, is_active: true },
    { id: "visual-nut", name: "Mur Hexagonal", code: { shape: "nut", primary: "#475569", secondary: "#cbd5e1", accent: "#2563eb", background: "#f8fafc" }, is_builtin: true, is_active: true },
    { id: "visual-wrench", name: "Kunci Pas", code: { shape: "wrench", primary: "#334155", secondary: "#94a3b8", accent: "#2563eb", background: "#eef2ff" }, is_builtin: true, is_active: true },
    { id: "visual-generic", name: "Perkakas Umum", code: { shape: "generic", primary: "#2563eb", secondary: "#93c5fd", accent: "#f59e0b", background: "#eff6ff" }, is_builtin: true, is_active: true },
  ];
  let supabase: any;
  try { supabase = createAdminClient(); } catch { supabase = await createClient(); }
  let query = supabase.from("product_visuals").select("id,name,code,is_builtin,is_active").order("is_builtin", { ascending: false }).order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row: any) => ({ ...row, code: row.code ?? { shape: "generic" } })) as ProductVisual[];
}

export async function getCategories(includeInactive = false) {
  const demoCategories = [
    { id: "cat-1", name: "Baut & Mur", description: null, is_active: true },
    { id: "cat-2", name: "Perkakas Tangan", description: null, is_active: true },
    { id: "cat-3", name: "Mesin & Power Tools", description: null, is_active: true },
    { id: "cat-4", name: "Aksesori Teknik", description: null, is_active: true },
  ];
  if (demo) return demoCategories;
  let supabase: any;
  try { supabase = createAdminClient(); } catch { supabase = await createClient(); }
  let query = supabase.from("categories").select("id,name,description,is_active").order("is_active", { ascending: false }).order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data } = await query;
  return data ?? [];
}
