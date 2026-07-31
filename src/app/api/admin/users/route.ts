import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) return NextResponse.json({ error: "Service role belum dikonfigurasi" }, { status: 500 });

  const body = await request.json();
  const allowedRoles = ["admin", "manager", "cashier", "warehouse"];
  if (!body.email || !body.password || !body.full_name || !allowedRoles.includes(body.role)) {
    return NextResponse.json({ error: "Data karyawan tidak valid" }, { status: 400 });
  }

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  if (body.store_id) {
    const { data: store } = await admin.from("stores").select("id").eq("id", body.store_id).maybeSingle();
    if (!store) return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 400 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.full_name },
  });
  if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Gagal membuat pengguna" }, { status: 400 });

  const { error: profileError } = await admin.from("profiles").update({
    full_name: body.full_name,
    phone: body.phone || null,
    role: body.role,
    primary_store_id: body.store_id || null,
    is_active: true,
  }).eq("id", data.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (body.store_id) {
    const { error: accessError } = await admin.from("user_store_access").insert({ user_id: data.user.id, store_id: body.store_id });
    if (accessError) return NextResponse.json({ error: accessError.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user }, { status: 201 });
}
