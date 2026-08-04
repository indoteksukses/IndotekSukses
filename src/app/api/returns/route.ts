import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.sale_id || !body.sale_item_id || Number(body.quantity) <= 0 || !body.reason) return NextResponse.json({ error: "Data retur belum lengkap" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ id: crypto.randomUUID(), return_number: `RET-DEMO-${Date.now()}`, demo: true }, { status: 201 });
  const auth = await requireRole(["owner","admin","manager","cashier"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.supabase.rpc("create_customer_return_v2", {
    p_sale_id: body.sale_id,
    p_sale_item_id: body.sale_item_id,
    p_quantity: Number(body.quantity),
    p_condition: body.condition,
    p_reason: body.reason,
    p_resolution: body.resolution || "refund",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
