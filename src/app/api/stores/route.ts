import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const code = String(body.code ?? "").trim().toUpperCase();
  if (!name || !code) return NextResponse.json({ error: "Nama dan kode toko wajib diisi" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ store: { id: crypto.randomUUID(), ...body, name, code, is_active: true }, demo: true }, { status: 201 });
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.supabase.from("stores").insert({ name, code, address: body.address || null, phone: body.phone || null, manager_name: body.manager_name || null, is_active: true }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ store: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "ID toko tidak ditemukan" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ store: body, demo: true });
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const payload = {
    name: String(body.name ?? "").trim(),
    code: String(body.code ?? "").trim().toUpperCase(),
    address: body.address || null,
    phone: body.phone || null,
    manager_name: body.manager_name || null,
    is_active: body.is_active !== false,
  };
  const { data, error } = await auth.supabase.from("stores").update(payload).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ store: data });
}
