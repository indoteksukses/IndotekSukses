import { CircleUserRound } from "lucide-react";

export const avatarPresets = [
  { key: "male-beard", label: "Pria Berjanggut" },
  { key: "female-stripe", label: "Wanita Garis" },
  { key: "male-glasses", label: "Pria Berkacamata" },
  { key: "male-dark", label: "Pria Kemeja Merah" },
  { key: "hijab-teal", label: "Hijab Teal" },
  { key: "female-pony", label: "Wanita Ponytail" },
  { key: "male-green", label: "Pria Hijau" },
  { key: "female-bob", label: "Wanita Bob" },
  { key: "female-teal", label: "Wanita Teal" },
  { key: "male-orange", label: "Pria Oranye" },
  { key: "female-blonde", label: "Wanita Pirang" },
  { key: "male-suit", label: "Pria Jas" },
  { key: "female-afro", label: "Wanita Afro" },
  { key: "female-glasses", label: "Wanita Berkacamata" },
  { key: "female-blazer", label: "Wanita Blazer" },
  { key: "hijab-navy", label: "Hijab Navy" },
  { key: "hijab-rose", label: "Hijab Rose" },
] as const;

export type AvatarPresetKey = (typeof avatarPresets)[number]["key"];
type HairStyle = "short" | "side" | "bob" | "long" | "pony" | "afro" | "wave";

type AvatarConfig = {
  bgStart: string;
  bgEnd: string;
  skin: string;
  skinShadow: string;
  hair: string;
  hairHighlight?: string;
  hairStyle: HairStyle;
  shirt: string;
  shirtStyle?: "polo" | "stripe" | "suit" | "blazer" | "crew" | "tunic";
  shirtAccent?: string;
  collar?: string;
  tie?: string;
  female?: boolean;
  beard?: boolean;
  glasses?: boolean;
  glassesColor?: string;
  hijab?: string;
  hijabShadow?: string;
  ciput?: string;
  headband?: string;
  earring?: string;
};

const legacyMap: Record<string, AvatarPresetKey> = {
  ocean: "male-beard",
  indigo: "male-glasses",
  emerald: "hijab-teal",
  sunset: "female-blonde",
  rose: "female-stripe",
  violet: "hijab-rose",
  slate: "male-green",
  cyan: "hijab-navy",
  amber: "female-blonde",
  forest: "male-green",
  berry: "female-bob",
  night: "male-suit",
  "male-navy": "male-beard",
  "male-brown": "male-green",
  "male-cap": "male-glasses",
  "female-rose": "female-stripe",
  "female-gold": "female-blonde",
  "hijab-blue": "hijab-navy",
  "hijab-green": "hijab-teal",
  "hijab-violet": "hijab-rose",
};

