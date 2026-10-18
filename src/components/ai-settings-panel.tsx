"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Check, CheckCircle2, Cpu, Eye, EyeOff, Globe, HardDrive, HelpCircle, Layers, Loader2, RefreshCw, Server, Sparkles, Zap } from "lucide-react";
import { AI_PRESETS, DEFAULT_AI_SETTINGS, getStoredAISettings, saveStoredAISettings, testAIConnection, type AIPreset } from "@/lib/ai-search-client";
import type { AISettings, SystemSettings } from "@/lib/types";

interface AISettingsPanelProps {
  settings?: SystemSettings | null;
  onSaved?: (newSettings: AISettings) => void;
  compact?: boolean;
}

export function AISettingsPanel({ settings, onSaved, compact = false }: AISettingsPanelProps) {
  const [config, setConfig] = useState<AISettings>(() => getStoredAISettings(settings));
  const [categoryFilter, setCategoryFilter] = useState<"all" | "pihak_ketiga" | "pihak_kedua" | "pihak_pertama">("all");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latency_ms?: number;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setConfig((current) => ({
        base_url: settings.ai_base_url || current.base_url || DEFAULT_AI_SETTINGS.base_url,
        model: settings.ai_model || current.model || DEFAULT_AI_SETTINGS.model,
        api_key: settings.ai_api_key ?? current.api_key ?? "",
        enabled: settings.ai_search_enabled ?? current.enabled ?? true,
      }));
    }
  }, [settings]);

  // Find active preset if matched
  const activePreset = useMemo(() => {
    return AI_PRESETS.find(
      (p) =>
        config.base_url.replace(/\/+$/, "") === p.base_url.replace(/\/+$/, "") &&
        config.model.trim().toLowerCase() === p.model.trim().toLowerCase()
    );
  }, [config.base_url, config.model]);

  const filteredPresets = useMemo(() => {
    if (categoryFilter === "all") return AI_PRESETS;
    return AI_PRESETS.filter((p) => p.category === categoryFilter);
  }, [categoryFilter]);

  const handleApplyPreset = (preset: AIPreset) => {
    setConfig((curr) => ({
      ...curr,
      base_url: preset.base_url,
      model: preset.model,
    }));
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAIConnection({
        base_url: config.base_url,
        model: config.model,
        api_key: config.api_key,
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: `Koneksi berhasil! Model "${res.model}" merespons dalam ${res.latency_ms}ms.`,
          latency_ms: res.latency_ms,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || "Gagal menghubungi endpoint LLM",
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Terjadi kesalahan koneksi",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Save to local storage for immediate zero-latency availability in POS
      saveStoredAISettings(config);

      // 2. Persist to server system_settings
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_base_url: config.base_url.trim(),
          ai_model: config.model.trim(),
          ai_api_key: config.api_key?.trim() || null,
          ai_search_enabled: config.enabled,
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }

      if (onSaved) {
        onSaved(config);
      }
    } catch {
      // Still consider saved locally
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`panel ai-settings-panel ${compact ? "ai-settings-compact" : ""}`}>
      <div className="panel-header">
        <div className="ai-settings-header-title">
          <div className="ai-settings-icon">
            <Sparkles size={22} />
          </div>
          <div>
            <h2>Pencarian Cerdas AI (LLM)</h2>
            <p>
              Bantu kasir mencocokkan perkataan pembeli (bahasa sehari-hari / slang / fungsi) dengan nama produk di
              katalog toko.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="ai-settings-content">
        {/* Toggle Switch */}
        <label className="ai-toggle-card">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
          />
          <div>
            <strong>Aktifkan Tombol AI di Terminal Kasir (POS)</strong>
            <span>Kasir dapat mengetik bahasa bebas pelanggan lalu menekan tombol AI untuk mencari otomatis.</span>
          </div>
        </label>

        {/* Quick Presets & Provider Filter */}
        <div className="ai-presets-section">
          <div className="ai-presets-header">
            <div className="ai-field-label">
              <Zap size={14} />
              <span>Pilihan Provider & Preset LLM (Pihak 1, 2 & 3):</span>
            </div>

            <div className="ai-category-tabs">
              <button
                type="button"
                className={`ai-cat-tab ${categoryFilter === "all" ? "active" : ""}`}
                onClick={() => setCategoryFilter("all")}
              >
                Semua
              </button>
              <button
                type="button"
                className={`ai-cat-tab ${categoryFilter === "pihak_ketiga" ? "active" : ""}`}
                onClick={() => setCategoryFilter("pihak_ketiga")}
              >
                <Globe size={12} />
                <span>Pihak Ke-3 (Cloud)</span>
              </button>
              <button
                type="button"
                className={`ai-cat-tab ${categoryFilter === "pihak_kedua" ? "active" : ""}`}
                onClick={() => setCategoryFilter("pihak_kedua")}
              >
                <HardDrive size={12} />
                <span>Pihak Ke-2 (Lokal / Toko)</span>
              </button>
              <button
                type="button"
                className={`ai-cat-tab ${categoryFilter === "pihak_pertama" ? "active" : ""}`}
                onClick={() => setCategoryFilter("pihak_pertama")}
              >
                <Layers size={12} />
                <span>Pihak Ke-1</span>
              </button>
            </div>
          </div>

          <div className="ai-preset-chips">
            {filteredPresets.map((p) => {
              const isActive =
                config.base_url.replace(/\/+$/, "") === p.base_url.replace(/\/+$/, "") &&
                config.model.trim().toLowerCase() === p.model.trim().toLowerCase();
              return (
                <button
                  type="button"
                  key={p.name}
                  className={`ai-preset-chip ${isActive ? "active" : ""}`}
                  onClick={() => handleApplyPreset(p)}
                  title={p.desc}
                >
                  <div className="preset-chip-top">
                    <b>{p.name}</b>
                    <span className={`preset-badge ${p.category}`}>
                      {p.category === "pihak_ketiga" ? "Pihak 3" : p.category === "pihak_kedua" ? "Pihak 2 (Lokal)" : "Pihak 1"}
                    </span>
                  </div>
                  <small>{p.model}</small>
                </button>
              );
            })}
          </div>

          {activePreset ? (
            <div className="ai-preset-detail-note">
              <Sparkles size={13} />
              <span>
                <strong>{activePreset.name} ({activePreset.categoryLabel}):</strong> {activePreset.desc}
              </span>
            </div>
          ) : null}
        </div>

        {/* Form Fields Grid */}
        <div className="ai-form-grid">
          <label className="ai-field span-2">
            <span className="field-title">Base URL API LLM (OpenAI Compatible)</span>
            <input
              type="text"
              required
              value={config.base_url}
              onChange={(e) => setConfig((c) => ({ ...c, base_url: e.target.value }))}
              placeholder="https://api.openai.com/v1 atau http://localhost:11434/v1"
            />
            <small className="field-hint">
              Mendukung penuh <strong>Pihak Ke-1</strong> (OpenAI), <strong>Pihak Ke-2</strong> (Ollama, LM Studio, vLLM, server lokal toko), serta <strong>Pihak Ke-3</strong> (OpenRouter, DeepSeek, Groq, Google Gemini, Mistral, Together AI, Portkey, OneAPI).
            </small>
          </label>

          <label className="ai-field">
            <span className="field-title">Nama Model</span>
            <input
              type="text"
              required
              value={config.model}
              onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
              placeholder="Contoh: gpt-4o-mini, llama-3.3-70b, deepseek-chat, gemini-2.0-flash"
            />
            <small className="field-hint">
              {activePreset ? `Preset aktif: ${activePreset.name}` : "Masukkan kode nama model yang disediakan oleh provider Anda."}
            </small>
          </label>

          <label className="ai-field">
            <span className="field-title">API Key (Kunci Rahasia)</span>
            <div className="ai-key-input-wrap">
              <input
                type={showKey ? "text" : "password"}
                value={config.api_key || ""}
                onChange={(e) => setConfig((c) => ({ ...c, api_key: e.target.value }))}
                placeholder={activePreset?.keyPlaceholder || "sk-... (kosongkan jika pakai Ollama/LM Studio lokal)"}
              />
              <button
                type="button"
                className="ai-key-toggle-btn"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? "Sembunyikan kunci" : "Lihat kunci"}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <small className="field-hint">
              {activePreset && !activePreset.needsKey
                ? "Provider ini tidak membutuhkan API key (gratis & berjalan di server internal)."
                : "Tersimpan aman. Hanya diperlukan jika menggunakan provider pihak ke-1 atau ke-3 berbayar/cloud."}
            </small>
          </label>
        </div>

        {/* Test Connection Result */}
        {testResult ? (
          <div className={`ai-test-alert ${testResult.success ? "success" : "error"}`}>
            {testResult.success ? <CheckCircle2 size={18} /> : <Bot size={18} />}
            <div>
              <strong>{testResult.success ? "Koneksi Berhasil" : "Koneksi Gagal"}</strong>
              <p>{testResult.message}</p>
            </div>
          </div>
        ) : null}

        {/* Actions Bar */}
        <div className="ai-actions-bar">
          <button
            type="button"
            className="button secondary ai-test-btn"
            disabled={testing || !config.base_url || !config.model}
            onClick={handleTest}
          >
            {testing ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            <span>{testing ? "Menguji Koneksi..." : "Tes Koneksi AI"}</span>
          </button>

          <div className="ai-save-group">
            {saveSuccess ? (
              <span className="ai-save-badge">
                <Check size={15} /> Pengaturan AI Tersimpan!
              </span>
            ) : null}
            <button type="submit" className="button primary ai-save-btn" disabled={saving}>
              {saving ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              <span>{saving ? "Menyimpan..." : "Simpan Pengaturan AI"}</span>
            </button>
          </div>
        </div>

        {/* Multi-Tier Educational Guide */}
        <div className="ai-guide-box">
          <HelpCircle size={18} className="guide-icon" />
          <div className="ai-guide-text">
            <strong>Dukungan Multi-Provider LLM (Pihak 1, 2 & 3)</strong>
            <p>
              Sistem ini fleksibel dan tidak mengunci toko pada satu vendor. Anda bebas memilih opsi yang paling hemat dan cepat:
            </p>
            <ul className="ai-guide-list">
              <li>
                <strong>Pihak Ke-3 (Cloud Alternatif & Aggregator)</strong>: Gunakan <em>OpenRouter</em> (akses 300+ model dengan 1 akun), <em>DeepSeek</em> (sangat pintar & termurah), <em>Groq</em> (kecepatan kilat &lt;300ms), atau <em>Google Gemini</em> (tersedia kuota gratis besar via AI Studio).
              </li>
              <li>
                <strong>Pihak Ke-2 (Server Internal / Komputer Toko)</strong>: Jalankan <em>Ollama</em> atau <em>LM Studio</em> langsung di PC kasir/server toko. 100% gratis, bisa beroperasi tanpa koneksi internet (offline), dan data transaksi tidak keluar dari toko.
              </li>
              <li>
                <strong>Pihak Ke-1</strong>: Gunakan <em>OpenAI (GPT-4o mini)</em> resmi dengan memasukkan API Key OpenAI Anda.
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}
