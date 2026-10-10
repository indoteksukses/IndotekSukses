"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { formatCurrency } from "@/lib/format";

export type SalesChartPoint = {
  date: string;
  revenue: number;
  transactions?: number;
  units?: number;
  gross_profit?: number;
};

export function InteractiveSalesChart({ points }: { points: SalesChartPoint[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = useMemo(() => Math.max(...points.map((point) => point.revenue), 1), [points]);
  const active = activeIndex == null ? null : points[activeIndex];

  const percent = points.length && activeIndex != null ? ((activeIndex + 0.5) / points.length) * 100 : 50;
  const tooltipSide = activeIndex != null && activeIndex >= Math.floor(points.length / 2) ? "left" : "right";
  const tooltipStyle = { "--tooltip-anchor": `${percent}%` } as CSSProperties;

  return (
    <div
      className="interactive-chart"
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setActiveIndex(null);
      }}
    >
      <div className="interactive-chart-grid" aria-label="Grafik omzet 7 hari terakhir">
        {points.map((point, index) => {
          const height = Math.max((point.revenue / max) * 100, point.revenue ? 7 : 2);
          const dateLabel = new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" }).format(new Date(`${point.date}T12:00:00+07:00`));
          return (
            <button
              type="button"
              className={`interactive-chart-column ${activeIndex === index ? "active" : ""}`}
              key={point.date}
              aria-label={`${point.date}, omzet ${formatCurrency(point.revenue)}`}
              aria-pressed={activeIndex === index}
              onPointerEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onClick={() => setActiveIndex(index)}
            >
              <span className="interactive-chart-value">{point.revenue ? formatCurrency(point.revenue) : "Rp 0"}</span>
              <span className="interactive-chart-track"><i style={{ height: `${height}%` }} /></span>
              <span className="interactive-chart-label">{dateLabel}</span>
            </button>
          );
        })}
      </div>
      {active ? (
        <div className={`chart-tooltip chart-tooltip-positioned chart-tooltip-aside ${tooltipSide === "left" ? "align-left" : "align-right"}`} role="status" style={tooltipStyle}>
          <strong>{new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" }).format(new Date(`${active.date}T12:00:00+07:00`))}</strong>
          <dl>
            <div><dt>Omzet</dt><dd>{formatCurrency(active.revenue)}</dd></div>
            <div><dt>Transaksi</dt><dd>{active.transactions ?? 0}</dd></div>
            <div><dt>Unit terjual</dt><dd>{active.units ?? 0}</dd></div>
            {active.gross_profit != null ? <div><dt>Laba kotor</dt><dd>{formatCurrency(active.gross_profit)}</dd></div> : null}
          </dl>
        </div>
      ) : null}
      <p className="chart-hint">Geser sentuhan atau arahkan kursor di atas batang grafik untuk melihat omzet per tanggal.</p>
    </div>
  );
}
