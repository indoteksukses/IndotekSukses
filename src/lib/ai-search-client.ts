"use client";

import type { AIMatchItem, AISearchResponse, AISettings, SystemSettings } from "@/lib/types";

export const DEFAULT_AI_SETTINGS: AISettings = {
  base_url: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  api_key: "",
  enabled: true,
};

export type AIPreset = {
  name: string;
  category: "pihak_ketiga" | "pihak_kedua" | "pihak_pertama";
  categoryLabel: string;
  base_url: string;
  model: string;
  desc: string;
  keyPlaceholder: string;
  needsKey: boolean;
};

export const AI_PRESETS: AIPreset[] = [
  {
    name: "OpenRouter",
    category: "pihak_ketiga",
    categoryLabel: "Pihak Ketiga (Cloud Aggregator)",
    base_url: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct",
    desc: "Paling populer: 1 API Key untuk akses 300+ model (Claude, DeepSeek, Gemini, Llama)",
    keyPlaceholder: "sk-or-v1-...",
    needsKey: true,
  },
  {
    name: "DeepSeek",
    category: "pihak_ketiga",
    categoryLabel: "Pihak Ketiga (Cloud)",
    base_url: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    desc: "DeepSeek-V3: Sangat cerdas, paham bahasa Indonesia sehari-hari, biaya super hemat",
    keyPlaceholder: "sk-...",
    needsKey: true,
  },
  {
    name: "Groq",
    category: "pihak_ketiga",
    categoryLabel: "Pihak Ketiga (Cloud)",
    base_url: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    desc: "Inference super kilat (<300ms) menggunakan chip LPU khusus",
    keyPlaceholder: "gsk_...",
    needsKey: true,
  },
  {
    name: "Google Gemini",
    category: "pihak_ketiga",
    categoryLabel: "Pihak Ketiga (Cloud)",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
    desc: "Google AI Studio: Tersedia kuota gratis, respons cepat & paham variasi katalog",
    keyPlaceholder: "AIzaSy...",
    needsKey: true,
  },
  {
    name: "OpenAI",
    category: "pihak_pertama",
    categoryLabel: "Pihak Pertama",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    desc: "Standar resmi OpenAI (GPT-4o mini): Cepat, akurat, stabil",
    keyPlaceholder: "sk-proj-...",
    needsKey: true,
  },
  {
    name: "Claude (via OpenRouter)",
    category: "pihak_ketiga",
    categoryLabel: "Pihak Ketiga (Cloud)",
    base_url: "https://openrouter.ai/api/v1",
    model: "anthropic/claude-3.5-haiku",
    desc: "Claude 3.5 Haiku: Penalaran tinggi, cocok untuk sebutan barang yang ambigu",
    keyPlaceholder: "sk-or-v1-...",
    needsKey: true,
  },
  {
    name: "Mistral AI",
    category: "pihak_ketiga",
    categoryLabel: "Pihak Ketiga (Cloud)",
    base_url: "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
    desc: "Model Eropa efisien & berkualitas tinggi",
    keyPlaceholder: "...",
    needsKey: true,
  },
  {
    name: "Together AI",
    category: "pihak_ketiga",
    categoryLabel: "Pihak Ketiga (Cloud)",
    base_url: "https://api.together.xyz/v1",
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    desc: "Penyedia model open-source berkecepatan tinggi",
    keyPlaceholder: "...",
    needsKey: true,
  },
  {
    name: "Ollama (Lokal)",
    category: "pihak_kedua",
    categoryLabel: "Pihak Kedua (Lokal / Server Toko)",
    base_url: "http://localhost:11434/v1",
    model: "llama3.1",
    desc: "100% Gratis & offline di komputer kasir / server lokal toko (Tanpa API Key)",
    keyPlaceholder: "Tidak butuh API key (Kosongkan)",
    needsKey: false,
  },
  {
    name: "LM Studio",
    category: "pihak_kedua",
    categoryLabel: "Pihak Kedua (Lokal / Server Toko)",
    base_url: "http://127.0.0.1:1234/v1",
    model: "local-model",
    desc: "Model lokal via aplikasi LM Studio di komputer toko",
    keyPlaceholder: "Tidak butuh API key (Kosongkan)",
    needsKey: false,
  },
  {
    name: "Proxy / Gateway Custom",
    category: "pihak_ketiga",
    categoryLabel: "Gateway / Proxy Custom",
    base_url: "https://proxy.example.com/v1",
    model: "custom-model",
    desc: "Mendukung OneAPI, NewAPI, Portkey, LiteLLM, Cloudflare AI Gateway",
    keyPlaceholder: "Token / Key proxy Anda...",
    needsKey: true,
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
    includeInactive?: boolean;
    settings?: AISettings;
  }
): Promise<AISearchResponse> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { success: true, query: "", matches: [] };
  }

  try {
    const res = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: cleanQuery,
        store_id: options?.storeId,
        include_inactive: options?.includeInactive,
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
