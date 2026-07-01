import { buildPosterWheelSegments } from "@/lib/poster-utils";
import { Campaign, CampaignPosterSettings, PosterTemplateId, Prize } from "@/lib/types";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const SAFE_FONT = "DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
const SAFE_DISPLAY_FONT = SAFE_FONT;

type TemplateConfig = {
  id: PosterTemplateId;
  background: string;
  accent: string;
  accentDark: string;
  headline: string;
  headlineStroke: string;
  qrFrame: string;
  logoVariant: "lined" | "badge";
  wheelX: number;
  wheelY: number;
  wheelRadius: number;
  qrX: number;
  qrY: number;
  qrSize: number;
  ctaX: number;
  ctaY: number;
  ctaWidth: number;
  ctaHeight: number;
  ctaRotation: number;
  headlineY: number;
  headlineSizeMultiplier: number;
};

const TEMPLATE_CONFIGS: Record<PosterTemplateId, TemplateConfig> = {
  "classic-wheel": {
    id: "classic-wheel",
    background: "#fff6ee",
    accent: "#1b04b8",
    accentDark: "#050644",
    headline: "#050644",
    headlineStroke: "#ffffff",
    qrFrame: "#1b04b8",
    logoVariant: "lined",
    wheelX: 238,
    wheelY: 800,
    wheelRadius: 312,
    qrX: 408,
    qrY: 512,
    qrSize: 292,
    ctaX: 369,
    ctaY: 812,
    ctaWidth: 370,
    ctaHeight: 86,
    ctaRotation: 0,
    headlineY: 245,
    headlineSizeMultiplier: 1.38,
  },
  "soft-gradient-wheel": {
    id: "soft-gradient-wheel",
    background: "#f4f3ff",
    accent: "#2100b8",
    accentDark: "#060642",
    headline: "#050644",
    headlineStroke: "#ffffff",
    qrFrame: "#2100b8",
    logoVariant: "badge",
    wheelX: 272,
    wheelY: 716,
    wheelRadius: 260,
    qrX: 408,
    qrY: 512,
    qrSize: 292,
    ctaX: 369,
    ctaY: 812,
    ctaWidth: 370,
    ctaHeight: 86,
    ctaRotation: 0,
    headlineY: 292,
    headlineSizeMultiplier: 1.52,
  },
  "terracotta-wheel": {
    id: "terracotta-wheel",
    background: "#ddc9b8",
    accent: "#a82c1d",
    accentDark: "#2b1d18",
    headline: "#a82c1d",
    headlineStroke: "rgba(255,255,255,0.42)",
    qrFrame: "#a82c1d",
    logoVariant: "badge",
    wheelX: 228,
    wheelY: 790,
    wheelRadius: 310,
    qrX: 408,
    qrY: 512,
    qrSize: 292,
    ctaX: 369,
    ctaY: 812,
    ctaWidth: 370,
    ctaHeight: 86,
    ctaRotation: 0,
    headlineY: 258,
    headlineSizeMultiplier: 1.34,
  },
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function splitLines(text: string, maxChars: number) {
  const lines: string[] = [];
  const paragraphs = text
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs.length ? paragraphs : [text.trim()]) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;

      if (next.length <= maxChars || !current) {
        current = next;
        continue;
      }

      lines.push(current);
      current = word;
    }

    if (current) lines.push(current);
  }

  return lines;
}

function fontFamily(font: "display" | "sans" | "serif") {
  switch (font) {
    case "serif":
      return "serif";
    case "sans":
      return SAFE_FONT;
    default:
      return SAFE_DISPLAY_FONT;
  }
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function segmentPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${cx} ${cy}`,
    `L ${start.x.toFixed(1)} ${start.y.toFixed(1)}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
    "Z",
  ].join(" ");
}

