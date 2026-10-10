import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export async function requireRole(roles: UserRole[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Sesi login berakhir", supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id,role,primary_store_id,is_active").eq("id", user.id).single();
  if (!profile?.is_active || !roles.includes(profile.role as UserRole)) return { ok: false as const, status: 403, error: "Anda tidak memiliki izin untuk tindakan ini", supabase, user, profile };
  return { ok: true as const, status: 200, error: null, supabase, user, profile };
}

export async function requireAdmin() {
  return requireRole(["owner", "admin"]);
}
