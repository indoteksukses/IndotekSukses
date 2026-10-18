import { NextResponse } from "next/server";
import { getProductsWithStocks, getSystemSettings } from "@/lib/data";
import type { AIMatchItem, AISearchResponse, Product, ProductVariant } from "@/lib/types";

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const query = String(body.query ?? "").trim();
    const storeId = body.store_id ? String(body.store_id) : undefined;

    if (!query) {
      return NextResponse.json({ success: true, query: "", matches: [] });
    }

    // Resolve AI settings: body overrides -> system settings -> environment defaults
    const systemSettings = await getSystemSettings().catch(() => null);

    let baseUrl =
      String(body.base_url ?? "").trim() ||
      systemSettings?.ai_base_url ||
      process.env.OPENAI_BASE_URL ||
      process.env.AI_BASE_URL ||
      "";

    let model =
      String(body.model ?? "").trim() ||
      systemSettings?.ai_model ||
      process.env.OPENAI_MODEL ||
      process.env.AI_MODEL ||
      "";

    const apiKey =
      String(body.api_key ?? "").trim() ||
      systemSettings?.ai_api_key ||
      process.env.OPENAI_API_KEY ||
      process.env.AI_API_KEY ||
      "";

    if (!baseUrl || !model) {
      return NextResponse.json(
        {
          success: false,
          query,
          matches: [],
          error:
            "Pengaturan AI belum lengkap. Harap masukkan Base URL dan Nama Model di menu Pengaturan atau melalui tombol Pengaturan AI di POS.",
        },
        { status: 400 }
      );
    }

    // Clean Base URL
    baseUrl = baseUrl.replace(/\/+$/, "");
    let endpoint = `${baseUrl}/chat/completions`;
    if (baseUrl.endsWith("/chat/completions")) {
      endpoint = baseUrl;
    }

    // Load store catalog
    const products: Product[] = await getProductsWithStocks(storeId, false);
    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        query,
        interpretation: "Katalog produk kosong",
        matches: [],
        latency_ms: Date.now() - startTime,
      });
    }

    // Build a compact catalog dictionary for fast, token-efficient LLM analysis
    const catalogDigest = products.map((p) => {
      const activeVars = (p.variants ?? []).filter((v) => v.is_active !== false);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        cat: p.category || "Umum",
        brand: p.brand || "",
        stock: p.selected_stock ?? p.total_stock ?? 0,
        variants: activeVars.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          stock: v.selected_stock ?? 0,
        })),
      };
    });

    const systemPrompt = `Anda adalah asisten pencarian cerdas katalog barang toko teknik & bangunan "Indotek Sukses".
Tugas Anda adalah memetakan perkataan pembeli (yang seringkali menggunakan bahasa sehari-hari, bahasa tukang, nama daerah/slang, atau deskripsi fungsi) ke produk dan varian yang tepat di katalog toko kami.

Karakteristik permintaan pembeli:
1. Istilah Sehari-hari / Slang:
   - "kran leher angsa / lentur / cuci piring" -> Kran Sink Fleksibel
   - "batu gerinda tipis potong besi" -> Batu Gerinda Potong WD
   - "lem paralon pipa" -> Lem Pipa PVC
   - "mata bor beton" -> Mata Bor Tembok / Beton
   - "stop kontak colokan panjang" -> Stop Kontak Kabel
   - "kabel serabut merah hitam" -> Kabel Twin / Speaker / NYAF
   - "kunci inggris sedang" -> Kunci Inggris 8" / 10"
   - "obeng bolak balik" -> Obeng 2 Way
   - "gembok leher panjang" -> Gembok Long
2. Ukuran atau varian spesifik (misal: 4 inch, 10mm, 3 meter, meja vs tembok).

PANDUAN OUTPUT:
Pilih maksimal 5 produk (atau varian) yang PALING RELEVAN dari katalog yang disediakan.
Kembalikan HANYA teks JSON valid dengan struktur:
{
  "interpretation": "Penjelasan singkat maksud pembeli (maksimal 1 kalimat)",
  "matches": [
    {
      "product_id": "ID_PRODUK",
      "variant_id": "ID_VARIAN_JIKA_ADA_ATAU_NULL",
      "confidence": 0.95,
      "reason": "Alasan singkat kecocokan (misal: Sesuai fungsi kran cuci piring leher fleksibel)"
    }
  ]
}
Catatan: Jika benar-benar tidak ada barang yang berhubungan, kembalikan matches: []. Jangan membuat ID produk baru di luar katalog yang diberikan.`;

    const userPrompt = `Permintaan / Kata Pembeli: "${query}"

Katalog Toko Tersedia:
${JSON.stringify(catalogDigest)}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const llmResponse = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 700,
      }),
    });
    clearTimeout(timeout);

    if (!llmResponse.ok) {
      const errJson = await llmResponse.json().catch(() => null);
      const errMsg =
        errJson?.error?.message ||
        errJson?.error ||
        errJson?.message ||
        `HTTP ${llmResponse.status}: ${llmResponse.statusText}`;
      return NextResponse.json(
        {
          success: false,
          query,
          matches: [],
          error: `Gagal memanggil model ${model}: ${errMsg}`,
          latency_ms: Date.now() - startTime,
        },
        { status: 400 }
      );
    }

    const rawData = await llmResponse.json();
    const rawContent = rawData?.choices?.[0]?.message?.content || "";

    // Parse JSON safely from markdown or plain text
    let parsedJson: { interpretation?: string; matches?: AIMatchItem[] } | null = null;
    try {
      // Strip potential markdown code fences: ```json ... ```
      const cleaned = rawContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();
      parsedJson = JSON.parse(cleaned);
    } catch {
      // Regex extraction fallback
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsedJson = JSON.parse(match[0]);
        } catch {
          // ignore
        }
      }
    }

    if (!parsedJson || !Array.isArray(parsedJson.matches)) {
      return NextResponse.json({
        success: false,
        query,
        matches: [],
        error: "Model AI tidak mengembalikan format JSON yang diharapkan.",
        raw_response: rawContent.slice(0, 300),
        latency_ms: Date.now() - startTime,
      });
    }

    // Validate matched product IDs against real catalog and enrich with variant name
    const productMap = new Map(products.map((p) => [p.id, p]));
    const validatedMatches: AIMatchItem[] = [];

    for (const match of parsedJson.matches) {
      if (!match || !match.product_id) continue;
      const product = productMap.get(match.product_id);
      if (!product) continue;

      let variantName: string | null = null;
      let validVariantId: string | null = null;

      if (match.variant_id && Array.isArray(product.variants)) {
        const foundVar = product.variants.find((v) => v.id === match.variant_id);
        if (foundVar) {
          validVariantId = foundVar.id;
          variantName = foundVar.name;
        }
      }

      validatedMatches.push({
        product_id: product.id,
        variant_id: validVariantId,
        variant_name: variantName,
        confidence: typeof match.confidence === "number" ? Math.min(Math.max(match.confidence, 0), 1) : 0.9,
        reason: String(match.reason || "Sesuai dengan pencarian pembeli"),
      });
    }

    const responsePayload: AISearchResponse = {
      success: true,
      query,
      interpretation: parsedJson.interpretation || `Rekomendasi produk untuk "${query}"`,
      matches: validatedMatches,
      model_used: model,
      latency_ms: Date.now() - startTime,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        matches: [],
        error: isTimeout
          ? "Waktu tunggu AI habis (> 20 detik). Coba gunakan model yang lebih ringan seperti gpt-4o-mini atau llama-3.1."
          : error instanceof Error
          ? error.message
          : "Gagal memproses pencarian AI",
        latency_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
