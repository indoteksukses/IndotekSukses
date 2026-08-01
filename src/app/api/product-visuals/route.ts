import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";
import type { ProductVisualDefinition, ProductVisualElement, ProductVisualShape } from "@/lib/types";

const shapes = new Set<ProductVisualShape>(["bolt","nut","screw","wrench","drill","grinder","saw","hammer","pliers","bearing","tape","generic","custom"]);
const elementTypes = new Set<ProductVisualElement["type"]>(["path","rect","circle","ellipse","polygon","line"]);
const colorPattern = /^#[0-9a-f]{6}$/i;
const paintNames = new Set(["primary", "secondary", "accent", "none", "white", "transparent"]);
const pathPattern = /^[MmLlHhVvCcSsQqTtAaZz0-9,\.\-\s]+$/;
const pointsPattern = /^[0-9,\.\-\s]+$/;

function number(value: unknown, min = -100, max = 200) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error("Koordinat elemen visual tidak valid");
  return parsed;
}

function optionalNumber(value: unknown, min = -100, max = 200) {
  return value == null ? undefined : number(value, min, max);
}

function paint(value: unknown) {
  if (value == null || value === "") return undefined;
  const text = String(value);
  if (!paintNames.has(text) && !colorPattern.test(text)) throw new Error(`Warna ${text} tidak valid`);
  return text;
}

function normalizeElement(input: unknown): ProductVisualElement {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Setiap elemen custom harus berupa objek");
  const raw = input as Record<string, unknown>;
  const type = String(raw.type ?? "") as ProductVisualElement["type"];
  if (!elementTypes.has(type)) throw new Error("Tipe elemen custom tidak dikenali");
  const base: ProductVisualElement = {
    type,
    fill: paint(raw.fill),
    stroke: paint(raw.stroke),
    strokeWidth: optionalNumber(raw.strokeWidth, 0, 12),
    opacity: optionalNumber(raw.opacity, 0, 1),
    rotate: optionalNumber(raw.rotate, -360, 360),
  };
  if (type === "path") {
    const d = String(raw.d ?? "");
    if (!d || d.length > 800 || !pathPattern.test(d)) throw new Error("Path custom tidak valid");
    return { ...base, d };
  }
  if (type === "polygon") {
    const points = String(raw.points ?? "");
    if (!points || points.length > 500 || !pointsPattern.test(points)) throw new Error("Titik polygon tidak valid");
    return { ...base, points };
  }
  if (type === "line") return { ...base, x1: number(raw.x1), y1: number(raw.y1), x2: number(raw.x2), y2: number(raw.y2) };
  if (type === "circle") return { ...base, cx: number(raw.cx), cy: number(raw.cy), r: number(raw.r, 0, 100) };
  if (type === "ellipse") return { ...base, cx: number(raw.cx), cy: number(raw.cy), width: number(raw.width, 0, 100), height: number(raw.height, 0, 100) };
  return { ...base, x: number(raw.x), y: number(raw.y), width: number(raw.width, 0, 200), height: number(raw.height, 0, 200), rx: optionalNumber(raw.rx, 0, 100) };
}

function normalizeCode(input: unknown): ProductVisualDefinition {
  let raw: unknown = input;
  if (typeof input === "string") {
    try { raw = JSON.parse(input); } catch { throw new Error("Kode visual harus berupa JSON yang valid"); }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Kode visual harus berupa objek JSON");
  const value = raw as Record<string, unknown>;
  const shape = String(value.shape ?? "generic") as ProductVisualShape;
  if (!shapes.has(shape)) throw new Error("Bentuk visual tidak dikenali");
  const result: ProductVisualDefinition = { shape };
  for (const key of ["primary","secondary","accent","background"] as const) {
    const color = value[key];
    if (color != null && !colorPattern.test(String(color))) throw new Error(`${key} harus menggunakan warna hex 6 digit, contoh #2563eb`);
    if (color) result[key] = String(color);
  }
  if (shape === "custom") {
    if (!Array.isArray(value.elements) || value.elements.length === 0) throw new Error("Visual custom membutuhkan minimal satu elemen");
    if (value.elements.length > 30) throw new Error("Visual custom maksimal 30 elemen");
    result.elements = value.elements.map(normalizeElement);
  }
  return result;
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nama visual wajib diisi" }, { status: 400 });
  let code: ProductVisualDefinition;
  try { code = normalizeCode(body.code); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Kode visual tidak valid" }, { status: 400 }); }
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ visual: { id: crypto.randomUUID(), name, code, is_builtin: false, is_active: true } }, { status: 201 });
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = crypto.randomUUID();
  const { error } = await auth.supabase.from("product_visuals").insert({ id, name, code, is_builtin: false, is_active: true, created_by: auth.user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ visual: { id, name, code, is_builtin: false, is_active: true } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = String(body.id ?? "");
  const name = String(body.name ?? "").trim();
  if (!id || !name) return NextResponse.json({ error: "Visual dan nama wajib diisi" }, { status: 400 });
  let code: ProductVisualDefinition;
  try { code = normalizeCode(body.code); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Kode visual tidak valid" }, { status: 400 }); }
  if (isDemoMode || !hasSupabaseEnv) return NextResponse.json({ visual: { id, name, code, is_builtin: false, is_active: body.is_active !== false } });
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data: existing } = await auth.supabase.from("product_visuals").select("is_builtin").eq("id", id).maybeSingle();
  const update = existing?.is_builtin ? { is_active: body.is_active !== false } : { name, code, is_active: body.is_active !== false, updated_at: new Date().toISOString() };
  const { error } = await auth.supabase.from("product_visuals").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ visual: { id, name, code, is_builtin: Boolean(existing?.is_builtin), is_active: body.is_active !== false } });
}
