"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Flame,
  FileText,
  Printer,
  Radio,
  RefreshCw,
  Settings2,
} from "lucide-react";
import type { SaleDetail, SystemSettings } from "@/lib/types";
import { thermalPrinter, type ThermalPrinterState } from "@/lib/thermal-printer";
import { ThermalPrinterModal } from "@/components/thermal-printer-modal";

export type ReceiptFormat = "thermal58" | "thermal80" | "standard";

interface ReceiptActionsProps {
  sale?: SaleDetail;
  settings?: SystemSettings | null;
  format?: ReceiptFormat;
  onFormatChange?: (format: ReceiptFormat) => void;
  autoPrint?: boolean;
}

export function ReceiptActions({
  sale,
  settings,
  format = "thermal58",
  onFormatChange,
}: ReceiptActionsProps) {
  const [printerState, setPrinterState] = useState<ThermalPrinterState>(thermalPrinter.getState());
  const [modalOpen, setModalOpen] = useState(false);
  const [directPrinting, setDirectPrinting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    return thermalPrinter.subscribe((state) => {
      setPrinterState(state);
    });
  }, []);

  const isConnected = printerState.status === "connected";

  const handleDirectEscPosPrint = async () => {
    if (!sale) return;
    setDirectPrinting(true);
    setFeedback(null);
    try {
      const width = format === "thermal80" ? 80 : 58;
      await thermalPrinter.printInvoice(sale, settings, width);
      setFeedback("Struk berhasil dikirim ke printer thermal!");
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Gagal mencetak struk");
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setDirectPrinting(false);
    }
  };

  return (
    <>
      <div className="receipt-control-bar no-print">
        {/* Left: Navigation */}
        <div className="receipt-bar-left">
          <button
            type="button"
            className="button secondary receipt-back-btn"
            onClick={() => history.back()}
          >
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </button>
        </div>

        {/* Center: Format Selector */}
        {onFormatChange ? (
          <div className="receipt-format-tabs">
            <button
              type="button"
              className={`format-tab-btn ${format === "thermal58" ? "active" : ""}`}
              onClick={() => onFormatChange("thermal58")}
            >
              <Flame size={14} />
              <span>Thermal 58mm</span>
            </button>
            <button
              type="button"
              className={`format-tab-btn ${format === "thermal80" ? "active" : ""}`}
              onClick={() => onFormatChange("thermal80")}
            >
              <Flame size={14} />
              <span>Thermal 80mm</span>
            </button>
            <button
              type="button"
              className={`format-tab-btn ${format === "standard" ? "active" : ""}`}
              onClick={() => onFormatChange("standard")}
            >
              <FileText size={14} />
              <span>Standar A4</span>
            </button>
          </div>
        ) : null}

        {/* Right: Thermal Connect & Print Actions */}
        <div className="receipt-bar-right">
          {/* Thermal Connection Status / Trigger */}
          <button
            type="button"
            className={`button secondary thermal-toggle-btn ${isConnected ? "is-connected" : ""}`}
            onClick={() => setModalOpen(true)}
            title="Pengaturan Printer Thermal (Bluetooth / USB Serial)"
          >
            <span className={`status-dot ${isConnected ? "connected" : "disconnected"}`} />
            {isConnected ? (
              <span className="thermal-device-label">
                <Radio size={14} /> {printerState.deviceName || "Thermal OK"}
              </span>
            ) : (
              <span>
                <Settings2 size={14} /> Sambung Printer
              </span>
            )}
          </button>

          {/* Direct ESC/POS Print (When connected) */}
          {isConnected && sale ? (
            <button
              type="button"
              className="button primary direct-thermal-btn"
              disabled={directPrinting}
              onClick={handleDirectEscPosPrint}
              title="Cetak langsung ke printer thermal tanpa dialog browser"
            >
              {directPrinting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Printer size={16} />
              )}
              <span>{directPrinting ? "Mencetak..." : "Cetak Langsung"}</span>
            </button>
          ) : null}

          {/* Browser / Windows Print Dialog */}
          <button
            type="button"
            className={`button ${isConnected ? "secondary" : "primary"}`}
            onClick={() => window.print()}
          >
            <Printer size={16} />
            <span>
              {format === "thermal58"
                ? "Cetak 58mm"
                : format === "thermal80"
                ? "Cetak 80mm"
                : "Cetak Dokumen"}
            </span>
          </button>

          {/* Download PDF button (when standard format) */}
          {format === "standard" ? (
            <button
              type="button"
              className="button secondary"
              onClick={() => window.print()}
              title="Simpan sebagai PDF"
            >
              <Download size={16} />
              <span>PDF</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Floating feedback message */}
      {feedback ? (
        <div
          className={`receipt-feedback-badge no-print ${
            feedback.includes("berhasil") ? "success" : "error"
          }`}
        >
          {feedback.includes("berhasil") ? <CheckCircle2 size={16} /> : null}
          <span>{feedback}</span>
        </div>
      ) : null}

      {/* Thermal Printer Settings Modal */}
      <ThermalPrinterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        settings={settings}
      />
    </>
  );
}
