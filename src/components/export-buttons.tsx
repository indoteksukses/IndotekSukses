"use client";

import { Download, Printer } from "lucide-react";

type CsvValue = string | number | boolean | null | undefined;

function csvCell(value: CsvValue) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadRows(filename: string, rows: Record<string, CsvValue>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function CsvButton({
  filename,
  rows,
  getRows,
  label = "Unduh CSV",
  disabled,
}: {
  filename: string;
  rows?: Record<string, CsvValue>[];
  getRows?: () => Record<string, CsvValue>[];
  label?: string;
  disabled?: boolean;
}) {
  const handleClick = () => {
    const data = getRows ? getRows() : (rows ?? []);
    downloadRows(filename, data);
  };
  const isDisabled = disabled ?? (getRows ? false : !(rows && rows.length));
  return (
    <button type="button" className="button secondary" onClick={handleClick} disabled={isDisabled}>
      <Download size={16}/> {label}
    </button>
  );
}

export function ExportButtons({ filename, rows }: { filename: string; rows: Record<string, CsvValue>[] }) {
  return <div className="export-actions">
    <button type="button" className="button secondary" onClick={() => window.print()}><Printer size={16}/> Cetak / PDF</button>
    <button type="button" className="button primary" onClick={() => downloadRows(filename, rows)} disabled={!rows.length}><Download size={16}/> Unduh CSV</button>
  </div>;
}
