import { buildPosterWheelSegments, MAX_POSTER_HEADLINE_LINES, splitPosterSegmentLines } from "@/lib/poster-utils";
import { getPosterTemplate, PosterTemplateConfig } from "@/lib/poster-templates";
import { getPosterFontAsset } from "@/lib/poster-fonts";
import { Campaign, CampaignPosterSettings, Prize, TextFont } from "@/lib/types";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const SAFE_FONT = "Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
const SAFE_DISPLAY_FONT = "Anton, Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";

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

// Keep a visual safety margin for italic glyphs and the headline stroke.
// The safe width and textLength are shared by the preview and exported PNG.
const POSTER_HEADLINE_SIDE_PADDING = 76;
const POSTER_HEADLINE_MAX_WIDTH = A4_WIDTH - POSTER_HEADLINE_SIDE_PADDING * 2;

function rebalanceHeadlineLines(text: string, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= maxLines) {
    return words;
  }

  const targetLength = Math.ceil(words.join(" ").length / maxLines);
  const lines: string[] = [];
  let current = "";

  words.forEach((word, index) => {
    const remainingWords = words.length - index;
    const remainingLines = maxLines - lines.length;
    const next = current ? `${current} ${word}` : word;

    if (
      current &&
      remainingLines > 1 &&
      next.length > targetLength &&
      remainingWords >= remainingLines
    ) {
      lines.push(current);
      current = word;
      return;
    }

    current = next;
  });

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

function splitHeadlineLines(
  text: string,
  size: number,
  maxWidth = POSTER_HEADLINE_MAX_WIDTH,
) {
  const maxChars = clamp(Math.floor(maxWidth / (size * 0.5)), 12, 30);
  const lines = splitLines(text, maxChars);

  return lines.length <= MAX_POSTER_HEADLINE_LINES
    ? lines
    : rebalanceHeadlineLines(text, MAX_POSTER_HEADLINE_LINES);
}

function estimateHeadlineWidth(text: string, size: number) {
  const width = [...text].reduce((total, character) => {
    if ("MWQ@%&".includes(character)) return total + size * 0.9;
    if ("I!.,'".includes(character)) return total + size * 0.34;
    return total + size * 0.7;
  }, 0);

  return Math.max(1, width - Math.max(0, text.length - 1) * 1.5);
}

