import { betaReplayPage } from "@/lib/beta-replay-contract";

const SAFE_LABELS = new Set([
  "Accueil", "Campagnes", "Le jeu", "La promesse", "L’apparence", "Les lots", "Les actions",
  "Continuer", "Retour", "Enregistrer", "Publier", "Prévisualiser", "QR code", "Affiche",
  "Roue de la fortune", "Ticket à gratter", "Ajouter", "Annuler", "Fermer",
]);

export function maskBetaReplayText(text: string) {
  return SAFE_LABELS.has(text.trim()) ? text : text.replace(/\S/g, "*");
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
  // rrweb inlines public build CSS in this synthetic attribute. Do not blank the layout,
  // and never whitelist arbitrary style elements or user-defined stylesheets.
  if (name === "_cssText" && element?.tagName === "LINK" &&
    element.getAttribute("rel") === "stylesheet" && compiledStylesheet(element.getAttribute("href") ?? "")) return value;
  // Keep layout classes and CSS without retaining arbitrary text, links or image URLs.
  if (name === "class" && !/[\[\]@]|(?:url|https?):/i.test(value)) return value;
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
  ".ph-no-capture", "[data-replay-private]", "img", "picture", "svg", "canvas", "iframe", "video", "audio",
  "script", "noscript", "meta", "title", "[contenteditable]",
].join(",");
