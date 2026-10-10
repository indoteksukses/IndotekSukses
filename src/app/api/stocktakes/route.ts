import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

const roles = ["owner", "admin", "manager", "warehouse"] as const;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID opname wajib diisi" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) {
    return NextResponse.json({
      stocktake: { id, stocktake_number: "SO-DEMO", store_name: "Indotek Sukses", status: "completed" },
      items: [
        { id: "demo-1", product_id: "demo-product", name: "Baut M4", sku: "BAUT-M4", unit: "pcs", system_quantity: 20, physical_quantity: 19, variance: -1, notes: "Selisih hasil hitung" },
      ],
    });
  }
  const auth = await requireRole([...roles]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: stocktake, error: stocktakeError } = await auth.supabase
    .from("stocktakes")
    .select("id,stocktake_number,status,notes,created_at,completed_at,store_id,stores(name,code)")
    .eq("id", id)
    .maybeSingle();
  if (stocktakeError) return NextResponse.json({ error: stocktakeError.message }, { status: 400 });
  if (!stocktake) return NextResponse.json({ error: "Stok opname tidak ditemukan" }, { status: 404 });

  const { data: items, error: itemsError } = await auth.supabase
    .from("stocktake_items")
    .select("id,product_id,variant_id,system_quantity,physical_quantity,variance,notes,products(name,sku,unit),product_variants(name,sku)")
    .eq("stocktake_id", id)
    .order("variance", { ascending: true, nullsFirst: false });
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 });

  const storeRelation = stocktake.stores as unknown as { name?: string; code?: string } | null;
  return NextResponse.json({
    stocktake: { ...stocktake, store_name: storeRelation?.name ?? "—", store_code: storeRelation?.code ?? "" },
    items: (items ?? []).map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id ? String(item.variant_id) : null,
      name: item.products?.name ?? "Produk",
      sku: item.products?.sku ?? "—",
      variant_name: item.product_variants?.name ?? null,
      variant_sku: item.product_variants?.sku ?? null,
      unit: item.products?.unit ?? "pcs",
      system_quantity: Number(item.system_quantity ?? 0),
      physical_quantity: item.physical_quantity == null ? null : Number(item.physical_quantity),
      variance: item.variance == null ? null : Number(item.variance),
      notes: item.notes ?? "",
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ id: crypto.randomUUID(), demo: true }, { status: 201 });
  const auth = await requireRole([...roles]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (body.action === "create") {
    const { data, error } = await auth.supabase.rpc("create_stocktake", { p_store_id: body.store_id, p_notes: body.notes || null });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  }
  if (body.action === "complete") {
    const { data, error } = await auth.supabase.rpc("complete_stocktake", { p_stocktake_id: body.stocktake_id, p_counts: body.counts });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }
  return NextResponse.json({ error: "Aksi opname tidak dikenal" }, { status: 400 });
}