function fontFamily(font: TextFont) {
  switch (font) {
    case "roboto":
      return "Roboto, Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
    case "geogrotesque":
      return "Geogrotesque, Roboto, Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
    case "comfortaa":
      return "Comfortaa, Roboto, Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
    case "days-one":
      return "Days One, Roboto, Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
    case "delius-unicase":
      return "Delius Unicase, Roboto, Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
    case "lato":
      return "Lato, Roboto, Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
    case "lobster":
      return "Lobster, Roboto, Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
    case "pacifico":
      return "Pacifico, Roboto, Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
    case "syncopate":
      return "Syncopate, Roboto, Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
    case "anton":
    case "display":
      return SAFE_DISPLAY_FONT;
    case "serif":
      return "serif";
    case "cormorant":
      return "Cormorant Garamond, Georgia, serif";
    case "fredoka":
      return "Fredoka, Inter, sans-serif";
    case "inter":
      return SAFE_FONT;
    case "bebas":
      return "Bebas Neue, Anton, sans-serif";
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

function renderBackground(
  poster: CampaignPosterSettings,
  template: PosterTemplateConfig,
  premiumBackdropSource?: string,
) {
  const baseColor =
    template.id === "classic-wheel" && poster.backgroundMode === "color"
      ? poster.backgroundColor || template.background
      : template.background;

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

  if (template.id === "premium-wheel") {
    if (premiumBackdropSource) {
      return `
        <image href="${escapeXml(premiumBackdropSource)}" x="0" y="0" width="${A4_WIDTH}" height="${A4_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
      `;
    }

    return `
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="#f7f2ec"/>
    `;
  }

  return `
    <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="${baseColor}"/>
    <circle cx="258" cy="884" r="360" fill="${template.accent}" opacity="0.04"/>
  `;
}

function getLogoLayout(poster: CampaignPosterSettings, template: PosterTemplateConfig) {
  const logoSize = clamp((poster.logoSizePercent / 100) * 170, 72, 300);
  const logoY = template.logoY ?? (template.id === "classic-wheel" ? 28 : 22);

  return {
    logoSize,
    logoY,
    bottomY: logoY + logoSize + poster.logoBottomMarginPx,
  };
}

function renderLogo(campaign: Campaign, poster: CampaignPosterSettings, template: PosterTemplateConfig) {
  const logoMode = poster.logoMode ?? "none";
  const logoUrl = logoMode === "image" ? poster.logoUrl || campaign.logoUrl : undefined;
  const logoText =
    logoMode === "text" ? (poster.logoText ?? campaign.logoText ?? "").trim() : "";
  const { logoSize, logoY } = getLogoLayout(poster, template);
  const logoX = template.logoX ?? A4_WIDTH / 2;

  if (logoMode === "image" && logoUrl) {
    return `<image href="${escapeXml(logoUrl)}" x="${logoX - (logoSize * 1.9) / 2}" y="${logoY}" width="${logoSize * 1.9}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  if (logoMode !== "text" || !logoText) {
    return "";
  }

  const text = escapeXml(logoText);
  // Keep the merchant name visually secondary to the poster headline.
  const fontSize = clamp(logoSize * (template.id === "premium-wheel" ? 0.2 : 0.24), 18, 51);
  const centerY = logoY + logoSize / 2;
  const logoTextColor = poster.headlineTextColor || template.headline;

  return `
    <text x="${logoX}" y="${centerY + fontSize * 0.34}" text-anchor="middle" fill="${logoTextColor}" font-family="${SAFE_FONT}" font-size="${fontSize}" font-weight="${template.logoFontWeight ?? 800}" letter-spacing="${template.logoLetterSpacing ?? 0}">${text}</text>
  `;
}

export function getPremiumHeadlineLayout(headline: string, poster: CampaignPosterSettings, template: PosterTemplateConfig,
  measure?: (text: string, size: number) => number) {
    const x = template.headlineX ?? 284;
    const width = Math.min(template.headlineMaxWidth ?? 466, A4_WIDTH - x - 40);
    const logo = getLogoLayout(poster, template);
    const logoFontSize = clamp(logo.logoSize * 0.2, 18, 51);
    const logoBottom = poster.logoMode === "image"
      ? logo.logoY + logo.logoSize
      : poster.logoMode === "text" ? logo.logoY + logo.logoSize / 2 + logoFontSize * 0.6 : 0;
    const top = Math.max(150, logoBottom + poster.logoBottomMarginPx);
    const availableHeight = Math.max(70, 350 - top);
    const measureText = measure ?? ((text: string, size: number) => text.length * size * 0.46);
    const wrap = (size: number) => {
      const lines: string[] = [];
      for (const paragraph of headline.split(/\r?\n/).filter(Boolean)) {
        let line = "";
        for (const word of paragraph.trim().split(/\s+/)) {
          const next = line ? `${line} ${word}` : word;
          if (line && measureText(next, size) > width) {
            lines.push(line);
            line = "";
          }
          if (measureText(word, size) <= width) {
            line = line ? `${line} ${word}` : word;
            continue;
          }
          // A single long word must stay within the same safe bounds.
          for (const character of (line ? ` ${word}` : word)) {
            if (line && measureText(line + character, size) > width) {
              lines.push(line);
              line = "";
            }
            line += character;
          }
        }
        if (line) lines.push(line);
      }
      return lines;
    };
    const requestedSize = poster.headlineFontSizePx * template.headlineSizeMultiplier;
    let size = requestedSize;
    let lines = wrap(size);
    while (size > 12 && (lines.length > 4 || lines.length * size * 1.08 > availableHeight)) {
      size -= 1;
      lines = wrap(size);
    }
    return { x, top, size, lines, requestedSize, adjusted: size < requestedSize };
}

function renderHeadline(campaign: Campaign, poster: CampaignPosterSettings, template: PosterTemplateConfig,
  measure?: (text: string, size: number) => number) {
  const headline = poster.headline || campaign.subtitle || "Faites tourner la roue";
  const family = fontFamily(poster.headlineFontFamily);
  const color = poster.headlineTextColor || template.headline;
  if (template.id === "premium-wheel") {
    const { x, top, size, lines } = getPremiumHeadlineLayout(headline, poster, template, measure);
    return `<g data-headline-size="${size}">${lines.map((line, index) => `<text x="${x}" y="${top + size * 0.82 + index * size * 1.08}"
      text-anchor="start" fill="${color}" font-family="${family}" font-size="${size}"
      font-weight="${template.headlineFontWeight ?? 500}">${escapeXml(line)}</text>`).join("")}</g>`;
  }
  const size = clamp(poster.headlineFontSizePx * template.headlineSizeMultiplier, 46, 94);
  const headlineX = template.headlineX ?? A4_WIDTH / 2;
  const headlineMaxWidth = template.headlineMaxWidth ?? POSTER_HEADLINE_MAX_WIDTH;
  // Recalculate the line capacity from the effective font size, then balance
  // the result into at most four lines. Each line is fitted to the same SVG
  // container so long headlines cannot escape the poster on screen or in PNG.
  const headlineText = headline.toUpperCase();
  const lines = splitHeadlineLines(headlineText, size, headlineMaxWidth);
  const logoAwareHeadlineY = template.headlineY + (poster.logoBottomMarginPx - 28);
  const firstLineY = Math.max(logoAwareHeadlineY, getLogoLayout(poster, template).bottomY + size * 0.15);
  const lineHeight = size * 1.08;
  const headlineTop = Math.max(0, firstLineY - size * 1.05);
  const headlineBottom = Math.min(
    A4_HEIGHT,
    template.wheelY - template.wheelRadius - size * 0.1,
  );
  const maxVisibleLines = clamp(
    Math.floor((headlineBottom - headlineTop) / lineHeight) + 1,
    1,
    MAX_POSTER_HEADLINE_LINES,
  );
  const visibleLines =
    lines.length <= maxVisibleLines
      ? lines
      : rebalanceHeadlineLines(headlineText, maxVisibleLines);
  const accent = poster.wheel.winColor || template.accent;
  const letterSpacing = -2;

  return `
    <g>
  ${visibleLines
    .map((line, index) => {
      const y = firstLineY + index * lineHeight;
      const rotation = template.id === "terracotta-wheel" ? -3 : template.id === "classic-wheel" ? -2 : 0;
      const fill = index % 2 === 1 ? accent : color;
      const fittedWidth = Math.min(headlineMaxWidth, estimateHeadlineWidth(line, size));
      const fitAttributes =
        fittedWidth >= headlineMaxWidth * 0.68
          ? ` textLength="${headlineMaxWidth}" lengthAdjust="spacingAndGlyphs"`
          : "";

      return `
        <text
          x="${headlineX}"
          y="${y}"
          transform="rotate(${rotation} ${headlineX} ${y})"
          text-anchor="middle"
          fill="${fill}"
          font-family="${family}"
          font-size="${size}"
          font-weight="${template.headlineFontWeight ?? 900}"
          font-style="${template.headlineItalic === false ? "normal" : "italic"}"
          letter-spacing="${letterSpacing}"
          paint-order="stroke"
          stroke="${template.headlineStroke}"
          stroke-width="${template.headlineStroke === "none" ? 0 : 8}"
          ${fitAttributes}
        >${escapeXml(line)}</text>
      `;
    })
    .join("")}
    </g>
  `;
}

function renderWheel(template: PosterTemplateConfig, poster: CampaignPosterSettings, prizes: Prize[] | Array<Pick<Prize, "label">>) {
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
      const lines = splitPosterSegmentLines(segment.label.replace(" !", ""));
      const fontSize = lines.length >= 4 ? 14 : lines.length === 3 ? 16 : 18;
      const lineHeight = fontSize * 1.05;
      const firstLineDy = -((lines.length - 1) * lineHeight) / 2 + fontSize * 0.34;
      const labelLines = lines
        .map(
          (line, lineIndex) =>
            `<tspan x="${labelPoint.x.toFixed(1)}" dy="${lineIndex === 0 ? firstLineDy : lineHeight}">${escapeXml(line)}</tspan>`,
        )
        .join("");
      const clipId = `posterWheelSegmentClip${index}`;
      const slicePath = segmentPath(cx, cy, radius, start, end);

      return `
        <path d="${slicePath}" fill="${fill}" stroke="${rimColor}" stroke-width="2"/>
        <g clip-path="url(#${clipId})">
          <text
            x="${labelPoint.x.toFixed(1)}"
            y="${labelPoint.y.toFixed(1)}"
            transform="rotate(${labelAngle} ${labelPoint.x.toFixed(1)} ${labelPoint.y.toFixed(1)})"
            text-anchor="middle"
            fill="${segment.textColor}"
            font-family="${SAFE_FONT}"
            font-size="${fontSize}"
            font-weight="900"
          >${labelLines}</text>
        </g>
      `;
    })
    .join("");

  const segmentClips = segments
    .map((_, index) => {
      const start = index * 60;
      const end = start + 60;
      return `<clipPath id="posterWheelSegmentClip${index}"><path d="${segmentPath(cx, cy, radius, start, end)}"/></clipPath>`;
    })
    .join("");

  return `
    <g filter="url(#posterShadow)">
      <defs>${segmentClips}</defs>
      <circle cx="${cx}" cy="${cy}" r="${radius + 36}" fill="#fff7ef" opacity="0.88"/>
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#ffffff" stroke="${rimColor}" stroke-width="9"/>
      ${slices}
      <circle cx="${cx}" cy="${cy}" r="33" fill="${template.accentDark}"/>
      <path d="M ${cx - 32} ${cy - radius - 50} L ${cx + 32} ${cy - radius - 50} L ${cx} ${cy - radius + 8} Z" fill="${template.accentDark}"/>
    </g>
  `;
}

function renderScratch(template: PosterTemplateConfig, poster: CampaignPosterSettings) {
  const family = fontFamily(poster.headlineFontFamily);

  return `
    <g filter="url(#posterShadow)" transform="translate(92 520) rotate(-4 305 170)">
      <rect x="0" y="0" width="610" height="330" rx="34" fill="#ffffff" stroke="${template.accent}" stroke-width="8"/>
      <rect x="34" y="62" width="542" height="178" rx="28" fill="url(#scratchMetal)"/>
      <text x="305" y="162" text-anchor="middle" fill="${template.accentDark}" font-family="${family}" font-size="44" font-weight="900">GRATTEZ ICI</text>
      <text x="305" y="286" text-anchor="middle" fill="${template.accent}" font-family="${SAFE_FONT}" font-size="28" font-weight="900">DÉCOUVREZ VOTRE CADEAU</text>
    </g>
  `;
}

function renderQrAndCta(qrDataUrl: string, template: PosterTemplateConfig) {
  const accent = template.accent;
  const qrFrameBottom = template.qrY + template.qrSize + 18;
  const ctaY = Math.max(template.ctaY, qrFrameBottom + 16);

  if (template.inlineQrCta) {
    const cardWidth = template.qrSize + 36;
    const cardHeight = template.qrSize + 60;
    const premiumQr = template.id === "premium-wheel";
    const qrContentSize = premiumQr ? template.qrSize - 26 : template.qrSize;
    const qrContentX = premiumQr ? (cardWidth - qrContentSize) / 2 - 18 : 0;
    const qrContentY = premiumQr ? 12 : 0;
    const qrLabelX = cardWidth / 2 - 18;
    const qrLabelY = qrContentY + qrContentSize + (premiumQr ? 34 : 30);
    const qrLabelFontSize = 20;

    return `
      <g filter="url(#posterShadow)" transform="translate(${template.qrX} ${template.qrY})">
        <rect x="-18" y="-18" width="${cardWidth}" height="${cardHeight}" rx="28" fill="#ffffff" stroke="${accent}" stroke-width="2"/>
        <image href="${escapeXml(qrDataUrl)}" x="${qrContentX}" y="${qrContentY}" width="${qrContentSize}" height="${qrContentSize}"/>
        <text x="${qrLabelX}" y="${qrLabelY}" text-anchor="middle" fill="#111111" font-family="${SAFE_FONT}" font-size="${qrLabelFontSize}" font-weight="800" letter-spacing="0.8">SCANNEZ POUR JOUER</text>
      </g>
    `;
  }

  return `
    <g filter="url(#posterShadow)" transform="translate(${template.qrX} ${template.qrY})">
      <rect x="-18" y="-18" width="${template.qrSize + 36}" height="${template.qrSize + 36}" rx="28" fill="${template.qrFrame}"/>
      <rect x="0" y="0" width="${template.qrSize}" height="${template.qrSize}" rx="10" fill="#ffffff"/>
      <image href="${escapeXml(qrDataUrl)}" x="18" y="18" width="${template.qrSize - 36}" height="${template.qrSize - 36}"/>
    </g>
    <g filter="url(#posterShadow)" transform="translate(${template.ctaX} ${ctaY}) rotate(${template.ctaRotation} ${template.ctaWidth / 2} ${template.ctaHeight / 2})">
      <rect width="${template.ctaWidth}" height="${template.ctaHeight}" rx="24" fill="${accent}" stroke="#ffffff" stroke-width="7"/>
      <text x="${template.ctaWidth / 2}" y="${template.ctaHeight / 2 + 11}" text-anchor="middle" fill="#ffffff" font-family="${SAFE_FONT}" font-size="26" font-weight="900" letter-spacing="0.5">SCANNEZ POUR JOUER</text>
    </g>
  `;
}

function renderSteps(template: PosterTemplateConfig, gameType: Campaign["gameType"]) {
  const action = gameType === "wheel" ? "Jouez" : "Grattez";
  const gift = "Gagnez";

  if (template.id === "premium-wheel") {
    return `
      <g transform="translate(0 925)">
        <rect width="${A4_WIDTH}" height="${A4_HEIGHT - 925}" fill="#ffffff" opacity="0.76"/>
        <line x1="281" y1="30" x2="281" y2="138" stroke="#171412" stroke-width="2"/>
        <line x1="513" y1="30" x2="513" y2="138" stroke="#171412" stroke-width="2"/>
        <g transform="translate(33 14)">
          <g transform="translate(0 9)">
            <circle cx="132" cy="48" r="42" fill="${template.accent}"/>
            <g transform="translate(132 48) scale(0.9) translate(-132 -48)">
              <path transform="translate(0 -7)" d="M116 29 h31 a6 6 0 0 1 6 6 v42 a6 6 0 0 1 -6 6 h-31 a6 6 0 0 1 -6 -6 v-42 a6 6 0 0 1 6 -6 Z M118 42 h27 M118 53 h20 M118 64 h23" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
            </g>
          </g>
          <text x="132" y="138" text-anchor="middle" fill="#111111" font-family="${SAFE_FONT}" font-size="28" font-weight="700">Scannez</text>
        </g>
        <g transform="translate(264 14)">
          <g transform="translate(0 9)">
            <circle cx="132" cy="48" r="42" fill="${template.accent}"/>
            <circle cx="132" cy="48" r="25" fill="none" stroke="#ffffff" stroke-width="4"/>
            <path d="M132 23 v50 M107 48 h50 M114 30 l36 36 M150 30 l-36 36" stroke="#ffffff" stroke-width="3"/>
          </g>
          <text x="132" y="138" text-anchor="middle" fill="#111111" font-family="${SAFE_FONT}" font-size="28" font-weight="700">${action}</text>
        </g>
        <g transform="translate(497 14)">
          <g transform="translate(0 9)">
            <circle cx="132" cy="48" r="42" fill="${template.accent}"/>
            <g transform="translate(132 48) scale(1.6)">
              <rect x="-13" y="-5" width="26" height="19" rx="2" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M-15-5h30v7h-30z" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M0-5v19" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M0-5c-7 0-11-2-10-6 1-4 7-3 10 6Z" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M0-5c7 0 11-2 10-6-1-4-7-3-10 6Z" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          </g>
          <text x="132" y="138" text-anchor="middle" fill="#111111" font-family="${SAFE_FONT}" font-size="28" font-weight="700">${gift}</text>
        </g>
      </g>
    `;
  }

  const iconCenterY = 68;
  const iconScale = 0.52;
  const iconTop = iconCenterY - 24;
  const wheelIconScale = 0.68;
  const wheelIconTop = iconCenterY - 50 * wheelIconScale;

  return `
    <g transform="translate(28 954)">
      <rect width="738" height="124" rx="22" fill="rgba(255,255,255,0.96)" stroke="#fff0e8" stroke-width="4"/>
      <line x1="246" y1="24" x2="246" y2="100" stroke="${template.accent}" stroke-width="2"/>
      <line x1="492" y1="24" x2="492" y2="100" stroke="${template.accent}" stroke-width="2"/>
      <g transform="translate(0 0)">
        <circle cx="146" cy="38" r="17" fill="${template.accent}"/>
        <text x="146" y="44" text-anchor="middle" fill="#ffffff" font-family="${SAFE_FONT}" font-size="16" font-weight="900">1</text>
        <text x="168" y="90" text-anchor="middle" fill="${template.accentDark}" font-family="${SAFE_FONT}" font-size="22" font-weight="900">Scannez</text>
        <g transform="translate(51 ${iconTop}) scale(${iconScale})">
          <path d="M20 12 h40 a8 8 0 0 1 8 8 v60 a8 8 0 0 1 -8 8 h-40 a8 8 0 0 1 -8 -8 v-60 a8 8 0 0 1 8 -8 Z M28 26 h24 M28 40 h8 M44 40 h8 M28 54 h8 M44 54 h8 M28 68 h24" fill="none" stroke="#05070c" stroke-width="4" stroke-linecap="round"/>
        </g>
      </g>
      <g transform="translate(246 0)">
        <circle cx="146" cy="38" r="17" fill="${template.accent}"/>
        <text x="146" y="44" text-anchor="middle" fill="#ffffff" font-family="${SAFE_FONT}" font-size="16" font-weight="900">2</text>
        <text x="168" y="90" text-anchor="middle" fill="${template.accentDark}" font-family="${SAFE_FONT}" font-size="22" font-weight="900">${action}</text>
        <g transform="translate(55 ${wheelIconTop}) scale(${wheelIconScale})">
          <circle cx="28" cy="50" r="30" fill="none" stroke="#05070c" stroke-width="4"/>
          <path d="M28 20 v60 M-2 50 h60 M8 30 l40 40 M48 30 l-40 40" stroke="#05070c" stroke-width="3"/>
        </g>
      </g>
      <g transform="translate(492 0)">
        <circle cx="146" cy="38" r="17" fill="${template.accent}"/>
        <text x="146" y="44" text-anchor="middle" fill="#ffffff" font-family="${SAFE_FONT}" font-size="16" font-weight="900">3</text>
        <text x="168" y="90" text-anchor="middle" fill="${template.accentDark}" font-family="${SAFE_FONT}" font-size="22" font-weight="900">${gift}</text>
        <g transform="translate(47 ${iconTop}) scale(${iconScale})">
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
  posterFontSource?: string;
  premiumBackdropSource?: string;
  measureHeadline?: (text: string, size: number) => number;
}) {
  const {
    campaign,
    poster,
    prizes,
    qrDataUrl,
    posterFontSource,
    premiumBackdropSource,
    measureHeadline,
  } = args;
  const posterFontAsset = getPosterFontAsset(poster.headlineFontFamily);
  const posterFontFace = posterFontAsset
    ? `
            @font-face {
              font-family: "${posterFontAsset.familyName}";
              src: url("${posterFontSource ?? `/fonts/poster/${posterFontAsset.fileName}`}") format("truetype");
              font-weight: ${posterFontAsset.fontWeight};
              font-style: normal;
            }`
    : "";
  const baseTemplate = getPosterTemplate(poster.templateId);
  const effectiveWheel =
    baseTemplate.colorsCustomizable === false ? baseTemplate.wheel : poster.wheel;
  const effectivePoster = {
    ...poster,
    headlineTextColor:
      baseTemplate.colorsCustomizable === false
        ? baseTemplate.headlineTextColor
        : poster.headlineTextColor,
    wheel: effectiveWheel,
  };
  const template = {
    ...baseTemplate,
    accent:
      baseTemplate.colorsCustomizable === false
        ? baseTemplate.accent
        : poster.wheel.winColor || baseTemplate.accent,
    qrFrame:
      baseTemplate.colorsCustomizable === false
        ? baseTemplate.qrFrame
        : poster.wheel.winColor || baseTemplate.qrFrame,
  };
  const gameMarkup =
    campaign.gameType === "wheel" && template.id !== "premium-wheel"
      ? renderWheel(template, effectivePoster, prizes)
      : campaign.gameType === "scratch"
        ? renderScratch(template, effectivePoster)
        : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="${A4_WIDTH}" height="${A4_HEIGHT}" viewBox="0 0 ${A4_WIDTH} ${A4_HEIGHT}">
      <defs>
        <style>
          <![CDATA[
            ${posterFontFace}
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

      ${renderBackground(effectivePoster, template, premiumBackdropSource)}
      ${renderLogo(campaign, effectivePoster, template)}
      ${renderHeadline(campaign, effectivePoster, template, measureHeadline)}
      ${gameMarkup}
      ${renderQrAndCta(qrDataUrl, template)}
      ${renderSteps(template, campaign.gameType)}
    </svg>
  `;
}

