"use client";

import { useEffect, useState } from "react";
import { Bot, Check, CheckCircle2, Eye, EyeOff, HelpCircle, Loader2, RefreshCw, Sparkles, Zap } from "lucide-react";
import { AI_PRESETS, DEFAULT_AI_SETTINGS, getStoredAISettings, saveStoredAISettings, testAIConnection } from "@/lib/ai-search-client";
import type { AISettings, SystemSettings } from "@/lib/types";

interface AISettingsPanelProps {
  settings?: SystemSettings | null;
  onSaved?: (newSettings: AISettings) => void;
  compact?: boolean;
}

export function AISettingsPanel({ settings, onSaved, compact = false }: AISettingsPanelProps) {
  const [config, setConfig] = useState<AISettings>(() => getStoredAISettings(settings));
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

  const handleApplyPreset = (preset: (typeof AI_PRESETS)[number]) => {
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

        {/* Quick Presets */}
        <div className="ai-presets-section">
          <div className="ai-field-label">
            <Zap size={14} />
            <span>Pilih Cepat Penyedia AI (Preset):</span>
          </div>
          <div className="ai-preset-chips">
            {AI_PRESETS.map((p) => {
              const isActive = config.base_url === p.base_url && config.model === p.model;
              return (
                <button
                  type="button"
                  key={p.name}
                  className={`ai-preset-chip ${isActive ? "active" : ""}`}
                  onClick={() => handleApplyPreset(p)}
                  title={p.desc}
                >
                  <b>{p.name}</b>
                  <small>{p.model}</small>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="ai-form-grid">
          <label className="ai-field span-2">
            <span className="field-title">Base URL API LLM (OpenAI Compatible)</span>
            <input
              type="url"
              required
              value={config.base_url}
              onChange={(e) => setConfig((c) => ({ ...c, base_url: e.target.value }))}
              placeholder="https://api.openai.com/v1 atau http://localhost:11434/v1"
            />
            <small className="field-hint">
              Mendukung semua endpoint kompatibel OpenAI: OpenAI, Groq, OpenRouter, Ollama Lokal, LM Studio, vLLM, dll.
            </small>
          </label>

          <label className="ai-field">
            <span className="field-title">Nama Model</span>
            <input
              type="text"
              required
              value={config.model}
              onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
              placeholder="Contoh: gpt-4o-mini, llama3.1, qwen2.5"
            />
            <small className="field-hint">Disarankan model cepat & hemat seperti gpt-4o-mini atau llama-3.1-8b.</small>
          </label>

          <label className="ai-field">
            <span className="field-title">API Key (Kunci Rahasia)</span>
            <div className="ai-key-input-wrap">
              <input
                type={showKey ? "text" : "password"}
                value={config.api_key || ""}
                onChange={(e) => setConfig((c) => ({ ...c, api_key: e.target.value }))}
                placeholder="sk-... (kosongkan jika pakai Ollama lokal)"
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
            <small className="field-hint">Tersimpan aman. Kosongkan jika menggunakan Ollama di komputer lokal.</small>
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

        {/* Educational Note */}
        <div className="ai-guide-box">
          <HelpCircle size={17} className="guide-icon" />
          <div>
            <strong>Bagaimana AI Membantu Kasir Anda?</strong>
            <p>
              Pelanggan sering datang menyebutkan fungsi (&ldquo;buat nambal pipa bocor&rdquo;) atau istilah slang
              (&ldquo;kran angsa lentur&rdquo; / &ldquo;batu potong tipis&rdquo;). AI membaca katalog toko dan menerjemahkannya
              ke produk & varian resmi sehingga kasir baru sekalipun dapat melayani secepat kasir berpengalaman.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
