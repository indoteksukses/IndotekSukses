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
      unit: String(body.unit ?? "pcs"),
      cost_price: Number(body.cost_price ?? 0),
      selling_price: Number(body.selling_price ?? 0),
      minimum_stock: Number(body.minimum_stock ?? 0),
      image_url: String(body.image_url ?? "").trim() || null,
      visual_id: body.visual_id ? String(body.visual_id) : null,
      is_active: body.is_active !== false,
      sales_scope: salesScope,
    },
    salesStoreIds,
  };
}

async function validateReferences(admin: ReturnType<typeof createAdminClient>, product: ReturnType<typeof normalize>["product"], storeIds: string[]) {
  const { data: category } = await admin.from("categories").select("id").eq("id", product.category_id).eq("is_active", true).maybeSingle();
  if (!category) return "Kategori tidak ditemukan atau sudah nonaktif";
  if (product.visual_id) {
    const { data: visual } = await admin.from("product_visuals").select("id").eq("id", product.visual_id).eq("is_active", true).maybeSingle();
    if (!visual) return "Visual produk tidak ditemukan atau sudah nonaktif";
  }
  if (product.sales_scope === "selected") {
    if (!storeIds.length) return "Pilih minimal satu cabang penjualan";
    const { data: storeRows, error } = await admin.from("stores").select("id").in("id", storeIds).eq("is_active", true);
    if (error || (storeRows ?? []).length !== storeIds.length) return "Cabang penjualan tidak valid atau sudah nonaktif";
  }
  return null;
}

async function saveAvailability(admin: ReturnType<typeof createAdminClient>, productId: string, salesScope: string, storeIds: string[]) {
  const { error: clearError } = await admin.from("product_store_sales").delete().eq("product_id", productId);
  if (clearError) throw clearError;
  if (salesScope === "selected") {
    const { error } = await admin.from("product_store_sales").insert(storeIds.map((storeId) => ({ product_id: productId, store_id: storeId })));
    if (error) throw error;
  }
}

function validateProduct(product: ReturnType<typeof normalize>["product"]) {
  if (!product.name || !product.sku || !product.category_id || !product.brand) return "Nama, SKU, kategori, dan merek wajib diisi";
  if (![product.cost_price, product.selling_price, product.minimum_stock].every(Number.isFinite)) return "Harga atau minimum stok tidak valid";
  if (product.selling_price < 0 || product.cost_price < 0 || product.minimum_stock < 0) return "Harga dan minimum stok tidak boleh negatif";
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product, salesStoreIds } = normalize(body);
    const invalid = validateProduct(product);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    const productId = crypto.randomUUID();
    if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ product: { id: productId, ...product, sales_store_ids: salesStoreIds }, demo: true }, { status: 201 });

    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const admin = createAdminClient();
    const referenceError = await validateReferences(admin, product, salesStoreIds);
    if (referenceError) return NextResponse.json({ error: referenceError }, { status: 400 });

    const { error } = await admin.from("products").insert({ id: productId, ...product, created_by: auth.user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    try {
      await saveAvailability(admin, productId, product.sales_scope, salesStoreIds);
    } catch (availabilityError) {
      await admin.from("products").delete().eq("id", productId);
      throw availabilityError;
    }
    return NextResponse.json({ product: { id: productId, ...product, sales_store_ids: salesStoreIds } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyimpan produk" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "ID produk tidak ditemukan" }, { status: 400 });
    const { product, salesStoreIds } = normalize(body);
    const invalid = validateProduct(product);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ product: { id: body.id, ...product, sales_store_ids: salesStoreIds }, demo: true });

    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const admin = createAdminClient();
    const referenceError = await validateReferences(admin, product, salesStoreIds);
    if (referenceError) return NextResponse.json({ error: referenceError }, { status: 400 });

    const { data: updated, error } = await admin.from("products").update(product).eq("id", body.id).select("id,visual_id,image_url,category_id,brand").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!updated) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    await saveAvailability(admin, String(body.id), product.sales_scope, salesStoreIds);
    return NextResponse.json({ product: { ...product, ...updated, sales_store_ids: salesStoreIds } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memperbarui produk" }, { status: 500 });
  }
}
