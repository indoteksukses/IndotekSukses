/**
 * cache.ts — Server-side cache layer menggunakan Next.js unstable_cache
 *
 * Strategi:
 * - Data statis (kategori, visual, daftar toko) di-cache 60 detik.
 * - Catalog produk + stok di-cache 30 detik.
 * - Tag-based revalidation agar cache langsung invalid saat mutasi terjadi.
 *
 * CACHE TAGS:
 *   "catalog"     — semua query produk + inventory
 *   "categories"  — daftar kategori
 *   "visuals"     — daftar product visual
 *   "stores"      — daftar toko
 */

import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/pagination";
import type { Product, ProductVisual, Store } from "@/lib/types";

// ─── IN-MEMORY FAST CACHE ───────────────────────────────────────────────────
// Menghilangkan latency jaringan berulang ke Supabase (sub-millisecond hit)

type MemEntry<T> = { data: T; expires: number };
const memStore = new Map<string, MemEntry<any>>();

export function memGet<T>(key: string): T | undefined {
  const entry = memStore.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    memStore.delete(key);
    return undefined;
  }
  return entry.data;
}

export function memSet<T>(key: string, data: T, ttlSec: number): T {
  memStore.set(key, { data, expires: Date.now() + ttlSec * 1000 });
  return data;
}

export function invalidateTags(...tags: string[]) {
  for (const tag of tags) {
    // Purge semua cache di memori yang mengandung tag
    for (const key of memStore.keys()) {
      if (key.includes(tag)) memStore.delete(key);
    }
    try {
      (revalidateTag as any)(tag, "max");
    } catch {
      // Safe fallback
    }
  }
}

// ─── helper reader ──────────────────────────────────────────────────────────

function getPublicReader(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getReader(): Promise<any> {
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    try {
      return createAdminClient();
    } catch {
      // fallback
    }
  }
  // Public reader avoids PostgreSQL's "revoke select from authenticated" bug on public.products
  const pub = getPublicReader();
  if (pub) return pub;

  try {
    return await createClient();
  } catch {
    return null;
  }
}

// ─── CATEGORIES ─────────────────────────────────────────────────────────────

export async function getCachedCategories(includeInactive = false) {
  const key = `categories_${includeInactive}`;
  const hit = memGet<Array<{ id: string; name: string; description: string | null; is_active: boolean }>>(key);
  if (hit) return hit;

  const reader = await getReader();
  if (!reader) return [];
  let query = reader
    .from("categories")
    .select("id,name,description,is_active")
    .order("is_active", { ascending: false })
    .order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data } = await query;
  const list = (data ?? []) as Array<{ id: string; name: string; description: string | null; is_active: boolean }>;
  return memSet(key, list, 60);
}

// ─── PRODUCT VISUALS ────────────────────────────────────────────────────────

export async function getCachedProductVisuals(includeInactive = false) {
  const key = `visuals_${includeInactive}`;
  const hit = memGet<ProductVisual[]>(key);
  if (hit) return hit;

  const reader = await getReader();
  if (!reader) return [] as ProductVisual[];
  let query = reader
    .from("product_visuals")
    .select("id,name,code,is_builtin,is_active")
    .order("is_builtin", { ascending: false })
    .order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data } = await query;
  const list = (data ?? []).map((row: any) => ({
    ...row,
    code: row.code ?? { shape: "generic" },
  })) as ProductVisual[];
  return memSet(key, list, 120);
}

// ─── STORES ─────────────────────────────────────────────────────────────────

export async function getCachedStores() {
  const key = "stores_active";
  const hit = memGet<Store[]>(key);
  if (hit) return hit;

  const reader = await getReader();
  if (!reader) return [] as Store[];
  const { data } = await reader
    .from("stores")
    .select("id,code,name,address,phone,manager_name,image_url,is_active")
    .eq("is_active", true)
    .order("name");
  return memSet(key, (data ?? []) as Store[], 60);
}

// ─── PRODUCT METADATA (tanpa stok) ──────────────────────────────────────────

