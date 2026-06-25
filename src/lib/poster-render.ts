import {
  buildPosterWheelSegments,
  splitPosterSegmentLines,
} from "@/lib/poster-utils";
import { Campaign, CampaignPosterSettings, Prize } from "@/lib/types";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

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

    if (current) {
      lines.push(current);
    }
  }

  return lines;
}

function fontFamily(font: "display" | "sans" | "serif") {
  switch (font) {
    case "serif":
      return "Georgia, 'Times New Roman', serif";
    case "sans":
      return "Arial, sans-serif";
    default:
      return "'Trebuchet MS', Arial, sans-serif";
  }
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

export function buildPosterSvg(args: {
  campaign: Campaign;
  poster: CampaignPosterSettings;
  prizes: Prize[] | Array<Pick<Prize, "label">>;
  qrDataUrl: string;
}) {
  const { campaign, poster, prizes, qrDataUrl } = args;
  const wheel = poster.wheel;
  const wheelSegments = buildPosterWheelSegments(prizes, wheel);
  const headingFamily = fontFamily(poster.headlineFontFamily);
  const headlineLines = splitLines(
    poster.headline || campaign.subtitle || campaign.title,
    24,
  ).slice(0, 4);
  const headingSize = clamp(poster.headlineFontSizePx * 1.16, 34, 76);
  const logoMode = poster.logoMode ?? "none";
  const logoUrl = logoMode === "image" ? poster.logoUrl || campaign.logoUrl : undefined;
  const logoText =
    logoMode === "text"
      ? (poster.logoText ?? campaign.logoText ?? campaign.title ?? "").trim()
      : "";
  const logoWidth = clamp((poster.logoSizePercent / 100) * 210, 92, 310);
  const logoHeight = logoUrl ? clamp((poster.logoSizePercent / 100) * 90, 48, 145) : 0;
  const logoTextSize = clamp((poster.logoSizePercent / 100) * 52, 30, 84);
  const logoBlockHeight =
    logoMode === "image" && logoUrl
      ? logoHeight
      : logoMode === "text" && logoText
        ? logoTextSize
        : 0;
  const gameIsWheel = campaign.gameType === "wheel";
  const usesBackgroundImage =
    poster.backgroundMode === "image" && Boolean(poster.backgroundImageUrl);

  const headlineStartY =
    60 +
    logoBlockHeight +
    (logoBlockHeight ? poster.logoBottomMarginPx : 0) +
    headingSize * 0.88;
  const headlineEndY =
    headlineStartY +
    headlineLines.length * headingSize +
    Math.max(0, headlineLines.length - 1) * 7;
  const wheelCenterX = 397;
  const wheelCenterY = clamp(headlineEndY + 320, 626, 692);
  const wheelRadius = 232;
  const scratchX = 118;
  const scratchY = clamp(headlineEndY + 138, 420, 510);
  const qrX = gameIsWheel ? 438 : 418;
  const qrY = gameIsWheel
    ? clamp(wheelCenterY + 40, 626, 700)
    : clamp(scratchY + 212, 620, 692);
  const qrSize = 248;
  const scanLabelY = gameIsWheel
    ? clamp(wheelCenterY + 72, 650, 726)
    : clamp(scratchY + 252, 694, 754);
  const actionLabel = gameIsWheel ? "Faites tourner" : "Grattez";
  const actionBody = gameIsWheel ? "la roue" : "le ticket";

  const backgroundMarkup = usesBackgroundImage
    ? `
      <image href="${poster.backgroundImageUrl}" x="0" y="0" width="${A4_WIDTH}" height="${A4_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="rgba(9,12,20,0.18)"/>
    `
    : `<rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="${poster.backgroundColor || campaign.presentation.background.color || "#ffffff"}"/>`;

  const logoMarkup =
    logoMode === "image" && logoUrl
      ? `<image href="${logoUrl}" x="${(A4_WIDTH - logoWidth) / 2}" y="60" width="${logoWidth}" height="${logoHeight}" preserveAspectRatio="xMidYMid meet"/>`
      : logoMode === "text" && logoText
        ? `<text x="${A4_WIDTH / 2}" y="${60 + logoTextSize * 0.82}" text-anchor="middle" fill="${poster.headlineTextColor}" font-family="${headingFamily}" font-size="${logoTextSize}" font-weight="900">${escapeXml(logoText)}</text>`
        : ``;

  const headlineMarkup = headlineLines
    .map(
      (line, index) => `
      <text
        x="${A4_WIDTH / 2}"
        y="${headlineStartY + index * (headingSize + 7)}"
        text-anchor="middle"
        fill="${poster.headlineTextColor}"
        font-family="${headingFamily}"
        font-size="${headingSize}"
        font-weight="900"
        paint-order="stroke"
        stroke="rgba(9,12,20,0.34)"
        stroke-width="6"
      >${escapeXml(line)}</text>`,
    )
    .join("");

  const wheelMarkup = wheelSegments
    .map((segment, index) => {
      const angle = (index * 60 - 90) * (Math.PI / 180);
      const nextAngle = ((index + 1) * 60 - 90) * (Math.PI / 180);
      const x1 = wheelCenterX + Math.cos(angle) * wheelRadius;
      const y1 = wheelCenterY + Math.sin(angle) * wheelRadius;
      const x2 = wheelCenterX + Math.cos(nextAngle) * wheelRadius;
      const y2 = wheelCenterY + Math.sin(nextAngle) * wheelRadius;
      const lines = splitPosterSegmentLines(segment.label);
      const textAngle = index * 60 - 60;
      const textY = wheelCenterY - 132;
      const fontSize = lines.length > 2 ? 20 : 22;

      return `
        <path d="M ${wheelCenterX} ${wheelCenterY} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${wheelRadius} ${wheelRadius} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${segment.color}"/>
        <g transform="rotate(${textAngle} ${wheelCenterX} ${wheelCenterY})">
          <text
            x="${wheelCenterX}"
            y="${textY}"
            fill="${segment.textColor}"
            font-family="Arial, sans-serif"
            font-size="${fontSize}"
            font-weight="900"
            text-anchor="middle"
          >
            ${lines
              .map(
                (line, lineIndex) =>
                  `<tspan x="${wheelCenterX}" dy="${lineIndex === 0 ? 0 : 22}">${escapeXml(line)}</tspan>`,
              )
              .join("")}
          </text>
        </g>
      `;
    })
    .join("");

  const gameMarkup = gameIsWheel
    ? `
      <g filter="url(#shadowStrong)">
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="${wheelRadius + 26}" fill="${wheel.rimColor}"/>
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="${wheelRadius}" fill="#111827"/>
        ${wheelMarkup}
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="46" fill="#111827"/>
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="30" fill="${wheel.winColor}"/>
        <path d="M ${wheelCenterX - 28} ${wheelCenterY - wheelRadius - 62} L ${wheelCenterX + 28} ${wheelCenterY - wheelRadius - 62} L ${wheelCenterX} ${wheelCenterY - wheelRadius - 8} Z" fill="#ffffff"/>
      </g>
    `
    : `
      <g filter="url(#shadowStrong)" transform="translate(${scratchX} ${scratchY}) rotate(-3 280 210)">
        <rect x="0" y="0" width="560" height="376" rx="34" fill="#ffffff" stroke="#111827" stroke-width="10"/>
        <rect x="24" y="24" width="512" height="328" rx="28" fill="#f8fafc"/>
        <text x="280" y="78" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="22" font-weight="900" letter-spacing="3">TICKET À GRATTER</text>
        <rect x="58" y="106" width="444" height="170" rx="28" fill="url(#scratchMetal)"/>
        <text x="280" y="202" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="34" font-weight="900">GRATTEZ ICI</text>
        <rect x="120" y="298" width="320" height="40" rx="14" fill="#111827"/>
        <text x="280" y="324" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="900">${escapeXml(prizes[0]?.label ?? "Cadeau surprise")}</text>
      </g>
    `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${A4_WIDTH}" height="${A4_HEIGHT}" viewBox="0 0 ${A4_WIDTH} ${A4_HEIGHT}">
      <defs>
        <filter id="shadowStrong" x="-24%" y="-24%" width="148%" height="148%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#020617" flood-opacity="0.32"/>
        </filter>
        <filter id="shadowMild" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#020617" flood-opacity="0.18"/>
        </filter>
        <linearGradient id="scratchMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#dde3ee"/>
          <stop offset="45%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#b5bfd2"/>
        </linearGradient>
        <pattern id="dotPattern" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="2.4" fill="#ffffff" opacity="0.68"/>
        </pattern>
      </defs>

      ${backgroundMarkup}
      ${
        usesBackgroundImage
          ? `
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="url(#dotPattern)" opacity="0.28"/>
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="rgba(0,0,0,0.07)"/>
      `
          : ""
      }

      ${logoMarkup}
      ${headlineMarkup}
      ${gameMarkup}

      <g filter="url(#shadowMild)" transform="translate(132 ${scanLabelY}) rotate(-4)">
        <rect width="210" height="78" rx="10" fill="#05070c"/>
        <text x="105" y="32" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="25" font-weight="900">SCANNEZ</text>
        <text x="105" y="63" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="25" font-weight="900">POUR JOUER</text>
      </g>

      <g filter="url(#shadowStrong)" transform="translate(${qrX} ${qrY}) rotate(-4 ${qrSize / 2} ${qrSize / 2})">
        <rect x="-10" y="-10" width="${qrSize + 20}" height="${qrSize + 20}" rx="28" fill="#111827"/>
        <rect x="0" y="0" width="${qrSize}" height="${qrSize}" rx="18" fill="#ffffff"/>
        <image href="${qrDataUrl}" x="16" y="16" width="${qrSize - 32}" height="${qrSize - 32}"/>
      </g>

      <g transform="translate(54 936)">
        <rect width="686" height="154" rx="24" fill="rgba(255,255,255,0.94)"/>
        <g transform="translate(30 36)">
          <text x="76" y="18" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="30" font-weight="900">1</text>
          <text x="76" y="50" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="22" font-weight="900">Scannez</text>
          <text x="76" y="74" text-anchor="middle" fill="#4b5563" font-family="Arial, sans-serif" font-size="17">le QR code</text>
        </g>
        <g transform="translate(246 36)">
          <text x="76" y="18" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="30" font-weight="900">2</text>
          <text x="76" y="50" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="22" font-weight="900">${actionLabel}</text>
          <text x="76" y="74" text-anchor="middle" fill="#4b5563" font-family="Arial, sans-serif" font-size="17">${actionBody}</text>
        </g>
        <g transform="translate(472 36)">
          <text x="76" y="18" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="30" font-weight="900">3</text>
          <text x="76" y="50" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="22" font-weight="900">Récupérez</text>
          <text x="76" y="74" text-anchor="middle" fill="#4b5563" font-family="Arial, sans-serif" font-size="17">votre cadeau</text>
        </g>
      </g>
    </svg>
  `;
}
