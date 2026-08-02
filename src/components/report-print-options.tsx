"use client";

import { Download, Printer, X } from "lucide-react";
import { useState } from "react";

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

type Options = {
  summary: boolean;
  inventory: boolean;
  transactions: boolean;
  logo: boolean;
  costs: boolean;
  cashier: boolean;
};

export function ReportExportActions({
  filename,
  rows,
  canViewCosts,
}: {
  filename: string;
  rows: Record<string, CsvValue>[];
  canViewCosts: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Options>({ summary: true, inventory: true, transactions: true, logo: true, costs: canViewCosts, cashier: true });

  const toggle = (key: keyof Options) => setOptions((current) => ({ ...current, [key]: !current[key] }));
  const print = () => {
    if (!options.summary && !options.inventory && !options.transactions) return;
    const root = document.documentElement;
    root.dataset.printSummary = options.summary ? "1" : "0";
    root.dataset.printInventory = options.inventory ? "1" : "0";
    root.dataset.printTransactions = options.transactions ? "1" : "0";
    root.dataset.printLogo = options.logo ? "1" : "0";
    root.dataset.printCosts = options.costs && canViewCosts ? "1" : "0";
    root.dataset.printCashier = options.cashier ? "1" : "0";
    setOpen(false);
    window.setTimeout(() => window.print(), 80);
  };

  return (
    <>
      <div className="export-actions">
        <button type="button" className="button secondary" onClick={() => setOpen(true)}><Printer size={16}/> Cetak / PDF</button>
        <button type="button" className="button primary" onClick={() => downloadRows(filename, rows)} disabled={!rows.length}><Download size={16}/> Unduh CSV</button>
      </div>
      {open ? (
        <div className="modal-backdrop report-options-backdrop" role="dialog" aria-modal="true" aria-label="Pilihan cetak laporan">
          <div className="modal-card report-options-modal">
            <div className="modal-header report-options-header">
              <div><h2>Cetak / Unduh laporan</h2><p>Pilih bagian yang ingin disertakan pada hasil cetak atau PDF.</p></div>
              <button type="button" className="icon-button" onClick={() => setOpen(false)}><X size={20}/></button>
            </div>
            <div className="report-option-groups">
              <section>
                <h3>Isi laporan</h3>
                <CheckRow checked={options.summary} onChange={() => toggle("summary")} label="Ringkasan utama" description="Penjualan bersih, retur, HPP, laba, transaksi, dan unit." />
                <CheckRow checked={options.inventory} onChange={() => toggle("inventory")} label="Ringkasan persediaan" description="Daftar stok, nilai persediaan, dan status restok." />
                <CheckRow checked={options.transactions} onChange={() => toggle("transactions")} label="Transaksi periode" description="Nomor invoice, tanggal, toko, kasir, total, dan status." />
              </section>
              <section>
                <h3>Tampilan</h3>
                <CheckRow checked={options.logo} onChange={() => toggle("logo")} label="Sertakan logo" description="Gunakan logo perusahaan pada kepala laporan." />
                <CheckRow checked={options.cashier} onChange={() => toggle("cashier")} label="Sertakan nama kasir" description="Tampilkan nama kasir pada tabel transaksi." />
                {canViewCosts ? <CheckRow checked={options.costs} onChange={() => toggle("costs")} label="Sertakan HPP / harga modal" description="Hanya tersedia untuk owner dan admin." /> : null}
              </section>
            </div>
            {!options.summary && !options.inventory && !options.transactions ? <div className="alert error">Pilih minimal satu bagian laporan.</div> : null}
            <div className="modal-actions report-options-actions">
              <button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button>
              <button type="button" className="button primary" disabled={!options.summary && !options.inventory && !options.transactions} onClick={print}><Printer size={16}/> Buka cetak / PDF</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CheckRow({ checked, onChange, label, description }: { checked: boolean; onChange: () => void; label: string; description: string }) {
  return (
    <label className={`report-check-row ${checked ? "checked" : ""}`}>
      <input type="checkbox" checked={checked} onChange={onChange}/>
      <span className="report-check-box" aria-hidden="true">{checked ? "✓" : ""}</span>
      <span><strong>{label}</strong><small>{description}</small></span>
    </label>
  );
}