export function createPosterPreviewQrDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
      <rect width="280" height="280" rx="24" fill="#ffffff"/>
      <g fill="#111827">
        <rect x="22" y="22" width="54" height="54" rx="8"/>
        <rect x="204" y="22" width="54" height="54" rx="8"/>
        <rect x="22" y="204" width="54" height="54" rx="8"/>
      </g>
      <g fill="#ffffff">
        <rect x="34" y="34" width="30" height="30" rx="5"/>
        <rect x="216" y="34" width="30" height="30" rx="5"/>
        <rect x="34" y="216" width="30" height="30" rx="5"/>
      </g>
      <g fill="#111827">
        <rect x="98" y="32" width="18" height="18"/>
        <rect x="126" y="32" width="18" height="18"/>
        <rect x="154" y="32" width="18" height="18"/>
        <rect x="98" y="60" width="18" height="18"/>
        <rect x="154" y="60" width="18" height="18"/>
        <rect x="182" y="60" width="18" height="18"/>
        <rect x="88" y="96" width="18" height="18"/>
        <rect x="116" y="96" width="18" height="18"/>
        <rect x="172" y="96" width="18" height="18"/>
        <rect x="200" y="96" width="18" height="18"/>
        <rect x="88" y="124" width="18" height="18"/>
        <rect x="144" y="124" width="18" height="18"/>
        <rect x="172" y="124" width="18" height="18"/>
        <rect x="200" y="124" width="18" height="18"/>
        <rect x="32" y="98" width="18" height="18"/>
        <rect x="60" y="126" width="18" height="18"/>
        <rect x="32" y="154" width="18" height="18"/>
        <rect x="88" y="152" width="18" height="18"/>
        <rect x="116" y="152" width="18" height="18"/>
        <rect x="172" y="152" width="18" height="18"/>
        <rect x="228" y="154" width="18" height="18"/>
        <rect x="88" y="180" width="18" height="18"/>
        <rect x="116" y="180" width="18" height="18"/>
        <rect x="144" y="180" width="18" height="18"/>
        <rect x="172" y="180" width="18" height="18"/>
        <rect x="200" y="180" width="18" height="18"/>
        <rect x="88" y="208" width="18" height="18"/>
        <rect x="144" y="208" width="18" height="18"/>
        <rect x="200" y="208" width="18" height="18"/>
        <rect x="228" y="208" width="18" height="18"/>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderBackground(poster: CampaignPosterSettings, template: TemplateConfig) {
  const baseColor = template.background;

  if (template.id === "soft-gradient-wheel") {
    return `
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="${baseColor}"/>
      <circle cx="398" cy="530" r="470" fill="${template.accent}" opacity="0.055"/>
      <circle cx="510" cy="706" r="360" fill="#ffffff" opacity="0.48"/>
    `;
  }

  if (template.id === "terracotta-wheel") {
    return `
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="${baseColor}"/>
      <circle cx="-80" cy="1100" r="720" fill="${template.accent}" opacity="0.18"/>
      <circle cx="732" cy="180" r="460" fill="#ffffff" opacity="0.22"/>
    `;
  }

  return `
    <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="${baseColor}"/>
    <circle cx="258" cy="884" r="360" fill="${template.accent}" opacity="0.04"/>
  `;
}

function getLogoLayout(poster: CampaignPosterSettings, template: TemplateConfig) {
  const logoSize = clamp((poster.logoSizePercent / 100) * 112, 72, 170);
  const logoY = template.id === "classic-wheel" ? 48 : 38;

  return {
    logoSize,
    logoY,
    bottomY: logoY + logoSize + poster.logoBottomMarginPx,
  };
}

