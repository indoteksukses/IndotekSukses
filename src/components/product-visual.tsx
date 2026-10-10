"use client";

import { memo, useState, type CSSProperties, type ReactNode } from "react";
import type { ProductVisualDefinition, ProductVisualElement } from "@/lib/types";

type Props = {
  name: string;
  imageUrl?: string | null;
  definition?: ProductVisualDefinition | null;
  size?: "thumb" | "card" | "preview";
  animated?: boolean;
};

const fallback: Required<Pick<ProductVisualDefinition, "shape" | "primary" | "secondary" | "accent" | "background">> = {
  shape: "generic", primary: "#2563eb", secondary: "#93c5fd", accent: "#f59e0b", background: "#eff6ff",
};

function safeColor(value: string | undefined, fallbackValue: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallbackValue;
}

function Shapes({ shape, primary, secondary, accent }: Required<Pick<ProductVisualDefinition, "shape" | "primary" | "secondary" | "accent">>) {
  const common = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const shapes: Record<string, ReactNode> = {
    bolt: <g {...common}><polygon points="30,19 46,19 55,28 55,55 46,64 30,64 21,55 21,28" fill={secondary} stroke={primary} strokeWidth="4"/><rect x="35" y="58" width="8" height="25" rx="3" fill={primary}/><path d="M32 67h14M32 74h14M32 81h14" stroke={accent} strokeWidth="3"/></g>,
    nut: <g {...common}><polygon points="24,28 38,20 54,24 62,38 56,54 42,62 26,57 18,43" fill={secondary} stroke={primary} strokeWidth="5"/><circle cx="40" cy="41" r="10" fill="white" stroke={primary} strokeWidth="4"/><path d="M35 36l10 10M45 36L35 46" stroke={accent} strokeWidth="2" opacity=".8"/></g>,
    screw: <g {...common}><circle cx="40" cy="23" r="14" fill={secondary} stroke={primary} strokeWidth="4"/><path d="M31 23h18M40 14v18" stroke={accent} strokeWidth="3"/><rect x="36" y="36" width="8" height="41" rx="3" fill={primary}/><path d="M31 45h18M31 54h18M31 63h18M31 72h18" stroke={secondary} strokeWidth="3"/></g>,
    wrench: <g {...common} transform="rotate(-25 40 45)"><path d="M31 16c7-5 15-4 20 1l-9 9 7 7 9-9c3 8 0 17-8 21l-23 27c-3 4-10 4-14 0s-4-10 0-14l27-23c-5-5-8-12-9-19z" fill={secondary} stroke={primary} strokeWidth="4"/><circle cx="21" cy="64" r="5" fill={accent}/></g>,
    drill: <g {...common}><path d="M17 26h36l11 11v16H40l-5 25H22l4-25h-9z" fill={primary}/><rect x="23" y="31" width="25" height="11" rx="3" fill={secondary}/><path d="M64 40h14v9H64" fill={accent}/><path d="M39 53h15l-5 25H34z" fill={secondary}/><circle cx="31" cy="37" r="3" fill={accent}/></g>,
    grinder: <g {...common}><path d="M16 35h37l12 10-10 15H24L15 50z" fill={primary}/><rect x="23" y="40" width="23" height="8" rx="3" fill={secondary}/><circle cx="63" cy="54" r="17" fill={secondary} stroke={primary} strokeWidth="4"/><circle cx="63" cy="54" r="5" fill={accent}/><path d="M24 58l-7 17" stroke={primary} strokeWidth="7"/></g>,
    saw: <g {...common} transform="rotate(-8 40 45)"><path d="M18 24h44l13 34-8 8-8-10-7 9-7-10-7 8-7-10-7 7z" fill={secondary} stroke={primary} strokeWidth="3"/><path d="M18 24h28v15H18z" fill={accent}/><rect x="7" y="18" width="18" height="27" rx="7" fill={primary}/></g>,
    hammer: <g {...common} transform="rotate(-23 40 45)"><rect x="34" y="34" width="10" height="48" rx="4" fill={accent}/><path d="M18 20h43v22H18c-8 0-8-22 0-22z" fill={secondary} stroke={primary} strokeWidth="4"/><path d="M61 24h9l7 7-7 7h-9z" fill={primary}/></g>,
    pliers: <g {...common}><path d="M27 18c-7 5-8 16-2 23l11 12-16 27" fill="none" stroke={primary} strokeWidth="8"/><path d="M53 18c7 5 8 16 2 23L44 53l16 27" fill="none" stroke={primary} strokeWidth="8"/><circle cx="40" cy="50" r="7" fill={accent}/><path d="M25 20l12 17M55 20L43 37" stroke={secondary} strokeWidth="5"/></g>,
    bearing: <g {...common}><circle cx="40" cy="43" r="28" fill={secondary} stroke={primary} strokeWidth="5"/><circle cx="40" cy="43" r="11" fill="white" stroke={primary} strokeWidth="4"/>{[0,45,90,135,180,225,270,315].map((deg)=><circle key={deg} cx={40+20*Math.cos(deg*Math.PI/180)} cy={43+20*Math.sin(deg*Math.PI/180)} r="3" fill={accent}/>)}</g>,
    tape: <g {...common}><rect x="14" y="20" width="54" height="50" rx="14" fill={primary}/><circle cx="41" cy="45" r="15" fill={secondary}/><circle cx="41" cy="45" r="7" fill="white"/><path d="M68 50h13v10H68" fill={accent}/><path d="M20 62h25" stroke={accent} strokeWidth="4"/></g>,
    generic: <g {...common}><path d="M17 31l23-13 23 13v30L40 75 17 61z" fill={secondary} stroke={primary} strokeWidth="4"/><path d="M17 31l23 14 23-14M40 45v30" fill="none" stroke={primary} strokeWidth="3"/><circle cx="40" cy="31" r="5" fill={accent}/></g>,
  };
  return <>{shapes[shape] ?? shapes.generic}</>;
}

