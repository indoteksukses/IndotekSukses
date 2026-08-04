import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

const ownerAssignable: UserRole[] = ["admin", "manager", "cashier", "warehouse"];
const adminAssignable: UserRole[] = ["manager", "cashier", "warehouse"];
const usernamePattern = /^[a-z0-9._-]{3,32}$/;

function allowedRoles(actorRole: UserRole) {
  return actorRole === "owner" ? ownerAssignable : adminAssignable;
}

function normalizeUsername(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

async function validateStores(admin: ReturnType<typeof createAdminClient>, storeIds: string[]) {
  if (!storeIds.length) return true;
  const unique = [...new Set(storeIds)];
  const { data, error } = await admin.from("stores").select("id").in("id", unique).eq("is_active", true);
  return !error && (data ?? []).length === unique.length;
}

async function usernameAvailable(admin: ReturnType<typeof createAdminClient>, username: string, excludeId?: string) {
  let query = admin.from("profiles").select("id").eq("username", username).is("deleted_at", null);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw new Error(error.message.includes("username") ? "Migration v2.5.0 belum dijalankan: kolom username belum tersedia." : error.message);
  return !(data?.length);
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json();
    const actorRole = auth.profile.role as UserRole;
    const role = body.role as UserRole;
    const username = normalizeUsername(body.username);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const storeIds: string[] = [...new Set<string>((Array.isArray(body.store_ids) ? body.store_ids : body.store_id ? [body.store_id] : []).filter(Boolean).map((value: unknown) => String(value)))];

    if (!fullName || !email || password.length < 8 || !usernamePattern.test(username) || !allowedRoles(actorRole).includes(role)) {
      return NextResponse.json({ error: "Nama, username, email, password, atau role tidak valid. Username menggunakan 3–32 karakter: huruf, angka, titik, garis bawah, atau minus." }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!(await usernameAvailable(admin, username))) return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });
    if (!(await validateStores(admin, storeIds))) return NextResponse.json({ error: "Salah satu toko tidak ditemukan atau sudah nonaktif" }, { status: 400 });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, username },
    });
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Gagal membuat pengguna" }, { status: 400 });

    try {
      const primaryStoreId = body.primary_store_id || storeIds[0] || null;
      if (primaryStoreId && !storeIds.includes(String(primaryStoreId))) storeIds.unshift(String(primaryStoreId));
      const profilePayload = {
        id: data.user.id,
        full_name: fullName,
        username,
        phone: String(body.phone ?? "").trim() || null,
        email,
        role,
        primary_store_id: primaryStoreId,
        is_active: true,
        deleted_at: null,
        deleted_by: null,
      };
      const { error: profileError } = await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });
      if (profileError) throw profileError;

      if (storeIds.length) {
        const { error: accessError } = await admin.from("user_store_access").insert(storeIds.map((storeId) => ({ user_id: data.user.id, store_id: storeId })));
        if (accessError) throw accessError;
      }
      return NextResponse.json({ user: { id: data.user.id, username, email: data.user.email } }, { status: 201 });
    } catch (error) {
      await admin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal membuat pengguna" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Terjadi kesalahan saat membuat karyawan" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json();
    const targetId = String(body.id ?? "");
    if (!targetId) return NextResponse.json({ error: "ID pengguna tidak ditemukan" }, { status: 400 });

    const admin = createAdminClient();
    const { data: target, error: targetError } = await admin.from("profiles").select("id,role,email,username,deleted_at").eq("id", targetId).single();
    if (targetError || !target || target.deleted_at) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    if (target.role === "owner") return NextResponse.json({ error: "Akun owner tidak dapat diubah dari menu karyawan" }, { status: 403 });

    const actorRole = auth.profile.role as UserRole;
    const role = body.role as UserRole;
    if (!allowedRoles(actorRole).includes(role)) return NextResponse.json({ error: "Anda tidak diizinkan menetapkan role tersebut" }, { status: 403 });

    const storeIds: string[] = [...new Set<string>((Array.isArray(body.store_ids) ? body.store_ids : []).filter(Boolean).map((value: unknown) => String(value)))];
    const primaryStoreId = body.primary_store_id || storeIds[0] || null;
    if (primaryStoreId && !storeIds.includes(String(primaryStoreId))) storeIds.unshift(String(primaryStoreId));
    if (!(await validateStores(admin, storeIds))) return NextResponse.json({ error: "Salah satu toko tidak ditemukan atau sudah nonaktif" }, { status: 400 });

    const isOwner = actorRole === "owner";
    const username = isOwner ? normalizeUsername(body.username) : String(target.username ?? "");
    const email = isOwner ? String(body.email ?? "").trim().toLowerCase() : String(target.email ?? "");
    const newPassword = isOwner ? String(body.new_password ?? "") : "";
    if (isOwner && (!usernamePattern.test(username) || !email)) return NextResponse.json({ error: "Username atau email tidak valid" }, { status: 400 });
    if (newPassword && newPassword.length < 8) return NextResponse.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
    if (isOwner && !(await usernameAvailable(admin, username, targetId))) return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });

    const isActive = body.is_active !== false;
    const authUpdate: Record<string, unknown> = { ban_duration: isActive ? "none" : "876000h" };
    if (isOwner && email !== target.email) { authUpdate.email = email; authUpdate.email_confirm = true; }
    if (newPassword) authUpdate.password = newPassword;
    if (isOwner || !isActive) {
      const { error: authError } = await admin.auth.admin.updateUserById(targetId, authUpdate as any);
      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const { error } = await admin.from("profiles").update({
      full_name: String(body.full_name ?? "").trim(),
      username,
      email,
      phone: String(body.phone ?? "").trim() || null,
      role,
      primary_store_id: primaryStoreId,
      is_active: isActive,
    }).eq("id", targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await admin.from("user_store_access").delete().eq("user_id", targetId);
    if (storeIds.length) {
      const { error: accessError } = await admin.from("user_store_access").insert(storeIds.map((storeId) => ({ user_id: targetId, store_id: storeId })));
      if (accessError) return NextResponse.json({ error: accessError.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, password_changed: Boolean(newPassword) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Terjadi kesalahan saat memperbarui karyawan" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await request.json();
    const targetId = String(body.id ?? "");
    if (!targetId) return NextResponse.json({ error: "ID pengguna tidak ditemukan" }, { status: 400 });
    if (targetId === auth.user.id) return NextResponse.json({ error: "Akun yang sedang digunakan tidak dapat dihapus" }, { status: 403 });

    const admin = createAdminClient();
    const { data: target } = await admin.from("profiles").select("id,role,full_name,email,deleted_at").eq("id", targetId).maybeSingle();
    if (!target || target.deleted_at) return NextResponse.json({ error: "Karyawan tidak ditemukan" }, { status: 404 });
    if (target.role === "owner") return NextResponse.json({ error: "Akun owner tidak dapat dihapus" }, { status: 403 });
    if (auth.profile.role !== "owner" && target.role === "admin") return NextResponse.json({ error: "Hanya owner yang dapat menghapus admin" }, { status: 403 });

    const deletedEmail = `deleted-${targetId.replaceAll("-", "")}@accounts.invalid`;
    const { error: banError } = await admin.auth.admin.updateUserById(targetId, { ban_duration: "876000h", email: deletedEmail, email_confirm: true } as any);
    if (banError) return NextResponse.json({ error: banError.message }, { status: 400 });
    await admin.from("user_store_access").delete().eq("user_id", targetId);
    const { error: profileError } = await admin.from("profiles").update({ is_active: false, deleted_at: new Date().toISOString(), deleted_by: auth.user.id, primary_store_id: null }).eq("id", targetId);
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

    return NextResponse.json({ success: true, retained_history: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus karyawan" }, { status: 500 });
  }
}
