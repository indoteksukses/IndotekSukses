import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function parseLocalAuthUser(request: NextRequest): { id: string } | null {
  try {
    const cookies = request.cookies.getAll();
    const authCookies = cookies.filter((c) => c.name.includes("-auth-token"));
    if (!authCookies.length) return null;

    let rawValue = "";
    if (authCookies.length === 1 && !authCookies[0].name.includes(".")) {
      rawValue = authCookies[0].value;
    } else {
      authCookies.sort((a, b) => a.name.localeCompare(b.name));
      rawValue = authCookies.map((c) => c.value).join("");
    }
    if (!rawValue) return null;

    let sessionData: any;
    if (rawValue.startsWith("base64-")) {
      const decoded = Buffer.from(rawValue.slice(7), "base64").toString("utf8");
      sessionData = JSON.parse(decoded);
    } else {
      try {
        sessionData = JSON.parse(rawValue);
      } catch {
        const decoded = Buffer.from(rawValue, "base64").toString("utf8");
        sessionData = JSON.parse(decoded);
      }
    }

    const token = sessionData?.access_token;
    if (!token || typeof token !== "string") return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);

    // Jika token masih berlaku (dengan buffer 30 detik), verifikasi lokal lolos instan
    if (payload.exp && payload.exp > now + 30 && payload.sub) {
      return { id: String(payload.sub) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const path = request.nextUrl.pathname;
  if (path.startsWith("/_next")) return response;

  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/setup") ||
    path.startsWith("/api/setup") ||
    path.startsWith("/auth") ||
    path.startsWith("/demo") ||
    path.startsWith("/manifest");
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  // Fast-path: Cek JWT token secara lokal (< 2ms) tanpa network call ke Supabase
  let user: { id: string } | null = parseLocalAuthUser(request);

  // Jika token lokal tidak ada atau expired, baru buat client dan panggil Supabase untuk refresh
  if (!user && !isPublic && !demo) {
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
    user = data?.user ?? null;
  }

  if (!user && !isPublic && !demo) {
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
