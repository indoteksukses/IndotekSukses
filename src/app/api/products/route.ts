import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

function normalize(body: any) {
  const salesScope = body.sales_scope === "selected" ? "selected" : "all";
  const salesStoreIds = [...new Set<string>((Array.isArray(body.sales_store_ids) ? body.sales_store_ids : []).filter(Boolean).map(String))];
  return {
    product: {
      sku: String(body.sku ?? "").trim().toUpperCase(),
      barcode: String(body.barcode ?? "").trim() || null,
      name: String(body.name ?? "").trim(),
      category_id: String(body.category_id ?? "").trim(),
      brand: String(body.brand ?? "").trim() || "Tanpa Merek",
      unit: String(body.unit ?? "pcs").trim() || "pcs",
      cost_price: Number(body.cost_price ?? 0),
      selling_price: Number(body.selling_price ?? 0),
      minimum_stock: Number(body.minimum_stock ?? 0),
      image_url: String(body.image_url ?? "").trim() || null,
      visual_id: body.visual_id ? String(body.visual_id).trim() : null,
      is_active: body.is_active !== false,
      sales_scope: salesScope as "all" | "selected",
    },
    salesStoreIds,
  };
}

function validateProduct(product: ReturnType<typeof normalize>["product"], storeIds: string[]) {
  if (!product.name || !product.sku || !product.category_id || !product.brand) return "Nama, SKU, kategori, dan merek wajib diisi";
  if (![product.cost_price, product.selling_price, product.minimum_stock].every(Number.isFinite)) return "Harga atau minimum stok tidak valid";
  if (product.selling_price < 0 || product.cost_price < 0 || product.minimum_stock < 0) return "Harga dan minimum stok tidak boleh negatif";
  if (product.sales_scope === "selected" && !storeIds.length) return "Pilih minimal satu cabang penjualan";
  return null;
}

function databaseMessage(message: string) {
  if (message.includes("duplicate key") || message.includes("products_sku")) return "SKU sudah digunakan produk lain.";
  if (message.includes("foreign key") && message.includes("category")) return "Kategori produk tidak valid.";
  if (message.includes("foreign key") && message.includes("visual")) return "Visual produk tidak valid.";
  return message;
}

