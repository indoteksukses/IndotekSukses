import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

const avatars = new Set(["ocean","indigo","emerald","sunset","rose","violet","slate","cyan","amber","forest","berry","night","male-navy","male-brown","male-cap","female-rose","female-gold","hijab-blue","hijab-green","hijab-violet"]);

export async function PATCH(request: Request) {
  const body = await request.json();
  const avatarKey = String(body.avatar_key ?? "");
  if (!avatars.has(avatarKey)) return NextResponse.json({ error: "Avatar tidak valid" }, { status: 400 });
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ success: true, avatar_key: avatarKey, demo: true });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesi login berakhir" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });
  const payload: Record<string, unknown> = { avatar_key: avatarKey, updated_at: new Date().toISOString() };
  if (["owner", "admin"].includes(profile.role)) {
    if (body.full_name !== undefined) {
      const fullName = String(body.full_name).trim();
      if (!fullName) return NextResponse.json({ error: "Nama lengkap wajib diisi" }, { status: 400 });
      payload.full_name = fullName;
    }
    if (body.phone !== undefined) payload.phone = String(body.phone).trim() || null;
  }
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").update(payload).eq("id", user.id).select("id,full_name,email,phone,role,primary_store_id,is_active,avatar_key").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}
