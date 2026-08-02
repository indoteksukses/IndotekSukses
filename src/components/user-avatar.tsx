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

type AvatarPresetKey = (typeof avatarPresets)[number]["key"];
type HairStyle = "short" | "side" | "bob" | "long" | "pony" | "afro" | "wave";

type AvatarPalette = {
  background: string;
  skin: string;
  shirt: string;
  shirtAccent?: string;
  hair: string;
  hairStyle: HairStyle;
  female?: boolean;
  beard?: boolean;
  glasses?: boolean;
  hijab?: string;
  headband?: string;
  tie?: string;
  collar?: string;
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

const paletteByKey: Record<AvatarPresetKey, AvatarPalette> = {
  "male-beard": { background: "#dce7e9", skin: "#dca779", shirt: "#12394a", hair: "#101827", hairStyle: "side", beard: true, collar: "#e9eef2" },
  "female-stripe": { background: "#fde7dc", skin: "#efbe95", shirt: "#0f8f92", shirtAccent: "#ffffff", hair: "#4b2733", hairStyle: "long", female: true },
  "male-glasses": { background: "#9bd8dc", skin: "#e8b083", shirt: "#184c75", hair: "#172033", hairStyle: "short", beard: true, glasses: true, tie: "#b32332", collar: "#ffffff" },
  "male-dark": { background: "#e9c6ad", skin: "#7b4b35", shirt: "#b84a2b", shirtAccent: "#f7e5d4", hair: "#171414", hairStyle: "afro" },
  "hijab-teal": { background: "#96d4d6", skin: "#edb78e", shirt: "#163b4c", hair: "#27313c", hairStyle: "long", female: true, hijab: "#244e5b" },
  "female-pony": { background: "#f5e8dc", skin: "#edba91", shirt: "#2f9aa0", shirtAccent: "#ffffff", hair: "#5a302d", hairStyle: "pony", female: true },
  "male-green": { background: "#dce9e5", skin: "#efbc96", shirt: "#245a35", hair: "#4b2b27", hairStyle: "side" },
  "female-bob": { background: "#79c8cd", skin: "#f0bd96", shirt: "#9ddbd8", hair: "#5a2d37", hairStyle: "bob", female: true },
  "female-teal": { background: "#f2d6ca", skin: "#e7a876", shirt: "#0d8990", shirtAccent: "#ffffff", hair: "#0a5664", hairStyle: "wave", female: true },
  "male-orange": { background: "#afe0d4", skin: "#6c4636", shirt: "#dc6b18", collar: "#f5f1e7", hair: "#131212", hairStyle: "short" },
  "female-blonde": { background: "#c1dfe2", skin: "#efbf94", shirt: "#22394f", shirtAccent: "#f06f44", hair: "#d47a2f", hairStyle: "bob", female: true, headband: "#f0a73a" },
  "male-suit": { background: "#84c7c9", skin: "#eab58c", shirt: "#24405b", collar: "#ffffff", tie: "#23436f", hair: "#121c2a", hairStyle: "side", glasses: true },
  "female-afro": { background: "#f4e5d4", skin: "#8d553c", shirt: "#69b6a7", collar: "#ffffff", hair: "#181315", hairStyle: "afro", female: true },
  "female-glasses": { background: "#efd2c9", skin: "#e8ae85", shirt: "#df4a35", shirtAccent: "#1c7b74", hair: "#3b2830", hairStyle: "long", female: true, glasses: true },
  "female-blazer": { background: "#9bd6d7", skin: "#e9b58f", shirt: "#167d7d", collar: "#ffffff", hair: "#3f2930", hairStyle: "pony", female: true },
  "hijab-navy": { background: "#dbe9ef", skin: "#eab58b", shirt: "#173a58", hair: "#17202d", hairStyle: "long", female: true, hijab: "#254b65" },
  "hijab-rose": { background: "#f6dedf", skin: "#edb98f", shirt: "#92445d", hair: "#33222a", hairStyle: "long", female: true, hijab: "#a85a73" },
};

function resolvePreset(key?: string): AvatarPresetKey {
  if (!key) return "male-beard";
  if (key in paletteByKey) return key as AvatarPresetKey;
  return legacyMap[key] ?? "male-beard";
}

function Hair({ colors }: { colors: AvatarPalette }) {
  if (colors.hijab) return null;
  const common = { fill: colors.hair };
  switch (colors.hairStyle) {
    case "afro":
      return <><circle cx="36" cy="28" r="13" {...common}/><circle cx="49" cy="24" r="15" {...common}/><circle cx="61" cy="30" r="13" {...common}/><circle cx="30" cy="39" r="10" {...common}/><circle cx="67" cy="40" r="10" {...common}/></>;
    case "long":
      return <path d="M25 47c0-21 9-32 23-32s23 11 23 32v24c-6-5-10-9-12-15H37c-2 6-6 10-12 15z" {...common}/>;
    case "pony":
      return <><path d="M27 43c0-18 8-28 21-28s21 10 21 28v13c-4-3-7-7-9-12H36c-2 5-5 9-9 12z" {...common}/><ellipse cx="71" cy="44" rx="8" ry="15" {...common}/></>;
    case "bob":
      return <path d="M25 45c0-19 9-30 23-30s23 11 23 30v15c-5 6-11 10-17 11l3-15H39l3 15c-7-1-12-5-17-11z" {...common}/>;
    case "wave":
      return <path d="M24 47c0-20 9-31 24-31s24 11 24 31v17c-3-4-6-7-10-9 1 7-2 13-7 17l-3-17H39l-3 17c-6-4-8-10-6-17-3 2-5 5-6 9z" {...common}/>;
    case "side":
      return <path d="M28 39c0-16 8-25 21-25 11 0 18 6 21 17-7-3-14-5-23-4-8 1-14 5-19 12z" {...common}/>;
    default:
      return <path d="M28 38c1-15 9-23 21-23 10 0 18 6 20 17-7-4-14-5-22-4-7 1-13 4-19 10z" {...common}/>;
  }
}

function PersonIllustration({ preset, name }: { preset: AvatarPresetKey; name: string }) {
  const colors = paletteByKey[preset];
  const female = Boolean(colors.female);
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false" className="avatar-art">
      <rect width="96" height="96" rx="48" fill={colors.background}/>
      <ellipse cx="48" cy="91" rx="28" ry="5" fill="rgba(15,23,42,.09)"/>
      <path d="M17 96c3-20 14-31 31-31s28 11 31 31z" fill={colors.shirt}/>
      {colors.shirtAccent ? <path d="M25 78h46v5H25zm0 10h46v5H25z" fill={colors.shirtAccent} opacity=".92"/> : null}
      {colors.collar ? <><path d="M37 66l11 12-13 4-7-10z" fill={colors.collar}/><path d="M59 66L48 78l13 4 7-10z" fill={colors.collar}/></> : null}
      {colors.tie ? <path d="M46 76h4l3 16-5 4-5-4z" fill={colors.tie}/> : null}
      <rect x="42" y="57" width="12" height="13" rx="5" fill={colors.skin}/>
      <Hair colors={colors}/>
      {colors.hijab ? <path d="M22 53c0-25 12-39 26-39s26 14 26 39v29c-8-9-16-14-26-14S30 73 22 82z" fill={colors.hijab}/> : null}
      <ellipse cx="48" cy="40" rx="17" ry="20" fill={colors.skin}/>
      {colors.hijab ? <path d="M31 37c3-11 9-17 17-17 9 0 15 6 18 17-5-5-11-8-18-8s-12 3-17 8z" fill={colors.hijab}/> : null}
      {colors.headband ? <path d="M31 28c5-6 10-9 17-9 7 0 13 3 17 9l-3 4c-5-4-9-6-14-6-6 0-10 2-14 6z" fill={colors.headband}/> : null}
      {colors.beard ? <path d="M33 43c2 15 7 22 15 22s13-7 15-22c-2 6-7 10-15 10s-13-4-15-10z" fill={colors.hair} opacity=".95"/> : null}
      <path d={female ? "M37 38c2-2 5-2 7 0" : "M37 37c2-1 5-1 7 0"} stroke="#4b332b" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d={female ? "M52 38c2-2 5-2 7 0" : "M52 37c2-1 5-1 7 0"} stroke="#4b332b" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="41" cy="40" r="1.35" fill="#2f2b2b"/><circle cx="55" cy="40" r="1.35" fill="#2f2b2b"/>
      {colors.glasses ? <><rect x="34" y="35" width="13" height="10" rx="4" fill="none" stroke="#263442" strokeWidth="1.7"/><rect x="49" y="35" width="13" height="10" rx="4" fill="none" stroke="#263442" strokeWidth="1.7"/><path d="M47 39h2" stroke="#263442" strokeWidth="1.7"/></> : null}
      <path d="M45 48c1 1 2 1.5 3 1.5s2-.5 3-1.5" stroke="#a15e50" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      <path d="M42 55c2 2 4 3 6 3s4-1 6-3" stroke="#9e3f47" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <title>{`Avatar ${name}`}</title>
    </svg>
  );
}

export function UserAvatar({ name, avatarKey = "male-beard", size = "md" }: { name: string; avatarKey?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const preset = resolvePreset(avatarKey);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return <span className={`avatar avatar-person avatar-${size}`} aria-label={`Avatar ${name}`} data-avatar-key={preset}><PersonIllustration preset={preset} name={name}/>{!name ? <span className="avatar-fallback">{initials || <CircleUserRound size={18}/>}</span> : null}</span>;
}
