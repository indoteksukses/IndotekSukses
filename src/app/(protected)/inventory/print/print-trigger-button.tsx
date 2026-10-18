"use client";

import { Printer } from "lucide-react";

export function PrintTriggerButton({ orientation = "portrait" }: { orientation?: "landscape" | "portrait" }) {
  const handlePrint = () => {
    const styleId = "standalone-print-page-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@media print { @page { size: A4 ${orientation}; margin: 8mm; } }`;

    window.print();
  };

  return (
    <button type="button" className="button primary no-print" onClick={handlePrint}>
      <Printer size={16} /> Cetak / Simpan PDF
    </button>
  );
}
