"use client";

import type { AIMatchItem, AISearchResponse, AISettings, SystemSettings } from "@/lib/types";

export const DEFAULT_AI_SETTINGS: AISettings = {
  base_url: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  api_key: "",
  enabled: true,
};

export const AI_PRESETS = [
  {
    name: "OpenAI",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    desc: "Cepat, akurat, hemat token (Direkomendasikan)",
    needsKey: true,
  },
  {
    name: "Groq",
    base_url: "https://api.groq.com/openai/v1",
    model: "llama-3.1-8b-instant",
    desc: "Sangat kilat (<300ms) dengan Llama 3.1",
    needsKey: true,
  },
  {
    name: "OpenRouter",
    base_url: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.1-8b-instruct",
    desc: "Akses multi-model AI global",
    needsKey: true,
  },
  {
    name: "Ollama (Lokal)",
    base_url: "http://localhost:11434/v1",
    model: "llama3.1",
    desc: "Gratis & offline di komputer kasir / server toko",
    needsKey: false,
  },
  {
    name: "LM Studio",
    base_url: "http://127.0.0.1:1234/v1",
    model: "local-model",
    desc: "Model lokal via aplikasi LM Studio",
    needsKey: false,
  },
];

const STORAGE_KEY = "ids_ai_settings_v1";

export function getStoredAISettings(serverSettings?: SystemSettings | null): AISettings {
  if (typeof window === "undefined") {
    return {
      base_url: serverSettings?.ai_base_url || DEFAULT_AI_SETTINGS.base_url,
      model: serverSettings?.ai_model || DEFAULT_AI_SETTINGS.model,
      api_key: serverSettings?.ai_api_key || "",
      enabled: serverSettings?.ai_search_enabled ?? DEFAULT_AI_SETTINGS.enabled,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        base_url: parsed.base_url || serverSettings?.ai_base_url || DEFAULT_AI_SETTINGS.base_url,
        model: parsed.model || serverSettings?.ai_model || DEFAULT_AI_SETTINGS.model,
        api_key: parsed.api_key ?? (serverSettings?.ai_api_key || ""),
        enabled: parsed.enabled ?? (serverSettings?.ai_search_enabled ?? DEFAULT_AI_SETTINGS.enabled),
      };
    }
  } catch {
    // ignore
  }

  return {
    base_url: serverSettings?.ai_base_url || DEFAULT_AI_SETTINGS.base_url,
    model: serverSettings?.ai_model || DEFAULT_AI_SETTINGS.model,
    api_key: serverSettings?.ai_api_key || "",
    enabled: serverSettings?.ai_search_enabled ?? DEFAULT_AI_SETTINGS.enabled,
  };
}

export function saveStoredAISettings(settings: AISettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export async function testAIConnection(settings: {
  base_url: string;
  model: string;
  api_key?: string;
}): Promise<{ success: boolean; latency_ms?: number; model?: string; error?: string }> {
  try {
    const res = await fetch("/api/pos/ai-search/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}: Gagal terhubung ke endpoint LLM` };
    }
    return data;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Tidak dapat terhubung ke server" };
  }
}

export async function executeAISearch(
  query: string,
  options?: {
    storeId?: string;
    settings?: AISettings;
  }
): Promise<AISearchResponse> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { success: true, query: "", matches: [] };
  }

  try {
    const res = await fetch("/api/pos/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: cleanQuery,
        store_id: options?.storeId,
        base_url: options?.settings?.base_url,
        model: options?.settings?.model,
        api_key: options?.settings?.api_key,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        query: cleanQuery,
        matches: [],
        error: data.error || `HTTP ${res.status}: Gagal melakukan pencarian AI`,
      };
    }

    return data as AISearchResponse;
  } catch (err) {
    return {
      success: false,
      query: cleanQuery,
      matches: [],
      error: err instanceof Error ? err.message : "Koneksi jaringan terputus saat pencarian AI",
    };
  }
}
