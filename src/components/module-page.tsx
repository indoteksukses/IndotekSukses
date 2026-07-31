import { PageHeader, StatusBadge } from "@/components/ui";
import type { ReactNode } from "react";

export function ModulePage({ title, description, actionLabel = "Tambah Data", children }: { title: string; description: string; actionLabel?: string; children?: ReactNode }) {
  return (
    <>
      <PageHeader title={title} description={description} actions={<button className="button primary">+ {actionLabel}</button>} />
      <div className="toolbar-card">
        <div className="search-box"><span>⌕</span><input placeholder={`Cari ${title.toLowerCase()}...`} /></div>
        <select className="select"><option>Semua toko</option><option>Toko 1</option><option>Toko 2</option></select>
        <select className="select"><option>Semua status</option><option>Aktif</option><option>Menunggu</option><option>Selesai</option></select>
        <button className="button secondary">Ekspor</button>
      </div>
      {children ?? <div className="panel table-panel">
        <table><thead><tr><th>Nomor</th><th>Tanggal</th><th>Toko</th><th>Keterangan</th><th>Status</th><th>Total</th><th/></tr></thead>
        <tbody>{[1,2,3,4,5].map((item) => <tr key={item}><td><strong>IDS-{String(item).padStart(5,"0")}</strong></td><td>31 Jul 2026</td><td>Indotek Sukses Toko {item % 2 ? 1 : 2}</td><td>Data operasional contoh</td><td><StatusBadge tone={item % 3 === 0 ? "warning" : "success"}>{item % 3 === 0 ? "Menunggu" : "Selesai"}</StatusBadge></td><td>Rp{(item * 275000).toLocaleString("id-ID")}</td><td><button className="table-action">Detail</button></td></tr>)}</tbody></table>
      </div>}
    </>
  );
}
