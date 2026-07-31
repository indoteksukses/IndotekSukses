"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

export async function createProduct(formData: FormData) {
  if (isDemoMode || !hasSupabaseEnv) { revalidatePath("/products"); return; }
  const supabase = await createClient();
  const payload = {
    sku: String(formData.get("sku") ?? "").trim(),
    barcode: String(formData.get("barcode") ?? "").trim() || null,
    name: String(formData.get("name") ?? "").trim(),
    unit: String(formData.get("unit") ?? "pcs"),
    cost_price: Number(formData.get("cost_price") ?? 0),
    selling_price: Number(formData.get("selling_price") ?? 0),
    minimum_stock: Number(formData.get("minimum_stock") ?? 0),
    is_active: true,
  };
  const { error } = await supabase.from("products").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/products");
}
