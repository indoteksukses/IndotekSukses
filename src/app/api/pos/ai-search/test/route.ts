import { NextResponse } from "next/server";
import { buildLLMHeaders, extractLLMResponseText, resolveLLMEndpoint } from "@/lib/ai-llm-server";

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const baseUrl = String(body.base_url ?? "").trim();
    const model = String(body.model ?? "").trim();
    const apiKey = String(body.api_key ?? "").trim();

    if (!baseUrl) {
      return NextResponse.json({ error: "Base URL LLM wajib diisi" }, { status: 400 });
    }
    if (!model) {
      return NextResponse.json({ error: "Nama Model LLM wajib diisi" }, { status: 400 });
    }

    // Universal endpoint resolution for 1st, 2nd, and 3rd party providers
    const endpoint = resolveLLMEndpoint(baseUrl);
    const headers = buildLLMHeaders(apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12 seconds max

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Koneksi tes. Balas singkat 1 kata: OK" }],
        max_tokens: 15,
        temperature: 0.1,
      }),
    });
    clearTimeout(timeout);

    const latency_ms = Date.now() - startTime;
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg =
        result?.error?.message ||
        result?.error ||
        result?.message ||
        `HTTP ${response.status}: ${response.statusText}`;
      return NextResponse.json(
        {
          success: false,
          error: `Koneksi ke ${endpoint} gagal: ${errMsg}`,
          latency_ms,
        },
        { status: 400 }
      );
    }

    const reply = extractLLMResponseText(result) || "OK";
    return NextResponse.json({
      success: true,
      latency_ms,
      model,
      reply: String(reply).trim().slice(0, 100),
      endpoint,
    });
  } catch (error) {
    const latency_ms = Date.now() - startTime;
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "Waktu koneksi habis (Timeout > 12 detik). Pastikan Base URL dapat diakses."
          : error instanceof Error
          ? error.message
          : "Gagal menghubungkan ke endpoint AI",
        latency_ms,
      },
      { status: 500 }
    );
  }
}