async function fetchProductMetaList(): Promise<any[]> {
  console.log("[DEBUG fetchProductMetaList] START");
  const reader = await getReader();
  console.log("[DEBUG fetchProductMetaList] reader exists:", Boolean(reader));
  if (!reader) return [];

  let { data: products, error } = await fetchAllRows<any>(
    (from, to) =>
      reader
        .from("products")
        .select(
          "id,sku,barcode,name,brand,unit,cost_price,selling_price,minimum_stock," +
          "image_url,visual_id,is_active,sales_scope,category_id," +
          "categories(name)," +
          "product_visuals(id,name,code,is_builtin,is_active)," +
          "product_variants(id,name,sku,barcode,cost_price,selling_price,is_active,sort_order)," +
          "product_store_sales(store_id)",
        )
        .is("product_variants.archived_at", null)
        .order("id")
        .range(from, to),
  );

  console.log("[DEBUG fetchProductMetaList] query products count:", products?.length, "error:", error?.message);

  if ((error || !products || products.length === 0)) {
    console.log("[DEBUG fetchProductMetaList] trying simple fallback query...");
    const simple = await fetchAllRows<any>((from, to) =>
      reader.from("products").select("*").order("id").range(from, to),
    );
    console.log("[DEBUG fetchProductMetaList] simple count:", simple.data?.length, "error:", simple.error?.message);
    if (simple.data && simple.data.length > 0) {
      products = simple.data;
      error = null;
    }
  }

  if (error || !products) return [];

  const list: any[] = [];
  for (const row of products as any[]) {
    const variants = ((row.product_variants ?? []) as any[])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((v: any) => ({
        id: String(v.id),
        product_id: String(row.id),
        name: String(v.name),
        sku: v.sku ? String(v.sku) : null,
        barcode: v.barcode ? String(v.barcode) : null,
        cost_price: Number(v.cost_price ?? 0),
        selling_price: Number(v.selling_price ?? 0),
        is_active: Boolean(v.is_active),
        sort_order: Number(v.sort_order ?? 0),
        stocks: {},
        total_stock: 0,
      }));

    const visual = row.product_visuals
      ? {
          id: String(row.product_visuals.id),
          name: String(row.product_visuals.name),
          code: row.product_visuals.code ?? { shape: "generic" },
          is_builtin: Boolean(row.product_visuals.is_builtin),
          is_active: Boolean(row.product_visuals.is_active),
        }
      : null;

    list.push({
      id: String(row.id),
      sku: String(row.sku),
      barcode: row.barcode ? String(row.barcode) : null,
      name: String(row.name),
      brand: row.brand ?? null,
      unit: String(row.unit),
      cost_price: Number(row.cost_price ?? 0),
      selling_price: Number(row.selling_price ?? 0),
      minimum_stock: Number(row.minimum_stock ?? 0),
      image_url: row.image_url ? String(row.image_url) : null,
      visual_id: row.visual_id ? String(row.visual_id) : null,
      visual,
      is_active: Boolean(row.is_active),
      sales_scope: row.sales_scope === "selected" ? "selected" : "all",
      category_id: row.category_id ? String(row.category_id) : null,
      category_name: row.categories?.name ?? null,
      sales_store_ids: (row.product_store_sales ?? []).map((s: any) => String(s.store_id)),
      variants,
    });
  }
  console.log("[DEBUG fetchProductMetaList] final list count:", list.length);
  return list;
}

export async function getCachedProductMeta(): Promise<Map<string, any>> {
  const key = "catalog_meta_map";
  const hit = memGet<Map<string, any>>(key);
  if (hit && hit.size > 0) return hit;

  const list = await fetchProductMetaList();
  const meta = new Map<string, any>();
  for (const item of list) {
    meta.set(item.id, item);
  }
  if (meta.size === 0) return meta;
  return memSet(key, meta, 120);
}

// ─── INVENTORY OVERVIEW (stok produk per toko) ──────────────────────────────

export async function getInventoryOverview(scopedStoreIds: string[] | null): Promise<any[]> {
  const key = `catalog_inv_${scopedStoreIds ? scopedStoreIds.sort().join(",") : "all"}`;
  const hit = memGet<any[]>(key);
  if (hit) return hit;

  const supabase = await getReader();
  if (!supabase) return [];
  const { data } = await fetchAllRows<any>((from, to) => {
    let query = supabase
      .from("inventory_overview")
      .select(
        "product_id,sku,barcode,name,unit,minimum_stock,selling_price," +
        "store_id,store_code,store_name,quantity_on_hand,quantity_reserved,quantity_available,stock_status",
      )
      .order("product_id")
      .order("store_id")
      .range(from, to);
    if (scopedStoreIds?.length) query = query.in("store_id", scopedStoreIds);
    return query;
  });
  return memSet(key, (data ?? []) as any[], 60);
}