const presetConfigs: Record<AvatarPresetKey, AvatarConfig> = {
  "male-beard": {
    bgStart: "#3b82f6",
    bgEnd: "#1d4ed8",
    skin: "#f6c8a2",
    skinShadow: "#e2ad82",
    hair: "#1e293b",
    hairHighlight: "#334155",
    hairStyle: "side",
    shirt: "#0f172a",
    shirtStyle: "polo",
    collar: "#38bdf8",
    beard: true,
  },
  "female-stripe": {
    bgStart: "#fb7185",
    bgEnd: "#e11d48",
    skin: "#fcdbc3",
    skinShadow: "#ebb99b",
    hair: "#451a03",
    hairHighlight: "#78350f",
    hairStyle: "long",
    shirt: "#1e293b",
    shirtStyle: "stripe",
    shirtAccent: "#ffffff",
    female: true,
    earring: "#fbbf24",
  },
  "male-glasses": {
    bgStart: "#06b6d4",
    bgEnd: "#0e7490",
    skin: "#fed7aa",
    skinShadow: "#fba96b",
    hair: "#292524",
    hairHighlight: "#44403c",
    hairStyle: "short",
    shirt: "#1e3a8a",
    shirtStyle: "suit",
    collar: "#ffffff",
    tie: "#dc2626",
    glasses: true,
    glassesColor: "#0f172a",
    beard: true,
  },
  "male-dark": {
    bgStart: "#f97316",
    bgEnd: "#c2410c",
    skin: "#9a5c37",
    skinShadow: "#7a4422",
    hair: "#171414",
    hairHighlight: "#2d2424",
    hairStyle: "short",
    shirt: "#991b1b",
    shirtStyle: "polo",
    collar: "#fef3c7",
  },
  "hijab-teal": {
    bgStart: "#14b8a6",
    bgEnd: "#0f766e",
    skin: "#fcd9bd",
    skinShadow: "#e8b492",
    hair: "#1e293b",
    hairStyle: "long",
    shirt: "#134e4a",
    shirtStyle: "tunic",
    female: true,
    hijab: "#042f2e",
    hijabShadow: "#02201f",
    ciput: "#2dd4bf",
  },
  "female-pony": {
    bgStart: "#38bdf8",
    bgEnd: "#0284c7",
    skin: "#fcdbc3",
    skinShadow: "#eeb493",
    hair: "#3e2723",
    hairHighlight: "#5d4037",
    hairStyle: "pony",
    shirt: "#0284c7",
    shirtStyle: "crew",
    collar: "#ffffff",
    female: true,
    earring: "#ffffff",
  },
  "male-green": {
    bgStart: "#10b981",
    bgEnd: "#047857",
    skin: "#fed7aa",
    skinShadow: "#fba96b",
    hair: "#3f2817",
    hairHighlight: "#5c3d25",
    hairStyle: "side",
    shirt: "#065f46",
    shirtStyle: "polo",
    collar: "#a7f3d0",
  },
  "female-bob": {
    bgStart: "#a855f7",
    bgEnd: "#7e22ce",
    skin: "#fcdbc3",
    skinShadow: "#eeb493",
    hair: "#4a044e",
    hairHighlight: "#701a75",
    hairStyle: "bob",
    shirt: "#fdf4ff",
    shirtStyle: "crew",
    collar: "#c084fc",
    female: true,
    earring: "#fbbf24",
  },
  "female-teal": {
    bgStart: "#2dd4bf",
    bgEnd: "#0d9488",
    skin: "#fcd9bd",
    skinShadow: "#ebb99b",
    hair: "#042f2e",
    hairHighlight: "#115e59",
    hairStyle: "wave",
    shirt: "#0f766e",
    shirtStyle: "crew",
    female: true,
    earring: "#ffffff",
  },
  "male-orange": {
    bgStart: "#f59e0b",
    bgEnd: "#d97706",
    skin: "#854d2e",
    skinShadow: "#68391d",
    hair: "#1c1917",
    hairHighlight: "#292524",
    hairStyle: "short",
    shirt: "#ea580c",
    shirtStyle: "crew",
    collar: "#ffedd5",
  },
  "female-blonde": {
    bgStart: "#6366f1",
    bgEnd: "#4338ca",
    skin: "#fcdbc3",
    skinShadow: "#ebb99b",
    hair: "#d97706",
    hairHighlight: "#f59e0b",
    hairStyle: "bob",
    shirt: "#1e1b4b",
    shirtStyle: "crew",
    headband: "#fbbf24",
    female: true,
    earring: "#fbbf24",
  },
  "male-suit": {
    bgStart: "#64748b",
    bgEnd: "#334155",
    skin: "#fed7aa",
    skinShadow: "#fba96b",
    hair: "#0f172a",
    hairHighlight: "#334155",
    hairStyle: "side",
    shirt: "#0f172a",
    shirtStyle: "suit",
    collar: "#ffffff",
    tie: "#2563eb",
    glasses: true,
    glassesColor: "#1e293b",
  },
  "female-afro": {
    bgStart: "#ea580c",
    bgEnd: "#9a3412",
    skin: "#8b4f2c",
    skinShadow: "#6d3a1c",
    hair: "#1c1917",
    hairHighlight: "#292524",
    hairStyle: "afro",
    shirt: "#047857",
    shirtStyle: "crew",
    collar: "#ffffff",
    female: true,
    earring: "#fbbf24",
  },
  "female-glasses": {
    bgStart: "#ec4899",
    bgEnd: "#be185d",
    skin: "#fcdbc3",
    skinShadow: "#eeb493",
    hair: "#312e81",
    hairHighlight: "#4338ca",
    hairStyle: "long",
    shirt: "#be185d",
    shirtStyle: "crew",
    female: true,
    glasses: true,
    glassesColor: "#451a03",
    earring: "#ffffff",
  },
  "female-blazer": {
    bgStart: "#059669",
    bgEnd: "#064e3b",
    skin: "#fcdbc3",
    skinShadow: "#eeb493",
    hair: "#3b1e08",
    hairHighlight: "#5c3311",
    hairStyle: "pony",
    shirt: "#064e3b",
    shirtStyle: "blazer",
    collar: "#ffffff",
    female: true,
    earring: "#fbbf24",
  },
  "hijab-navy": {
    bgStart: "#2563eb",
    bgEnd: "#1e3a8a",
    skin: "#fcd9bd",
    skinShadow: "#e8b492",
    hair: "#0f172a",
    hairStyle: "long",
    shirt: "#172554",
    shirtStyle: "tunic",
    female: true,
    hijab: "#1e3a8a",
    hijabShadow: "#0f172a",
    ciput: "#60a5fa",
  },
  "hijab-rose": {
    bgStart: "#f43f5e",
    bgEnd: "#9f1239",
    skin: "#fcd9bd",
    skinShadow: "#e8b492",
    hair: "#451a03",
    hairStyle: "long",
    shirt: "#881337",
    shirtStyle: "tunic",
    female: true,
    hijab: "#9f1239",
    hijabShadow: "#4c0519",
    ciput: "#fda4af",
  },
};

