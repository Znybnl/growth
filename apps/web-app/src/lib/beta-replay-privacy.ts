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
  "Toutes", "Actives", "En pause", "Archivées", "Rechercher une campagne", "Filtrer",
  "Choisissez votre point de départ", "Suggestions", "Mes lots", "Ajouter un lot",
  "Chance", "Coût de revient", "Actions", "Probabilité", "Conditions", "Paramètres avancés",
  "Jeu 100 % gagnant", "Durée de validité du gain (jours)", "Délai minimum entre deux participations (jours)",
  "Aperçu", "Plus", "Modifier l’e-mail de gain", "Choisir dans la bibliothèque", "Importer votre logo",
  "Secteur d’activité", "Sous-secteur", "Type de jeu", "Aucune campagne", "Voir les résultats",
  "Vue d’ensemble", "Toutes les campagnes", "Scans et participations par jour", "Conversion",
  "Le type de jeu.", "Le texte affiché à vos clients.", "Donnez à la campagne votre signature.",
  "Configurez vos récompenses et leurs probabilités.", "Composez les actions proposées avant le jeu.",
  "Choisissez les récompenses et définissez les chances de les gagner.", "Trouver des idées de lots", "Créer un lot",
  "Répartition des chances", "Les chances restantes sont calculées comme des participations perdantes.",
  "Aucun lot n’est ajouté automatiquement. Vérifiez les offres disponibles chez vous, puis personnalisez-les.",
  "Quels avantages souhaitez-vous faire gagner ?", "Commencez avec une composition suggérée ou créez vos propres lots.",
  "Créer rapidement", "Choisissez une composition prête à personnaliser.", "Explorer les suggestions",
  "Découvrez des lots adaptés à votre activité.", "Créer mes lots", "Ajoutez vos propres récompenses.",
]);

export function maskBetaReplayText(text: string, element?: Element) {
  // rrweb can visit an iframe document separately from its blocked parent.
  // An approved preview frame may show its rendered content, but private nodes
  // and recognizable personal data remain masked inside it.
  let frame: Element | null | undefined;
  try {
    frame = element?.ownerDocument?.defaultView?.frameElement;
    if (frame && !frame.hasAttribute("data-replay-preview")) return text.replace(/\S/g, "*");
  } catch { return text.replace(/\S/g, "*"); }
  if (element?.closest?.("[data-replay-private], .ph-no-capture")) return text.replace(/\S/g, "*");
  const visibleRegion = element?.closest?.("[data-replay-visible], .okado-preview-surface");
  // Aggregate KPI values are useful for diagnosing the screen. This exception
  // never applies to arbitrary numbers (PIN, phone, redemption code, etc.).
  const aggregateMetric = element?.closest(".okado-metric-card__value") && /^[\d\s.,%€+−-]+$/.test(text);
  if (!visibleRegion && !frame?.hasAttribute("data-replay-preview") && !SAFE_LABELS.has(text.trim()) && !aggregateMetric) {
    return text.replace(/\S/g, "*");
  }
  return maskIdentifiableReplayText(text);
}

function maskIdentifiableReplayText(text: string) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, match => "*".repeat(match.length))
    .replace(/\bhttps?:\/\/[^\s<>"']+/gi, match => "*".repeat(match.length))
    .replace(/(?<![\p{L}\p{N}])\+?\d(?:[\d ().-]{5,}\d)(?![\p{L}\p{N}])/gu, match => {
      // Dates are useful campaign copy, not telephone numbers.
      if (/^\d{4}[-.]\d{2}[-.]\d{2}$/.test(match.trim())) return match;
      return match.replace(/\d/g, "*");
    });
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

// Public product illustrations only. Merchant uploads and arbitrary URLs must
// never be passed to the replay player, even when they use the same domain.
function publicReplayImage(raw: string) {
  try {
    let url = new URL(raw, "https://app.okado.app");
    // Next/Image wraps a public asset in /_next/image?url=... . Never retain
    // the wrapper or its query: validate the underlying asset independently.
    if (url.pathname === "/_next/image") {
      if (!(url.hostname === "app.okado.app" || url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".vercel.app"))) return null;
      const source = url.searchParams.get("url");
      if (!source || !source.startsWith("/images/")) return null;
      url = new URL(source, url.origin);
    }
    if (!["https:", "http:"].includes(url.protocol) ||
      !(url.hostname === "app.okado.app" || url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".vercel.app")) ||
      !/^\/images\/(?:(?:scratch-templates|wheel-templates)\/[\w-]+|templates\/[\w-]+\/[\w-]+)\.(?:webp|png|jpg|jpeg)$/i.test(url.pathname)) return null;
    return `${url.origin}${url.pathname}`;
  } catch { return null; }
}

