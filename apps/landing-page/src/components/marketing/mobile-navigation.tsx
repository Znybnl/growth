"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { APP_URL } from "@/lib/site";

export function MobileNavigation({ links }: { links: readonly { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="lg:hidden" onKeyDown={event => {
    if (event.key === "Escape" && open) { setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} type="button" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} aria-controls="mobile-navigation"
      onClick={() => setOpen(!open)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#e8dfea] text-[#24142a] focus-visible:outline-2 focus-visible:outline-[#6c00f6]">
      {open ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
    </button>
    {open && <nav id="mobile-navigation" aria-label="Navigation mobile" className="absolute inset-x-0 top-full max-h-[75dvh] overflow-y-auto border-b border-[#e8dfea] bg-white px-5 py-4 shadow-lg">
      {[...links, { href: `${APP_URL}/connexion`, label: "Connexion" }].map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block min-h-11 rounded-lg px-3 py-3 text-sm font-semibold text-[#24142a] hover:bg-[#f5f0ff] focus-visible:outline-2 focus-visible:outline-[#6c00f6]">{link.label}</Link>)}
    </nav>}
  </div>;
}