async function persistProduct(body: any, productId: string | null) {
  const { product, salesStoreIds } = normalize(body);
  const invalid = validateProduct(product, salesStoreIds);
  if (invalid) return { ok: false as const, status: 400, error: invalid };

  if (isDemoMode || !hasSupabaseEnv) {
    return {
      ok: true as const,
      status: productId ? 200 : 201,
      product: { id: productId ?? crypto.randomUUID(), ...product, category_name: "Kategori demo", visual_name: null, sales_store_ids: salesStoreIds },
      demo: true,
    };
  }

  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false as const, status: auth.status, error: auth.error };

  const admin = createAdminClient();

  const [{ data: category, error: categoryError }, visualResult] = await Promise.all([
    admin.from("categories").select("id,name,is_active").eq("id", product.category_id).maybeSingle(),
    product.visual_id
      ? admin.from("product_visuals").select("id,name,is_active").eq("id", product.visual_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (categoryError) return { ok: false as const, status: 400, error: databaseMessage(categoryError.message) };
  if (!category?.id || category.is_active === false) return { ok: false as const, status: 400, error: "Kategori tidak ditemukan atau sudah nonaktif." };
  if (visualResult.error) return { ok: false as const, status: 400, error: databaseMessage(visualResult.error.message) };
  if (product.visual_id && (!visualResult.data?.id || visualResult.data.is_active === false)) {
    return { ok: false as const, status: 400, error: "Visual produk tidak ditemukan atau sudah nonaktif." };
  }

  if (product.sales_scope === "selected") {
    const { data: validStores, error: storesError } = await admin.from("stores").select("id").in("id", salesStoreIds).eq("is_active", true);
    if (storesError) return { ok: false as const, status: 400, error: databaseMessage(storesError.message) };
    if ((validStores ?? []).length !== salesStoreIds.length) return { ok: false as const, status: 400, error: "Salah satu cabang penjualan tidak valid atau nonaktif." };
  }

  const productRow = {
    ...product,
    // Visual kode dan URL gambar tidak boleh aktif bersamaan.
    image_url: product.visual_id ? null : product.image_url,
    visual_id: product.image_url ? null : product.visual_id,
    updated_at: new Date().toISOString(),
  };

  let savedRow: any = null;
  let saveError: { message: string } | null = null;
  if (productId) {
    const result = await admin
      .from("products")
      .update(productRow)
      .eq("id", productId)
      .select("id,sku,name,category_id,brand,image_url,visual_id,is_active,sales_scope")
      .single();
    savedRow = result.data;
    saveError = result.error;
  } else {
    const result = await admin
      .from("products")
      .insert({ ...productRow, created_by: auth.user.id })
      .select("id,sku,name,category_id,brand,image_url,visual_id,is_active,sales_scope")
      .single();
    savedRow = result.data;
    saveError = result.error;
  }

  if (saveError) return { ok: false as const, status: 400, error: databaseMessage(saveError.message) };
  if (!savedRow?.id) return { ok: false as const, status: 500, error: "Produk tidak ditemukan atau gagal disimpan." };

  const savedId = String(savedRow.id);

  const { error: clearSalesError } = await admin.from("product_store_sales").delete().eq("product_id", savedId);
  if (clearSalesError) return { ok: false as const, status: 400, error: databaseMessage(clearSalesError.message) };

  if (product.sales_scope === "selected") {
    const { error: salesError } = await admin.from("product_store_sales").insert(
      salesStoreIds.map((storeId) => ({ product_id: savedId, store_id: storeId })),
    );
    if (salesError) return { ok: false as const, status: 400, error: databaseMessage(salesError.message) };
  }

  if (!productId) {
    const { data: stores, error: inventoryStoresError } = await admin.from("stores").select("id").eq("is_active", true);
    if (inventoryStoresError) return { ok: false as const, status: 400, error: databaseMessage(inventoryStoresError.message) };
    if (stores?.length) {
      const { error: inventoryError } = await admin.from("store_inventory").upsert(
        stores.map((store) => ({ store_id: store.id, product_id: savedId, quantity_on_hand: 0, quantity_reserved: 0 })),
        { onConflict: "store_id,product_id", ignoreDuplicates: true },
      );
      if (inventoryError) return { ok: false as const, status: 400, error: databaseMessage(inventoryError.message) };
    }
  }

  // Read back with the service-role client. This verifies the actual database row,
  // independent of RLS and column-level grants used by browser sessions.
  const [{ data: verified, error: verifyError }, { data: savedSales, error: savedSalesError }] = await Promise.all([
    admin.from("products").select("id,sku,name,category_id,brand,image_url,visual_id,is_active,sales_scope").eq("id", savedId).single(),
    admin.from("product_store_sales").select("store_id").eq("product_id", savedId).order("store_id"),
  ]);

  if (verifyError || !verified) return { ok: false as const, status: 500, error: databaseMessage(verifyError?.message ?? "Produk gagal dibaca kembali setelah disimpan.") };
  if (savedSalesError) return { ok: false as const, status: 500, error: databaseMessage(savedSalesError.message) };

  const expectedImage = productRow.image_url ?? null;
  const expectedVisual = productRow.visual_id ?? null;
  if (String(verified.category_id ?? "") !== product.category_id) return { ok: false as const, status: 500, error: "Kategori gagal tersimpan ke database." };
  if (String(verified.brand ?? "").trim() !== product.brand) return { ok: false as const, status: 500, error: "Merek gagal tersimpan ke database." };
  if ((verified.visual_id ?? null) !== expectedVisual) return { ok: false as const, status: 500, error: "Visual kode gagal tersimpan ke database." };
  if ((verified.image_url ?? null) !== expectedImage) return { ok: false as const, status: 500, error: "Sumber gambar gagal tersimpan ke database." };

  const saved = {
    ...verified,
    category_name: category.name,
    visual_name: visualResult.data?.name ?? null,
    sales_store_ids: (savedSales ?? []).map((row) => String(row.store_id)),
  };

  revalidatePath("/products", "page");
  revalidatePath("/inventory", "page");
  revalidatePath("/dashboard", "page");
  revalidatePath("/pos", "page");
  return { ok: true as const, status: productId ? 200 : 201, product: saved, demo: false };
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

export async function POST(request: Request) {
  try {
    const result = await persistProduct(await request.json(), null);
    if (!result.ok) return json({ error: result.error }, result.status);
    return json({ product: result.product, ...(result.demo ? { demo: true } : {}) }, result.status);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Gagal menyimpan produk" }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return json({ error: "ID produk tidak ditemukan" }, 400);
    const result = await persistProduct(body, String(body.id));
    if (!result.ok) return json({ error: result.error }, result.status);
    return json({ product: result.product, ...(result.demo ? { demo: true } : {}) }, result.status);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Gagal memperbarui produk" }, 500);
  }
}