function resolvePaint(value: string | undefined, palette: Record<string, string>, fallbackValue: string) {
  if (!value) return fallbackValue;
  if (value === "none" || value === "white" || value === "transparent") return value;
  if (value in palette) return palette[value];
  return safeColor(value, fallbackValue);
}

function CustomShapes({ elements, palette }: { elements: ProductVisualElement[]; palette: Record<string, string> }) {
  return <>{elements.slice(0, 30).map((element, index) => {
    const common = {
      key: `${element.type}-${index}`,
      fill: resolvePaint(element.fill, palette, "none"),
      stroke: resolvePaint(element.stroke, palette, palette.primary),
      strokeWidth: Math.max(0, Math.min(Number(element.strokeWidth ?? 2), 12)),
      opacity: Math.max(0, Math.min(Number(element.opacity ?? 1), 1)),
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      transform: element.rotate ? `rotate(${Math.max(-360, Math.min(element.rotate, 360))} 40 45)` : undefined,
    };
    if (element.type === "path") return <path {...common} d={element.d}/>;
    if (element.type === "rect") return <rect {...common} x={element.x} y={element.y} width={element.width} height={element.height} rx={element.rx}/>;
    if (element.type === "circle") return <circle {...common} cx={element.cx} cy={element.cy} r={element.r}/>;
    if (element.type === "ellipse") return <ellipse {...common} cx={element.cx} cy={element.cy} rx={element.width} ry={element.height}/>;
    if (element.type === "polygon") return <polygon {...common} points={element.points}/>;
    return <line {...common} x1={element.x1} y1={element.y1} x2={element.x2} y2={element.y2}/>;
  })}</>;
}

export const ProductVisual = memo(function ProductVisual({ name, imageUrl, definition, size = "card", animated = true }: Props) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const normalized = {
    shape: definition?.shape ?? fallback.shape,
    primary: safeColor(definition?.primary, fallback.primary),
    secondary: safeColor(definition?.secondary, fallback.secondary),
    accent: safeColor(definition?.accent, fallback.accent),
    background: safeColor(definition?.background, fallback.background),
  };
  const style = { "--visual-bg": normalized.background } as CSSProperties;
  const custom = normalized.shape === "custom" && Array.isArray(definition?.elements) && definition.elements.length > 0;
  const showImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;
  return <div className={`product-visual product-visual-${size} ${animated ? "is-animated" : ""}`} style={style} aria-label={`Ilustrasi ${name}`}>
    {showImage ? <img key={imageUrl} src={imageUrl!} alt={name} loading={size === "preview" ? "eager" : "lazy"} decoding="async" draggable={false} onError={() => setFailedImageUrl(imageUrl ?? null)}/> : <svg viewBox="0 0 80 90" role="img" aria-hidden="true"><ellipse cx="40" cy="82" rx="25" ry="5" fill="rgba(15,23,42,.13)"/><g className="product-visual-object">{custom ? <CustomShapes elements={definition!.elements!} palette={normalized}/> : <Shapes {...normalized}/>}</g></svg>}
  </div>;
});
