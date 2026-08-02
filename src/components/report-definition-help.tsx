"use client";

import { Info } from "lucide-react";
import { useState } from "react";

export function ReportDefinitionHelp({ title, description }: { title: string; description: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="definition-help">
      <button type="button" aria-label={`Penjelasan ${title}`} onClick={() => setOpen((value) => !value)} onBlur={() => setOpen(false)}><Info size={13}/></button>
      {open ? <span className="definition-popover" role="tooltip"><strong>{title}</strong>{description}</span> : null}
    </span>
  );
}
