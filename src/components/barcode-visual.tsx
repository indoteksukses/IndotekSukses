"use client";

import { useMemo } from "react";
import { encodeCode128 } from "@/lib/barcode";

export function BarcodeVisual({
  value,
  className = "",
  height = 42,
  showText = true,
  altText,
}: {
  value: string;
  className?: string;
  height?: number;
  showText?: boolean;
  altText?: string;
}) {
  const data = useMemo(() => encodeCode128(value), [value]);

  if (!value || data.width === 0) {
    return (
      <div className={`barcode-visual-empty ${className}`}>
        <span>Tanpa Barcode</span>
      </div>
    );
  }

  return (
    <div className={`barcode-visual-container ${className}`}>
      <svg
        viewBox={`0 0 ${data.width} ${height}`}
        preserveAspectRatio="none"
        className="barcode-svg-element"
        aria-label={`Barcode: ${value}`}
        role="img"
      >
        {data.bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill="currentColor"
          />
        ))}
      </svg>
      {showText ? (
        <span className="barcode-visual-code-text">
          {altText || value}
        </span>
      ) : null}
    </div>
  );
}