function sanitizedReplayPreviewDocument(raw: string) {
  try {
    const document = new DOMParser().parseFromString(raw, "text/html");
    document.querySelectorAll("script, iframe, object, embed, form, style, video, audio, meta, title, base, [contenteditable], link[rel='import']")
      .forEach(node => node.remove());
    // The parent frame has already been explicitly approved as a preview.
    // Mark its parsed body while filtering vector geometry and private text.
    document.body.setAttribute("data-replay-visible", "");
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (parent) {
        const text = node.nodeValue ?? "";
        node.nodeValue = parent.closest("textarea, select, option")
          ? text.replace(/\S/g, "*")
          : maskBetaReplayText(text, parent);
      }
    }
    for (const element of [...document.body.querySelectorAll("*"), document.body]) {
      for (const attribute of [...element.attributes]) {
        const safe = maskBetaReplayAttribute(attribute.name, attribute.value, element);
        if (safe) element.setAttribute(attribute.name, safe);
        else element.removeAttribute(attribute.name);
      }
    }
    return `<!doctype html>${document.documentElement.outerHTML}`;
  } catch {
    // Fail closed if the browser cannot parse the preview document.
    return "";
  }
}

export function maskBetaReplayAttribute(name: string, value: string, element?: Element) {
  if (name === "src" && element?.tagName === "IMG") return publicReplayImage(value) ?? "";
  if (name === "srcdoc") {
    return element?.tagName === "IFRAME" && element.hasAttribute("data-replay-preview")
      ? sanitizedReplayPreviewDocument(value) : "";
  }
  // Lucide renders product-owned vector icons. Uploaded images, charts and
  // arbitrary SVGs remain blocked. Explicit preview artwork retains geometry,
  // never links, identifiers, stylesheets or unfiltered text.
  if (element?.closest?.("svg.lucide") || (element?.closest?.("svg") && element.closest("[data-replay-visible]"))) {
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
    // CSS variables/content can contain text or URLs. Keep a small set of
    // numeric layout and finite presentation values only.
    return value.split(";").filter(declaration => {
      const [property, cssValue, extra] = declaration.split(":").map(part => part.trim());
      if (!extra && /^(?:color|background-color|border-color|fill|stroke)$/.test(property)) {
        return (cssValue?.length ?? 0) <= 40 && /^(?:#[\da-f]{3,8}|transparent|currentColor|rgba?\(\s*[\d.,%\s]+\))$/i.test(cssValue ?? "");
      }
      if (!extra && property === "text-align") return /^(?:left|right|center|start|end|justify)$/.test(cssValue ?? "");
      if (!extra && property === "font-weight") return /^(?:normal|bold|[1-9]00)$/.test(cssValue ?? "");
      if (!extra && property === "transform") return (cssValue?.length ?? 0) <= 16 && /^scale\(\s*(?:0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/.test(cssValue ?? "");
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
  ".ph-no-capture", "[data-replay-private]", "iframe:not([data-replay-preview])", "img:not([src^='/images/scratch-templates/']):not([src^='/images/wheel-templates/']):not([src^='/images/templates/']):not([src^='/_next/image?'])", "svg:not(.lucide):not([data-replay-visible] svg)", "canvas:not([data-replay-visible] canvas)", "video", "audio",
  "script", "noscript", "meta", "title", "[contenteditable]",
].join(",");
