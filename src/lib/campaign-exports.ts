import QRCode from "qrcode";

import { gameTypeLabel, goalLabel } from "@/lib/format";
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

  if (!words.length) {
    return [];
  }

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
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    margin: 1,
    width: 720,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });

  const headline = campaign.subtitle || campaign.title;
  const headlineLines = splitLines(headline, 22).slice(0, 4);
  const title = escapeXml(campaign.title);
  const cta = escapeXml(campaign.ctaLabel);
  const merchantName = escapeXml(merchant.companyName);
  const gameLabel = escapeXml(gameTypeLabel(campaign.gameType));
  const goal = escapeXml(goalLabel(campaign.goalType));
  const firstPrize = prizes[0]?.label ? escapeXml(prizes[0].label) : "Cadeau surprise";
  const logoUrl = campaign.logoUrl ?? merchant.logoUrl;
  const headingSize = clamp(campaign.presentation.heading.fontSizePx * 1.7, 42, 78);
  const headingColor = campaign.presentation.heading.textColor;
  const bgColor = campaign.presentation.background.color || "#111827";
  const signal = campaign.accent.signal;
  const paper = campaign.accent.paper;
  const ink = campaign.accent.ink;
  const buttonBg = campaign.presentation.button.backgroundColor;
  const buttonText = campaign.presentation.button.textColor;
  const buttonBorder = campaign.presentation.button.borderColor;
  const buttonFontSize = clamp(campaign.presentation.button.textSizePx, 16, 34);
  const prizeText =
    campaign.rewardRules.isWinningEveryTime
      ? "Jeu 100 % gagnant"
      : `Exemple de dotation : ${firstPrize}`;

  const linesMarkup = headlineLines
    .map(
      (line, index) => `
        <text
          x="86"
          y="${246 + index * (headingSize + 6)}"
          fill="${headingColor}"
          font-family="Georgia, 'Times New Roman', serif"
          font-size="${headingSize}"
          font-weight="700"
          letter-spacing="-1.2"
        >${escapeXml(line)}</text>`,
    )
    .join("");

  const backgroundImage =
    campaign.presentation.background.mode === "image" && campaign.presentation.background.imageUrl
      ? `
        <image href="${campaign.presentation.background.imageUrl}" x="0" y="0" width="${A4_WIDTH}" height="${A4_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
        <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="rgba(9,12,20,0.52)"/>
      `
      : "";

  const logoMarkup = logoUrl
    ? `
      <rect x="86" y="72" width="132" height="132" rx="34" fill="rgba(255,255,255,0.12)"/>
      <image href="${logoUrl}" x="98" y="84" width="108" height="108" preserveAspectRatio="xMidYMid meet"/>
    `
    : `
      <rect x="86" y="72" width="132" height="132" rx="34" fill="#ffffff"/>
      <text x="152" y="152" text-anchor="middle" fill="${ink}" font-family="Arial, sans-serif" font-size="42" font-weight="700">${escapeXml(merchant.logoText)}</text>
    `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${A4_WIDTH}" height="${A4_HEIGHT}" viewBox="0 0 ${A4_WIDTH} ${A4_HEIGHT}">
      <defs>
        <linearGradient id="posterGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bgColor}"/>
          <stop offset="55%" stop-color="#111827"/>
          <stop offset="100%" stop-color="#090c14"/>
        </linearGradient>
        <radialGradient id="haloPrimary" cx="0.18" cy="0.14" r="0.7">
          <stop offset="0%" stop-color="${signal}" stop-opacity="0.52"/>
          <stop offset="100%" stop-color="${signal}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="haloSecondary" cx="0.84" cy="0.78" r="0.46">
          <stop offset="0%" stop-color="${paper}" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="${paper}" stop-opacity="0"/>
        </radialGradient>
        <filter id="shadowSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="20" stdDeviation="28" flood-color="#020617" flood-opacity="0.28"/>
        </filter>
      </defs>

      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="url(#posterGradient)"/>
      ${backgroundImage}
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="url(#haloPrimary)"/>
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="url(#haloSecondary)"/>
      <circle cx="702" cy="146" r="118" fill="${signal}" fill-opacity="0.14"/>
      <circle cx="662" cy="874" r="96" fill="${paper}" fill-opacity="0.08"/>
      <path d="M 0 938 C 174 882 274 864 428 908 C 594 956 676 1024 794 1100 L 794 1123 L 0 1123 Z" fill="${signal}" fill-opacity="0.18"/>

      ${logoMarkup}

      <text x="240" y="106" fill="rgba(255,255,255,0.68)" font-family="Arial, sans-serif" font-size="18" letter-spacing="6">ACTIVATION MAGASIN</text>
      <text x="240" y="152" fill="#ffffff" font-family="Arial, sans-serif" font-size="38" font-weight="700">${merchantName}</text>
      <text x="240" y="188" fill="rgba(255,255,255,0.68)" font-family="Arial, sans-serif" font-size="20">${title}</text>

      ${linesMarkup}

      <g transform="translate(86 540)">
        <rect width="620" height="154" rx="34" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.08)"/>
        <text x="34" y="48" fill="rgba(255,255,255,0.62)" font-family="Arial, sans-serif" font-size="16" letter-spacing="3">À PROPOS DE CETTE CAMPAGNE</text>
        <text x="34" y="92" fill="#ffffff" font-family="Arial, sans-serif" font-size="26" font-weight="700">${goal}</text>
        <text x="34" y="130" fill="rgba(255,255,255,0.76)" font-family="Arial, sans-serif" font-size="24">${escapeXml(prizeText)}</text>
        <text x="456" y="112" fill="${signal}" font-family="Arial, sans-serif" font-size="24" font-weight="700" text-anchor="end">${gameLabel}</text>
      </g>

      <g filter="url(#shadowSoft)">
        <rect x="86" y="738" width="622" height="276" rx="42" fill="#ffffff"/>
      </g>
      <image href="${qrDataUrl}" x="124" y="776" width="200" height="200"/>
      <rect x="356" y="786" width="310" height="74" rx="24" fill="${buttonBg}" stroke="${buttonBorder}" stroke-width="3"/>
      <text x="511" y="833" text-anchor="middle" fill="${buttonText}" font-family="Arial, sans-serif" font-size="${buttonFontSize}" font-weight="700">${cta}</text>
      <text x="356" y="904" fill="#111827" font-family="Arial, sans-serif" font-size="18" letter-spacing="3">SCANNEZ POUR JOUER</text>
      <text x="356" y="940" fill="#4b5563" font-family="Arial, sans-serif" font-size="27" font-weight="700">${merchantName}</text>
      <text x="356" y="978" fill="#6b7280" font-family="Arial, sans-serif" font-size="20">Parcours mobile plein écran, lot instantané, retrait en boutique</text>

      <text x="86" y="1062" fill="rgba(255,255,255,0.68)" font-family="Arial, sans-serif" font-size="18">Lien public : ${escapeXml(publicUrl)}</text>
    </svg>
  `;
}
