export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http") &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("SENSITIVE") &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.includes("SENSITIVE"),
);

export const hasAdminKey = Boolean(
  (process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SECRET_KEY.includes("SENSITIVE")) ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("SENSITIVE")),
);

