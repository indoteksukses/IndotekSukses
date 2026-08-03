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
      category_id: body.category_id || null,
      brand: String(body.brand ?? "").trim() || null,
      unit: String(body.unit ?? "pcs"),
      cost_price: Number(body.cost_price ?? 0),
      selling_price: Number(body.selling_price ?? 0),
      minimum_stock: Number(body.minimum_stock ?? 0),
      image_url: String(body.image_url ?? "").trim() || null,
      visual_id: body.visual_id || null,
      is_active: body.is_active !== false,
      sales_scope: salesScope,
    },
    salesStoreIds,
  };
}

async function validateStores(admin: ReturnType<typeof createAdminClient>, salesScope: string, storeIds: string[]) {
  if (salesScope !== "selected") return true;
  if (!storeIds.length) return false;
  const { data, error } = await admin.from("stores").select("id").in("id", storeIds).eq("is_active", true);
  return !error && (data ?? []).length === storeIds.length;
}

async function saveAvailability(admin: ReturnType<typeof createAdminClient>, productId: string, salesScope: string, storeIds: string[]) {
  const { error: clearError } = await admin.from("product_store_sales").delete().eq("product_id", productId);
  if (clearError) throw clearError;
  if (salesScope === "selected") {
    const { error } = await admin.from("product_store_sales").insert(storeIds.map((storeId) => ({ product_id: productId, store_id: storeId })));
    if (error) throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product, salesStoreIds } = normalize(body);
    if (!product.name || !product.sku || product.selling_price < 0 || product.cost_price < 0) return NextResponse.json({ error: "Data produk tidak valid" }, { status: 400 });
    if (product.sales_scope === "selected" && !salesStoreIds.length) return NextResponse.json({ error: "Pilih minimal satu cabang penjualan" }, { status: 400 });
    const productId = crypto.randomUUID();
    if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ product: { id: productId, ...product, sales_store_ids: salesStoreIds }, demo: true }, { status: 201 });

    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const admin = createAdminClient();
    if (!(await validateStores(admin, product.sales_scope, salesStoreIds))) return NextResponse.json({ error: "Cabang penjualan tidak valid atau sudah nonaktif" }, { status: 400 });

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
    if (!product.name || !product.sku || product.selling_price < 0 || product.cost_price < 0) return NextResponse.json({ error: "Nama, SKU, dan harga produk tidak valid" }, { status: 400 });
    if (product.sales_scope === "selected" && !salesStoreIds.length) return NextResponse.json({ error: "Pilih minimal satu cabang penjualan" }, { status: 400 });
    if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ product: { id: body.id, ...product, sales_store_ids: salesStoreIds }, demo: true });

    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const admin = createAdminClient();
    if (!(await validateStores(admin, product.sales_scope, salesStoreIds))) return NextResponse.json({ error: "Cabang penjualan tidak valid atau sudah nonaktif" }, { status: 400 });

    const { error } = await admin.from("products").update(product).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await saveAvailability(admin, String(body.id), product.sales_scope, salesStoreIds);
    return NextResponse.json({ product: { id: body.id, ...product, sales_store_ids: salesStoreIds } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memperbarui produk" }, { status: 500 });
  }
}
