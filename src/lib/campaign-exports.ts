import QRCode from "qrcode";

import {
  buildPosterWheelSegments,
  createPosterSettingsDefaults,
  normalizePosterSettings,
  splitPosterSegmentLines,
} from "@/lib/poster-utils";
import { CampaignPerformance } from "@/lib/types";

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
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
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

export async function createCampaignQrSvg(url: string) {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
    width: 1200,
  });
}

export async function createCampaignPosterSvg(
  performance: CampaignPerformance,
  publicUrl: string,
) {
  const { campaign, prizes } = performance;
  const poster = normalizePosterSettings(
    campaign.presentation.poster,
    createPosterSettingsDefaults({
      logoUrl: undefined,
      logoSizePercent: campaign.presentation.logo.sizePercent,
      logoBottomMarginPx: campaign.presentation.logo.marginBottomPx,
      backgroundImageUrl: "",
      headline: campaign.subtitle,
      headlineTextColor: campaign.presentation.heading.textColor,
      headlineFontSizePx: campaign.presentation.heading.fontSizePx,
      headlineFontFamily: campaign.presentation.heading.fontFamily,
      wheel: campaign.presentation.wheel,
      footerBackgroundColor: campaign.accent.signal,
    }),
  );
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    margin: 1,
    width: 720,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });

  const wheel = poster.wheel;
  const wheelSegments = buildPosterWheelSegments(prizes, wheel);
  const headingFamily = fontFamily(poster.headlineFontFamily);
  const headlineLines = splitLines(
    poster.headline || campaign.subtitle || campaign.title,
    24,
  ).slice(0, 3);
  const headingSize = clamp(poster.headlineFontSizePx * 1.16, 34, 76);
  const logoUrl = poster.logoUrl;
  const logoWidth = clamp((poster.logoSizePercent / 100) * 210, 92, 310);
  const logoHeight = logoUrl ? clamp((poster.logoSizePercent / 100) * 90, 48, 145) : 0;
  const gameIsWheel = campaign.gameType === "wheel";

  const headlineStartY =
    60 + logoHeight + (logoUrl ? poster.logoBottomMarginPx : 0) + headingSize * 0.88;
  const headlineEndY =
    headlineStartY +
    headlineLines.length * headingSize +
    Math.max(0, headlineLines.length - 1) * 7;
  const wheelCenterX = 397;
  const wheelCenterY = clamp(headlineEndY + 215, 532, 584);
  const wheelRadius = 232;
  const scratchX = 118;
  const scratchY = clamp(headlineEndY + 56, 338, 420);
  const qrX = gameIsWheel ? 450 : 430;
  const qrY = gameIsWheel ? clamp(wheelCenterY + 74, 612, 684) : clamp(scratchY + 228, 604, 670);
  const qrSize = 214;
  const scanLabelY = gameIsWheel ? clamp(wheelCenterY + 110, 644, 720) : clamp(scratchY + 292, 706, 756);
  const footerY = 942;
  const actionLabel = gameIsWheel ? "Faites tourner" : "Grattez";
  const actionBody = gameIsWheel ? "la roue" : "le ticket";

  const backgroundMarkup = poster.backgroundImageUrl
    ? `
      <image href="${poster.backgroundImageUrl}" x="0" y="0" width="${A4_WIDTH}" height="${A4_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="rgba(9,12,20,0.18)"/>
    `
    : `<rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="${campaign.presentation.background.color || "#111827"}"/>`;

  const logoMarkup = logoUrl
    ? `<image href="${logoUrl}" x="${(A4_WIDTH - logoWidth) / 2}" y="60" width="${logoWidth}" height="${logoHeight}" preserveAspectRatio="xMidYMid meet"/>`
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
      const fontSize = lines.length > 1 ? 22 : 26;
      const firstDy = lines.length > 1 ? -10 : 0;

      return `
        <path d="M ${wheelCenterX} ${wheelCenterY} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${wheelRadius} ${wheelRadius} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${segment.color}"/>
        <text x="${wheelCenterX}" y="${wheelCenterY - 140}" fill="${segment.textColor}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="900" text-anchor="middle" transform="rotate(${index * 60 - 60} ${wheelCenterX} ${wheelCenterY})">
          ${lines
            .map(
              (line, lineIndex) =>
                `<tspan x="${wheelCenterX}" dy="${lineIndex === 0 ? firstDy : 26}">${escapeXml(line)}</tspan>`,
            )
            .join("")}
        </text>
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
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="30" fill="${wheel.rimColor}"/>
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
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="url(#dotPattern)" opacity="0.28"/>
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="rgba(0,0,0,0.07)"/>

      ${logoMarkup}
      ${headlineMarkup}
      ${gameMarkup}

      <g filter="url(#shadowMild)" transform="translate(100 ${scanLabelY}) rotate(-5)">
        <rect width="210" height="78" rx="10" fill="#05070c"/>
        <text x="105" y="32" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="25" font-weight="900">SCANNEZ</text>
        <text x="105" y="63" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="25" font-weight="900">POUR JOUER</text>
      </g>

      <g filter="url(#shadowStrong)" transform="translate(${qrX} ${qrY}) rotate(-4 ${qrSize / 2} ${qrSize / 2})">
        <rect x="-10" y="-10" width="${qrSize + 20}" height="${qrSize + 20}" rx="28" fill="#111827"/>
        <rect x="0" y="0" width="${qrSize}" height="${qrSize}" rx="18" fill="#ffffff"/>
        <image href="${qrDataUrl}" x="16" y="16" width="${qrSize - 32}" height="${qrSize - 32}"/>
      </g>

      <rect x="0" y="${footerY}" width="${A4_WIDTH}" height="${A4_HEIGHT - footerY}" fill="${poster.footerBackgroundColor}"/>
      <g transform="translate(54 972)">
        <rect width="686" height="106" rx="22" fill="rgba(255,255,255,0.94)"/>
        <g transform="translate(30 24)">
          <text x="76" y="18" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="30" font-weight="900">1</text>
          <text x="76" y="50" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="22" font-weight="900">Scannez</text>
          <text x="76" y="74" text-anchor="middle" fill="#4b5563" font-family="Arial, sans-serif" font-size="17">le QR code</text>
        </g>
        <g transform="translate(246 24)">
          <text x="76" y="18" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="30" font-weight="900">2</text>
          <text x="76" y="50" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="22" font-weight="900">${actionLabel}</text>
          <text x="76" y="74" text-anchor="middle" fill="#4b5563" font-family="Arial, sans-serif" font-size="17">${actionBody}</text>
        </g>
        <g transform="translate(472 24)">
          <text x="76" y="18" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="30" font-weight="900">3</text>
          <text x="76" y="50" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="22" font-weight="900">Récupérez</text>
          <text x="76" y="74" text-anchor="middle" fill="#4b5563" font-family="Arial, sans-serif" font-size="17">votre cadeau</text>
        </g>
      </g>
    </svg>
  `;
}
