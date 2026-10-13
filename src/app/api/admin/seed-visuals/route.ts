import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidateTags } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleSeed(request);
}

export async function POST(request: Request) {
  return handleSeed(request);
}

async function handleSeed(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("secret");
    if (token !== "indotek-seed-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 1. Ensure Tang visual exists
    const tangVisualId = "31000000-0000-0000-0000-000000000009";
    const { data: existingTang } = await admin.from("product_visuals").select("id").eq("id", tangVisualId).maybeSingle();
    if (!existingTang) {
      await admin.from("product_visuals").insert({
        id: tangVisualId,
        name: "Tang Kombinasi",
        code: {
          shape: "pliers",
          primary: "#334155",
          secondary: "#64748b",
          accent: "#dc2626",
          background: "#fef2f2"
        },
        is_builtin: true,
        is_active: true
      });
    }

    // 2. Ensure Kunci L visual exists
    let { data: existingKunciL } = await admin.from("product_visuals").select("id").eq("name", "Kunci L (Hex Key)").maybeSingle();
    let kunciLVisualId = existingKunciL?.id;

    if (!kunciLVisualId) {
      const { data: insertedKunciL, error: insertError } = await admin.from("product_visuals").insert({
        name: "Kunci L (Hex Key)",
        code: {
          shape: "custom",
          primary: "#0f766e",
          secondary: "#14b8a6",
          accent: "#f59e0b",
          background: "#f0fdfa",
          elements: [
            { type: "path", d: "M28 20v40a8 8 0 0 0 8 8h24", stroke: "primary", strokeWidth: 10, opacity: 1 },
            { type: "path", d: "M28 20v40a8 8 0 0 0 8 8h24", stroke: "secondary", strokeWidth: 5, opacity: 1 },
            { type: "circle", cx: 28, cy: 20, r: 3.5, fill: "accent", stroke: "none" },
            { type: "circle", cx: 60, cy: 68, r: 3.5, fill: "accent", stroke: "none" }
          ]
        },
        is_builtin: false,
        is_active: true
      }).select("id").single();

      if (insertError) {
        throw insertError;
      }
      kunciLVisualId = insertedKunciL?.id;
    }

    // 3. Update Batch 1 products
    const kunciPasVisualId = "31000000-0000-0000-0000-000000000004";
    const paluVisualId = "31000000-0000-0000-0000-000000000008";

    const productsToUpdate = [
      { id: "738ffcc7-8ff7-401b-8d89-9cc770fa8606", name: "Kunci Pas", visual_id: kunciPasVisualId },
      { id: "15aba693-9ea0-4868-9051-2965ffab45e5", name: "Kunci Ring Pas", visual_id: kunciPasVisualId },
      { id: "4b6031db-44ff-4ff8-96f7-96afe1598e1a", name: "Kunci L Panjang", visual_id: kunciLVisualId },
      { id: "098efc50-1159-48e9-9ab1-b21910bdf3d5", name: "Tang Buaya - 10\"", visual_id: tangVisualId },
      { id: "ec6a1730-7a2c-4743-88a4-076cc53d0c45", name: "Palu Kambing", visual_id: paluVisualId },
      { id: "4e4652b0-4686-4208-b14e-937f25289341", name: "Palu Bodem", visual_id: paluVisualId }
    ];

    const results = [];
    for (const item of productsToUpdate) {
      const { error } = await admin
        .from("products")
        .update({ visual_id: item.visual_id, updated_at: new Date().toISOString() })
        .eq("id", item.id);

      results.push({
        name: item.name,
        id: item.id,
        visual_id: item.visual_id,
        success: !error,
        error: error?.message || null
      });
    }

    invalidateTags("products", "product_visuals", "catalog");

    return NextResponse.json({
      success: true,
      message: "Batch 1 visuals applied successfully",
      kunciLVisualId,
      tangVisualId,
      results
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal error"
    }, { status: 500 });
  }
}
