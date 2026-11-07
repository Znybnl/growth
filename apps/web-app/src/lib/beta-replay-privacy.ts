import { betaReplayPage } from "@/lib/beta-replay-contract";

const SAFE_LABELS = new Set([
  "Accueil", "Campagnes", "Le jeu", "La promesse", "L’apparence", "Les lots", "Les actions",
  "Continuer", "Retour", "Enregistrer", "Publier", "Prévisualiser", "QR code", "Affiche",
  "Roue de la fortune", "Ticket à gratter", "Ajouter", "Annuler", "Fermer",
  "Résultats", "Mon compte", "Gestion des animations", "Toutes vos campagnes",
  "Créer une campagne", "Modifier", "Dupliquer", "Supprimer", "Enregistrer le brouillon",
  "Nom de l’animation", "Promesse affichée au client", "Templates Beauté", "Autres templates",
  "Nom du lot", "Conditions d’utilisation", "Règles de participation et de validité",
  "Participations", "Gagnants", "Lots utilisés", "Taux de consommation",
  "Okado", "Navigation", "Outils marchand", "Valider un retrait", "Déconnexion",
  "Gérer les cookies", "Site actif", "Votre période d'essai est terminée. Activez votre abonnement pour relancer vos jeux.",
  "Vue d'ensemble", "Pilotez vos campagnes", "Campagnes actives", "Lots consommés",
  "Suivez vos campagnes en direct, comparez les mécaniques qui performent et lancez rapidement une nouvelle campagne.",
  "Activité récente", "Scans et participations par jour", "Scans",
  "7 derniers jours", "14 derniers jours", "30 derniers jours",
  "Vos dernières campagnes", "Contacts récents", "Dernières saisies", "Voir tout",
  "Stocks et retraits", "Lots à remettre et stock disponible", "Campagne", "Lot remporté", "Date",
  "Nom", "Statut", "Actions", "Stock", "Illimité", "Brouillon", "Publiée", "Active", "Inactive",
  "Établissement", "Utilisateur", "Abonnement", "Informations de connexion", "Préférences personnelles",
  "Notifications de gains", "Liens marketing", "Prénom", "Nom de famille", "E-mail de connexion",
]);

export function maskBetaReplayText(text: string, element?: Element) {
  // Aggregate KPI values are useful for diagnosing the screen. This exception
  // never applies to arbitrary numbers (PIN, phone, redemption code, etc.).
  const aggregateMetric = element?.closest(".okado-metric-card__value") && /^[\d\s.,%€+−-]+$/.test(text);
  return SAFE_LABELS.has(text.trim()) || aggregateMetric ? text : text.replace(/\S/g, "*");
}

function compiledStylesheet(raw: string) {
  try {
    const url = new URL(raw, "https://app.okado.app");
    let pathname: string;
    try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
    const fileSegments = pathname.slice("/_next/static/".length).split("/");
    const isStaticCss = pathname.startsWith("/_next/static/") && pathname.endsWith(".css") &&
      fileSegments.every(segment => segment !== "." && segment !== ".." && /^[\w.\[\]-]+$/.test(segment));
    if (!["http:", "https:"].includes(url.protocol) ||
      !(url.hostname === "app.okado.app" || url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".vercel.app")) ||
      !isStaticCss) return null;
    return `${url.origin}${url.pathname}`;
  } catch { return null; }
}

export function maskBetaReplayAttribute(name: string, value: string, element?: Element) {
  // Lucide renders product-owned vector icons. Uploaded images, charts and
  // arbitrary SVGs remain blocked. Retain geometry only, never links or text.
  if (element?.closest?.("svg.lucide")) {
    if (["d", "points", "viewBox", "viewbox"].includes(name) && /^[\d\s.,+eEMmLlHhVvCcSsQqTtAaZz-]+$/.test(value)) return value;
    if (["x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "stroke-width"].includes(name) && /^\d+(?:\.\d+)?$/.test(value)) return value;
    if (["stroke", "fill"].includes(name) && /^(?:none|currentColor|#[\da-f]{3,8})$/i.test(value)) return value;
    if (name === "stroke-linecap" && /^(?:round|butt|square)$/.test(value)) return value;
    if (name === "stroke-linejoin" && /^(?:round|bevel|miter)$/.test(value)) return value;
  }
  // rrweb inlines public build CSS in this synthetic attribute. Do not blank the layout,
  // and never whitelist arbitrary style elements or user-defined stylesheets.
  if (name === "_cssText" && element?.tagName === "LINK" &&
    element.getAttribute("rel") === "stylesheet" && compiledStylesheet(element.getAttribute("href") ?? "")) return value;
  // Keep layout classes and CSS without retaining arbitrary text, links or image URLs.
  if (name === "class") {
    // Tailwind arbitrary values/variants are layout, too (w-[248px], [&>*], …).
    // Filter individual tokens: one rejected token must not erase the whole sidebar.
    return value.split(/\s+/).filter(token => token.length <= 256 &&
      /^[\w\-:[\]().,%#/*>&=~!+|^$]+$/.test(token) &&
      !/(?:url\(|https?:|content-|\[--|\[content:)/i.test(token)).join(" ");
  }
  // Only finite UI states, never arbitrary data-* values or identifiers.
  if (name === "data-state" && /^(?:open|closed|active|inactive|checked|unchecked|on|off)$/.test(value)) return value;
  if (name === "data-orientation" && /^(?:horizontal|vertical)$/.test(value)) return value;
  if (name === "style") {
    // CSS variables/content can contain text or URLs too. Keep numeric layout only.
    return value.split(";").filter(declaration => {
      const [property, cssValue, extra] = declaration.split(":").map(part => part.trim());
      return !extra && /^(?:(?:min-|max-)?(?:width|height)|(?:padding|margin)(?:-(?:top|right|bottom|left))?|top|right|bottom|left|(?:row-|column-)?gap|opacity|z-index|border-radius)$/.test(property) &&
        /^(?:auto|none|-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%)?)(?:\s+(?:auto|-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%)?))*$/.test(cssValue ?? "");
    }).join(";");
  }
  if (["type", "disabled", "checked", "selected", "multiple", "rel"].includes(name)) return value;
  if (["width", "height", "colspan", "rowspan"].includes(name) && /^\d+$/.test(value)) return value;
  if (name === "href") return compiledStylesheet(value) ?? "";
  return "";
}

export function betaReplayUrl(raw: string) {
  try {
    const url = new URL(raw);
    const page = betaReplayPage(url.pathname);
    return page ? `${url.origin}${page}` : `${url.origin}/redacted`;
  } catch { return "https://app.okado.app/redacted"; }
}

export const BETA_REPLAY_BLOCK_SELECTOR = [
  ".ph-no-capture", "[data-replay-private]", "img", "picture", "svg:not(.lucide)", "canvas", "iframe", "video", "audio",
  "script", "noscript", "meta", "title", "[contenteditable]",
].join(",");
