import { NextResponse } from "next/server";
import { getProductsWithStocks, getSystemSettings } from "@/lib/data";
import { buildLLMHeaders, extractLLMResponseText, parseAISearchJSON, resolveLLMEndpoint } from "@/lib/ai-llm-server";
import type { AIMatchItem, AISearchResponse, Product, ProductVariant } from "@/lib/types";

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const query = String(body.query ?? "").trim();
    const storeId = body.store_id ? String(body.store_id) : undefined;
    const includeInactive = Boolean(body.include_inactive);

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
            "Pengaturan AI belum lengkap. Harap masukkan Base URL dan Nama Model di menu Pengaturan (Pengaturan Sistem > Pengaturan AI).",
        },
        { status: 400 }
      );
    }

    // Universal resolution for 1st, 2nd (local/Ollama/LM Studio), or 3rd party (OpenRouter/Groq/DeepSeek/Gemini/etc.)
    const endpoint = resolveLLMEndpoint(baseUrl);

    // Load store catalog
    const products: Product[] = await getProductsWithStocks(storeId, includeInactive);
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

    const systemPrompt = `Anda adalah AI Search Engine Semantik UNIVERSAL untuk seluruh katalog barang toko "Indotek Sukses".
Tugas Anda adalah memetakan kueri pencarian APA PUN dari pengguna (pembeli, kasir, admin gudang, maupun manajer) ke produk dan varian yang paling tepat di katalog toko.

Kueri pencarian bisa berupa:
1. SEBUTAN SEHARI-HARI / SLANG / BAHASA TUKANG / NAMA ALTERNATIF:
   - Contoh: "sanyo", "drat", "nepel", "tang cucut", "tang buaya", "kunci inggris", "batu gerinda wd", "lem alteco / lem setan / lem korea", "perlak", "seal tape", "lem bakar / glue gun", "kabel serabut merah hitam", "obeng bolak-balik", "gembok leher panjang", "baut roofing / baja ringan", "fitting colokan gantung", "mata sok", "mata gerinda asah/potong", dll.
2. DESKRIPSI FUNGSI / KEGUNAAN / MASALAH / SOLUSI:
   - Contoh: "buat nambal atap seng bocor", "alat potong kabel kawat", "buat sambungan pipa leter L atau T", "alat buat buka baut yang macet / slek", "kran cuci piring yang bisa ditekuk lehernya", "lampu tidur warna kuning hangat", "colokan listrik cabang 3 atau 4", "buat nempel keramik / granit", "pelapis anti bocor", dll.
3. BENTUK FISIK / CIRI / WARNA / MATERIAL:
   - Contoh: "yang warna hitam doff", "bentuk spiral", "leher fleksibel lentur", "bulat pipih", "besi siku ambalan rak", "kuningan", "stainless", "pipa pvc abu-abu", "mata obeng kembang / minus", dll.
4. UKURAN / SPESIFIKASI / VARIAN SPESIFIK:
   - Contoh: "4 inch", "10 mili", "2 x 1.5", "1/2 inch", "3/4 inch", "3 meter", "5 meter", "tebal 1mm", "ukuran sedang", "isi 50 pcs", meja vs tembok, dll.
5. TYPO / PLESETAN / SALAH KETIK / SALAH SEBUT / SINGKATAN:
   - Toleransi tinggi terhadap salah ketik atau ejaan kasar pengguna.
6. PERTANYAAN BEBAS / KALIMAT PANJANG:
   - Contoh: "ada barang yang bisa dipakai untuk potong hollow baja ringan?", "cari kran yang pasang di dinding dapur", "stop kontak yang kabelnya panjang ada?".

PANDUAN OUTPUT:
Pilih maksimal 6 produk (beserta varian jika spesifik) yang PALING COCOK dari katalog yang disediakan.
Kembalikan HANYA teks JSON valid dengan struktur:
{
  "interpretation": "Penjelasan singkat maksud pengguna (maksimal 1 kalimat)",
  "matches": [
    {
      "product_id": "ID_PRODUK",
      "variant_id": "ID_VARIAN_JIKA_ADA_ATAU_NULL",
      "confidence": 0.95,
      "reason": "Alasan singkat mengapa produk/varian ini cocok (contoh: Sesuai fungsi kran cuci piring leher lentur fleksibel)"
    }
  ]
}
Catatan Penting: Jangan mengarang ID produk atau varian baru di luar katalog yang diberikan. Jika benar-benar tidak ada produk yang berkaitan di katalog, kembalikan matches: [].`;

    const userPrompt = `Kueri Pencarian Pengguna: "${query}"

Katalog Toko Tersedia:
${JSON.stringify(catalogDigest)}`;

    const headers = buildLLMHeaders(apiKey);

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

    const rawData = await llmResponse.json().catch(() => null);
    const rawContent = extractLLMResponseText(rawData);

    // Parse JSON safely using universal fallback extraction
    const parsedJson = parseAISearchJSON(rawContent);

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
