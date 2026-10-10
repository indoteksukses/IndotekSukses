import { NextResponse } from "next/server";
import { invalidateTags } from "@/lib/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import { requireRole } from "@/lib/auth";

const allowedTypes = new Set([
  "opening", "purchase", "customer_return", "supplier_return", "damage",
  "loss", "internal_use", "stocktake_adjustment", "manual_adjustment",
]);

async function movementPayload(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data } = await supabase.from("stock_movements")
    .select("id,store_id,product_id,variant_id,created_at,quantity,movement_type,reason,stock_before,stock_after,reversed_at,correction_reason,stores(name),products(name),product_variants(name),profiles!stock_movements_created_by_fkey(full_name)")
    .eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as any;
  return {
    id: String(row.id), time: String(row.created_at), store: row.stores?.name ?? "Toko", product: row.products?.name ?? "Produk", variant_id: row.variant_id ? String(row.variant_id) : null, variant_name: row.product_variants?.name ?? null,
    type: String(row.movement_type).replaceAll("_", " "), movement_type: String(row.movement_type), quantity: Number(row.quantity),
    user: row.profiles?.full_name ?? "Pengguna", reason: row.reason, product_id: String(row.product_id), store_id: String(row.store_id),
    stock_before: Number(row.stock_before ?? 0), stock_after: Number(row.stock_after ?? 0), reversed_at: row.reversed_at, correction_reason: row.correction_reason,
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : body.product_id ? [{ product_id: body.product_id, variant_id: body.variant_id || null, quantity: body.quantity }] : [];
  const direction = body.direction === "out" ? "out" : "in";
  if (!body.store_id || !allowedTypes.has(body.movement_type) || !items.length) return NextResponse.json({ error: "Data pergerakan stok tidak valid" }, { status: 400 });
  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!item.product_id || !Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: "Setiap produk harus memiliki jumlah lebih dari nol" }, { status: 400 });
  }
  if (new Set(items.map((item: any) => `${String(item.product_id)}:${item.variant_id ? String(item.variant_id) : "base"}`)).size !== items.length) return NextResponse.json({ error: "Produk atau varian duplikat tidak diperbolehkan" }, { status: 400 });

  if (isDemoMode || !hasSupabaseEnv) {
    return NextResponse.json({ movements: items.map((item: any, index: number) => ({ id: crypto.randomUUID(), time: new Date().toISOString(), store: "Toko demo", product: `Produk demo ${index + 1}`, type: body.movement_type, movement_type: body.movement_type, quantity: Number(item.quantity) * (direction === "out" ? -1 : 1), user: "Demo", reason: body.reason || null, store_id: body.store_id, product_id: item.product_id, stock_before: 0, stock_after: Number(item.quantity), reversed_at: null })) });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi login berakhir" }, { status: 401 });

  const { data, error } = await supabase.rpc("post_stock_movement_batch", {
    p_store_id: body.store_id,
    p_type: body.movement_type,
    p_direction: direction,
    p_items: items.map((item: any) => ({ product_id: String(item.product_id), variant_id: item.variant_id ? String(item.variant_id) : null, quantity: Number(item.quantity) })),
    p_reference_label: body.reference_label || null,
    p_reason: body.reason || null,
    p_notes: body.notes || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const ids = Array.isArray(data) ? data.map((row: any) => String(row.id)) : [];
  const movements = (await Promise.all(ids.map((id) => movementPayload(supabase, id)))).filter(Boolean);
  invalidateTags("catalog"); // invalidate inventory overview cache
  return NextResponse.json({ ids, movements });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const movementId = String(body.movement_id ?? "");
  const reason = String(body.reason ?? "").trim();
  if (!movementId || !reason) return NextResponse.json({ error: "Pergerakan dan alasan ralat wajib diisi" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ success: true, reversal_id: crypto.randomUUID(), demo: true });
  const auth = await requireRole(["owner", "admin", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.supabase.rpc("reverse_stock_movement", { p_movement_id: movementId, p_reason: reason });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  invalidateTags("catalog"); // invalidate inventory overview cache
  return NextResponse.json({ success: true, reversal_id: data, movement: await movementPayload(auth.supabase, String(data)) });
}
