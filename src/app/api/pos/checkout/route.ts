import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import { invalidateTags } from "@/lib/cache";

export async function POST(request: Request) {
  const body = await request.json();
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Keranjang kosong" }, { status: 400 });
  }

  if (isDemoMode || !hasSupabaseEnv) {
    return NextResponse.json({
      sale_id: crypto.randomUUID(),
      invoice_number: `DEMO-${Date.now()}`,
      grand_total: Number(body.grand_total ?? 0),
      demo: true,
    });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi login berakhir" }, { status: 401 });

  const { data, error } = await supabase.rpc("complete_sale", {
    p_store_id: body.store_id,
    p_shift_id: body.shift_id || null,
    p_customer_name: body.customer_name || null,
    p_items: body.items.map((item: { product_id: string; variant_id?: string | null; quantity: number }) => ({
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: Number(item.quantity),
    })),
    p_payments: body.payments,
    p_discount: Number(body.discount ?? 0),
    p_notes: body.notes || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  invalidateTags("catalog", "sales");
  return NextResponse.json(data);
}

