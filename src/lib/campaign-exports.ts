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
  const { campaign, merchant, prizes } = performance;
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
  const headlineLines = splitLines(poster.headline || campaign.subtitle || campaign.title, 21).slice(0, 4);
  const headingSize = clamp(poster.headlineFontSizePx * 1.3, 34, 82);
  const headingFamily = fontFamily(poster.headlineFontFamily);
  const merchantName = escapeXml(merchant.companyName);
  const firstPrize = prizes[0]?.label ? escapeXml(prizes[0].label) : "Cadeau surprise";
  const prizeText = campaign.rewardRules.isWinningEveryTime
    ? "Jeu 100 % gagnant"
    : `Exemple de dotation : ${firstPrize}`;
  const logoUrl = poster.logoUrl || campaign.logoUrl;
  const logoSize = clamp((poster.logoSizePercent / 100) * 132, 70, 220);
  const logoX = 86;
  const logoY = 66;
  const headlineStartY = logoY + logoSize + 66;
  const wheelCenterX = 558;
  const wheelCenterY = 585;
  const wheelRadius = 184;

  const logoMarkup = campaign.logoMode === "image" && logoUrl
    ? `<image href="${logoUrl}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`
    : campaign.logoMode === "text"
      ? `<text x="${logoX}" y="${logoY + logoSize * 0.64}" fill="#ffffff" font-family="${headingFamily}" font-size="${clamp(logoSize * 0.3, 26, 58)}" font-weight="800">${escapeXml(campaign.logoText ?? merchant.companyName)}</text>`
      : "";

  const headlineMarkup = headlineLines
    .map((line, index) => `
      <text
        x="86"
        y="${headlineStartY + index * (headingSize + 8)}"
        fill="${poster.headlineTextColor}"
        font-family="${headingFamily}"
        font-size="${headingSize}"
        font-weight="800"
      >${escapeXml(line)}</text>`)
    .join("");

  const backgroundMarkup = poster.backgroundImageUrl
    ? `
      <image href="${poster.backgroundImageUrl}" x="0" y="0" width="${A4_WIDTH}" height="${A4_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="rgba(5,10,21,0.32)"/>
    `
    : `<rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="${campaign.presentation.background.color || "#111827"}"/>`;

  const wheelSegments = [
    { color: wheel.winColor, label: "GAGNE" },
    { color: wheel.loseColor, label: "PERDU" },
    { color: wheel.alternateWinColor, label: "BONUS" },
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
        <text x="${wheelCenterX}" y="${wheelCenterY - 106}" fill="#ffffff" font-family="Arial, sans-serif" font-size="22" font-weight="900" text-anchor="middle" transform="rotate(${index * 60 - 60} ${wheelCenterX} ${wheelCenterY})">${segment.label}</text>
      `;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${A4_WIDTH}" height="${A4_HEIGHT}" viewBox="0 0 ${A4_WIDTH} ${A4_HEIGHT}">
      <defs>
        <filter id="shadowSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="20" stdDeviation="28" flood-color="#020617" flood-opacity="0.28"/>
        </filter>
      </defs>

      ${backgroundMarkup}
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="rgba(0,0,0,0.08)"/>
      ${logoMarkup}
      ${headlineMarkup}

      <g filter="url(#shadowSoft)">
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="${wheelRadius + 24}" fill="${wheel.rimColor}"/>
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="${wheelRadius}" fill="#111827"/>
        ${wheelMarkup}
        <circle cx="${wheelCenterX}" cy="${wheelCenterY}" r="38" fill="${wheel.rimColor}"/>
        <path d="M ${wheelCenterX - 24} ${wheelCenterY - wheelRadius - 50} L ${wheelCenterX + 24} ${wheelCenterY - wheelRadius - 50} L ${wheelCenterX} ${wheelCenterY - wheelRadius - 5} Z" fill="#ffffff"/>
      </g>

      <g filter="url(#shadowSoft)">
        <rect x="86" y="718" width="292" height="292" rx="42" fill="#ffffff"/>
      </g>
      <image href="${qrDataUrl}" x="124" y="756" width="216" height="216"/>
      <text x="408" y="788" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="800">Scannez le QR code</text>
      <text x="408" y="832" fill="rgba(255,255,255,0.84)" font-family="Arial, sans-serif" font-size="26" font-weight="800">${merchantName}</text>
      <text x="408" y="876" fill="rgba(255,255,255,0.76)" font-family="Arial, sans-serif" font-size="20">${escapeXml(prizeText)}</text>

      <rect x="0" y="1004" width="${A4_WIDTH}" height="119" fill="${poster.footerBackgroundColor}"/>
      <g transform="translate(86 1036)">
        <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.22)"/>
        <text x="20" y="27" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="900">1</text>
        <text x="54" y="27" fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="900">Scan</text>
      </g>
      <g transform="translate(308 1036)">
        <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.22)"/>
        <text x="20" y="27" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="900">2</text>
        <text x="54" y="27" fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="900">Jouer</text>
      </g>
      <g transform="translate(508 1036)">
        <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.22)"/>
        <text x="20" y="27" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="20" font-weight="900">3</text>
        <text x="54" y="27" fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="900">Récupérer</text>
        <text x="54" y="56" fill="rgba(255,255,255,0.82)" font-family="Arial, sans-serif" font-size="18">le cadeau</text>
      </g>
    </svg>
  `;
}
