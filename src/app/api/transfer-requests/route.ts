import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ id: crypto.randomUUID(), request_number: `REQ-DEMO-${Date.now()}`, status: "pending", demo: true }, { status: 201 });
    const auth = await requireRole(["owner", "admin", "manager", "cashier", "warehouse"]);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const quantity = Math.floor(Number(body.quantity ?? 0));
    if (!body.product_id || !body.source_store_id || !body.destination_store_id || quantity <= 0) {
      return NextResponse.json({ error: "Produk, cabang asal, cabang tujuan, dan jumlah wajib diisi." }, { status: 400 });
    }
    const { data, error } = await auth.supabase.rpc("create_stock_transfer_request", {
      p_product_id: body.product_id,
      p_variant_id: body.variant_id || null,
      p_source_store_id: body.source_store_id,
      p_destination_store_id: body.destination_store_id,
      p_quantity: quantity,
      p_notes: String(body.notes ?? "").trim() || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal membuat permintaan transfer." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ id: crypto.randomUUID(), status: "approved", demo: true });
    const auth = await requireRole(["owner", "admin", "manager", "warehouse"]);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (!body.id || body.action !== "approve") return NextResponse.json({ error: "Permintaan atau aksi tidak valid." }, { status: 400 });
    const { data, error } = await auth.supabase.rpc("approve_stock_transfer_request", { p_request_id: body.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memproses permintaan transfer." }, { status: 500 });
  }
}
