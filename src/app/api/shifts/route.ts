import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  const body = await request.json();
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ id: crypto.randomUUID(), demo: true });
  const auth = await requireRole(["owner", "admin", "manager", "cashier"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (body.action === "open") {
    if (!body.store_id || Number(body.opening_cash) < 0) return NextResponse.json({ error: "Data buka shift tidak valid" }, { status: 400 });
    const { data: existing } = await auth.supabase.from("cashier_shifts").select("id,profiles!cashier_shifts_cashier_id_fkey(full_name)").eq("store_id", body.store_id).eq("status", "open").maybeSingle();
    if (existing) return NextResponse.json({ error: `Toko ini sudah memiliki shift aktif yang dibuka oleh ${(existing as any).profiles?.full_name ?? "karyawan lain"}` }, { status: 409 });
    const { data, error } = await auth.supabase.from("cashier_shifts").insert({ store_id: body.store_id, cashier_id: auth.user.id, opening_cash: Number(body.opening_cash), notes: body.notes || null }).select("*").single();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "Toko ini sudah memiliki shift aktif" : error.message }, { status: 400 });
    return NextResponse.json({ shift: data }, { status: 201 });
  }

  if (body.action === "close") {
    if (!body.shift_id || Number(body.actual_cash) < 0) return NextResponse.json({ error: "Data tutup shift tidak valid" }, { status: 400 });
    const { data: shift, error: shiftError } = await auth.supabase.from("cashier_shifts").select("id,cashier_id,opening_cash,status").eq("id", body.shift_id).single();
    if (shiftError || !shift || shift.status !== "open") return NextResponse.json({ error: "Shift aktif tidak ditemukan" }, { status: 400 });
    if (shift.cashier_id !== auth.user.id && !["owner", "admin", "manager"].includes(auth.profile.role)) return NextResponse.json({ error: "Hanya pembuka shift atau pengelola toko yang dapat menutup shift" }, { status: 403 });
    const { data: sales } = await auth.supabase.from("sales").select("payments(method,amount)").eq("shift_id", body.shift_id).in("status", ["completed", "partially_refunded"]);
    const cashSales = (sales ?? []).reduce((sum: number, sale: any) => sum + (sale.payments ?? []).filter((payment: any) => payment.method === "cash").reduce((value: number, payment: any) => value + Number(payment.amount), 0), 0);
    const expected = Number(shift.opening_cash) + cashSales;
    const actual = Number(body.actual_cash);
    const { data, error } = await auth.supabase.from("cashier_shifts").update({ expected_cash: expected, actual_cash: actual, cash_difference: actual - expected, notes: body.notes || null, closed_at: new Date().toISOString(), status: "closed" }).eq("id", body.shift_id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ shift: data });
  }
  return NextResponse.json({ error: "Aksi shift tidak dikenal" }, { status: 400 });
}
