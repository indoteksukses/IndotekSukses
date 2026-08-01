import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

function optionalHttpsUrl(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const companyName = String(body.company_name ?? "").trim();
  const logoUrl = optionalHttpsUrl(body.logo_url);
  if (!companyName) return NextResponse.json({ error: "Nama perusahaan wajib diisi" }, { status: 400 });
  if (logoUrl === undefined) return NextResponse.json({ error: "URL logo harus berupa alamat HTTPS yang valid" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ settings: { ...body, logo_url: logoUrl }, demo: true });

  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const payload = {
    id: 1,
    company_name: companyName,
    company_tagline: String(body.company_tagline ?? "").trim() || "Inventory & Point of Sale",
    logo_url: logoUrl,
    phone: String(body.phone ?? "").trim() || null,
    address: String(body.address ?? "").trim() || null,
    receipt_footer: String(body.receipt_footer ?? "").trim() || `Terima kasih telah berbelanja di ${companyName}.`,
    updated_at: new Date().toISOString(),
    updated_by: auth.user.id,
  };
  const { data, error } = await auth.supabase.from("system_settings").upsert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: data });
}
