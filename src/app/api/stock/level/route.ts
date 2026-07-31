import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

export async function PATCH(request: Request) {
  const body = await request.json();
  const target = Number(body.target_quantity);
  const reason = String(body.reason ?? "").trim();
  if (!body.store_id || !body.product_id || !Number.isFinite(target) || target < 0 || !reason) {
    return NextResponse.json({ error: "Toko, produk, stok akhir, dan alasan wajib diisi" }, { status: 400 });
  }
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ id: crypto.randomUUID(), target_quantity: target, demo: true });
  const auth = await requireRole(["owner", "admin", "manager", "warehouse"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.supabase.rpc("set_stock_level", { p_store_id: body.store_id, p_product_id: body.product_id, p_target_quantity: target, p_reason: reason });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data, target_quantity: target });
}
