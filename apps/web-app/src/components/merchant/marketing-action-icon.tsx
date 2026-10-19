import { CalendarDays, Globe2, Link2 } from "lucide-react";
import { siFacebook, siGoogle, siInstagram, siTiktok, siTripadvisor } from "simple-icons";

import type { MarketingActionKey } from "@/lib/marketing-action-library";

const brands = { google: siGoogle, instagram: siInstagram, facebook: siFacebook, tiktok: siTiktok, tripadvisor: siTripadvisor };

/** Shared visual identity for the action library and establishment links. */
export function MarketingActionIcon({ actionKey }: { actionKey: MarketingActionKey | "appointment" | null }) {
  const brand = actionKey && actionKey in brands ? brands[actionKey as keyof typeof brands] : null;
  const Icon = actionKey === "appointment" ? CalendarDays : actionKey === "website" ? Globe2 : Link2;

  return <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-haze text-aubergine"
    data-marketing-icon={actionKey ?? "custom"} aria-hidden="true">
    {brand ? <svg viewBox="0 0 24 24" className="size-5 fill-current"><path d={brand.path} /></svg> : <Icon className="size-5" />}
  </span>;
}
