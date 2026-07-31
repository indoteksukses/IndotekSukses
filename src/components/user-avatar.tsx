import { CircleUserRound } from "lucide-react";

export const avatarPresets = [
  { key: "ocean", label: "Ocean" }, { key: "indigo", label: "Indigo" }, { key: "emerald", label: "Emerald" },
  { key: "sunset", label: "Sunset" }, { key: "rose", label: "Rose" }, { key: "violet", label: "Violet" },
  { key: "slate", label: "Slate" }, { key: "cyan", label: "Cyan" }, { key: "amber", label: "Amber" },
  { key: "forest", label: "Forest" }, { key: "berry", label: "Berry" }, { key: "night", label: "Night" },
] as const;

export function UserAvatar({ name, avatarKey = "ocean", size = "md" }: { name: string; avatarKey?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return <span className={`avatar avatar-${avatarKey} avatar-${size}`} aria-label={`Avatar ${name}`}><span className="avatar-shape"/>{initials || <CircleUserRound size={18}/>}</span>;
}
