import { NextResponse } from "next/server";
import { invalidateTags } from "@/lib/cache";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

function normalizeName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = normalizeName(body.name);
  if (!name) return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ category: { id: crypto.randomUUID(), name, description: body.description || null, is_active: true }, demo: true }, { status: 201 });
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.supabase.from("categories").insert({ name, description: String(body.description ?? "").trim() || null, is_active: true }).select("id,name,description,is_active").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Nama kategori sudah digunakan" : error.message }, { status: 400 });
  invalidateTags("categories", "catalog");
  return NextResponse.json({ category: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = String(body.id ?? "");
  const name = normalizeName(body.name);
  if (!id || !name) return NextResponse.json({ error: "Data kategori tidak lengkap" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ category: { ...body, name }, demo: true });
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.supabase.from("categories").update({ name, description: String(body.description ?? "").trim() || null, is_active: body.is_active !== false, updated_at: new Date().toISOString() }).eq("id", id).select("id,name,description,is_active").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Nama kategori sudah digunakan" : error.message }, { status: 400 });
  invalidateTags("categories", "catalog");
  return NextResponse.json({ category: data });
}
