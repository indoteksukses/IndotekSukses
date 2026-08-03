import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

function normalizeItems(value: unknown) {
  if (!Array.isArray(value) || !value.length) return null;
  const items = value.map((item: any) => ({
    product_id: String(item?.product_id ?? ""),
    unit_cost: Number(item?.unit_cost ?? 0),
    allocations: Array.isArray(item?.allocations) ? item.allocations.map((allocation: any) => ({ store_id: String(allocation?.store_id ?? ""), quantity: Math.floor(Number(allocation?.quantity ?? 0)) })).filter((allocation: any) => allocation.store_id && allocation.quantity > 0) : [],
  }));
  if (items.some((item) => !item.product_id || !Number.isFinite(item.unit_cost) || item.unit_cost < 0 || !item.allocations.length)) return null;
  if (new Set(items.map((item) => item.product_id)).size !== items.length) return null;
  if (items.some((item) => new Set(item.allocations.map((allocation: any) => allocation.store_id)).size !== item.allocations.length)) return null;
  return items;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ id: body.purchase_order_id || crypto.randomUUID(), po_number: `PO-DEMO-${Date.now()}`, demo: true }, { status: body.action === "create" ? 201 : 200 });
    const auth = await requireRole(["owner", "admin", "manager", "warehouse"]);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (body.action === "create" || body.action === "update") {
      const items = normalizeItems(body.items);
      const shippingCost = Number(body.shipping_cost ?? 0);
      const discount = Number(body.discount ?? 0);
      const scope = String(body.receiving_scope ?? "selected");
      if (!body.supplier_id || !items || !["single","selected","all"].includes(scope) || !Number.isFinite(shippingCost) || shippingCost < 0 || !Number.isFinite(discount) || discount < 0) {
        return NextResponse.json({ error: "Data pembelian tidak valid. Periksa supplier, cabang, produk, jumlah, dan harga beli." }, { status: 400 });
      }
      const { data, error } = await auth.supabase.rpc("save_purchase_order_multi", {
        p_purchase_order_id: body.action === "update" ? body.purchase_order_id : null,
        p_supplier_id: body.supplier_id,
        p_receiving_scope: scope,
        p_items: items,
        p_shipping_cost: shippingCost,
        p_discount: discount,
        p_notes: String(body.notes ?? "").trim() || null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      const saved = Array.isArray(data) ? data[0] : data;
      if (!saved || !(saved as any).id) return NextResponse.json({ error: "PO tidak tersimpan karena database tidak mengembalikan ID pesanan." }, { status: 500 });
      revalidatePath("/purchases", "page");
      return NextResponse.json(saved, { status: body.action === "create" ? 201 : 200 });
    }
    if (body.action === "receive") {
      const { data, error } = await auth.supabase.rpc("receive_purchase_order", { p_purchase_order_id: body.purchase_order_id });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      revalidatePath("/purchases", "page");
      revalidatePath("/inventory", "page");
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: "Aksi pembelian tidak dikenal" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Terjadi kesalahan pada pembelian." }, { status: 500 });
  }
}
