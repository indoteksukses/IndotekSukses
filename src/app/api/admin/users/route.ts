import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

const ownerAssignable: UserRole[] = ["admin", "manager", "cashier", "warehouse"];
const adminAssignable: UserRole[] = ["manager", "cashier", "warehouse"];

function allowedRoles(actorRole: UserRole) {
  return actorRole === "owner" ? ownerAssignable : adminAssignable;
}

async function validateStores(admin: ReturnType<typeof createAdminClient>, storeIds: string[]) {
  if (!storeIds.length) return true;
  const unique = [...new Set(storeIds)];
  const { data } = await admin.from("stores").select("id").in("id", unique).eq("is_active", true);
  return (data ?? []).length === unique.length;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json();
  const actorRole = auth.profile.role as UserRole;
  const role = body.role as UserRole;
  const storeIds: string[] = [...new Set<string>((Array.isArray(body.store_ids) ? body.store_ids : body.store_id ? [body.store_id] : []).filter(Boolean).map((value: unknown) => String(value)))];
  if (!body.email || String(body.password ?? "").length < 8 || !String(body.full_name ?? "").trim() || !allowedRoles(actorRole).includes(role)) {
    return NextResponse.json({ error: "Data karyawan tidak valid atau role tidak diizinkan" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!(await validateStores(admin, storeIds))) return NextResponse.json({ error: "Salah satu toko tidak ditemukan atau sudah nonaktif" }, { status: 400 });

  const { data, error } = await admin.auth.admin.createUser({
    email: String(body.email).trim().toLowerCase(),
    password: String(body.password),
    email_confirm: true,
    user_metadata: { full_name: String(body.full_name).trim() },
  });
  if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Gagal membuat pengguna" }, { status: 400 });

  try {
    const primaryStoreId = body.primary_store_id || storeIds[0] || null;
    if (primaryStoreId && !storeIds.includes(String(primaryStoreId))) storeIds.unshift(String(primaryStoreId));
    const { error: profileError } = await admin.from("profiles").update({
      full_name: String(body.full_name).trim(),
      phone: String(body.phone ?? "").trim() || null,
      email: String(body.email).trim().toLowerCase(),
      role,
      primary_store_id: primaryStoreId,
      is_active: true,
    }).eq("id", data.user.id);
    if (profileError) throw profileError;

    if (storeIds.length) {
      const { error: accessError } = await admin.from("user_store_access").insert(storeIds.map((storeId) => ({ user_id: data.user.id, store_id: storeId })));
      if (accessError) throw accessError;
    }
    return NextResponse.json({ user: { id: data.user.id, email: data.user.email } }, { status: 201 });
  } catch (error) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal membuat pengguna" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json();
  const targetId = String(body.id ?? "");
  if (!targetId) return NextResponse.json({ error: "ID pengguna tidak ditemukan" }, { status: 400 });

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin.from("profiles").select("id,role").eq("id", targetId).single();
  if (targetError || !target) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  if (target.role === "owner") return NextResponse.json({ error: "Akun owner tidak dapat diubah dari menu karyawan" }, { status: 403 });

  const actorRole = auth.profile.role as UserRole;
  const role = body.role as UserRole;
  if (!allowedRoles(actorRole).includes(role)) return NextResponse.json({ error: "Anda tidak diizinkan menetapkan role tersebut" }, { status: 403 });

  const storeIds: string[] = [...new Set<string>((Array.isArray(body.store_ids) ? body.store_ids : []).filter(Boolean).map((value: unknown) => String(value)))];
  const primaryStoreId = body.primary_store_id || storeIds[0] || null;
  if (primaryStoreId && !storeIds.includes(String(primaryStoreId))) storeIds.unshift(String(primaryStoreId));
  if (!(await validateStores(admin, storeIds))) return NextResponse.json({ error: "Salah satu toko tidak ditemukan atau sudah nonaktif" }, { status: 400 });

  const { error } = await admin.from("profiles").update({
    full_name: String(body.full_name ?? "").trim(),
    phone: String(body.phone ?? "").trim() || null,
    role,
    primary_store_id: primaryStoreId,
    is_active: body.is_active !== false,
  }).eq("id", targetId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("user_store_access").delete().eq("user_id", targetId);
  if (storeIds.length) {
    const { error: accessError } = await admin.from("user_store_access").insert(storeIds.map((storeId) => ({ user_id: targetId, store_id: storeId })));
    if (accessError) return NextResponse.json({ error: accessError.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
