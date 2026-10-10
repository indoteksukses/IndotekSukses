"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
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
  const [tooltipLeft, setTooltipLeft] = useState(0);
  const [tooltipSide, setTooltipSide] = useState<"left" | "right">("right");
  const chartRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const max = useMemo(() => Math.max(...points.map((point) => point.revenue), 1), [points]);
  const active = activeIndex == null ? null : points[activeIndex];

  const activate = (index: number, target: HTMLElement) => {
    const chart = chartRef.current;
    if (!chart) return;
    const chartRect = chart.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const center = targetRect.left - chartRect.left + targetRect.width / 2;
    setTooltipLeft(center);
    setTooltipSide(center > chartRect.width - 160 ? "left" : "right");
    setActiveIndex(index);
  };

  const activateFromPointer = (clientX: number) => {
    const refs = buttonRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (!refs.length) return;
    let nearest = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    refs.forEach((button, index) => {
      const rect = button.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(center - clientX);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = index;
      }
    });
    const button = refs[nearest];
    if (button) activate(nearest, button);
  };

  const tooltipStyle = { "--tooltip-anchor": `${tooltipLeft}px` } as CSSProperties;

  return (
    <div
      className="interactive-chart"
      ref={chartRef}
      onPointerMove={(event) => {
        if (!points.length) return;
        activateFromPointer(event.clientX);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setActiveIndex(null);
      }}
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
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              aria-label={`${point.date}, omzet ${formatCurrency(point.revenue)}`}
              aria-pressed={activeIndex === index}
              onMouseEnter={(event) => activate(index, event.currentTarget)}
              onFocus={(event) => activate(index, event.currentTarget)}
              onBlur={() => setActiveIndex(null)}
              onClick={(event) => activate(index, event.currentTarget)}
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
