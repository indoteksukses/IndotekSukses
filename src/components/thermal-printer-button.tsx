"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { thermalPrinter, type ThermalPrinterState } from "@/lib/thermal-printer";
import { ThermalPrinterModal } from "@/components/thermal-printer-modal";

interface ThermalPrinterButtonProps {
  variant?: "topbar" | "sidebar" | "pos" | "compact";
  className?: string;
}

export function ThermalPrinterButton({ variant = "topbar", className = "" }: ThermalPrinterButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [state, setState] = useState<ThermalPrinterState>(thermalPrinter.getState());

  useEffect(() => {
    return thermalPrinter.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  const isConnected = state.status === "connected";

  if (variant === "topbar") {
    return (
      <>
        <button
          type="button"
          className={`topbar-printer-button ${isConnected ? "is-connected" : ""} ${className}`}
          onClick={() => setModalOpen(true)}
          title={`Printer Thermal (${state.paperWidth}mm) - ${isConnected ? `Terhubung: ${state.deviceName}` : "Belum Terhubung"}`}
          aria-label="Pengaturan Printer Thermal"
        >
          <div className="topbar-printer-icon-wrap">
            <Printer size={18} />
            <span className={`status-dot ${isConnected ? "connected" : "disconnected"}`} />
          </div>
          <span className="topbar-printer-label">
            <span className="printer-text">Printer</span>
            <span className="printer-badge">{state.paperWidth}mm</span>
          </span>
        </button>

        <ThermalPrinterModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  if (variant === "sidebar") {
    return (
      <>
        <button
          type="button"
          className={`sidebar-printer-button ${isConnected ? "is-connected" : ""} ${className}`}
          onClick={() => setModalOpen(true)}
        >
          <div className="sidebar-printer-icon">
            <Printer size={19} />
            <span className={`status-dot ${isConnected ? "connected" : "disconnected"}`} />
          </div>
          <div className="sidebar-printer-info">
            <strong>Printer Thermal</strong>
            <small>{isConnected ? `${state.deviceName} (${state.paperWidth}mm)` : `Kertas ${state.paperWidth}mm (Offline)`}</small>
          </div>
        </button>

        <ThermalPrinterModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  if (variant === "pos") {
    return (
      <>
        <button
          type="button"
          className={`pos-printer-quick-btn ${isConnected ? "is-connected" : ""} ${className}`}
          onClick={() => setModalOpen(true)}
          title={`Pengaturan Printer Struk (${state.paperWidth}mm) - Klik untuk sambungkan`}
        >
          <Printer size={18} />
          <span>Printer {state.paperWidth}mm</span>
          <span className={`status-dot ${isConnected ? "connected" : "disconnected"}`} />
        </button>

        <ThermalPrinterModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`button secondary compact-printer-btn ${isConnected ? "is-connected" : ""} ${className}`}
        onClick={() => setModalOpen(true)}
      >
        <Printer size={15} />
        <span>Printer ({state.paperWidth}mm)</span>
        <span className={`status-dot ${isConnected ? "connected" : "disconnected"}`} />
      </button>

      <ThermalPrinterModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
