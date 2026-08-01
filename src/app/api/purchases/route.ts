import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

function normalizeItems(value: unknown) {
  if (!Array.isArray(value) || !value.length) return null;
  const items = value.map((item) => ({
    product_id: String(item?.product_id ?? ""),
    quantity: Math.floor(Number(item?.quantity ?? 0)),
    unit_cost: Number(item?.unit_cost ?? 0),
  }));
  if (items.some((item) => !item.product_id || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unit_cost) || item.unit_cost < 0)) return null;
  if (new Set(items.map((item) => item.product_id)).size !== items.length) return null;
  return items;
}

export async function POST(request: Request) {
  const body = await request.json();
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ id: crypto.randomUUID(), po_number: `PO-DEMO-${Date.now()}`, demo: true }, { status: 201 });
  const auth = await requireRole(["owner", "admin", "manager", "warehouse"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (body.action === "create") {
    const items = normalizeItems(body.items);
    const shippingCost = Number(body.shipping_cost ?? 0);
    const discount = Number(body.discount ?? 0);
    if (!body.supplier_id || !body.destination_store_id || !items || !Number.isFinite(shippingCost) || shippingCost < 0 || !Number.isFinite(discount) || discount < 0) {
      return NextResponse.json({ error: "Data pembelian tidak valid. Periksa supplier, toko tujuan, produk, jumlah, dan harga beli." }, { status: 400 });
    }
    const { data, error } = await auth.supabase.rpc("create_purchase_order", {
      p_supplier_id: body.supplier_id,
      p_destination_store_id: body.destination_store_id,
      p_items: items,
      p_shipping_cost: shippingCost,
      p_discount: discount,
      p_notes: String(body.notes ?? "").trim() || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  }
  if (body.action === "receive") {
    const { data, error } = await auth.supabase.rpc("receive_purchase_order", { p_purchase_order_id: body.purchase_order_id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }
  return NextResponse.json({ error: "Aksi pembelian tidak dikenal" }, { status: 400 });
}
