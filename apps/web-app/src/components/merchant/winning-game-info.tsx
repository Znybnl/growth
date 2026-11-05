"use client";

import { Info } from "lucide-react";
import { useId, useState } from "react";

/** The caller provides a positioned row so the explanation fits narrow screens. */
export function WinningGameInfo() {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" aria-label="À propos du jeu 100 % gagnant" aria-describedby={id}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={event => { if (document.activeElement !== event.currentTarget) setOpen(false); }}
      onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[#716b78] hover:text-aubergine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine/40">
      <Info className="size-4" aria-hidden="true" />
    </button>
    <span id={id} role="tooltip" hidden={!open}
      className="pointer-events-none absolute left-0 top-8 z-30 w-full max-w-lg rounded-xl border border-border bg-white p-3 text-xs font-normal leading-5 text-graphite shadow-lg">
      Cocher cette case ne modifie pas les chances saisies. Pendant le jeu, si un stock est épuisé, ses chances sont réparties proportionnellement entre les lots disponibles à chance positive. Un lot à 0 % ne peut pas être gagné. Sans lot éligible, aucune nouvelle partie ne peut démarrer.
    </span>
  </>;
}
