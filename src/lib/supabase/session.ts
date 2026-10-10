/**
 * session.ts — Fast-path session extractor dari Supabase auth cookies.
 *
 * Membaca & mendecode payload JWT langsung dari cookie browser tanpa
 * melakukan round-trip HTTP ke Supabase Cloud (0.05ms vs 250ms+).
 */

export interface DecodedSessionInfo {
  userId: string;
  email: string | null;
  role: string | null;
  userMetadata: Record<string, any> | null;
  exp: number;
  isExpired: boolean;
  needsRefresh: boolean;
}

function decodeJwtPayload(jwt: string): any | null {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function parseChunkValue(raw: string): string {
  let val = raw;
  if (val.startsWith("base64-")) {
    try {
      val = Buffer.from(val.slice(7), "base64url").toString("utf-8");
    } catch {
      // fallback as-is
    }
  }
  return val;
}

export function extractSessionFromCookieList(
  cookies: Array<{ name: string; value: string }>
): DecodedSessionInfo | null {
  if (!cookies || !cookies.length) return null;

  // Filter cookie yang terkait dengan auth supabase
  const authCookies = cookies.filter(
    (c) => c.name.includes("-auth-token") || c.name === "supabase-auth-token"
  );
  if (!authCookies.length) return null;

  // Urutkan chunk: nama induk dulu, lalu .0, .1, .2 ...
  authCookies.sort((a, b) => {
    const aParts = a.name.split(".");
    const bParts = b.name.split(".");
    const aNum = aParts.length > 1 ? parseInt(aParts[1], 10) : -1;
    const bNum = bParts.length > 1 ? parseInt(bParts[1], 10) : -1;
    return aNum - bNum;
  });

  const rawJoined = authCookies.map((c) => c.value).join("");
  if (!rawJoined) return null;

  const decodedRaw = parseChunkValue(rawJoined);
  let parsedJson: any = null;

  try {
    parsedJson = JSON.parse(decodedRaw);
  } catch {
    try {
      parsedJson = JSON.parse(decodeURIComponent(decodedRaw));
    } catch {
      return null;
    }
  }

  if (!parsedJson) return null;

  // Supabase SSR bisa menyimpan session tunggal atau array
  const session = Array.isArray(parsedJson) ? parsedJson[0] : parsedJson;
  const accessToken = session?.access_token;
  if (!accessToken || typeof accessToken !== "string") return null;

  const payload = decodeJwtPayload(accessToken);
  if (!payload) return null;

  const exp = Number(payload.exp ?? session?.expires_at ?? 0);
  const now = Math.floor(Date.now() / 1000);
  const isExpired = exp > 0 && exp <= now;
  const needsRefresh = exp > 0 && exp - now < 60; // Refresh jika sisa < 60 detik

  const userId = String(payload.sub || session?.user?.id || "");
  if (!userId) return null;

  return {
    userId,
    email: payload.email || session?.user?.email || null,
    role: payload.role || session?.user?.role || "authenticated",
    userMetadata: payload.user_metadata || session?.user?.user_metadata || null,
    exp,
    isExpired,
    needsRefresh,
  };
}
