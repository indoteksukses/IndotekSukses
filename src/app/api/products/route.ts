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
      sales_scope: salesScope,
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

function rpcErrorMessage(message: string) {
  if (message.includes("save_product_master_v2") || message.includes("schema cache")) {
    return "Fungsi penyimpanan produk v2.5.2 belum tersedia. Jalankan migration 202608040011_product_category_visual_save_fix.sql di Supabase lalu coba kembali.";
  }
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
  const { data, error } = await admin.rpc("save_product_master_v2", {
    p_product_id: productId,
    p_actor_id: auth.user.id,
    p_payload: product,
    p_sales_store_ids: salesStoreIds,
  });

  if (error) return { ok: false as const, status: 400, error: rpcErrorMessage(error.message) };
  const saved = data as any;
  if (!saved?.id) return { ok: false as const, status: 500, error: "Database tidak mengembalikan produk yang berhasil disimpan." };

  if (String(saved.category_id ?? "") !== product.category_id) {
    return { ok: false as const, status: 500, error: "Kategori gagal diverifikasi setelah penyimpanan." };
  }
  if (String(saved.brand ?? "").trim() !== product.brand) {
    return { ok: false as const, status: 500, error: "Merek gagal diverifikasi setelah penyimpanan." };
  }
  if ((saved.visual_id ?? null) !== product.visual_id) {
    return { ok: false as const, status: 500, error: "Visual kode gagal diverifikasi setelah penyimpanan." };
  }
  if ((saved.image_url ?? null) !== product.image_url) {
    return { ok: false as const, status: 500, error: "Sumber gambar gagal diverifikasi setelah penyimpanan." };
  }

  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
  return { ok: true as const, status: productId ? 200 : 201, product: saved, demo: false };
}

export async function POST(request: Request) {
  try {
    const result = await persistProduct(await request.json(), null);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ product: result.product, ...(result.demo ? { demo: true } : {}) }, { status: result.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyimpan produk" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "ID produk tidak ditemukan" }, { status: 400 });
    const result = await persistProduct(body, String(body.id));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ product: result.product, ...(result.demo ? { demo: true } : {}) }, { status: result.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memperbarui produk" }, { status: 500 });
  }
}
