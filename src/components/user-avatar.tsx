import { CircleUserRound } from "lucide-react";

export const avatarPresets = [
  { key: "male-navy", label: "Pria Navy" },
  { key: "male-brown", label: "Pria Cokelat" },
  { key: "male-cap", label: "Pria Bertopi" },
  { key: "female-rose", label: "Wanita Rose" },
  { key: "female-gold", label: "Wanita Gold" },
  { key: "hijab-blue", label: "Hijab Biru" },
  { key: "hijab-green", label: "Hijab Hijau" },
  { key: "hijab-violet", label: "Hijab Violet" },
] as const;

type AvatarPresetKey = (typeof avatarPresets)[number]["key"];

const legacyMap: Record<string, AvatarPresetKey> = {
  ocean: "male-navy",
  indigo: "male-cap",
  emerald: "hijab-green",
  sunset: "female-gold",
  rose: "female-rose",
  violet: "hijab-violet",
  slate: "male-brown",
  cyan: "hijab-blue",
  amber: "female-gold",
  forest: "hijab-green",
  berry: "female-rose",
  night: "male-navy",
};

type AvatarPalette = {
  background: string;
  skin: string;
  shirt: string;
  hair?: string;
  hairAccent?: string;
  hijab?: string;
  cap?: string;
};

const paletteByKey: Record<AvatarPresetKey, AvatarPalette> = {
  "male-navy": { background: "#eaf2ff", skin: "#f2c9a0", shirt: "#1d4ed8", hair: "#374151" },
  "male-brown": { background: "#f5efe6", skin: "#c98e60", shirt: "#92400e", hair: "#2b211b" },
  "male-cap": { background: "#eef6ff", skin: "#f0c39c", shirt: "#2563eb", hair: "#27364d", cap: "#475569" },
  "female-rose": { background: "#fff1f5", skin: "#f2c7a1", shirt: "#db2777", hair: "#6b2d39", hairAccent: "#b45372" },
  "female-gold": { background: "#fff8eb", skin: "#efc298", shirt: "#d97706", hair: "#513026", hairAccent: "#e7a938" },
  "hijab-blue": { background: "#edf5ff", skin: "#efc39f", shirt: "#1d4ed8", hijab: "#3259d6" },
  "hijab-green": { background: "#eefcf5", skin: "#efc39f", shirt: "#15803d", hijab: "#1b9d58" },
  "hijab-violet": { background: "#f6f0ff", skin: "#efc39f", shirt: "#7c3aed", hijab: "#8b5cf6" },
};

function resolvePreset(key?: string): AvatarPresetKey {
  if (!key) return "male-navy";
  if (key in paletteByKey) return key as AvatarPresetKey;
  return legacyMap[key] ?? "male-navy";
}

function PersonIllustration({ preset, name }: { preset: AvatarPresetKey; name: string }) {
  const colors = paletteByKey[preset];
  const skin = colors.skin;
  const withHijab = Boolean(colors.hijab);
  const withCap = Boolean(colors.cap);
  const female = preset.startsWith("female");

  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false" className="avatar-art">
      <rect x="0" y="0" width="96" height="96" rx="48" fill={colors.background} />
      <ellipse cx="48" cy="88" rx="26" ry="6" fill="rgba(15, 23, 42, 0.08)" />
      <path d="M22 86c3-15 13-23 26-23s23 8 26 23" fill={colors.shirt} />
      <ellipse cx="48" cy="40" rx="16" ry="18" fill={skin} />
      {!withHijab ? <path d={female ? "M29 41c0-13 8-23 19-23s19 10 19 23v5c-2-4-5-7-10-10l-1 8H38l-1-8c-4 2-7 6-8 10z" : "M29 40c0-13 9-22 19-22s19 9 19 22v4c-2-8-8-13-19-13s-17 5-19 13z"} fill={colors.hair ?? "#374151"} /> : null}
      {!withHijab && female ? <path d="M33 56c3 6 8 9 15 9 8 0 13-3 15-9v7c-4 4-9 6-15 6-7 0-12-2-15-6z" fill={colors.hairAccent ?? colors.hair ?? "#6b7280"} opacity="0.55" /> : null}
      {withHijab ? <path d="M24 53c0-22 13-35 24-35s24 13 24 35v15c-7-6-15-9-24-9s-17 3-24 9z" fill={colors.hijab} /> : null}
      {withCap ? <path d="M25 34c2-9 10-15 23-15 11 0 18 5 21 14l-7 2-1 4H34l-1-4z" fill={colors.cap} /> : null}
      <circle cx="42" cy="39" r="1.6" fill="#2f2f2f" />
      <circle cx="54" cy="39" r="1.6" fill="#2f2f2f" />
      <path d="M43 47c1.6 1.4 3.3 2.1 5 2.1 1.8 0 3.5-.7 5-2.1" stroke="#8a3c2f" strokeWidth="2" strokeLinecap="round" fill="none" />
      <title>{`Avatar ${name}`}</title>
    </svg>
  );
}

export function UserAvatar({ name, avatarKey = "male-navy", size = "md" }: { name: string; avatarKey?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const preset = resolvePreset(avatarKey);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <span className={`avatar avatar-person avatar-${size}`} aria-label={`Avatar ${name}`} data-avatar-key={preset}>
      <PersonIllustration preset={preset} name={name} />
      {!name ? <span className="avatar-fallback">{initials || <CircleUserRound size={18} />}</span> : null}
    </span>
  );
}
