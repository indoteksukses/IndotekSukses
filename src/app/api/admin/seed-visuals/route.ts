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

    // 1. Ensure Baut Hexagonal visual exists
    const bautHexVisualId = "31000000-0000-0000-0000-000000000001";
    const { data: existingBautHex } = await admin.from("product_visuals").select("id").eq("id", bautHexVisualId).maybeSingle();
    if (!existingBautHex) {
      await admin.from("product_visuals").insert({
        id: bautHexVisualId,
        name: "Baut Hexagonal",
        code: {
          shape: "bolt",
          primary: "#334155",
          secondary: "#94a3b8",
          accent: "#f59e0b",
          background: "#eff6ff"
        },
        is_builtin: true,
        is_active: true
      });
    }

    // 2. Ensure Air Chuck visual exists
    const airChuckVisualId = "0325a205-82aa-4456-8a13-8cc1678c3c95";
    const { data: existingAirChuck } = await admin.from("product_visuals").select("id").eq("id", airChuckVisualId).maybeSingle();
    if (!existingAirChuck) {
      await admin.from("product_visuals").insert({
        id: airChuckVisualId,
        name: "Air Chuck",
        code: {
          shape: "custom",
          primary: "#1e293b",
          secondary: "#64748b",
          accent: "#d97706",
          background: "#f8fafc",
          elements: [
            { type: "rect", x: 18, y: 38, width: 46, height: 14, rx: 3, fill: "secondary", stroke: "primary", strokeWidth: 2 },
            { type: "rect", x: 56, y: 34, width: 20, height: 22, rx: 4, fill: "accent", stroke: "primary", strokeWidth: 2 },
            { type: "circle", cx: 66, cy: 45, r: 6, fill: "primary" },
            { type: "path", d: "M40 38 L48 24 L58 24 L54 38 Z", fill: "primary", stroke: "secondary", strokeWidth: 1.5 },
            { type: "rect", x: 10, y: 41, width: 10, height: 8, rx: 2, fill: "accent", stroke: "primary", strokeWidth: 1.5 },
            { type: "line", x1: 24, y1: 42, x2: 24, y2: 48, stroke: "primary", strokeWidth: 2 },
            { type: "line", x1: 30, y1: 42, x2: 30, y2: 48, stroke: "primary", strokeWidth: 2 },
            { type: "line", x1: 36, y1: 42, x2: 36, y2: 48, stroke: "primary", strokeWidth: 2 }
          ]
        },
        is_builtin: false,
        is_active: true
      });
    }

    // 3. Ensure Tang visual exists
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

    // 4. Ensure Kunci L visual exists
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

    // 5. Visual IDs for restorations
    const ringKaretVisualId = "bbdbdfa2-8e48-40ae-b7e0-fda62219d9fe";
    const adaptorSocketVisualId = "5ec06f22-ed68-4e73-8846-ce71d4093cea";
    const batuAsahVisualId = "dab920e8-ec54-49d2-8739-fcfa7d027e21";
    const perkakasUmumVisualId = "31000000-0000-0000-0000-000000000012";
    const borTanganVisualId = "31000000-0000-0000-0000-000000000005";
    const kunciRingPasVisualId = "1578df08-5785-4779-bde3-c715d040f47f";
    const kunciPasVisualId = "31000000-0000-0000-0000-000000000004";
    const paluVisualId = "31000000-0000-0000-0000-000000000008";

    const productsToUpdate = [
      // Kunci Pas & Ring Pas & Palu
      { id: "738ffcc7-8ff7-401b-8d89-9cc770fa8606", name: "Kunci Pas", visual_id: kunciPasVisualId },
      { id: "15aba693-9ea0-4868-9051-2965ffab45e5", name: "Kunci Ring Pas", visual_id: kunciRingPasVisualId },
      { id: "4b6031db-44ff-4ff8-96f7-96afe1598e1a", name: "Kunci L Panjang", visual_id: kunciLVisualId },
      { id: "098efc50-1159-48e9-9ab1-b21910bdf3d5", name: "Tang Buaya - 10\"", visual_id: tangVisualId },
      { id: "ec6a1730-7a2c-4743-88a4-076cc53d0c45", name: "Palu Kambing", visual_id: paluVisualId },
      { id: "4e4652b0-4686-4208-b14e-937f25289341", name: "Palu Bodem", visual_id: paluVisualId },

      // Air Chuck (5 products)
      { id: "008bb0d5-4da6-45b7-8fb8-e9d20007b8e8", name: "Air chuck - Tire Guge Model Jepitan Kuningan", visual_id: airChuckVisualId },
      { id: "d32c8ca2-bcc1-4f9b-9782-897e04fc3ba8", name: "Air chuck - Tire Gauge Pen (Stick)", visual_id: airChuckVisualId },
      { id: "fef84f6f-c74e-4176-997c-2083363dd301", name: "Air chuck - Model Keong", visual_id: airChuckVisualId },
      { id: "b714e17d-a418-4f09-b0e1-31c6b354cc08", name: "Air chuck", visual_id: airChuckVisualId },
      { id: "1d7e5138-3571-402a-b764-3fc4f32b54de", name: "Air chuck", visual_id: airChuckVisualId },

      // Ring Karet (4 products)
      { id: "6b96adb8-4b1a-455d-8b67-e989117cc203", name: "\"O\" Ring karet pompa air", visual_id: ringKaretVisualId },
      { id: "c1f32291-3406-4bd1-bc1e-c772d567b08e", name: "\"O\" Ring karet pompa air", visual_id: ringKaretVisualId },
      { id: "9c8822b3-f14e-4519-8988-b0999d677e86", name: "\"O\" Ring karet pompa air", visual_id: ringKaretVisualId },
      { id: "eb7e46f1-3ed8-4b0e-a6c8-d1468221446f", name: "\"O\" Ring karet pompa air", visual_id: ringKaretVisualId },

      // Adaptor Socket (3 products)
      { id: "142d23cf-4871-48c8-ab8e-0942928d6e3a", name: "Adaptor Socket", visual_id: adaptorSocketVisualId },
      { id: "95f7def5-b8f6-4df8-8162-21bae38c0189", name: "Kunci Adaptor Socket", visual_id: adaptorSocketVisualId },
      { id: "d3e4ec96-764a-4379-9ea5-85c2691fa9e4", name: "Socket adapter telescopic 1/2 ke 1/4", visual_id: adaptorSocketVisualId },

      // Batu Asah Model Lepek (9 products)
      { id: "80175ea0-4049-4f91-9695-053211e61bbe", name: "Batu asah Model lepek - 5\" · Planner", visual_id: batuAsahVisualId },
      { id: "29826c4a-0dc6-46db-b897-8fe2e77b3662", name: "Batu asah Model lepek - 5\" · Planner", visual_id: batuAsahVisualId },
      { id: "4a9f4601-33f8-4411-aa3c-2aceacfa19f4", name: "Batu asah Model lepek - 5\" · Planner", visual_id: batuAsahVisualId },
      { id: "696176a2-824f-410e-a216-1771e274528d", name: "Batu asah Model lepek - 5\" · Planner", visual_id: batuAsahVisualId },
      { id: "f16e7825-d46b-4d7a-8b61-237e5f382994", name: "Batu asah Model lepek - 5\" · Planner", visual_id: batuAsahVisualId },
      { id: "7ef635e6-0e6f-4378-b7de-87a8aa353c21", name: "Batu asah Model lepek - 5\" · Planner", visual_id: batuAsahVisualId },
      { id: "d709d1ec-4982-4611-8230-cca51198e9fd", name: "Batu asah Model lepek - 5\" · Planner", visual_id: batuAsahVisualId },
      { id: "2ccdf417-93ee-4ae4-b7a5-b95866906dda", name: "Batu asah Model lepek - 5\" · Planner", visual_id: batuAsahVisualId },
      { id: "41aad5bd-b6f2-40d6-b78d-f22ce77b1029", name: "Batu asah Model lepek - 5\" · Planner", visual_id: batuAsahVisualId },

      // Non-socket items back to Perkakas Umum
      { id: "5aa8da90-28d5-40a6-9d05-a357be212070", name: "Socket polos PVC", visual_id: perkakasUmumVisualId },
      { id: "ea4cc453-28c8-4a80-b07f-2783a5a2418e", name: "Socket Reducer polos PVC", visual_id: perkakasUmumVisualId },
      { id: "fb72a158-3fd5-4239-9adc-153bf191bbba", name: "Socket konektor las Famale - 900 / 1300 watt", visual_id: perkakasUmumVisualId },
      { id: "c4de0535-b6b9-46fd-a1d6-e3e3d7813917", name: "Socket konektor las Male - 900 / 1300 watt", visual_id: perkakasUmumVisualId },

      // Bolts back to Baut Hexagonal
      { id: "d0a95ba8-2184-4f47-872e-755924a79bbf", name: "Baut Motor Obeng M5 - 5 x 8", visual_id: bautHexVisualId },
      { id: "607ee47f-8524-4710-a55c-45141bc1e0e1", name: "Baut pompa air Shiimizu - 5,11,8 Kc.6 ob. +", visual_id: bautHexVisualId },
      { id: "4dabeb9f-7c96-4029-b2d3-b418b4ecf4fc", name: "Baut Mata Planner - 6 Kc. 10", visual_id: bautHexVisualId },

      // Bor Tangan (Mollar)
      { id: "ece37240-4a1a-49e1-bb7d-867fd119ebfa", name: "Bor Tangan", visual_id: borTanganVisualId }
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
      message: "Visuals and products restored successfully",
      bautHexVisualId,
      airChuckVisualId,
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
