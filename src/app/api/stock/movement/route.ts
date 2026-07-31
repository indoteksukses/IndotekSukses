import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import { requireRole } from "@/lib/auth";

const allowedTypes = new Set([
  "opening", "purchase", "customer_return", "supplier_return", "damage",
  "loss", "internal_use", "stocktake_adjustment", "manual_adjustment",
]);

async function movementPayload(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data } = await supabase.from("stock_movements")
    .select("id,store_id,product_id,created_at,quantity,movement_type,reason,stock_before,stock_after,reversed_at,correction_reason,stores(name),products(name),profiles!stock_movements_created_by_fkey(full_name)")
    .eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as any;
  return {
    id: String(row.id), time: String(row.created_at), store: row.stores?.name ?? "Toko", product: row.products?.name ?? "Produk",
    type: String(row.movement_type).replaceAll("_", " "), movement_type: String(row.movement_type), quantity: Number(row.quantity),
    user: row.profiles?.full_name ?? "Pengguna", reason: row.reason, product_id: String(row.product_id), store_id: String(row.store_id),
    stock_before: Number(row.stock_before ?? 0), stock_after: Number(row.stock_after ?? 0), reversed_at: row.reversed_at, correction_reason: row.correction_reason,
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.store_id || !body.product_id || !allowedTypes.has(body.movement_type)) {
    return NextResponse.json({ error: "Data pergerakan stok tidak valid" }, { status: 400 });
  }
  const rawQuantity = Number(body.quantity);
  if (!Number.isFinite(rawQuantity) || rawQuantity <= 0) return NextResponse.json({ error: "Jumlah harus lebih dari nol" }, { status: 400 });
  const sign = ["supplier_return", "damage", "loss", "internal_use"].includes(body.movement_type) ? -1 : 1;

  if (isDemoMode || !hasSupabaseEnv) {
    return NextResponse.json({ movement: { id: crypto.randomUUID(), time: new Date().toISOString(), store: "Toko demo", product: "Produk demo", type: body.movement_type, movement_type: body.movement_type, quantity: rawQuantity * sign, user: "Demo", reason: body.reason || null, store_id: body.store_id, product_id: body.product_id, stock_before: 0, stock_after: rawQuantity * sign, reversed_at: null } });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi login berakhir" }, { status: 401 });

  const { data, error } = await supabase.rpc("post_stock_movement", {
    p_store_id: body.store_id, p_product_id: body.product_id, p_type: body.movement_type, p_quantity: rawQuantity * sign,
    p_reference_type: body.reference_type || null, p_reference_id: null, p_reason: body.reason || null, p_notes: body.notes || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data, movement: await movementPayload(supabase, String(data)) });
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
  return NextResponse.json({ success: true, reversal_id: data, movement: await movementPayload(auth.supabase, String(data)) });
}
