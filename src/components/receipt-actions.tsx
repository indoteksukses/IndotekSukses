"use client";

import { useEffect } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";

export function ReceiptActions({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => { if (autoPrint) window.setTimeout(() => window.print(), 350); }, [autoPrint]);
  return <div className="receipt-actions no-print"><button className="button secondary" onClick={() => history.back()}><ArrowLeft size={16}/> Kembali</button><button className="button secondary" onClick={() => window.print()}><Printer size={16}/> Cetak</button><button className="button primary" onClick={() => window.print()}><Download size={16}/> Unduh / Simpan PDF</button></div>;
}
