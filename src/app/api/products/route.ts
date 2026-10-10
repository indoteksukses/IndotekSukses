import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { invalidateTags } from "@/lib/cache";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

type NormalizedVariant = {
  id?: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
  sort_order: number;
};

function normalize(body: any) {
  const salesScope = body.sales_scope === "selected" ? "selected" : "all";
  const salesStoreIds = [...new Set<string>((Array.isArray(body.sales_store_ids) ? body.sales_store_ids : []).filter(Boolean).map(String))];
  const variants: NormalizedVariant[] = (Array.isArray(body.variants) ? body.variants : []).map((variant: any, index: number) => ({
    id: variant.id ? String(variant.id) : undefined,
    name: String(variant.name ?? "").trim(),
    sku: String(variant.sku ?? "").trim().toUpperCase() || null,
    barcode: String(variant.barcode ?? "").trim() || null,
    cost_price: Number(variant.cost_price ?? 0),
    selling_price: Number(variant.selling_price ?? 0),
    is_active: variant.is_active !== false,
    sort_order: Number.isFinite(Number(variant.sort_order)) ? Number(variant.sort_order) : index,
  }));
  const hasVariants = body.has_variants === true && variants.length > 0;
  const activeVariants = variants.filter((variant) => variant.is_active);
  const fallback = activeVariants[0] ?? variants[0];
  return {
    product: {
      sku: String(body.sku ?? "").trim().toUpperCase(),
      barcode: String(body.barcode ?? "").trim() || null,
      name: String(body.name ?? "").trim(),
      category_id: String(body.category_id ?? "").trim(),
      brand: String(body.brand ?? "").trim() || "Tanpa Merek",
      unit: String(body.unit ?? "pcs").trim() || "pcs",
      cost_price: hasVariants ? Number(fallback?.cost_price ?? 0) : Number(body.cost_price ?? 0),
      selling_price: hasVariants ? Number(fallback?.selling_price ?? 0) : Number(body.selling_price ?? 0),
      minimum_stock: Number(body.minimum_stock ?? 0),
      image_url: String(body.image_url ?? "").trim() || null,
      visual_id: body.visual_id ? String(body.visual_id).trim() : null,
      is_active: body.is_active !== false,
      sales_scope: salesScope as "all" | "selected",
    },
    salesStoreIds,
    hasVariants,
    variants: hasVariants ? variants : [],
  };
}

function validateProduct(normalized: ReturnType<typeof normalize>) {
  const { product, salesStoreIds, hasVariants, variants } = normalized;
  if (!product.name || !product.sku || !product.category_id || !product.brand) return "Nama, SKU, kategori, dan merek wajib diisi";
  if (![product.cost_price, product.selling_price, product.minimum_stock].every(Number.isFinite)) return "Harga atau minimum stok tidak valid";
  if (product.selling_price < 0 || product.cost_price < 0 || product.minimum_stock < 0) return "Harga dan minimum stok tidak boleh negatif";
  if (product.sales_scope === "selected" && !salesStoreIds.length) return "Pilih minimal satu cabang penjualan";
  if (hasVariants) {
    if (!variants.length) return "Tambahkan minimal satu varian";
    if (!variants.some((variant) => variant.is_active)) return "Minimal satu varian harus aktif";
    if (variants.some((variant) => !variant.name)) return "Nama setiap varian wajib diisi";
    if (variants.some((variant) => ![variant.cost_price, variant.selling_price].every(Number.isFinite) || variant.cost_price < 0 || variant.selling_price < 0)) return "Harga varian tidak valid";
    const names = variants.map((variant) => variant.name.toLowerCase());
    if (new Set(names).size !== names.length) return "Nama varian tidak boleh sama";
    const skus = variants.map((variant) => variant.sku).filter(Boolean);
    if (new Set(skus).size !== skus.length) return "SKU varian tidak boleh sama";
    const barcodes = variants.map((variant) => variant.barcode).filter(Boolean);
    if (new Set(barcodes).size !== barcodes.length) return "Barcode varian tidak boleh sama";
  }
  return null;
}

function databaseMessage(message: string) {
  if (message.includes('relation "product_variant_inventory" does not exist')) return "Migration stok varian v2.7.0 belum dijalankan di Supabase.";
  if (message.includes('relation "product_variants" does not exist')) return "Migration varian produk v2.6.0 belum dijalankan di Supabase.";
  if (message.includes("products_sku")) return "SKU produk sudah digunakan.";
  if (message.includes("product_variants_sku")) return "SKU varian sudah digunakan.";
  if (message.includes("product_variants_barcode")) return "Barcode varian sudah digunakan.";
  if (message.includes("duplicate key")) return "SKU, barcode, atau nama varian sudah digunakan.";
  if (message.includes("foreign key") && message.includes("category")) return "Kategori produk tidak valid.";
  if (message.includes("foreign key") && message.includes("visual")) return "Visual produk tidak valid.";
  return message;
}

