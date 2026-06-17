import QRCode from "qrcode";

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

  if (current) lines.push(current);
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
  const { campaign, merchant } = performance;
  const poster = campaign.presentation.poster;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    margin: 1,
    width: 720,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });

  const wheel = poster.wheel;
  const headingFamily = fontFamily(poster.headlineFontFamily);
  const headlineLines = splitLines(poster.headline || campaign.subtitle || campaign.title, 18).slice(0, 3);
  const headingSize = clamp(poster.headlineFontSizePx * 1.16, 34, 76);
  const logoUrl = poster.logoUrl || campaign.logoUrl || merchant.logoUrl;
  const logoWidth = clamp((poster.logoSizePercent / 100) * 210, 92, 310);
  const logoHeight = clamp((poster.logoSizePercent / 100) * 90, 48, 145);
  const gameIsWheel = campaign.gameType === "wheel";

  const backgroundMarkup = poster.backgroundImageUrl
    ? `
      <image href="${poster.backgroundImageUrl}" x="0" y="0" width="${A4_WIDTH}" height="${A4_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="rgba(9,12,20,0.18)"/>
    `
    : `<rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="${campaign.presentation.background.color || "#111827"}"/>`;

  const logoMarkup = logoUrl
    ? `<image href="${logoUrl}" x="${(A4_WIDTH - logoWidth) / 2}" y="60" width="${logoWidth}" height="${logoHeight}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${A4_WIDTH / 2}" y="116" text-anchor="middle" fill="#ffffff" font-family="${headingFamily}" font-size="${clamp(logoWidth * 0.28, 28, 62)}" font-weight="900">${escapeXml(campaign.logoText ?? merchant.companyName)}</text>`;

  const headlineMarkup = headlineLines
    .map((line, index) => `
      <text
        x="${A4_WIDTH / 2}"
        y="${190 + index * (headingSize + 7)}"
        text-anchor="middle"
        fill="${poster.headlineTextColor}"
        font-family="${headingFamily}"
        font-size="${headingSize}"
        font-weight="900"
        paint-order="stroke"
        stroke="rgba(9,12,20,0.34)"
        stroke-width="6"
      >${escapeXml(line)}</text>`)
    .join("");

  const wheelCenterX = 397;
  const wheelCenterY = 548;
  const wheelRadius = 235;
  const wheelSegments = [
    { color: wheel.winColor, label: "GAGNE" },
    { color: wheel.loseColor, label: "PERDU" },
    { color: wheel.alternateWinColor, label: "GAGNE" },
    { color: wheel.alternateLoseColor, label: "PERDU" },
    { color: wheel.winColor, label: "CADEAU" },
    { color: wheel.loseColor, label: "PERDU" },
  ];
  const wheelMarkup = wheelSegments
    .map((segment, index) => {
      const angle = (index * 60 - 90) * (Math.PI / 180);
      const nextAngle = ((index + 1) * 60 - 90) * (Math.PI / 180);
      const x1 = wheelCenterX + Math.cos(angle) * wheelRadius;
      const y1 = wheelCenterY + Math.sin(angle) * wheelRadius;
      const x2 = wheelCenterX + Math.cos(nextAngle) * wheelRadius;
      const y2 = wheelCenterY + Math.sin(nextAngle) * wheelRadius;

      return `
        <path d="M ${wheelCenterX} ${wheelCenterY} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${wheelRadius} ${wheelRadius} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${segment.color}"/>
        <text x="${wheelCenterX}" y="${wheelCenterY - 138}" fill="#ffffff" font-family="Arial, sans-serif" font-size="29" font-weight="900" text-anchor="middle" transform="rotate(${index * 60 - 60} ${wheelCenterX} ${wheelCenterY})">${segment.label}</text>
      `;
    })
    .join("");

  const gameMarkup = gameIsWheel
    ? `
      <g filter="url(#shadowStrong)">
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="${wheelRadius + 28}" fill="${wheel.rimColor}"/>
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="${wheelRadius}" fill="#111827"/>
        ${wheelMarkup}
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="46" fill="#111827"/>
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="30" fill="${wheel.rimColor}"/>
        <path d="M ${wheelCenterX - 28} ${wheelCenterY - wheelRadius - 62} L ${wheelCenterX + 28} ${wheelCenterY - wheelRadius - 62} L ${wheelCenterX} ${wheelCenterY - wheelRadius - 8} Z" fill="#ffffff"/>
      </g>
    `
    : `
      <g filter="url(#shadowStrong)" transform="translate(118 342) rotate(-3 280 210)">
        <rect x="0" y="0" width="560" height="380" rx="34" fill="#111827"/>
        <rect x="24" y="24" width="512" height="332" rx="28" fill="#ffffff"/>
        <rect x="54" y="76" width="452" height="186" rx="28" fill="url(#scratchMetal)"/>
        <text x="280" y="172" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="34" font-weight="900">GRATTEZ ICI</text>
        <text x="280" y="306" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="29" font-weight="900">TICKET À GRATTER</text>
      </g>
    `;

  const qrX = gameIsWheel ? 452 : 428;
  const qrY = gameIsWheel ? 622 : 604;
  const qrSize = 220;
  const actionLabel = gameIsWheel ? "Faites tourner" : "Grattez";
  const actionBody = gameIsWheel ? "la roue" : "le ticket";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${A4_WIDTH}" height="${A4_HEIGHT}" viewBox="0 0 ${A4_WIDTH} ${A4_HEIGHT}">
      <defs>
        <filter id="shadowStrong" x="-24%" y="-24%" width="148%" height="148%">
          <feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#020617" flood-opacity="0.44"/>
        </filter>
        <linearGradient id="scratchMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#d9dee8"/>
          <stop offset="42%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#aeb8c9"/>
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

      <g filter="url(#shadowStrong)" transform="translate(100 660) rotate(-5)">
        <rect width="210" height="78" rx="10" fill="#05070c"/>
        <text x="105" y="32" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="25" font-weight="900">SCANNEZ</text>
        <text x="105" y="63" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="25" font-weight="900">POUR JOUER</text>
      </g>

      <g filter="url(#shadowStrong)" transform="translate(${qrX} ${qrY}) rotate(-4 ${qrSize / 2} ${qrSize / 2})">
        <rect x="-12" y="-12" width="${qrSize + 24}" height="${qrSize + 24}" rx="28" fill="#111827"/>
        <rect x="0" y="0" width="${qrSize}" height="${qrSize}" rx="18" fill="#ffffff"/>
        <image href="${qrDataUrl}" x="16" y="16" width="${qrSize - 32}" height="${qrSize - 32}"/>
      </g>

      <rect x="0" y="964" width="${A4_WIDTH}" height="159" fill="#111827"/>
      <rect x="0" y="1058" width="${A4_WIDTH}" height="65" fill="${poster.footerBackgroundColor}"/>
      <g transform="translate(84 990)">
        <text x="28" y="28" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="900">1</text>
        <text x="72" y="20" fill="#ffffff" font-family="Arial, sans-serif" font-size="22" font-weight="900">Scannez</text>
        <text x="72" y="47" fill="rgba(255,255,255,0.82)" font-family="Arial, sans-serif" font-size="17">le QR code</text>
      </g>
      <g transform="translate(310 990)">
        <text x="28" y="28" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="900">2</text>
        <text x="72" y="20" fill="#ffffff" font-family="Arial, sans-serif" font-size="22" font-weight="900">${actionLabel}</text>
        <text x="72" y="47" fill="rgba(255,255,255,0.82)" font-family="Arial, sans-serif" font-size="17">${actionBody}</text>
      </g>
      <g transform="translate(536 990)">
        <text x="28" y="28" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="900">3</text>
        <text x="72" y="20" fill="#ffffff" font-family="Arial, sans-serif" font-size="22" font-weight="900">Récupérez</text>
        <text x="72" y="47" fill="rgba(255,255,255,0.82)" font-family="Arial, sans-serif" font-size="17">votre cadeau</text>
      </g>
    </svg>
  `;
}
