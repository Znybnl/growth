import { betaReplayPage } from "@/lib/beta-replay-contract";

export function maskBetaReplayText(text: string, element?: Element) {
  // rrweb visits iframe documents separately from their parent. Only explicitly
  // approved preview frames may show content; participant fields are marked.
  let frame: Element | null | undefined;
  try {
    frame = element?.ownerDocument?.defaultView?.frameElement;
    if (frame && !frame.hasAttribute("data-replay-preview")) return text.replace(/\S/g, "*");
  } catch { return text.replace(/\S/g, "*"); }
  if (element?.closest?.("[data-replay-private], .ph-no-capture")) return text.replace(/\S/g, "*");
  return text;
}

export function maskBetaReplayInput(text: string, element?: HTMLElement) {
  if (!element) return text.replace(/\S/g, "*");
  const type = element.tagName === "INPUT" ? element.getAttribute("type")?.toLowerCase() ?? "text" : "";
  return type === "password" || element.closest("[data-replay-private], .ph-no-capture")
    ? text.replace(/\S/g, "*")
    : text;
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

function replaySafeBackground(value: string) {
  if (value.length > 2048 || /[;{}<>\\\u0000-\u001f]/.test(value)) return null;
  let rejectedImage = false;
  const safeImages: string[] = [];
  const normalized = value.replace(/url\(([^)]*)\)/gi, (_match, rawUrl: string) => {
    const candidate = rawUrl.trim().replace(/^(['"])(.*)\1$/, "$2");
    const safeImage = publicReplayImage(candidate);
    if (!safeImage) {
      rejectedImage = true;
      return "";
    }
    const index = safeImages.push(safeImage) - 1;
    return `REPLAY_SAFE_IMAGE_${index}`;
  });
  if (rejectedImage || /url\s*\(/i.test(normalized) || /(?:var|expression|attr|javascript|data)\s*\(/i.test(normalized)) return null;
  const functions = normalized.replace(/(?:repeating-)?(?:linear|radial|conic)-gradient\(/gi, "(")
    .replace(/rgba?\(/gi, "(");
  if (/[a-z-]+\(/i.test(functions) || !/^[\w\s#.,%()+*/-]+$/.test(functions)) return null;
  return safeImages.reduce((result, image, index) => result.replace(`REPLAY_SAFE_IMAGE_${index}`, `url("${image}")`), normalized);
}

function sanitizedReplayPreviewDocument(raw: string) {
  try {
    const document = new DOMParser().parseFromString(raw, "text/html");
    document.querySelectorAll("script, iframe, object, embed, style, video, audio, meta, title, base, link[rel='import']")
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
        node.nodeValue = maskBetaReplayText(text, parent);
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
  // UI descriptions remain useful even on private inputs (for example the
  // placeholder "E-mail"); the marker masks the entered value itself.
  if (["title", "aria-label", "placeholder"].includes(name)) return value;
  // These non-content markers allow approved preview iframes and their artwork
  // to remain identifiable in rrweb snapshots and player reconstruction.
  if (["data-replay-preview", "data-replay-visible"].includes(name)) return "true";
  // Only finite UI states and presentation metadata; arbitrary data attributes
  // can contain customer data and are not forwarded to the replay.
  if (name === "data-state" && /^(?:open|closed|active|inactive|checked|unchecked|on|off)$/.test(value)) return value;
  if (name === "data-orientation" && /^(?:horizontal|vertical)$/.test(value)) return value;
  if (name === "data-layout" && /^(?:wide|compact)$/.test(value)) return value;
  if (name === "data-inline-preview" && /^(?:true|false)$/.test(value)) return value;
  if (name === "data-step-index" && /^(?:[0-9]|1[0-2])$/.test(value)) return value;
  if (name === "data-promo-variant" && value === "inspired") return value;
  if (name === "data-slot" && /^[a-z][a-z0-9-]{0,40}$/.test(value)) return value;
  if (name === "data-align" && /^(?:left|right|center)$/.test(value)) return value;
  if (["data-added", "data-recommended"].includes(name) && /^(?:true|false)$/.test(value)) return value;
  if (name === "data-travel-template" && /^(?:travel-roadtrip|travel-tropical)$/.test(value)) return value;
  if (name === "style") {
    // CSS variables/content can contain text or URLs. Keep a small set of
    // numeric layout and finite presentation values only.
    return value.split(";").map(declaration => {
      const separator = declaration.indexOf(":");
      if (separator < 0) return "";
      const property = declaration.slice(0, separator).trim();
      const cssValue = declaration.slice(separator + 1).trim();
      if (["background", "background-image"].includes(property)) {
        const safeBackground = replaySafeBackground(cssValue);
        const spacing = declaration.slice(separator + 1).match(/^\s*/)?.[0] ?? "";
        return safeBackground ? `${declaration.slice(0, separator + 1)}${spacing}${safeBackground}` : "";
      }
      const extra = declaration.slice(separator + 1).includes(":") ? ":" : "";
      if (!extra && /^(?:color|background-color|border-color|fill|stroke)$/.test(property)) {
        return (cssValue?.length ?? 0) <= 40 && /^(?:#[\da-f]{3,8}|transparent|currentColor|rgba?\(\s*[\d.,%\s]+\))$/i.test(cssValue ?? "") ? declaration : "";
      }
      if (!extra && property === "text-align") return /^(?:left|right|center|start|end|justify)$/.test(cssValue ?? "") ? declaration : "";
      if (!extra && property === "font-weight") return /^(?:normal|bold|[1-9]00)$/.test(cssValue ?? "") ? declaration : "";
      if (!extra && property === "transform") return (cssValue?.length ?? 0) <= 16 && /^scale\(\s*(?:0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/.test(cssValue ?? "") ? declaration : "";
      return !extra && /^(?:(?:min-|max-)?(?:width|height)|(?:padding|margin)(?:-(?:top|right|bottom|left))?|top|right|bottom|left|(?:row-|column-)?gap|opacity|z-index|border-radius)$/.test(property) &&
        /^(?:auto|none|-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%)?)(?:\s+(?:auto|-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%)?))*$/.test(cssValue ?? "") ? declaration : "";
    }).filter(Boolean).join(";");
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
  ".ph-no-capture", "iframe:not([data-replay-preview])", "img:not([src^='/images/scratch-templates/']):not([src^='/images/wheel-templates/']):not([src^='/images/templates/']):not([src^='/_next/image?'])", "svg:not(.lucide):not([data-replay-visible] svg)", "canvas:not([data-replay-visible] canvas)", "video", "audio",
  "script", "noscript", "meta", "title",
].join(",");
