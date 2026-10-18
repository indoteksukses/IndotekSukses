"use client";

import { Sparkles, X } from "lucide-react";
import { AISettingsPanel } from "@/components/ai-settings-panel";
import type { AISettings, SystemSettings } from "@/lib/types";

interface AISettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings?: SystemSettings | null;
  onSaved?: (settings: AISettings) => void;
}

export function AISettingsModal({ open, onClose, settings, onSaved }: AISettingsModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop ai-modal-backdrop" onClick={onClose}>
      <div className="modal-card ai-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="ai-modal-title">
            <div className="ai-modal-title-icon">
              <Sparkles size={22} />
            </div>
            <div>
              <h2>Pengaturan AI Pencarian Produk</h2>
              <p>Atur Base URL dan Model LLM untuk pencarian cerdas bahasa pelanggan.</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        <div className="ai-modal-body">
          <AISettingsPanel
            settings={settings}
            compact={true}
            onSaved={(newCfg) => {
              if (onSaved) onSaved(newCfg);
              setTimeout(() => onClose(), 800);
            }}
          />
        </div>
      </div>
    </div>
  );
}
