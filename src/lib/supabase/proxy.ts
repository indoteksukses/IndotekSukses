import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { extractSessionFromCookieList } from "@/lib/supabase/session";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const path = request.nextUrl.pathname;
  if (path.startsWith("/_next") || path.startsWith("/api") || path.includes(".")) return response;

  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/setup") ||
    path.startsWith("/api/setup") ||
    path.startsWith("/auth") ||
    path.startsWith("/demo") ||
    path.startsWith("/manifest");
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (demo) return response;

  // FAST PATH: Cek token JWT dari cookie lokal (0.05ms) tanpa HTTP request ke Supabase Cloud
  const cookieList = request.cookies.getAll();
  const sessionInfo = extractSessionFromCookieList(cookieList);

  if (sessionInfo && !sessionInfo.isExpired && !sessionInfo.needsRefresh) {
    if (path === "/login") {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
    return response;
  }

  // Pengguna belum login sama sekali mencoba akses halaman protected
  if (!sessionInfo && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // SLOW PATH: Token kedaluwarsa atau mendekati kedaluwarsa (< 60 detik tersisa)
  // Lakukan refresh token via Supabase SSR
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

  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (user && path === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

