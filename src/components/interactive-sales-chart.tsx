"use client";

import { useMemo, useRef, useState } from "react";
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
  const chartRef = useRef<HTMLDivElement>(null);
  const max = useMemo(() => Math.max(...points.map((point) => point.revenue), 1), [points]);
  const active = activeIndex == null ? null : points[activeIndex];

  return (
    <div
      className="interactive-chart"
      ref={chartRef}
      onPointerDown={(event) => {
        if (event.target === chartRef.current) setActiveIndex(null);
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
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onClick={() => setActiveIndex((current) => (current === index ? null : index))}
            >
              <span className="interactive-chart-value">{point.revenue ? formatCurrency(point.revenue) : "Rp 0"}</span>
              <span className="interactive-chart-track"><i style={{ height: `${height}%` }} /></span>
              <span className="interactive-chart-label">{dateLabel}</span>
            </button>
          );
        })}
      </div>
      {active ? (
        <div className="chart-tooltip" role="status">
          <strong>{new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" }).format(new Date(`${active.date}T12:00:00+07:00`))}</strong>
          <dl>
            <div><dt>Omzet</dt><dd>{formatCurrency(active.revenue)}</dd></div>
            <div><dt>Transaksi</dt><dd>{active.transactions ?? 0}</dd></div>
            <div><dt>Unit terjual</dt><dd>{active.units ?? 0}</dd></div>
            {active.gross_profit != null ? <div><dt>Laba kotor</dt><dd>{formatCurrency(active.gross_profit)}</dd></div> : null}
          </dl>
        </div>
      ) : null}
      <p className="chart-hint">Arahkan kursor atau sentuh batang grafik untuk melihat tanggal dan omzet.</p>
    </div>
  );
}
