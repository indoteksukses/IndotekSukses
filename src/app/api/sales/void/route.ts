import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.sale_id || !String(body.reason ?? "").trim()) return NextResponse.json({ error: "Transaksi dan alasan pembatalan wajib diisi" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ success: true, demo: true });
  const auth = await requireRole(["owner", "admin", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.supabase.rpc("void_sale", { p_sale_id: body.sale_id, p_reason: String(body.reason).trim() });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? { success: true });
}
