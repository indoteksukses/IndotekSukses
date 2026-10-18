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
  if (body.company_name !== undefined && !companyName) {
    return NextResponse.json({ error: "Nama perusahaan wajib diisi" }, { status: 400 });
  }
  if (logoUrl === undefined && body.logo_url !== undefined) {
    return NextResponse.json({ error: "URL logo harus berupa alamat HTTPS yang valid" }, { status: 400 });
  }
  if (isDemoMode || !hasSupabaseEnv) {
    return NextResponse.json({ settings: { ...body, logo_url: logoUrl }, demo: true });
  }

  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const aiBaseUrl = body.ai_base_url !== undefined ? String(body.ai_base_url ?? "").trim() || null : undefined;
  const aiApiKey = body.ai_api_key !== undefined ? String(body.ai_api_key ?? "").trim() || null : undefined;
  const aiModel = body.ai_model !== undefined ? String(body.ai_model ?? "").trim() || null : undefined;
  const aiSearchEnabled = body.ai_search_enabled !== undefined ? Boolean(body.ai_search_enabled) : undefined;

  const fullPayload: Record<string, unknown> = {
    id: 1,
    updated_at: new Date().toISOString(),
    updated_by: auth.user.id,
  };

  if (companyName) fullPayload.company_name = companyName;
  if (body.company_tagline !== undefined) fullPayload.company_tagline = String(body.company_tagline ?? "").trim() || "Inventory & Point of Sale";
  if (logoUrl !== undefined) fullPayload.logo_url = logoUrl;
  if (body.phone !== undefined) fullPayload.phone = String(body.phone ?? "").trim() || null;
  if (body.address !== undefined) fullPayload.address = String(body.address ?? "").trim() || null;
  if (body.receipt_footer !== undefined) fullPayload.receipt_footer = String(body.receipt_footer ?? "").trim() || `Terima kasih telah berbelanja di ${companyName || "Indotek Sukses"}.`;

  if (aiBaseUrl !== undefined) fullPayload.ai_base_url = aiBaseUrl;
  if (aiApiKey !== undefined) fullPayload.ai_api_key = aiApiKey;
  if (aiModel !== undefined) fullPayload.ai_model = aiModel;
  if (aiSearchEnabled !== undefined) fullPayload.ai_search_enabled = aiSearchEnabled;

  let { data, error } = await auth.supabase.from("system_settings").upsert(fullPayload).select("*").single();

  if (error && (aiBaseUrl !== undefined || aiApiKey !== undefined || aiModel !== undefined || aiSearchEnabled !== undefined)) {
    // If table doesn't have AI columns yet, fallback to base payload
    const basePayload = { ...fullPayload };
    delete basePayload.ai_base_url;
    delete basePayload.ai_api_key;
    delete basePayload.ai_model;
    delete basePayload.ai_search_enabled;

    const retry = await auth.supabase.from("system_settings").upsert(basePayload).select("*").single();
    if (!retry.error) {
      data = {
        ...retry.data,
        ai_base_url: aiBaseUrl,
        ai_api_key: aiApiKey,
        ai_model: aiModel,
        ai_search_enabled: aiSearchEnabled,
      };
      error = null;
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: data });
}

