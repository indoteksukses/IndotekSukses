"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

const invalidMessage = "Username/email atau password salah.";

export async function login(formData: FormData) {
  if (isDemoMode || !hasSupabaseEnv) redirect("/dashboard");
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) redirect(`/login?error=${encodeURIComponent(invalidMessage)}`);

  let email = identifier;
  if (!identifier.includes("@")) {
    const admin = createAdminClient();
    const { data: profile, error } = await admin.from("profiles").select("email,is_active,deleted_at").eq("username", identifier).is("deleted_at", null).maybeSingle();
    if (error) {
      const message = error.message.toLowerCase().includes("username")
        ? "Login username belum aktif. Jalankan migration v2.5.0 terlebih dahulu."
        : invalidMessage;
      redirect(`/login?error=${encodeURIComponent(message)}`);
    }
    if (!profile?.email || !profile.is_active) redirect(`/login?error=${encodeURIComponent(invalidMessage)}`);
    email = String(profile.email).toLowerCase();
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(invalidMessage)}`);
  redirect("/dashboard");
}