async function saveVariants(admin: ReturnType<typeof createAdminClient>, productId: string, variants: NormalizedVariant[]) {
  const { data: existing, error: existingError } = await admin.from("product_variants").select("id").eq("product_id", productId).is("archived_at", null);
  if (existingError) throw new Error(databaseMessage(existingError.message));
  const existingIds = new Set<string>((existing ?? []).map((row: any) => String(row.id)));
  for (const variant of variants) if (variant.id && !existingIds.has(variant.id)) throw new Error("Salah satu varian tidak terhubung ke produk ini.");

  const keptIds = new Set(variants.map((variant) => variant.id).filter(Boolean) as string[]);
  const removedIds = [...existingIds].filter((id) => !keptIds.has(id));
  if (removedIds.length) {
    const { data: stockRows, error: stockError } = await admin.from("product_variant_inventory").select("variant_id,quantity_on_hand,quantity_reserved,quantity_damaged,quantity_in_transit").in("variant_id", removedIds);
    if (stockError && !stockError.message.includes('relation "product_variant_inventory" does not exist')) throw new Error(databaseMessage(stockError.message));
    const hasStock = (stockRows ?? []).some((row: any) => Number(row.quantity_on_hand ?? 0) > 0 || Number(row.quantity_reserved ?? 0) > 0 || Number(row.quantity_damaged ?? 0) > 0 || Number(row.quantity_in_transit ?? 0) > 0);
    if (hasStock) throw new Error("Varian yang masih memiliki stok tidak dapat dihapus. Kosongkan atau pindahkan stok varian terlebih dahulu.");
    // Keep historical invoice, purchase, and transfer references intact. Removed variants are archived, not physically deleted.
    const { error } = await admin.from("product_variants").update({ is_active: false, archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("product_id", productId).in("id", removedIds);
    if (error) throw new Error(databaseMessage(error.message));
  }

  for (const variant of variants) {
    const row = { product_id: productId, name: variant.name, sku: variant.sku, barcode: variant.barcode, cost_price: variant.cost_price, selling_price: variant.selling_price, is_active: variant.is_active, archived_at: null, sort_order: variant.sort_order, updated_at: new Date().toISOString() };
    if (variant.id) {
      const { error } = await admin.from("product_variants").update(row).eq("id", variant.id).eq("product_id", productId);
      if (error) throw new Error(databaseMessage(error.message));
    } else {
      const { data: inserted, error } = await admin.from("product_variants").insert(row).select("id").single();
      if (error) throw new Error(databaseMessage(error.message));
      if (inserted?.id) {
        const { data: stores, error: storesError } = await admin.from("stores").select("id").eq("is_active", true);
        if (storesError) throw new Error(databaseMessage(storesError.message));
        if (stores?.length) {
          const { error: inventoryError } = await admin.from("product_variant_inventory").upsert(stores.map((store: any) => ({ store_id: store.id, variant_id: inserted.id, quantity_on_hand: 0, quantity_reserved: 0 })), { onConflict: "store_id,variant_id", ignoreDuplicates: true });
          if (inventoryError) throw new Error(databaseMessage(inventoryError.message));
        }
      }
    }
  }
  const { data, error } = await admin.from("product_variants").select("id,product_id,name,sku,barcode,cost_price,selling_price,is_active,sort_order").eq("product_id", productId).is("archived_at", null).order("sort_order").order("name");
  if (error) throw new Error(databaseMessage(error.message));
  return (data ?? []).map((variant: any) => ({ ...variant, id: String(variant.id), product_id: String(variant.product_id), cost_price: Number(variant.cost_price ?? 0), selling_price: Number(variant.selling_price ?? 0), is_active: Boolean(variant.is_active), sort_order: Number(variant.sort_order ?? 0), stocks: {}, total_stock: 0 }));
}

async function persistProduct(body: any, productId: string | null) {
  const normalized = normalize(body);
  const { product, salesStoreIds, variants } = normalized;
  const invalid = validateProduct(normalized);
  if (invalid) return { ok: false as const, status: 400, error: invalid };

  if (isDemoMode || !hasSupabaseEnv) {
    return { ok: true as const, status: productId ? 200 : 201, product: { id: productId ?? crypto.randomUUID(), ...product, category_name: "Kategori demo", visual_name: null, sales_store_ids: salesStoreIds, variants }, demo: true };
  }

  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false as const, status: auth.status, error: auth.error };
  const admin = createAdminClient();

  const [{ data: category, error: categoryError }, visualResult] = await Promise.all([
    admin.from("categories").select("id,name,is_active").eq("id", product.category_id).maybeSingle(),
    product.visual_id ? admin.from("product_visuals").select("id,name,is_active").eq("id", product.visual_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (categoryError) return { ok: false as const, status: 400, error: databaseMessage(categoryError.message) };
  if (!category?.id || category.is_active === false) return { ok: false as const, status: 400, error: "Kategori tidak ditemukan atau nonaktif." };
  if (visualResult.error) return { ok: false as const, status: 400, error: databaseMessage(visualResult.error.message) };
  if (product.visual_id && (!visualResult.data?.id || visualResult.data.is_active === false)) return { ok: false as const, status: 400, error: "Visual produk tidak ditemukan atau nonaktif." };

  if (product.sales_scope === "selected") {
    const { data: validStores, error } = await admin.from("stores").select("id").in("id", salesStoreIds).eq("is_active", true);
    if (error) return { ok: false as const, status: 400, error: databaseMessage(error.message) };
    if ((validStores ?? []).length !== salesStoreIds.length) return { ok: false as const, status: 400, error: "Salah satu cabang penjualan tidak valid." };
  }

  const productRow = { ...product, image_url: product.visual_id ? null : product.image_url, visual_id: product.image_url ? null : product.visual_id, updated_at: new Date().toISOString() };
  const result = productId
    ? await admin.from("products").update(productRow).eq("id", productId).select("id,sku,name,category_id,brand,image_url,visual_id,is_active,sales_scope").single()
    : await admin.from("products").insert({ ...productRow, created_by: auth.user.id }).select("id,sku,name,category_id,brand,image_url,visual_id,is_active,sales_scope").single();
  if (result.error) return { ok: false as const, status: 400, error: databaseMessage(result.error.message) };
  if (!result.data?.id) return { ok: false as const, status: 500, error: "Produk gagal disimpan." };
  const savedId = String(result.data.id);

  try {
    const savedVariants = await saveVariants(admin, savedId, variants);
    const { error: clearSalesError } = await admin.from("product_store_sales").delete().eq("product_id", savedId);
    if (clearSalesError) throw new Error(databaseMessage(clearSalesError.message));
    if (product.sales_scope === "selected") {
      const { error } = await admin.from("product_store_sales").insert(salesStoreIds.map((storeId) => ({ product_id: savedId, store_id: storeId })));
      if (error) throw new Error(databaseMessage(error.message));
    }
    if (!productId) {
      const { data: stores, error } = await admin.from("stores").select("id").eq("is_active", true);
      if (error) throw new Error(databaseMessage(error.message));
      if (stores?.length) {
        const { error: inventoryError } = await admin.from("store_inventory").upsert(stores.map((store) => ({ store_id: store.id, product_id: savedId, quantity_on_hand: 0, quantity_reserved: 0 })), { onConflict: "store_id,product_id", ignoreDuplicates: true });
        if (inventoryError) throw new Error(databaseMessage(inventoryError.message));
      }
    }
    const [{ data: verified, error: verifyError }, { data: savedSales, error: savedSalesError }] = await Promise.all([
      admin.from("products").select("id,sku,name,category_id,brand,image_url,visual_id,is_active,sales_scope").eq("id", savedId).single(),
      admin.from("product_store_sales").select("store_id").eq("product_id", savedId).order("store_id"),
    ]);
    if (verifyError || !verified) throw new Error(databaseMessage(verifyError?.message ?? "Produk gagal diverifikasi."));
    if (savedSalesError) throw new Error(databaseMessage(savedSalesError.message));
    if (String(verified.category_id ?? "") !== product.category_id) throw new Error("Kategori gagal tersimpan.");
    if (String(verified.brand ?? "").trim() !== product.brand) throw new Error("Merek gagal tersimpan.");
    if ((verified.visual_id ?? null) !== (productRow.visual_id ?? null)) throw new Error("Visual kode gagal tersimpan.");
    if (savedVariants.length !== variants.length) throw new Error("Jumlah varian yang tersimpan tidak lengkap.");

    const saved = { ...verified, category_name: category.name, visual_name: visualResult.data?.name ?? null, sales_store_ids: (savedSales ?? []).map((row) => String(row.store_id)), variants: savedVariants };
    for (const path of ["/products", "/inventory", "/dashboard", "/pos"]) revalidatePath(path, "page");
    invalidateTags("catalog"); // invalidate getCachedProductMeta, getInventoryOverview
    return { ok: true as const, status: productId ? 200 : 201, product: saved, demo: false };
  } catch (error) {
    return { ok: false as const, status: 400, error: error instanceof Error ? error.message : "Gagal menyimpan varian produk" };
  }
}

function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }); }

export async function POST(request: Request) {
  try { const result = await persistProduct(await request.json(), null); return result.ok ? json({ product: result.product, ...(result.demo ? { demo: true } : {}) }, result.status) : json({ error: result.error }, result.status); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Gagal menyimpan produk" }, 500); }
}

export async function PATCH(request: Request) {
  try { const body = await request.json(); if (!body.id) return json({ error: "ID produk tidak ditemukan" }, 400); const result = await persistProduct(body, String(body.id)); return result.ok ? json({ product: result.product, ...(result.demo ? { demo: true } : {}) }, result.status) : json({ error: result.error }, result.status); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Gagal memperbarui produk" }, 500); }
}
