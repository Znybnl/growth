import type { ActionKind, CampaignAction, Merchant } from "./types";

export const MARKETING_ACTION_CATALOG = [
  { key: "google", kind: "google", field: "googleReviewUrl", label: "Avis Google", cta: "Découvrir notre fiche Google", placeholder: "https://g.page/r/…" },
  { key: "instagram", kind: "instagram", field: "instagramUrl", label: "Instagram", cta: "Suivre sur Instagram", placeholder: "https://instagram.com/votre_compte ou @votre_compte" },
  { key: "facebook", kind: "facebook", field: "facebookUrl", label: "Facebook", cta: "Suivre sur Facebook", placeholder: "https://facebook.com/votre_page" },
  { key: "tiktok", kind: "tiktok", field: "tiktokUrl", label: "TikTok", cta: "Suivre sur TikTok", placeholder: "https://www.tiktok.com/@votre_compte" },
  { key: "tripadvisor", kind: "tripadvisor", field: "tripadvisorUrl", label: "Tripadvisor", cta: "Voir Tripadvisor", placeholder: "https://www.tripadvisor.fr/…" },
  { key: "appointment", kind: "custom", field: "appointmentUrl", label: "Réservation", cta: "Prendre rendez-vous", placeholder: "https://www.planity.com/…" },
  { key: "website", kind: "custom", field: "websiteUrl", label: "Site web", cta: "Visiter le site", placeholder: "https://votre-site.fr" },
  { key: "custom", kind: "custom", field: "customLinkUrl", label: "Autre lien", cta: "Découvrir", placeholder: "https://…" },
] as const satisfies ReadonlyArray<{ key: string; kind: ActionKind; field: keyof Merchant; label: string; cta: string; placeholder: string }>;

export type MarketingActionKey = typeof MARKETING_ACTION_CATALOG[number]["key"];
export type MarketingLinkField = typeof MARKETING_ACTION_CATALOG[number]["field"];
export type MarketingLinks = Pick<Merchant, MarketingLinkField>;

export function marketingActionEntry(key: string) {
  const entry = MARKETING_ACTION_CATALOG.find(entry => entry.key === key);
  if (!entry) throw new Error("Action marketing inconnue.");
  return entry;
}

const platformHosts: Partial<Record<MarketingActionKey, readonly string[]>> = {
  google: ["google.com", "www.google.com", "search.google.com", "maps.google.com", "g.page", "maps.app.goo.gl"],
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com"],
  tiktok: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
  tripadvisor: ["tripadvisor.com", "www.tripadvisor.com", "tripadvisor.fr", "www.tripadvisor.fr", "tripadvisor.co.uk", "www.tripadvisor.co.uk"],
};

export function normalizeMarketingActionUrl(key: MarketingActionKey, input: string) {
  let candidate = input.trim();
  if (!candidate || candidate.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(candidate))
    throw new Error("Saisissez un lien valide pour cette action.");
  if (key === "instagram" && !/^(www\.)?instagram\.com$/i.test(candidate) && /^@?[a-zA-Z0-9._]{1,30}$/.test(candidate)) candidate = `https://www.instagram.com/${candidate.replace(/^@/, "")}`;
  if (key === "tiktok" && /^@[a-zA-Z0-9._]{1,24}$/.test(candidate)) candidate = `https://www.tiktok.com/${candidate}`;
  if (!/^[a-z][a-z\d+.-]*:/i.test(candidate)) candidate = `https://${candidate}`;
  let url: URL;
  try { url = new URL(candidate); } catch { throw new Error("Saisissez une adresse web valide."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new Error("Utilisez un lien HTTPS sans identifiants ni port personnalisé.");
  if (!url.hostname.includes(".") || ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname))
    throw new Error("Utilisez une adresse web publique.");
  const allowed = platformHosts[key];
  if (allowed && !allowed.includes(url.hostname.toLowerCase()))
    throw new Error(`Utilisez une adresse officielle ${marketingActionEntry(key).label}.`);
  if (allowed && url.pathname === "/" && !url.search)
    throw new Error("Indiquez le lien de votre fiche ou de votre compte, pas la page d’accueil du service.");
  return url.toString();
}

export function configuredMarketingUrl(links: MarketingLinks, key: MarketingActionKey) {
  try { return normalizeMarketingActionUrl(key, links[marketingActionEntry(key).field] ?? ""); }
  catch { return ""; }
}

/** Historical custom actions remain custom unless their existing CTA identifies a dedicated entry. */
export function marketingActionKey(action: Pick<CampaignAction, "kind" | "label">): MarketingActionKey | null {
  if (action.kind === "crm") return null;
  if (action.kind !== "custom") return action.kind;
  if (action.label === "Prendre rendez-vous") return "appointment";
  if (action.label === "Visiter le site") return "website";
  return "custom";
}

export function marketingDestinationSummary(key: MarketingActionKey, value: string, companyName?: string) {
  try {
    const url = new URL(value);
    if (key === "google") return companyName ? `Fiche Google — ${companyName}` : "Fiche Google configurée";
    if (key === "instagram" || key === "tiktok") return `@${url.pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "") || url.hostname}`;
    return `${url.hostname.replace(/^www\./, "")}${url.pathname !== "/" ? "/…" : ""}`;
  } catch { return "Lien à corriger"; }
}
