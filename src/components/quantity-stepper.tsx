"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  value,
  min = 1,
  max,
  step = 1,
  unit,
  onChange,
  ariaLabel = "Jumlah",
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  ariaLabel?: string;
}) {
  const normalize = (next: number) => {
    const integer = Math.floor(Number.isFinite(next) ? next : min);
    return Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, integer));
  };

  return (
    <div className="quantity-stepper quantity-stepper-inline-unit">
      <button type="button" aria-label={`Kurangi ${ariaLabel}`} onClick={() => onChange(normalize(value - step))} disabled={value <= min}>
        <Minus size={17} />
      </button>
      <label>
        <span className="sr-only">{ariaLabel}</span>
        <input
          aria-label={ariaLabel}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(normalize(Number(event.target.value || min)))}
        />
        {unit ? <small>{unit}</small> : null}
      </label>
      <button type="button" aria-label={`Tambah ${ariaLabel}`} onClick={() => onChange(normalize(value + step))} disabled={max != null && value >= max}>
        <Plus size={17} />
      </button>
    </div>
  );
}
