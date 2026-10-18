import type { AIMatchItem } from "@/lib/types";

/**
 * Normalizes any LLM Base URL from 1st, 2nd, or 3rd party providers into a callable endpoint URL.
 * Supports:
 * - 1st party: OpenAI (https://api.openai.com/v1)
 * - 2nd party: Local Ollama (http://localhost:11434, http://localhost:11434/v1), LM Studio (http://localhost:1234), LocalAI, vLLM
 * - 3rd party: OpenRouter (https://openrouter.ai/api/v1), Groq (https://api.groq.com/openai/v1),
 *   DeepSeek (https://api.deepseek.com or https://api.deepseek.com/v1),
 *   Google Gemini (https://generativelanguage.googleapis.com/v1beta/openai or https://generativelanguage.googleapis.com),
 *   Mistral AI (https://api.mistral.ai/v1), Together AI (https://api.together.xyz/v1),
 *   Perplexity (https://api.perplexity.ai), OneAPI, NewAPI, LiteLLM, Portkey, Cloudflare AI Gateway.
 */
export function resolveLLMEndpoint(rawBaseUrl: string): string {
  let url = (rawBaseUrl || "").trim().replace(/\/+$/, "");
  if (!url) return "";

  // If the user already supplied a full target endpoint, keep it intact
  if (
    url.endsWith("/chat/completions") ||
    url.endsWith("/messages") ||
    url.endsWith(":generateContent") ||
    url.endsWith("/api/chat") ||
    url.endsWith("/api/generate")
  ) {
    return url;
  }

  // Google Gemini AI Studio (redirect to OpenAI-compatible chat endpoint)
  if (url.includes("generativelanguage.googleapis.com")) {
    if (!url.includes("/openai")) {
      return `${url}/v1beta/openai/chat/completions`;
    }
    return `${url}/chat/completions`;
  }

  // Ollama default port without /v1
  if ((url.includes(":11434") || url.endsWith("/11434")) && !url.includes("/v1") && !url.includes("/api")) {
    return `${url}/v1/chat/completions`;
  }

  // LM Studio default port without /v1
  if ((url.includes(":1234") || url.endsWith("/1234")) && !url.includes("/v1")) {
    return `${url}/v1/chat/completions`;
  }

  // OpenRouter root domain without /api/v1
  if (url === "https://openrouter.ai" || url === "http://openrouter.ai") {
    return "https://openrouter.ai/api/v1/chat/completions";
  }

  // DeepSeek root domain without /v1
  if (url === "https://api.deepseek.com" || url === "http://api.deepseek.com") {
    return "https://api.deepseek.com/chat/completions";
  }

  // Standard OpenAI-compatible append
  return `${url}/chat/completions`;
}

/**
 * Builds universal headers compatible with 1st, 2nd, and 3rd party providers.
 */
export function buildLLMHeaders(apiKey?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "IndotekSukses-POS/2.8",
  };

  const key = (apiKey || "").trim();
  if (key) {
    headers["Authorization"] = `Bearer ${key}`;
    headers["x-api-key"] = key;
    headers["x-goog-api-key"] = key;
    headers["api-key"] = key;
  }

  // Standard attribution headers for 3rd party aggregators (like OpenRouter)
  headers["HTTP-Referer"] = "https://indoteksukses.com";
  headers["X-Title"] = "Indotek Sukses POS";

  return headers;
}

/**
 * Universally extracts text content from any LLM provider response.
 * Handles OpenAI, Anthropic, Gemini, Ollama, Cohere, and custom proxies.
 */
export function extractLLMResponseText(data: any): string {
  if (!data) return "";
  if (typeof data === "string") return data;

  // 1. OpenAI / Groq / DeepSeek / OpenRouter / vLLM / LM Studio / LiteLLM / Mistral / Together AI
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0];
    if (choice?.message?.content) {
      const c = choice.message.content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) {
        return c.map((p: any) => p?.text || p?.content || "").filter(Boolean).join("\n");
      }
    }
    if (choice?.text) return String(choice.text);
  }

  // 2. Anthropic Claude native (/v1/messages)
  if (Array.isArray(data.content) && data.content.length > 0) {
    return data.content.map((p: any) => p?.text || "").filter(Boolean).join("\n");
  }

  // 3. Google Gemini native (/v1beta/models/...:generateContent)
  if (Array.isArray(data.candidates) && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    if (Array.isArray(candidate?.content?.parts)) {
      return candidate.content.parts.map((p: any) => p?.text || "").filter(Boolean).join("\n");
    }
  }

  // 4. Ollama native (/api/chat or /api/generate)
  if (data.message?.content) return String(data.message.content);
  if (data.response) return String(data.response);

  // 5. Cohere / other providers
  if (data.text) return String(data.text);
  if (data.output?.text) return String(data.output.text);

  return "";
}

/**
 * Robust JSON extraction from raw LLM output.
 * Handles markdown codeblocks, prefix/suffix conversational text, and whitespace.
 */
export function parseAISearchJSON(rawText: string): { interpretation?: string; matches?: AIMatchItem[] } | null {
  if (!rawText || typeof rawText !== "string") return null;

  // 1. Clean markdown code fences: ```json ... ```
  const stripped = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped);
    if (parsed && Array.isArray(parsed.matches)) return parsed;
  } catch {
    // continue to fallback extraction
  }

  // 2. Regex find first JSON object with "matches"
  const jsonMatch = rawText.match(/\{[\s\S]*"matches"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && Array.isArray(parsed.matches)) return parsed;
    } catch {
      // continue to general object
    }
  }

  // 3. Generic JSON object match
  const objMatch = rawText.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      if (parsed && Array.isArray(parsed.matches)) return parsed;
    } catch {
      // ignore
    }
  }

  return null;
}
