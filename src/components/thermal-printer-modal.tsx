"use client";

import { useEffect, useState } from "react";
import { Bluetooth, Cable, CheckCircle2, HelpCircle, Laptop, Loader2, Printer, RefreshCw, X } from "lucide-react";
import { thermalPrinter, type ThermalPaperWidth, type ThermalPrinterState } from "@/lib/thermal-printer";
import type { SystemSettings } from "@/lib/types";

interface ThermalPrinterModalProps {
  open: boolean;
  onClose: () => void;
  settings?: SystemSettings | null;
}

export function ThermalPrinterModal({ open, onClose, settings }: ThermalPrinterModalProps) {
  const [state, setState] = useState<ThermalPrinterState>(thermalPrinter.getState());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    return thermalPrinter.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  if (!open) return null;

  const handleConnectBt = async () => {
    setTestResult(null);
    await thermalPrinter.connectBluetooth();
  };

  const handleConnectSerial = async () => {
    setTestResult(null);
    await thermalPrinter.connectSerial();
  };

  const handleDisconnect = async () => {
    setTestResult(null);
    await thermalPrinter.disconnect();
  };

  const handleTestPrint = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await thermalPrinter.printTestReceipt(settings);
      setTestResult("Tes cetak berhasil dikirim ke printer!");
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Gagal melakukan tes cetak");
    } finally {
      setTesting(false);
    }
  };

  const handleWidthChange = (w: ThermalPaperWidth) => {
    thermalPrinter.setPaperWidth(w);
  };

  const isConnected = state.status === "connected";
  const isConnecting = state.status === "connecting";

  return (
    <div className="modal-backdrop thermal-printer-backdrop" onClick={onClose}>
      <div className="modal-card thermal-printer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="thermal-modal-title">
            <div className="thermal-title-icon">
              <Printer size={22} />
            </div>
            <div>
              <h2>Pengaturan Printer Thermal</h2>
              <p>Hubungkan printer struk kasir via Bluetooth atau USB/Serial (ESC/POS).</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="thermal-modal-body">
          {/* Status Box */}
          <div className={`thermal-status-card ${isConnected ? "is-connected" : state.status === "error" ? "is-error" : ""}`}>
            <div className="thermal-status-indicator">
              <span className={`status-dot ${isConnected ? "connected" : isConnecting ? "connecting" : "disconnected"}`} />
              <div>
                <strong>
                  {isConnected
                    ? `Terhubung: ${state.deviceName || "Printer Thermal"}`
                    : isConnecting
                    ? "Sedang Menghubungkan..."
                    : "Belum Ada Printer Terhubung"}
                </strong>
                <span>
                  {isConnected
                    ? `Koneksi ${state.type.toUpperCase()} · Ukuran Kertas ${state.paperWidth}mm`
                    : "Pilih metode koneksi di bawah atau gunakan dialog cetak Windows/driver."}
                </span>
              </div>
            </div>

            {isConnected ? (
              <button
                type="button"
                className="button secondary thermal-disconnect-btn"
                onClick={handleDisconnect}
              >
                Putuskan
              </button>
            ) : null}
          </div>

          {state.errorMessage ? (
            <div className="alert error thermal-alert">
              <span>{state.errorMessage}</span>
            </div>
          ) : null}

          {testResult ? (
            <div className={`alert ${testResult.includes("berhasil") ? "success" : "error"} thermal-alert`}>
              {testResult.includes("berhasil") ? <CheckCircle2 size={16} /> : null}
              <span>{testResult}</span>
            </div>
          ) : null}

          {/* Paper Width Selection */}
          <div className="thermal-section">
            <label className="thermal-section-label">Lebar Kertas Struk</label>
            <div className="thermal-width-selector">
              <button
                type="button"
                className={`thermal-width-btn ${state.paperWidth === 58 ? "active" : ""}`}
                onClick={() => handleWidthChange(58)}
              >
                <strong>58 mm</strong>
                <span>Struk Standar Kasir / Portable Mini (32 karakter/baris)</span>
              </button>
              <button
                type="button"
                className={`thermal-width-btn ${state.paperWidth === 80 ? "active" : ""}`}
                onClick={() => handleWidthChange(80)}
              >
                <strong>80 mm</strong>
                <span>Struk Lebar Desktop POS (48 karakter/baris)</span>
              </button>
            </div>
          </div>

          {/* Connection Actions */}
          <div className="thermal-section">
            <label className="thermal-section-label">Koneksi Perangkat Langsung (ESC/POS)</label>
            <div className="thermal-actions-grid">
              <button
                type="button"
                className="button primary thermal-connect-btn"
                disabled={isConnecting}
                onClick={handleConnectBt}
              >
                {isConnecting && state.type === "none" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Bluetooth size={18} />
                )}
                <div>
                  <strong>Hubungkan Bluetooth</strong>
                  <small>Cocok untuk printer struk nirkabel HP, tablet, & laptop</small>
                </div>
              </button>

              <button
                type="button"
                className="button secondary thermal-connect-btn"
                disabled={isConnecting}
                onClick={handleConnectSerial}
              >
                <Cable size={18} />
                <div>
                  <strong>Hubungkan USB / Serial</strong>
                  <small>Cocok untuk printer thermal desktop kabel USB/COM</small>
                </div>
              </button>
            </div>
          </div>

          {/* Test Print (When connected) */}
          {isConnected ? (
            <div className="thermal-section">
              <div className="thermal-test-row">
                <button
                  type="button"
                  className="button secondary thermal-test-btn"
                  disabled={testing}
                  onClick={handleTestPrint}
                >
                  {testing ? <RefreshCw size={16} className="animate-spin" /> : <Printer size={16} />}
                  <span>{testing ? "Mencetak..." : "Tes Cetak Struk Sekarang"}</span>
                </button>
                <span className="thermal-test-hint">Mencetak contoh struk untuk memastikan sambungan normal.</span>
              </div>
            </div>
          ) : null}

          {/* Alternative: Windows / Browser Driver Print */}
          <div className="thermal-driver-note">
            <div className="note-icon">
              <Laptop size={18} />
            </div>
            <div>
              <strong>Menggunakan Printer Thermal Driver Windows (POS-58 / POS-80 / Epson)?</strong>
              <p>
                Jika printer Anda terpasang lewat kabel biasa dan driver Windows, Anda tidak wajib menghubungkan Bluetooth.
                Cukup pilih format <strong>Thermal 58mm</strong> atau <strong>Thermal 80mm</strong> pada halaman invoice,
                lalu klik <strong>Cetak Struk (Dialog)</strong>.
              </p>
            </div>
          </div>

          <div className="thermal-help-box">
            <HelpCircle size={15} />
            <span>Mendukung merk printer thermal: Panda, RPP02N, Goojprt, Iware, Epson TM, Sunmi, Xprinter, dsb.</span>
          </div>
        </div>

        <div className="modal-actions thermal-modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