// ─── VARIANT INVENTORY (stok varian per toko) ───────────────────────────────

export async function getVariantInventory(scopedStoreIds: string[] | null): Promise<any[]> {
  const key = `catalog_var_inv_${scopedStoreIds ? scopedStoreIds.sort().join(",") : "all"}`;
  const hit = memGet<any[]>(key);
  if (hit) return hit;

  const reader = await getReader();
  const { data } = await fetchAllRows<any>((from, to) => {
    let query = reader
      .from("product_variant_inventory")
      .select("variant_id,store_id,quantity_on_hand,quantity_reserved,quantity_damaged,quantity_in_transit")
      .order("variant_id")
      .order("store_id")
      .range(from, to);
    if (scopedStoreIds?.length) query = query.in("store_id", scopedStoreIds);
    return query;
  });
  return memSet(key, (data ?? []) as any[], 60);
}

// ─── BUILDER: gabungkan meta + stok menjadi Product[] ───────────────────────

export function buildProducts(
  meta: Map<string, any>,
  inventoryRows: any[],
  variantInventoryRows: any[],
  opts: {
    storeId?: string | null;
    allowedStoreIds?: Set<string> | null;
    includeInactive?: boolean;
    canViewCosts?: boolean;
    salesScopeFilter?: boolean;
  } = {},
): Product[] {
  const {
    storeId,
    allowedStoreIds,
    includeInactive = false,
    canViewCosts = false,
    salesScopeFilter = false,
  } = opts;

  // Build variant stock index: variant_id → store_id → stok
  const stockByVariant = new Map<string, Map<string, any>>();
  for (const row of variantInventoryRows) {
    const vid = String(row.variant_id);
    const sid = String(row.store_id);
    if (!stockByVariant.has(vid)) stockByVariant.set(vid, new Map());
    stockByVariant.get(vid)!.set(sid, {
      quantity_on_hand: Number(row.quantity_on_hand ?? 0),
      quantity_reserved: Number(row.quantity_reserved ?? 0),
      quantity_available: Math.max(
        Number(row.quantity_on_hand ?? 0) - Number(row.quantity_reserved ?? 0),
        0,
      ),
    });
  }

  const grouped = new Map<string, Product>();

  // Inisialisasi semua produk dari meta agar produk tetap muncul meski belum memiliki baris stok
  const metaEntries =
    meta instanceof Map
      ? meta.entries()
      : meta && typeof meta === "object"
        ? Object.entries(meta)
        : [];

  for (const [id, productMeta] of metaEntries) {
    if (!productMeta) continue;
    if (!includeInactive && !productMeta.is_active) continue;
    if (salesScopeFilter && storeId) {
      const scope = productMeta.sales_scope;
      const saleStores: string[] = productMeta.sales_store_ids ?? [];
      if (scope === "selected" && !saleStores.includes(storeId)) continue;
    }

    grouped.set(id, {
      id,
      sku: productMeta.sku,
      barcode: productMeta.barcode ?? null,
      name: productMeta.name,
      category: productMeta.category_name ?? null,
      category_id: productMeta.category_id ?? null,
      brand: productMeta.brand ?? null,
      unit: productMeta.unit,
      cost_price: canViewCosts ? Number(productMeta.cost_price ?? 0) : 0,
      selling_price: Number(productMeta.selling_price ?? 0),
      minimum_stock: Number(productMeta.minimum_stock ?? 0),
      image_url: productMeta.image_url ?? null,
      visual_id: productMeta.visual_id ?? null,
      visual: productMeta.visual ?? null,
      is_active: Boolean(productMeta.is_active),
      sales_scope: productMeta.sales_scope === "selected" ? "selected" : "all",
      sales_store_ids: productMeta.sales_store_ids ?? [],
      variants: (productMeta.variants ?? [])
        .filter((v: any) => includeInactive || v.is_active)
        .map((v: any) => ({
          ...v,
          cost_price: canViewCosts ? v.cost_price : 0,
          stocks: {},
          total_stock: 0,
        })),
      stocks: {},
      total_stock: 0,
    });
  }

  for (const row of inventoryRows) {
    const rowStoreId = String(row.store_id);
    if (allowedStoreIds && !allowedStoreIds.has(rowStoreId)) continue;
    const id = String(row.product_id);
    const current = grouped.get(id);
    if (!current) continue;

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
      const variantRow = stockByVariant.get(variant.id)?.get(rowStoreId);
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
  }

  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
}
