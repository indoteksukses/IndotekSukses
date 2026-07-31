import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

const allowedTypes = new Set([
  "opening", "purchase", "customer_return", "supplier_return", "damage",
  "loss", "internal_use", "stocktake_adjustment", "manual_adjustment",
]);

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.store_id || !body.product_id || !allowedTypes.has(body.movement_type)) {
    return NextResponse.json({ error: "Data pergerakan stok tidak valid" }, { status: 400 });
  }
  const rawQuantity = Number(body.quantity);
  if (!Number.isFinite(rawQuantity) || rawQuantity <= 0) {
    return NextResponse.json({ error: "Jumlah harus lebih dari nol" }, { status: 400 });
  }
  const sign = ["supplier_return", "damage", "loss", "internal_use"].includes(body.movement_type) ? -1 : 1;

  if (isDemoMode || !hasSupabaseEnv) {
    return NextResponse.json({ id: crypto.randomUUID(), demo: true });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi login berakhir" }, { status: 401 });

  const { data, error } = await supabase.rpc("post_stock_movement", {
    p_store_id: body.store_id,
    p_product_id: body.product_id,
    p_type: body.movement_type,
    p_quantity: rawQuantity * sign,
    p_reference_type: body.reference_type || null,
    p_reference_id: null,
    p_reason: body.reason || null,
    p_notes: body.notes || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data });
}