function renderLogo(campaign: Campaign, poster: CampaignPosterSettings, template: TemplateConfig) {
  const logoMode = poster.logoMode ?? "none";
  const logoUrl = logoMode === "image" ? poster.logoUrl || campaign.logoUrl : undefined;
  const logoText =
    logoMode === "text" ? (poster.logoText ?? campaign.logoText ?? "").trim() : "";
  const { logoSize, logoY } = getLogoLayout(poster, template);

  if (logoMode === "image" && logoUrl) {
    return `<image href="${escapeXml(logoUrl)}" x="${(A4_WIDTH - logoSize * 1.7) / 2}" y="${logoY}" width="${logoSize * 1.7}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  if (logoMode !== "text" || !logoText) {
    return "";
  }

  const text = escapeXml(logoText.toUpperCase());
  const fontSize = clamp(logoSize * 0.32, 22, 44);
  const centerY = logoY + logoSize / 2;
  const logoTextColor = poster.headlineTextColor || template.headline;

  return `
    <text x="${A4_WIDTH / 2}" y="${centerY + fontSize * 0.34}" text-anchor="middle" fill="${logoTextColor}" font-family="${SAFE_FONT}" font-size="${fontSize}" font-weight="800">${text}</text>
  `;
}

function renderHeadline(campaign: Campaign, poster: CampaignPosterSettings, template: TemplateConfig) {
  const headline = poster.headline || campaign.subtitle || "Faites tourner la roue";
  const family = fontFamily(poster.headlineFontFamily);
  const color = poster.headlineTextColor || template.headline;
  const size = clamp(poster.headlineFontSizePx * template.headlineSizeMultiplier, 46, 94);
  const maxChars = template.id === "soft-gradient-wheel" ? 18 : 16;
  const lines = splitLines(headline.toUpperCase(), maxChars).slice(0, 3);
  const logoAwareHeadlineY = template.headlineY + (poster.logoBottomMarginPx - 28);
  const firstLineY = Math.max(logoAwareHeadlineY, getLogoLayout(poster, template).bottomY + size * 0.15);
  const accent = poster.wheel.winColor || template.accent;

  return lines
    .map((line, index) => {
      const y = firstLineY + index * (size * 0.92);
      const rotation = template.id === "terracotta-wheel" ? -3 : template.id === "classic-wheel" ? -2 : 0;
      const fill = index % 2 === 1 ? accent : color;

      return `
        <text
          x="${A4_WIDTH / 2}"
          y="${y}"
          transform="rotate(${rotation} ${A4_WIDTH / 2} ${y})"
          text-anchor="middle"
          fill="${fill}"
          font-family="${family}"
          font-size="${size}"
          font-weight="900"
          font-style="italic"
          letter-spacing="-2"
          paint-order="stroke"
          stroke="${template.headlineStroke}"
          stroke-width="8"
        >${escapeXml(line)}</text>
      `;
    })
    .join("");
}

function renderWheel(template: TemplateConfig, poster: CampaignPosterSettings, prizes: Prize[] | Array<Pick<Prize, "label">>) {
  const segments = buildPosterWheelSegments(prizes, poster.wheel);
  const cx = template.wheelX;
  const cy = template.wheelY;
  const radius = template.wheelRadius;
  const rimColor = poster.wheel.rimColor || template.accentDark;

  const slices = segments
    .map((segment, index) => {
      const start = index * 60;
      const end = start + 60;
      const fill = segment.color;
      const labelAngle = start + 30;
      const labelPoint = polarToCartesian(cx, cy, radius * 0.58, labelAngle);
      const label = segment.label.replace(" !", "").slice(0, 12);

      return `
        <path d="${segmentPath(cx, cy, radius, start, end)}" fill="${fill}" stroke="${rimColor}" stroke-width="2"/>
        <text
          x="${labelPoint.x.toFixed(1)}"
          y="${labelPoint.y.toFixed(1)}"
          transform="rotate(${labelAngle} ${labelPoint.x.toFixed(1)} ${labelPoint.y.toFixed(1)})"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="${segment.textColor}"
          font-family="${SAFE_FONT}"
          font-size="18"
          font-weight="900"
        >${escapeXml(label)}</text>
      `;
    })
    .join("");

  return `
    <g filter="url(#posterShadow)">
      <circle cx="${cx}" cy="${cy}" r="${radius + 36}" fill="#fff7ef" opacity="0.88"/>
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#ffffff" stroke="${rimColor}" stroke-width="9"/>
      ${slices}
      <circle cx="${cx}" cy="${cy}" r="33" fill="${template.accentDark}"/>
      <path d="M ${cx - 32} ${cy - radius - 50} L ${cx + 32} ${cy - radius - 50} L ${cx} ${cy - radius + 8} Z" fill="${template.accentDark}"/>
    </g>
  `;
}

function renderScratch(template: TemplateConfig) {
  return `
    <g filter="url(#posterShadow)" transform="translate(92 520) rotate(-4 305 170)">
      <rect x="0" y="0" width="610" height="330" rx="34" fill="#ffffff" stroke="${template.accent}" stroke-width="8"/>
      <rect x="34" y="62" width="542" height="178" rx="28" fill="url(#scratchMetal)"/>
      <text x="305" y="162" text-anchor="middle" fill="${template.accentDark}" font-family="${SAFE_FONT}" font-size="44" font-weight="900">GRATTEZ ICI</text>
      <text x="305" y="286" text-anchor="middle" fill="${template.accent}" font-family="${SAFE_FONT}" font-size="28" font-weight="900">DÉCOUVREZ VOTRE CADEAU</text>
    </g>
  `;
}

function renderQrAndCta(qrDataUrl: string, template: TemplateConfig) {
  const accent = template.accent;
  return `
    <g filter="url(#posterShadow)" transform="translate(${template.qrX} ${template.qrY})">
      <rect x="-18" y="-18" width="${template.qrSize + 36}" height="${template.qrSize + 36}" rx="28" fill="${template.qrFrame}"/>
      <rect x="0" y="0" width="${template.qrSize}" height="${template.qrSize}" rx="10" fill="#ffffff"/>
      <image href="${escapeXml(qrDataUrl)}" x="18" y="18" width="${template.qrSize - 36}" height="${template.qrSize - 36}"/>
    </g>
    <g filter="url(#posterShadow)" transform="translate(${template.ctaX} ${template.ctaY}) rotate(${template.ctaRotation} ${template.ctaWidth / 2} ${template.ctaHeight / 2})">
      <rect width="${template.ctaWidth}" height="${template.ctaHeight}" rx="24" fill="${accent}" stroke="#ffffff" stroke-width="7"/>
      <text x="${template.ctaWidth / 2}" y="${template.ctaHeight / 2 + 11}" text-anchor="middle" fill="#ffffff" font-family="${SAFE_FONT}" font-size="26" font-weight="900" letter-spacing="0.5">SCANNEZ POUR JOUER</text>
    </g>
  `;
}

function renderSteps(template: TemplateConfig, gameType: Campaign["gameType"]) {
  const action = gameType === "wheel" ? "Jouez" : "Grattez";
  const gift = "Gagnez";

  return `
    <g transform="translate(28 954)">
      <rect width="738" height="124" rx="22" fill="rgba(255,255,255,0.96)" stroke="#fff0e8" stroke-width="4"/>
      <line x1="246" y1="24" x2="246" y2="100" stroke="${template.accent}" stroke-width="2"/>
      <line x1="492" y1="24" x2="492" y2="100" stroke="${template.accent}" stroke-width="2"/>
      <g transform="translate(0 0)">
        <circle cx="146" cy="38" r="17" fill="${template.accent}"/>
        <text x="146" y="44" text-anchor="middle" fill="#ffffff" font-family="${SAFE_FONT}" font-size="16" font-weight="900">1</text>
        <text x="168" y="90" text-anchor="middle" fill="${template.accentDark}" font-family="${SAFE_FONT}" font-size="22" font-weight="900">Scannez</text>
        <g transform="translate(46 35) scale(0.56)">
          <path d="M20 12 h40 a8 8 0 0 1 8 8 v60 a8 8 0 0 1 -8 8 h-40 a8 8 0 0 1 -8 -8 v-60 a8 8 0 0 1 8 -8 Z M28 26 h24 M28 40 h8 M44 40 h8 M28 54 h8 M44 54 h8 M28 68 h24" fill="none" stroke="#05070c" stroke-width="4" stroke-linecap="round"/>
        </g>
      </g>
      <g transform="translate(246 0)">
        <circle cx="146" cy="38" r="17" fill="${template.accent}"/>
        <text x="146" y="44" text-anchor="middle" fill="#ffffff" font-family="${SAFE_FONT}" font-size="16" font-weight="900">2</text>
        <text x="168" y="90" text-anchor="middle" fill="${template.accentDark}" font-family="${SAFE_FONT}" font-size="22" font-weight="900">${action}</text>
        <g transform="translate(50 34) scale(0.56)">
          <circle cx="28" cy="50" r="30" fill="none" stroke="#05070c" stroke-width="4"/>
          <path d="M28 20 v60 M-2 50 h60 M8 30 l40 40 M48 30 l-40 40" stroke="#05070c" stroke-width="3"/>
        </g>
      </g>
      <g transform="translate(492 0)">
        <circle cx="146" cy="38" r="17" fill="${template.accent}"/>
        <text x="146" y="44" text-anchor="middle" fill="#ffffff" font-family="${SAFE_FONT}" font-size="16" font-weight="900">3</text>
        <text x="168" y="90" text-anchor="middle" fill="${template.accentDark}" font-family="${SAFE_FONT}" font-size="22" font-weight="900">${gift}</text>
        <g transform="translate(48 47) scale(0.56)">
          <path d="M18 42 h72 v46 h-72 Z M12 30 h84 v18 h-84 Z M54 30 v58 M34 30 c-26 -22 12 -32 20 0 M58 30 c8 -32 46 -22 20 0" fill="none" stroke="#05070c" stroke-width="4" stroke-linejoin="round"/>
        </g>
      </g>
    </g>
  `;
}

export function buildPosterSvg(args: {
  campaign: Campaign;
  poster: CampaignPosterSettings;
  prizes: Prize[] | Array<Pick<Prize, "label">>;
  qrDataUrl: string;
}) {
  const { campaign, poster, prizes, qrDataUrl } = args;
  const baseTemplate = TEMPLATE_CONFIGS[poster.templateId ?? "classic-wheel"] ?? TEMPLATE_CONFIGS["classic-wheel"];
  const template = {
    ...baseTemplate,
    accent: poster.wheel.winColor || baseTemplate.accent,
    qrFrame: poster.wheel.winColor || baseTemplate.qrFrame,
  };
  const gameMarkup =
    campaign.gameType === "wheel" ? renderWheel(template, poster, prizes) : renderScratch(template);
  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="${A4_WIDTH}" height="${A4_HEIGHT}" viewBox="0 0 ${A4_WIDTH} ${A4_HEIGHT}">
      <defs>
        <style>
          <![CDATA[
            text {
              font-family: ${SAFE_FONT};
            }
          ]]>
        </style>
        <filter id="posterShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#020617" flood-opacity="0.25"/>
        </filter>
        <linearGradient id="scratchMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#dbe2ee"/>
          <stop offset="48%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#aeb9ce"/>
        </linearGradient>
      </defs>

      ${renderBackground(poster, template)}
      ${renderLogo(campaign, poster, template)}
      ${renderHeadline(campaign, poster, template)}
      ${gameMarkup}
      ${renderQrAndCta(qrDataUrl, template)}
      ${renderSteps(template, campaign.gameType)}
    </svg>
  `;
}

