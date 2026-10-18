"use client";

import { useEffect, useState } from "react";
import { Bluetooth, Cable, CheckCircle2, HelpCircle, Laptop, Loader2, Printer, RefreshCw, Settings2 } from "lucide-react";
import { thermalPrinter, type ThermalPaperWidth, type ThermalPrinterState } from "@/lib/thermal-printer";
import type { SystemSettings } from "@/lib/types";

interface ThermalPrinterSettingsProps {
  settings?: SystemSettings | null;
}

export function ThermalPrinterSettings({ settings }: ThermalPrinterSettingsProps) {
  const [state, setState] = useState<ThermalPrinterState>(thermalPrinter.getState());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    return thermalPrinter.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  const isConnected = state.status === "connected";
  const isConnecting = state.status === "connecting";

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

  const handleAutoPrintToggle = (checked: boolean) => {
    thermalPrinter.setAutoPrintOnCheckout(checked);
  };

  return (
    <div className="panel thermal-settings-panel">
      <div className="panel-header">
        <div className="thermal-settings-header-title">
          <div className="thermal-settings-icon">
            <Printer size={22} />
          </div>
          <div>
            <h2>Printer Thermal & Cetak Struk</h2>
            <p>Pilih ukuran kertas struk, hubungkan printer Bluetooth/USB (ESC/POS), dan atur pencetakan otomatis.</p>
          </div>
        </div>
      </div>

      <div className="thermal-settings-content">
        {/* Status Card */}
        <div className={`thermal-status-card ${isConnected ? "is-connected" : "is-disconnected"}`}>
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
                  ? `Koneksi ${state.type.toUpperCase()} · Ukuran Kertas Aktif: ${state.paperWidth}mm`
                  : "Sambungkan via Bluetooth/USB atau gunakan driver printer Windows/browser."}
              </span>
            </div>
          </div>

          {isConnected ? (
            <button
              type="button"
              className="button secondary thermal-disconnect-btn"
              onClick={handleDisconnect}
            >
              Putuskan Sambungan
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

        {/* 1. Pilih Ukuran Kertas */}
        <div className="thermal-setting-group">
          <label className="thermal-setting-group-title">1. Pilih Ukuran Kertas Struk Default</label>
          <div className="thermal-width-selector">
            <button
              type="button"
              className={`thermal-width-btn ${state.paperWidth === 58 ? "active" : ""}`}
              onClick={() => handleWidthChange(58)}
            >
              <div className="thermal-width-btn-head">
                <strong>Thermal 58 mm</strong>
                <span className="thermal-badge">Paling Umum</span>
              </div>
              <span>Lebar cetak ~48mm (32 karakter/baris). Standar printer mobile Bluetooth & kasir mini.</span>
            </button>

            <button
              type="button"
              className={`thermal-width-btn ${state.paperWidth === 80 ? "active" : ""}`}
              onClick={() => handleWidthChange(80)}
            >
              <div className="thermal-width-btn-head">
                <strong>Thermal 80 mm</strong>
                <span className="thermal-badge">Lebar</span>
              </div>
              <span>Lebar cetak ~72mm (48 karakter/baris). Cocok untuk printer kasir desktop besar (Epson TM Series, dsb).</span>
            </button>
          </div>
        </div>

        {/* 2. Koneksi Printer Langsung */}
        <div className="thermal-setting-group">
          <label className="thermal-setting-group-title">2. Hubungkan Perangkat Printer (ESC/POS)</label>
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
                <small>Untuk printer nirkabel (Panda, RPP02N, Goojprt, Iware, dsb)</small>
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
                <small>Untuk printer kabel USB/COM desktop POS</small>
              </div>
            </button>
          </div>
        </div>

        {/* 3. Tes Cetak */}
        {isConnected ? (
          <div className="thermal-setting-group">
            <label className="thermal-setting-group-title">3. Pengujian Printer</label>
            <div className="thermal-test-row">
              <button
                type="button"
                className="button secondary thermal-test-btn"
                disabled={testing}
                onClick={handleTestPrint}
              >
                {testing ? <RefreshCw size={16} className="animate-spin" /> : <Printer size={16} />}
                <span>{testing ? "Sedang Mencetak..." : "Tes Cetak Struk Sekarang"}</span>
              </button>
              <span className="thermal-test-hint">Mencetak contoh struk pengujian untuk memastikan kertas dan cetakan pas.</span>
            </div>
          </div>
        ) : null}

        {/* 4. Opsi Otomatis Cetak Struk di Kasir */}
        <div className="thermal-setting-group">
          <label className="thermal-setting-group-title">4. Pengaturan Kasir</label>
          <label className="thermal-checkbox-card">
            <input
              type="checkbox"
              checked={state.autoPrintOnCheckout}
              onChange={(e) => handleAutoPrintToggle(e.target.checked)}
            />
            <div>
              <strong>Otomatis Cetak Struk Saat Transaksi Berhasil di Kasir</strong>
              <small>Ketika printer terhubung, struk thermal akan langsung dicetak otomatis saat pembayaran kasir selesai.</small>
            </div>
          </label>
        </div>

        {/* 5. Panduan Driver Windows */}
        <div className="thermal-driver-note">
          <div className="note-icon">
            <Laptop size={20} />
          </div>
          <div>
            <strong>Menggunakan Driver Printer Windows (POS-58 / POS-80 / Epson)?</strong>
            <p>
              Jika printer Anda terpasang menggunakan kabel biasa dan driver Windows bawaan, Anda tidak harus menghubungkan Bluetooth.
              Cukup pilih format <strong>Thermal 58mm</strong> atau <strong>80mm</strong> di atas, lalu pada halaman invoice atau popup kasir, klik <strong>Cetak Thermal (Dialog)</strong>.
            </p>
          </div>
        </div>

        <div className="thermal-help-box">
          <HelpCircle size={15} />
          <span>Mendukung berbagai merk: Panda, RPP02N, Goojprt, Iware, Epson TM-T82, Sunmi, Xprinter, dsb.</span>
        </div>
      </div>
    </div>
  );
}
