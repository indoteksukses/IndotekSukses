import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = path.startsWith("/login") || path.startsWith("/setup") || path.startsWith("/api/setup") || path.startsWith("/auth") || path.startsWith("/demo");
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  if (!user && !isPublic && !demo) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  let activeProfile = true;
  if (user && !demo) {
    const { data: profile } = await supabase.from("profiles").select("is_active,deleted_at").eq("id", user.id).maybeSingle();
    activeProfile = Boolean(profile?.is_active) && !profile?.deleted_at;
    if (!activeProfile) {
      await supabase.auth.signOut();
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("error", "Akun sudah dinonaktifkan. Hubungi owner.");
      return NextResponse.redirect(loginUrl);
    }
  }

  if (user && activeProfile && path === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
