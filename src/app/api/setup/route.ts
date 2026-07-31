import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner");
    return NextResponse.json({ configured: (count ?? 0) > 0 });
  } catch (error) {
    return NextResponse.json({ configured: false, error: error instanceof Error ? error.message : "Konfigurasi belum lengkap" }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const body = await request.json();
    const fullName = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const companyName = String(body.company_name ?? "Indotek Sukses").trim();
    const storeName = String(body.store_name ?? "").trim();
    const storeCode = String(body.store_code ?? "IDS-01").trim().toUpperCase();

    if (!fullName || !email || password.length < 8 || !storeName || !storeCode) {
      return NextResponse.json({ error: "Lengkapi data. Password minimal 8 karakter." }, { status: 400 });
    }

    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner");
    if ((count ?? 0) > 0) return NextResponse.json({ error: "Sistem sudah memiliki akun owner." }, { status: 409 });

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (authError || !authData.user) throw new Error(authError?.message ?? "Gagal membuat owner");

    const { data: existingStore } = await admin.from("stores").select("id").eq("code", storeCode).maybeSingle();
    let storeId = existingStore?.id as string | undefined;
    if (storeId) {
      const { error } = await admin.from("stores").update({ name: storeName, address: body.store_address || null, phone: body.store_phone || null, image_url: String(body.store_image_url ?? "").trim() || null, is_active: true }).eq("id", storeId);
      if (error) throw error;
    } else {
      const { data: store, error } = await admin.from("stores").insert({ code: storeCode, name: storeName, address: body.store_address || null, phone: body.store_phone || null, image_url: String(body.store_image_url ?? "").trim() || null }).select("id").single();
      if (error || !store) throw new Error(error?.message ?? "Gagal membuat toko pertama");
      storeId = store.id;
    }

    const { error: profileError } = await admin.from("profiles").update({
      full_name: fullName,
      email,
      role: "owner",
      primary_store_id: storeId,
      is_active: true,
    }).eq("id", authData.user.id);
    if (profileError) throw profileError;

    const { error: accessError } = await admin.from("user_store_access").upsert({ user_id: authData.user.id, store_id: storeId }, { onConflict: "user_id,store_id" });
    if (accessError) throw accessError;

    await admin.from("system_settings").upsert({
      id: 1,
      company_name: companyName,
      company_tagline: "Inventory & Point of Sale",
      phone: body.company_phone || null,
      address: body.company_address || null,
      receipt_footer: `Terima kasih telah berbelanja di ${companyName}.`,
    });

    return NextResponse.json({ success: true, email, store_id: storeId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Setup gagal" }, { status: 500 });
  }
}