export function normalizeAvatarKey(key?: string | null): AvatarPresetKey {
  if (!key) return "male-beard";
  if (key in presetConfigs) return key as AvatarPresetKey;
  return legacyMap[key] ?? "male-beard";
}

function PersonIllustration({ preset, name }: { preset: AvatarPresetKey; name: string }) {
  const c = presetConfigs[preset] ?? presetConfigs["male-beard"];
  const idPrefix = `av-${preset}`;

  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false" className="avatar-art">
      <defs>
        {/* Background gradient */}
        <linearGradient id={`${idPrefix}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.bgStart} />
          <stop offset="100%" stopColor={c.bgEnd} />
        </linearGradient>

        {/* Skin gradient */}
        <linearGradient id={`${idPrefix}-skin`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={c.skin} />
          <stop offset="100%" stopColor={c.skinShadow} />
        </linearGradient>
      </defs>

      {/* Circle base with smooth gradient */}
      <rect width="96" height="96" rx="48" fill={`url(#${idPrefix}-bg)`} />

      {/* Soft inner ambient vignette at bottom */}
      <circle cx="48" cy="48" r="48" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <ellipse cx="48" cy="94" rx="34" ry="8" fill="rgba(0,0,0,0.15)" />

      {/* ── BACK HAIR (for long, bob, pony styles) ── */}
      {!c.hijab && c.hairStyle === "long" && (
        <path
          d="M23 44 C23 20, 33 13, 48 13 C63 13, 73 20, 73 44 L75 75 C75 82, 69 82, 65 74 C62 67, 63 52, 64 44 C64 30, 56 22, 48 22 C40 22, 32 30, 32 44 C33 52, 34 67, 31 74 C27 82, 21 82, 21 75 Z"
          fill={c.hair}
        />
      )}
      {!c.hijab && c.hairStyle === "bob" && (
        <path
          d="M24 40 C24 18, 34 13, 48 13 C62 13, 72 18, 72 40 C72 56, 68 62, 63 58 C66 46, 66 32, 48 32 C30 32, 30 46, 33 58 C28 62, 24 56, 24 40 Z"
          fill={c.hair}
        />
      )}
      {!c.hijab && c.hairStyle === "wave" && (
        <path
          d="M24 42 C24 20, 34 13, 48 13 C62 13, 72 20, 72 42 C72 60, 67 76, 58 80 C64 72, 66 54, 64 42 C62 30, 55 22, 48 22 C39 22, 32 30, 30 42 C28 54, 26 70, 22 74 C22 62, 24 52, 24 42 Z"
          fill={c.hair}
        />
      )}
      {!c.hijab && c.hairStyle === "pony" && (
        <>
          <ellipse cx="73" cy="28" rx="4" ry="6" fill="#f43f5e" />
          <path
            d="M73 28 C82 20, 90 32, 83 52 C79 60, 74 54, 76 42 C78 32, 74 26, 73 28 Z"
            fill={c.hair}
          />
        </>
      )}

      {/* ── HIJAB BACK DRAPE ── */}
      {c.hijab && (
        <path
          d="M21 46 C21 17, 32 11, 48 11 C64 11, 75 17, 75 46 C75 74, 69 88, 74 96 L22 96 C27 88, 21 74, 21 46 Z"
          fill={c.hijab}
        />
      )}

      {/* ── NECK & CHEST BASE ── */}
      <path d="M41 54 L41 69 C41 72, 55 72, 55 69 L55 54 Z" fill={c.skinShadow} />
      <ellipse cx="48" cy="56" rx="7.5" ry="2" fill="rgba(0,0,0,0.12)" />

      {/* ── SHOULDERS & APPAREL ── */}
      <path
        d="M13 96 C15 74, 30 67, 48 67 C66 67, 81 74, 83 96 Z"
        fill={c.shirt}
      />

      {/* Apparel details */}
      {c.shirtStyle === "stripe" && (
        <g opacity="0.92">
          <path d="M22 75 C30 72, 40 71, 48 71 C56 71, 66 72, 74 75" stroke={c.shirtAccent || "#fff"} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M19 82 C28 79, 39 78, 48 78 C57 78, 68 79, 77 82" stroke={c.shirtAccent || "#fff"} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M16 89 C27 86, 38 85, 48 85 C58 85, 69 86, 80 89" stroke={c.shirtAccent || "#fff"} strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      )}

      {c.shirtStyle === "polo" && c.collar && (
        <>
          <path d="M37 67 L48 78 L42 81 L31 71 Z" fill={c.collar} />
          <path d="M59 67 L48 78 L54 81 L65 71 Z" fill={c.collar} />
          <path d="M48 78 L48 90" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
          <circle cx="48" cy="82" r="1.2" fill="#fff" />
          <circle cx="48" cy="87" r="1.2" fill="#fff" />
        </>
      )}

      {c.shirtStyle === "suit" && (
        <>
          {/* White inner shirt triangle */}
          <polygon points="41,67 55,67 48,82" fill="#ffffff" />
          {/* Tie */}
          {c.tie && (
            <>
              <polygon points="46,73 50,73 49,76 47,76" fill={c.tie} />
              <polygon points="46,76 50,76 52,93 48,96 44,93" fill={c.tie} />
            </>
          )}
          {/* Lapels */}
          <path d="M34 67 L44 86 L37 96 L26 96 Z" fill="#1e293b" />
          <path d="M62 67 L52 86 L59 96 L70 96 Z" fill="#1e293b" />
        </>
      )}

      {c.shirtStyle === "blazer" && (
        <>
          <polygon points="41,67 55,67 48,80" fill={c.collar || "#ffffff"} />
          <path d="M33 67 L45 84 L38 96 L24 96 Z" fill="#064e3b" />
          <path d="M63 67 L51 84 L58 96 L72 96 Z" fill="#064e3b" />
        </>
      )}

      {c.shirtStyle === "tunic" && c.hijab && (
        /* Soft draped scarf curve over tunic */
        <path d="M32 70 Q48 83 64 70 Q58 90 48 92 Q38 90 32 70 Z" fill={c.hijabShadow || "#0f172a"} opacity="0.4" />
      )}

      {/* ── EARS (shown if no hijab) ── */}
      {!c.hijab && (
        <>
          <circle cx="31.5" cy="41" r="4.2" fill={c.skin} />
          <circle cx="32" cy="41" r="2.2" fill={c.skinShadow} />
          <circle cx="64.5" cy="41" r="4.2" fill={c.skin} />
          <circle cx="64" cy="41" r="2.2" fill={c.skinShadow} />
          {c.earring && (
            <>
              <circle cx="31" cy="45" r="1.8" fill={c.earring} />
              <circle cx="65" cy="45" r="1.8" fill={c.earring} />
            </>
          )}
        </>
      )}

      {/* ── HEAD & FACE ── */}
      <path
        d="M31.5 38 C31.5 22, 64.5 22, 64.5 38 C64.5 53, 57.5 60, 48 60 C38.5 60, 31.5 53, 31.5 38 Z"
        fill={`url(#${idPrefix}-skin)`}
      />

      {/* ── HIJAB FACE FRAME & CIPUT ── */}
      {c.hijab && (
        <>
          {c.ciput && (
            <path
              d="M34 32 C38 27, 43 25, 48 25 C53 25, 58 27, 62 32 C58 29.5, 53 28.5, 48 28.5 C43 28.5, 38 29.5, 34 32 Z"
              fill={c.ciput}
            />
          )}
          <path
            d="M31.5 38 C32.5 24, 41 21, 48 21 C55 21, 63.5 24, 64.5 38 C65.5 53, 56.5 61, 48 61 C39.5 61, 30.5 53, 31.5 38 Z"
            fill="none"
            stroke={c.hijab}
            strokeWidth="3.5"
          />
          {/* Subtle brooch pin */}
          <circle cx="48" cy="62.5" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" />
        </>
      )}

      {/* ── CHEEKS BLUSH ── */}
      <ellipse cx="36" cy="46" rx="4" ry="2.2" fill="#f43f5e" opacity="0.18" />
      <ellipse cx="60" cy="46" rx="4" ry="2.2" fill="#f43f5e" opacity="0.18" />

      {/* ── EYES (Modern expressive vector with specular highlights) ── */}
      <g>
        {/* Left Eye Sclera */}
        <ellipse cx="40.5" cy="40.5" rx="3.6" ry="3.2" fill="#ffffff" />
        {/* Left Iris */}
        <circle cx="41" cy="40.5" r="2.2" fill="#1e293b" />
        {/* Left Specular Catchlight */}
        <circle cx="41.7" cy="39.8" r="0.8" fill="#ffffff" />
        {/* Left Upper Lid */}
        <path d="M37 40 Q40.5 37.5 44 40" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" fill="none" />

        {/* Right Eye Sclera */}
        <ellipse cx="55.5" cy="40.5" rx="3.6" ry="3.2" fill="#ffffff" />
        {/* Right Iris */}
        <circle cx="55" cy="40.5" r="2.2" fill="#1e293b" />
        {/* Right Specular Catchlight */}
        <circle cx="55.7" cy="39.8" r="0.8" fill="#ffffff" />
        {/* Right Upper Lid */}
        <path d="M52 40 Q55.5 37.5 59 40" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>

      {/* ── EYEBROWS ── */}
      <path
        d="M37 36 Q40.5 34 44 36"
        stroke={c.female ? "#3b1e08" : "#1e293b"}
        strokeWidth={c.female ? "1.5" : "1.8"}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M52 36 Q55.5 34 59 36"
        stroke={c.female ? "#3b1e08" : "#1e293b"}
        strokeWidth={c.female ? "1.5" : "1.8"}
        strokeLinecap="round"
        fill="none"
      />

      {/* ── NOSE ── */}
      <path d="M46.5 45 Q48 47.5 49.5 45" stroke="#be7b55" strokeWidth="1.4" strokeLinecap="round" fill="none" />

      {/* ── MOUTH (Warm friendly smile) ── */}
      <path d="M43 51 Q48 56 53 51" stroke="#be123c" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M44.5 51.5 Q48 54 51.5 51.5" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" fill="none" />

      {/* ── BEARD (if any) ── */}
      {c.beard && (
        <>
          <path
            d="M32.5 43 C34 56, 40 61, 48 61 C56 61, 62 56, 63.5 43 C61 48, 56 53, 48 53 C40 53, 35 48, 32.5 43 Z"
            fill={c.hair}
            opacity="0.95"
          />
          <path d="M44 49 Q48 50.5 52 49" stroke={c.hair} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* ── GLASSES (if any) ── */}
      {c.glasses && (
        <g>
          {/* Left Frame */}
          <rect
            x="34"
            y="35"
            width="13"
            height="11"
            rx="4.5"
            fill="rgba(255,255,255,0.18)"
            stroke={c.glassesColor || "#0f172a"}
            strokeWidth="1.8"
          />
          {/* Right Frame */}
          <rect
            x="49"
            y="35"
            width="13"
            height="11"
            rx="4.5"
            fill="rgba(255,255,255,0.18)"
            stroke={c.glassesColor || "#0f172a"}
            strokeWidth="1.8"
          />
          {/* Bridge */}
          <path d="M47 39.5 Q48 38 49 39.5" stroke={c.glassesColor || "#0f172a"} strokeWidth="1.8" fill="none" />
          {/* Temple arms */}
          <path d="M34 38 L30.5 38 M62 38 L65.5 38" stroke={c.glassesColor || "#0f172a"} strokeWidth="1.8" strokeLinecap="round" />
          {/* Glare */}
          <path d="M36 37.5 L40.5 37.5 M51 37.5 L55.5 37.5" stroke="rgba(255,255,255,0.65)" strokeWidth="1.1" strokeLinecap="round" />
        </g>
      )}

      {/* ── FRONT HAIR (Styled per character) ── */}
      {!c.hijab && (
        <>
          {c.hairStyle === "side" && (
            <path
              d="M28 36 C28 19, 39 14, 48 14 C60 14, 68 19, 68 33 C68 36, 66 38, 64 36 C61 24, 52 21, 44 21 C36 21, 30 27, 29 36 Z"
              fill={c.hair}
            />
          )}

          {c.hairStyle === "short" && (
            <path
              d="M29 36 C28 21, 38 15, 48 15 C58 15, 68 21, 67 36 C64 26, 56 22, 48 22 C40 22, 32 26, 29 36 Z"
              fill={c.hair}
            />
          )}

          {c.hairStyle === "afro" && (
            <path
              d="M19 40 C17 19, 32 9, 48 9 C64 9, 79 19, 77 40 C76 50, 71 56, 67 54 C67 41, 65 27, 48 27 C31 27, 29 41, 29 54 C25 56, 20 50, 19 40 Z"
              fill={c.hair}
            />
          )}

          {c.hairStyle === "long" && (
            <path
              d="M28 35 C30 21, 40 17, 48 17 C58 17, 68 21, 68 35 C65 27, 58 23, 48 23 C38 23, 31 27, 28 35 Z"
              fill={c.hair}
            />
          )}

          {c.hairStyle === "pony" && (
            <path
              d="M28 36 C29 21, 39 17, 48 17 C57 17, 68 21, 68 36 C65 27, 57 23, 48 23 C39 23, 31 27, 28 36 Z"
              fill={c.hair}
            />
          )}

          {c.hairStyle === "bob" && (
            <path
              d="M28 36 C29 21, 39 16, 48 16 C57 16, 68 21, 68 36 C65 26, 57 22, 48 22 C39 22, 31 26, 28 36 Z"
              fill={c.hair}
            />
          )}

          {c.hairStyle === "wave" && (
            <path
              d="M27 36 C29 20, 40 16, 48 16 C60 16, 69 20, 69 36 C66 26, 58 22, 48 22 C38 22, 30 26, 27 36 Z"
              fill={c.hair}
            />
          )}

          {c.headband && (
            <path
              d="M31 29 C36 22, 42 19, 48 19 C54 19, 60 22, 65 29 L62 33 C58 27, 53 25, 48 25 C43 25, 38 27, 34 33 Z"
              fill={c.headband}
            />
          )}
        </>
      )}

      <title>{`Avatar ${name}`}</title>
    </svg>
  );
}

export function UserAvatar({
  name,
  avatarKey = "male-beard",
  size = "md",
}: {
  name: string;
  avatarKey?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const preset = normalizeAvatarKey(avatarKey);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={`avatar avatar-person avatar-${size}`}
      aria-label={`Avatar ${name}`}
      data-avatar-key={preset}
    >
      <PersonIllustration preset={preset} name={name} />
      {!name ? (
        <span className="avatar-fallback">
          {initials || <CircleUserRound size={18} />}
        </span>
      ) : null}
    </span>
  );
}
