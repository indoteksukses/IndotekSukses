import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

function payload(body: any) {
  return {
    sku: String(body.sku ?? "").trim().toUpperCase(),
    barcode: String(body.barcode ?? "").trim() || null,
    name: String(body.name ?? "").trim(),
    category_id: body.category_id || null,
    brand: String(body.brand ?? "").trim() || null,
    unit: String(body.unit ?? "pcs"),
    cost_price: Number(body.cost_price ?? 0),
    selling_price: Number(body.selling_price ?? 0),
    minimum_stock: Number(body.minimum_stock ?? 0),
    is_active: body.is_active !== false,
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  const data = payload(body);
  if (!data.name || !data.sku || data.selling_price < 0 || data.cost_price < 0) return NextResponse.json({ error: "Data produk tidak valid" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ product: { id: crypto.randomUUID(), ...data }, demo: true }, { status: 201 });
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data: product, error } = await auth.supabase.from("products").insert({ ...data, created_by: auth.user.id }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ product }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "ID produk tidak ditemukan" }, { status: 400 });
  const data = payload(body);
  if (!data.name || !data.sku) return NextResponse.json({ error: "Nama dan SKU wajib diisi" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ product: { id: body.id, ...data }, demo: true });
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data: product, error } = await auth.supabase.from("products").update(data).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ product });
}
