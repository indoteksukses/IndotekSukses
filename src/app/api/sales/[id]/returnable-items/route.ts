import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ items: [{ sale_item_id: "demo-item", product_id: "p1", product_name: "Baut M8", sku: "BAUT-M8", purchased_quantity: 10, returned_quantity: 0, remaining_quantity: 10, unit_price: 3000 }] });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi login berakhir" }, { status: 401 });
  const { data, error } = await supabase.rpc("returnable_sale_items", { p_sale_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: (data ?? []).map((row: any) => ({
    sale_item_id: String(row.sale_item_id), product_id: String(row.product_id), product_name: String(row.product_name), sku: String(row.sku),
    purchased_quantity: Number(row.purchased_quantity), returned_quantity: Number(row.returned_quantity), remaining_quantity: Number(row.remaining_quantity), unit_price: Number(row.unit_price),
  })) });
}
