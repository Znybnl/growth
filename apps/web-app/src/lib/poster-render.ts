import { buildPosterWheelSegments, MAX_POSTER_HEADLINE_LINES, splitPosterSegmentLines } from "@/lib/poster-utils";
import {
  clampCampaignSpacingPx,
  defaultWheelSubtitleSpacingForTemplate,
  limitCampaignSubtitleLines,
} from "@/lib/campaign-defaults";
import { getPosterLogoTextFontSizePx, getPosterLogoTopY, getPosterTemplate, PosterTemplateConfig } from "@/lib/poster-templates";
import { getPosterFontAsset, getPosterSubtitleFont } from "@/lib/poster-fonts";
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
      return SAFE_DISPLAY_FONT;
    case "display":
      return "Display, Inter, Geist, DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
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

  if (template.id === "ivory-editorial-wheel") {
    return `<rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="url(#posterIvoryBackdrop)"/>`;
  }

  if (template.id === "soft-gradient-wheel") {
    return `
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="${baseColor}"/>
      <circle cx="398" cy="530" r="470" fill="${template.accent}" opacity="0.085"/>
      <circle cx="510" cy="706" r="360" fill="#ffffff" opacity="0.38"/>
    `;
  }

  if (template.id === "terracotta-wheel") {
    return `
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="${baseColor}"/>
      <circle cx="-80" cy="1100" r="720" fill="${template.accent}" opacity="0.18"/>
      <circle cx="732" cy="180" r="460" fill="#ffffff" opacity="0.22"/>
    `;
  }

  if (template.id === "pastel-editorial-wheel") {
    return `
      <rect width="${A4_WIDTH}" height="${A4_HEIGHT}" fill="url(#posterPastelBase)"/>
      <circle cx="92" cy="246" r="330" fill="#fffaf4" opacity="0.5"/>
      <path d="M0 510 C95 624 148 742 111 875 C82 981 19 1039 0 1069 Z" fill="url(#posterPastelSweep)" opacity="0.82"/>
      <path d="M794 450 C687 470 589 535 532 652 C460 798 459 976 361 1123 H794 Z" fill="url(#posterPastelLilac)" opacity="0.75"/>
      <path d="M0 1033 C154 929 274 883 402 898 C552 916 678 1044 794 989 V1123 H0 Z" fill="#ffd9ce" opacity="0.52"/>
      <path d="M794 88 C756 209 695 294 611 376 C703 341 761 314 794 272 Z" fill="#fff8f1" opacity="0.36"/>
    `;
  }

  if (template.backdropAsset) {
    if (premiumBackdropSource) {
      const backdrop = `
        <image href="${escapeXml(premiumBackdropSource)}" x="0" y="0" width="${A4_WIDTH}" height="${A4_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
      `;
      if (template.id === "botanical-editorial-poster") {
        return `${backdrop}
          <circle cx="137" cy="676" r="120" fill="${template.medallionFill ?? template.accent}"/>
          <circle cx="137" cy="676" r="116" fill="none" stroke="#f7f4e8" stroke-opacity=".65" stroke-width="2"/>
        `;
      }
      return backdrop;
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

function getLogoLayout(poster: CampaignPosterSettings) {
  const logoSize = clamp((poster.logoSizePercent / 100) * 170, 72, 300);
  const logoY = getPosterLogoTopY(poster.logoMode);

  return {
    logoSize,
    logoY,
    bottomY: logoY + logoSize + poster.logoBottomMarginPx,
  };
}

function wrapPosterLogoText(text: string, maxCharacters?: number) {
  if (!maxCharacters || maxCharacters < 8) return [text];
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maxCharacters) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function renderLogo(campaign: Campaign, poster: CampaignPosterSettings, template: PosterTemplateConfig) {
  const logoMode = poster.logoMode ?? "none";
  const logoUrl = logoMode === "image" ? poster.logoUrl || campaign.logoUrl : undefined;
  const logoText =
    logoMode === "text" ? (poster.logoText ?? campaign.logoText ?? "").trim() : "";
  const { logoSize, logoY } = getLogoLayout(poster);
  const logoX = template.logoX ?? A4_WIDTH / 2;

  if (logoMode === "image" && logoUrl) {
    const logoImageAnchor = template.logoImageAnchor ?? "middle";
    const imageX = logoImageAnchor === "start" ? logoX : logoX - (logoSize * 1.9) / 2;
    const preserveAspectRatio = logoImageAnchor === "start" ? "xMinYMid meet" : "xMidYMid meet";
    return `<image href="${escapeXml(logoUrl)}" x="${imageX}" y="${logoY}" width="${logoSize * 1.9}" height="${logoSize}" preserveAspectRatio="${preserveAspectRatio}"/>`;
  }

  if (logoMode !== "text" || !logoText) {
    return "";
  }

  const text = escapeXml(logoText);
  // Keep the merchant name visually secondary to the poster headline. The
  // 100% slider value represents the reference logo box, not a full-size
  // headline; use the same restrained text scale across poster templates.
  const fontSize = getPosterLogoTextFontSizePx(logoSize);
  const centerY = logoY + logoSize / 2;
  const logoTextColor = template.colorsCustomizable === false
    ? template.headlineTextColor
    : poster.headlineTextColor || template.headline;
  const logoFamily = fontFamily(template.logoFontFamily ?? "inter");
  const textAnchor = template.logoTextAnchor ?? "middle";
  const logoLines = wrapPosterLogoText(logoText, template.logoTextMaxCharactersPerLine);
  const firstLineY = centerY + fontSize * 0.34 - ((logoLines.length - 1) * fontSize * 0.84) / 2;
  const logoMarkup = logoLines.length > 1
    ? logoLines.map((line, index) => `<tspan x="${logoX}" y="${firstLineY + index * fontSize * 0.84}">${escapeXml(line)}</tspan>`).join("")
    : escapeXml(logoLines[0] ?? text);
  const underlineCentered = template.logoUnderlineCentered ?? textAnchor === "middle";
  const underlineX = underlineCentered
    ? logoX - (template.logoUnderlineWidth ?? 0) / 2
    : logoX;
  const underline = template.logoUnderlineWidth
    ? `<line x1="${underlineX}" y1="${centerY + fontSize * 0.34 + (template.logoUnderlineGapPx ?? 30)}" x2="${underlineX + template.logoUnderlineWidth}" y2="${centerY + fontSize * 0.34 + (template.logoUnderlineGapPx ?? 30)}" stroke="${template.logoUnderlineColor ?? logoTextColor}" stroke-width="${template.logoUnderlineStrokeWidth ?? 3}"/>`
    : "";

  return `
    <text x="${logoX}" y="${firstLineY}" text-anchor="${textAnchor}" fill="${logoTextColor}" font-family="${logoFamily}" font-size="${fontSize}" font-weight="${template.logoFontWeight ?? 800}" letter-spacing="${template.logoLetterSpacing ?? 0}">${logoMarkup}</text>
    ${underline}
  `;
}

export type PosterSubtitleLayout = {
  color: string;
  family: string;
  fontSize: number;
  lineHeight: number;
  lines: string[];
  maxWidth: number;
  maxRenderedLineWidth: number;
  textAnchor: "start" | "middle";
  x: number;
  top: number;
  headlineGap: number;
  headlineLayoutBottom?: number;
  fontWeight: number;
  letterSpacing: number;
  uppercase: boolean;
};

type StandardHeadlineLayout = {
  x: number;
  firstLineY: number;
  size: number;
  lineHeight: number;
  lines: string[];
};

function posterSubtitleLines(text: string, width: number, size: number, maxCharactersPerLine?: number) {
  const maxChars = maxCharactersPerLine ?? clamp(Math.floor(width / (size * 0.54)), 16, 52);
  return splitLines(text, maxChars).slice(0, 3);
}

function estimateIvorySubtitleLineWidth(text: string, size: number, letterSpacing: number) {
  const glyphWidth = [...text.toLocaleUpperCase("fr-FR")].reduce((total, character) => {
    if (character === " ") return total + size * 0.28;
    if ("MW@%&".includes(character)) return total + size * 0.82;
    if ("I!.,':;|".includes(character)) return total + size * 0.32;
    return total + size * 0.58;
  }, 0);

  return glyphWidth + Math.max(0, [...text].length - 1) * letterSpacing;
}

function wrapIvorySubtitle(text: string, maxWidth: number, size: number, letterSpacing: number) {
  const safeWidth = Math.max(1, maxWidth - 24);
  const lines: string[] = [];
  const paragraphs = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const paragraph of paragraphs.length ? paragraphs : [text.trim()]) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      let remainingWord = word;
      while (remainingWord) {
        const candidate = current ? `${current} ${remainingWord}` : remainingWord;
        if (estimateIvorySubtitleLineWidth(candidate, size, letterSpacing) <= safeWidth) {
          current = candidate;
          break;
        }

        if (current) {
          lines.push(current);
          current = "";
          continue;
        }

        const characters = [...remainingWord];
        let fittingLength = 1;
        while (
          fittingLength < characters.length &&
          estimateIvorySubtitleLineWidth(characters.slice(0, fittingLength + 1).join(""), size, letterSpacing) <= safeWidth
        ) {
          fittingLength += 1;
        }
        current = characters.slice(0, fittingLength).join("");
        remainingWord = characters.slice(fittingLength).join("");
        if (remainingWord) {
          lines.push(current);
          current = "";
        }
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

function getStandardHeadlineLayout(
  campaign: Campaign,
  poster: CampaignPosterSettings,
  template: PosterTemplateConfig,
  reservedBottom?: number,
): StandardHeadlineLayout {
  const headline = poster.headline || campaign.subtitle || "Faites tourner la roue";
  const size = clamp(poster.headlineFontSizePx * template.headlineSizeMultiplier, 46, 94);
  const headlineX = template.headlineX ?? A4_WIDTH / 2;
  const headlineMaxWidth = template.headlineMaxWidth ?? POSTER_HEADLINE_MAX_WIDTH;
  const lines = splitHeadlineLines(headline.toUpperCase(), size, headlineMaxWidth);
  const logoAwareHeadlineY = template.headlineY + (poster.logoBottomMarginPx - 28);
  const firstLineY = Math.max(logoAwareHeadlineY, getLogoLayout(poster).bottomY + size * 0.15);
  const lineHeight = size * (template.id === "classic-wheel" ? 1.02 : 1.08);
  const visualBottom = Math.min(
    A4_HEIGHT,
    template.wheelY - template.wheelRadius - size * 0.1,
  );
  const headlineBottom = reservedBottom ?? visualBottom;
  const maxVisibleLines = clamp(
    Math.floor((headlineBottom - firstLineY) / lineHeight) + 1,
    1,
    MAX_POSTER_HEADLINE_LINES,
  );
  const headlineText = headline.toUpperCase();
  const visibleLines =
    lines.length <= maxVisibleLines
      ? lines
      : rebalanceHeadlineLines(headlineText, maxVisibleLines);

  return { x: headlineX, firstLineY, size, lineHeight, lines: visibleLines };
}

export function getPosterSubtitleLayout(
  campaign: Campaign,
  poster: CampaignPosterSettings,
  template: PosterTemplateConfig,
  measure?: (text: string, size: number) => number,
): PosterSubtitleLayout | null {
  if (!poster.posterSubtitleEnabled) {
    return null;
  }

  const text = limitCampaignSubtitleLines(campaign.presentation.layout.wheelSubtitle ?? "").trim();
  if (!text) {
    return null;
  }

  const isBotanicalEditorial = template.id === "botanical-editorial-poster";
  const isEditorialTemplate = template.id === "pastel-editorial-wheel";
  const isIvoryTemplate = template.id === "ivory-editorial-wheel";
  let fontSize = isIvoryTemplate ? template.supportingTextFontSize ?? 24 : isBotanicalEditorial || isEditorialTemplate ? 28 : template.backdropAsset ? 24 : 25;
  let lineHeight = isIvoryTemplate ? template.supportingTextLineHeight ?? 32 : fontSize * (isEditorialTemplate ? 1.5 : 1.42);
  const letterSpacing = isIvoryTemplate
    ? template.supportingTextLetterSpacing ?? 1.2
    : isBotanicalEditorial ? template.subtitleLetterSpacing ?? 4 : isEditorialTemplate ? 3.2 : 0.28;
  const isPremiumTemplate = template.id === "premium-wheel";
  const width = isPremiumTemplate
    ? Math.min(template.qrSize, A4_WIDTH - template.qrX - 24)
    : isBotanicalEditorial
      ? template.subtitleMaxWidth ?? 620
    : Math.min(template.subtitleMaxWidth ?? template.headlineMaxWidth ?? 620, A4_WIDTH - 48);
  let lines = isIvoryTemplate
    ? wrapIvorySubtitle(text.toLocaleUpperCase("fr-FR"), width, fontSize, letterSpacing)
    : posterSubtitleLines(text, width, fontSize, isBotanicalEditorial ? template.subtitleMaxCharactersPerLine : undefined);
  let textHeight = fontSize + Math.max(0, lines.length - 1) * lineHeight;
  const configuredHeadlineGap = clampCampaignSpacingPx(
    campaign.presentation.layout.subtitleSpacingPx,
    defaultWheelSubtitleSpacingForTemplate(campaign.presentation.layout.templateId),
  );
  const baseHeadlineGap = template.id === "botanical-wheel"
    ? Math.max(30, configuredHeadlineGap)
    : isEditorialTemplate
      ? Math.max(28, configuredHeadlineGap)
      : configuredHeadlineGap;
  const headlineGap = clamp(
    baseHeadlineGap + (template.subtitleSpacingAdjustmentPx ?? 0) + (isIvoryTemplate ? 10 : 0),
    0,
    100,
  );
  const standardHeadlineLayout = !isPremiumTemplate && !template.backdropAsset && !isEditorialTemplate && !isIvoryTemplate
    ? getStandardHeadlineLayout(campaign, poster, template)
    : null;
  const editorialHeadline = poster.headline || campaign.subtitle || "Faites tourner la roue";
  const editorialHeadlineBottomLimit = isEditorialTemplate
    ? Math.min(
      template.headlineBlockBottom ?? Number.POSITIVE_INFINITY,
      template.qrY - 32 - textHeight - headlineGap,
    )
    : isIvoryTemplate
      ? Math.min(
        template.headlineBlockBottom ?? Number.POSITIVE_INFINITY,
        template.qrY - 20 - textHeight - headlineGap,
      )
    : isBotanicalEditorial
      ? template.qrY - 36 - headlineGap - fontSize * 0.82 - Math.max(0, lines.length - 1) * lineHeight
      : undefined;
  const editorialHeadlineLayout = isEditorialTemplate || isBotanicalEditorial || template.id === "botanical-wheel" || isIvoryTemplate
    ? getPremiumHeadlineLayout(
      editorialHeadline,
      poster,
      template,
      measure,
      editorialHeadlineBottomLimit,
    )
    : null;
  const visualTop = isPremiumTemplate
    ? template.qrY
    : isIvoryTemplate
      ? template.supportingTextY ?? 516
    : isEditorialTemplate
      ? template.supportingTextY ?? 484
    : template.backdropAsset
    ? template.supportingTextY
      ? template.supportingTextY - 18
      : template.qrY - 18
    : campaign.gameType === "scratch"
      ? 480
      : template.wheelY - template.wheelRadius - 36;
  const premiumVisualGap = isPremiumTemplate ? 52 : 36;
  const editorialHeadlineLayoutBottom = (isEditorialTemplate || isIvoryTemplate) && editorialHeadlineLayout
    ? editorialHeadlineLayout.top +
      editorialHeadlineLayout.size * 0.82 +
      Math.max(0, editorialHeadlineLayout.lines.length - 1) *
        editorialHeadlineLayout.size * (template.headlineLineHeightMultiplier ?? 1.08) +
      editorialHeadlineLayout.size * 0.18
    : undefined;
  const top = (isEditorialTemplate || isIvoryTemplate) && editorialHeadlineLayoutBottom !== undefined
    ? editorialHeadlineLayoutBottom + headlineGap
    : standardHeadlineLayout
    ? standardHeadlineLayout.firstLineY +
      Math.max(0, standardHeadlineLayout.lines.length - 1) * standardHeadlineLayout.lineHeight +
      standardHeadlineLayout.size * 0.2 +
      headlineGap
    : editorialHeadlineLayout && !isEditorialTemplate
      ? editorialHeadlineLayout.top +
        editorialHeadlineLayout.size * 0.82 +
        Math.max(0, editorialHeadlineLayout.lines.length - 1) * editorialHeadlineLayout.size * 1.08 +
        editorialHeadlineLayout.size * 0.18 +
        headlineGap
    : Math.max(0, visualTop - premiumVisualGap - textHeight);
  if (isIvoryTemplate) {
    const availableHeight = Math.max(0, (template.qrY ?? A4_HEIGHT) - 20 - top);
    while ((textHeight > availableHeight || lines.length > 6) && fontSize > 16) {
      fontSize -= 1;
      lineHeight = fontSize * 1.28;
      lines = wrapIvorySubtitle(text.toLocaleUpperCase("fr-FR"), width, fontSize, letterSpacing);
      textHeight = fontSize + Math.max(0, lines.length - 1) * lineHeight;
    }
    lineHeight = fontSize * 1.28;
  }
  const textAnchor = isIvoryTemplate ? "middle" : (template.backdropAsset && !isBotanicalEditorial) || isEditorialTemplate ? "start" : "middle";

  return {
    color: template.colorsCustomizable === false
      ? template.headlineTextColor
      : poster.headlineTextColor || template.headlineTextColor || template.headline,
    family: fontFamily(isIvoryTemplate ? template.supportingTextFontFamily ?? "inter" : getPosterSubtitleFont(campaign.presentation.heading.fontFamily)),
    fontSize,
    lineHeight,
    lines,
    maxWidth: width,
    maxRenderedLineWidth: isIvoryTemplate
      ? Math.max(0, ...lines.map((line) => estimateIvorySubtitleLineWidth(line, fontSize, letterSpacing)))
      : width,
    textAnchor,
    x: isPremiumTemplate
      ? template.qrX
      : isIvoryTemplate
        ? template.supportingTextX ?? A4_WIDTH / 2
      : isBotanicalEditorial
        ? template.qrX + template.qrSize / 2
        : template.backdropAsset || isEditorialTemplate
        ? template.headlineX ?? 72
        : template.headlineX ?? A4_WIDTH / 2,
    top,
    headlineGap,
    headlineLayoutBottom: editorialHeadlineLayoutBottom,
    fontWeight: isPremiumTemplate || isEditorialTemplate || isIvoryTemplate ? 400 : isBotanicalEditorial ? 500 : 600,
    letterSpacing,
    uppercase: isIvoryTemplate || (isBotanicalEditorial && template.subtitleUppercase === true) || isEditorialTemplate,
  };
}

export function getPremiumHeadlineLayout(headline: string, poster: CampaignPosterSettings, template: PosterTemplateConfig,
  measure?: (text: string, size: number) => number, reservedBottom?: number) {
    const x = template.headlineX ?? 284;
    const width = template.headlineTextAnchor === "middle"
      ? Math.min(template.headlineMaxWidth ?? 700, 2 * Math.min(x, A4_WIDTH - x) - 40)
      : Math.min(template.headlineMaxWidth ?? 466, A4_WIDTH - x - 40);
    const logo = getLogoLayout(poster);
    const logoFontSize = getPosterLogoTextFontSizePx(logo.logoSize);
    const logoBottom = poster.logoMode === "image"
      ? logo.logoY + logo.logoSize
      : poster.logoMode === "text"
        ? logo.logoY + logo.logoSize / 2 + logoFontSize * 0.6 + (wrapPosterLogoText((poster.logoText ?? "").trim(), template.logoTextMaxCharactersPerLine).length - 1) * logoFontSize * 0.84
        : 0;
    const logoUnderlineBottom = template.id === "ivory-editorial-wheel" && poster.logoMode === "text" && template.logoUnderlineWidth
      ? logo.logoY + logo.logoSize / 2 + logoFontSize * 0.34 + (template.logoUnderlineGapPx ?? 30) + (template.logoUnderlineStrokeWidth ?? 3) / 2
      : 0;
    const visualLogoBottom = Math.max(logoBottom, logoUnderlineBottom);
    const logoMargin = poster.logoMode === "none" ? 0 : poster.logoBottomMarginPx;
    const top = template.headlineLogoGapPx !== undefined && poster.logoMode !== "none"
      ? visualLogoBottom + template.headlineLogoGapPx + logoMargin
      : Math.max(template.headlineY ?? 150, visualLogoBottom) + logoMargin;
    const layoutBottom = Math.min(
      reservedBottom ?? Number.POSITIVE_INFINITY,
      template.headlineBlockBottom ?? (template.supportingTextY ? template.supportingTextY - 18 : 350),
    );
    const availableHeight = Math.max(70, layoutBottom - top);
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
    const lineHeightMultiplier = template.headlineLineHeightMultiplier ?? 1.08;
    let size = requestedSize;
    let lines = wrap(size);
    while (size > 12 && (lines.length > 4 || lines.length * size * lineHeightMultiplier > availableHeight)) {
      size -= 1;
      lines = wrap(size);
    }
    return { x, top, size, lines, requestedSize, adjusted: size < requestedSize };
}

function renderHeadline(campaign: Campaign, poster: CampaignPosterSettings, template: PosterTemplateConfig,
  measure?: (text: string, size: number) => number, subtitleLayout?: PosterSubtitleLayout | null) {
  const headline = poster.headline || campaign.subtitle || "Faites tourner la roue";
  const family = fontFamily(poster.headlineFontFamily);
  const color = template.colorsCustomizable === false
    ? template.headlineTextColor
    : poster.headlineTextColor || template.headline;
  if (template.backdropAsset || template.id === "pastel-editorial-wheel" || template.id === "ivory-editorial-wheel") {
    const reservedBottom = template.id === "pastel-editorial-wheel" && subtitleLayout?.headlineLayoutBottom !== undefined
      ? subtitleLayout.headlineLayoutBottom
      : (template.id === "premium-wheel" || template.id === "botanical-editorial-poster" || template.id === "ivory-editorial-wheel") && subtitleLayout
        ? subtitleLayout.top - subtitleLayout.headlineGap
        : undefined;
    const { x, top, size, lines } = getPremiumHeadlineLayout(
      headline,
      poster,
      template,
      measure,
      reservedBottom,
    );
    const lineHeightMultiplier = template.headlineLineHeightMultiplier ?? 1.08;
    return `<g data-headline-size="${size}">${lines.map((line, index) => {
      const stretch = template.headlineStretchToWidth && lines.length === 2
        ? ` textLength="${template.headlineMaxWidth}" lengthAdjust="spacingAndGlyphs"`
        : "";
      return `<text x="${x}" y="${top + size * 0.82 + index * size * lineHeightMultiplier}"
        text-anchor="${template.headlineTextAnchor ?? "start"}" fill="${color}" font-family="${family}" font-size="${size}"
        font-weight="${template.headlineFontWeight ?? 500}"${stretch}>${escapeXml(line)}</text>`;
    }).join("")}</g>`;
  }
  // Reuse the same title geometry for the preview and PNG so the subtitle
  // follows the actual number of rendered title lines.
  const headlineLayout = getStandardHeadlineLayout(
    campaign,
    poster,
    template,
    subtitleLayout ? subtitleLayout.top - subtitleLayout.headlineGap : undefined,
  );
  const { x: headlineX, firstLineY, size, lineHeight, lines: visibleLines } = headlineLayout;
  const headlineMaxWidth = template.headlineMaxWidth ?? POSTER_HEADLINE_MAX_WIDTH;
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

function renderPosterSubtitle(layout: PosterSubtitleLayout | null) {
  if (!layout) {
    return "";
  }

  return `
    <g data-poster-subtitle="true">
      ${layout.lines.map((line, index) => `<text x="${layout.x}" y="${layout.top + layout.fontSize * 0.82 + index * layout.lineHeight}"
        text-anchor="${layout.textAnchor}" fill="${layout.color}" font-family="${layout.family}" font-size="${layout.fontSize}"
        font-weight="${layout.fontWeight}" letter-spacing="${layout.letterSpacing}">${escapeXml(layout.uppercase ? line.toLocaleUpperCase("fr-FR") : line)}</text>`).join("")}
    </g>
  `;
}

function renderSupportingText(template: PosterTemplateConfig) {
  if (!template.supportingText) {
    return "";
  }

  const lines = template.supportingText.split(/\r?\n/).filter(Boolean);
  const x = template.supportingTextX ?? 72;
  const y = template.supportingTextY ?? 510;
  const size = template.supportingTextFontSize ?? 22;
  const lineHeight = template.supportingTextLineHeight ?? size * 1.45;
  const family = fontFamily(template.supportingTextFontFamily ?? "inter");
  const color = template.supportingTextColor ?? template.headline;
  const letterSpacing = template.supportingTextLetterSpacing ?? 0;
  const isBotanicalEditorial = template.id === "botanical-editorial-poster";
  const textX = isBotanicalEditorial ? 137 : x;
  const firstBaseline = isBotanicalEditorial
    ? 676 - ((lines.length - 1) * lineHeight) / 2 + size * 0.38
    : y;
  const textAnchor = isBotanicalEditorial ? "middle" : template.supportingTextAnchor ?? "start";

  return `
    <g>
      ${lines.map((line, index) => `<text x="${textX}" y="${firstBaseline + index * lineHeight}" text-anchor="${textAnchor}" fill="${color}" font-family="${family}" font-size="${size}" font-weight="500" letter-spacing="${letterSpacing}">${escapeXml(line)}</text>`).join("")}
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
      const segmentMark = template.wheelLabelVariant === "gift-icons"
        ? `<g transform="translate(${labelPoint.x.toFixed(1)} ${labelPoint.y.toFixed(1)}) rotate(${labelAngle})" fill="none" stroke="${segment.textColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="-19" y="-10" width="38" height="29" rx="3"/>
            <path d="M-22 -10h44v10h-44zM0 -10v29M-22 0h44"/>
            <path d="M0 -10c-15 0-20-3-17-10 3-6 12-2 17 10Zm0 0c15 0 20-3 17-10-3-6-12-2-17 10Z"/>
          </g>`
        : `<g clip-path="url(#${clipId})">
            <text x="${labelPoint.x.toFixed(1)}" y="${labelPoint.y.toFixed(1)}"
              transform="rotate(${labelAngle} ${labelPoint.x.toFixed(1)} ${labelPoint.y.toFixed(1)})"
              text-anchor="middle" fill="${segment.textColor}" font-family="${SAFE_FONT}"
              font-size="${fontSize}" font-weight="900">${labelLines}</text>
          </g>`;

      return `
        <path d="${slicePath}" fill="${fill}" stroke="${rimColor}" stroke-width="2"/>
        ${segmentMark}
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
      ${template.wheelPointerVariant === "rounded-triangle"
        ? `<path d="M ${cx - 29} ${cy - radius - 46} Q ${cx - 32} ${cy - radius - 46} ${cx - 29} ${cy - radius - 40} L ${cx - 4} ${cy - radius + 6} Q ${cx} ${cy - radius + 14} ${cx + 4} ${cy - radius + 6} L ${cx + 29} ${cy - radius - 40} Q ${cx + 32} ${cy - radius - 46} ${cx + 29} ${cy - radius - 46} Z" fill="${template.accentDark}" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"/>`
        : `<path d="M ${cx - 32} ${cy - radius - 50} L ${cx + 32} ${cy - radius - 50} L ${cx} ${cy - radius + 8} Z" fill="${template.accentDark}"/>`}
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

  if (template.id === "ivory-editorial-wheel") {
    const cardSize = template.qrSize + 34;
    const qrInset = 24;
    const qrContentSize = template.qrSize - 14;
    const cardCenter = template.qrX + cardSize / 2;
    const cardBottom = template.qrY + cardSize;
    return `
      <g filter="url(#posterSoftShadow)" transform="translate(${template.qrX} ${template.qrY})">
        <rect width="${cardSize}" height="${cardSize}" rx="32" fill="#fffefa" stroke="${template.qrFrame}" stroke-width="7"/>
        <image href="${escapeXml(qrDataUrl)}" x="${qrInset}" y="${qrInset}" width="${qrContentSize}" height="${qrContentSize}" preserveAspectRatio="xMidYMid meet"/>
      </g>
      <g fill="none" stroke="#111111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M${cardCenter - 136} ${cardBottom + 64} C${cardCenter - 198} ${cardBottom + 52} ${cardCenter - 230} ${cardBottom - 10} ${cardCenter - 220} ${cardBottom - 48}"/>
        <path d="M${cardCenter - 220} ${cardBottom - 48} L${cardCenter - 248} ${cardBottom - 29} M${cardCenter - 220} ${cardBottom - 48} L${cardCenter - 214} ${cardBottom - 14}"/>
      </g>
      <text x="${cardCenter}" y="${cardBottom + 82}" text-anchor="middle" fill="#111111" font-family="${fontFamily("cormorant")}" font-size="44" font-style="italic" font-weight="600">Scannez ici</text>
    `;
  }

  if (template.id === "pastel-editorial-wheel") {
    const cardSize = template.qrSize + 34;
    const qrInset = 24;
    const qrContentSize = template.qrSize - 14;
    return `
      <g filter="url(#posterSoftShadow)" transform="translate(${template.qrX} ${template.qrY})">
        <rect width="${cardSize}" height="${cardSize}" rx="30" fill="#fffdfb" stroke="${template.qrFrame}" stroke-width="5"/>
        <image href="${escapeXml(qrDataUrl)}" x="${qrInset}" y="${qrInset}" width="${qrContentSize}" height="${qrContentSize}" preserveAspectRatio="xMidYMid meet"/>
      </g>
      <g fill="none" stroke="#111111" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M208 1058 C172 1042 164 1004 184 974"/>
        <path d="M184 974 L164 991 M184 974 L191 1000"/>
      </g>
      <text x="226" y="1080" text-anchor="start" fill="#111111" font-family="${fontFamily("cormorant")}" font-size="42" font-style="italic" font-weight="600">Scannez ici</text>
    `;
  }

  if (template.inlineQrCta) {
    const cardWidth = template.qrSize + 36;
    const cardHeight = template.qrSize + 60;
    const premiumQr = template.id === "premium-wheel";
    const botanicalQr = template.id === "botanical-wheel";
    const qrContentSize = premiumQr ? template.qrSize - 26 : template.qrSize;
    const qrContentX = premiumQr ? (cardWidth - qrContentSize) / 2 - 18 : 0;
    const qrContentY = premiumQr ? 12 : 0;
    const qrLabelX = botanicalQr ? (template.inlineQrLabelWidth ?? cardWidth) / 2 - 18 : cardWidth / 2 - 18;
    const qrLabelY = qrContentY + qrContentSize + (premiumQr ? 34 : 30);
    const qrLabelFontSize = 20;

    if (botanicalQr) {
      const labelWidth = template.inlineQrLabelWidth ?? cardWidth;
      const labelHeight = template.inlineQrLabelHeight ?? 70;
      const labelGap = template.inlineQrLabelGap ?? 18;
      const cardHeight = template.qrSize + 36;
      const qrContent = template.qrSize - 26;
      const labelX = template.ctaX ?? template.qrX - (labelWidth - cardWidth) / 2;
      const labelY = template.ctaY ?? template.qrY + cardHeight + labelGap;

      return `
        <g filter="url(#posterShadow)" transform="translate(${template.qrX} ${template.qrY})">
          <rect x="-18" y="-18" width="${cardWidth}" height="${cardHeight}" rx="28" fill="#ffffff" stroke="${template.qrFrame}" stroke-width="3"/>
          <image href="${escapeXml(qrDataUrl)}" x="5" y="5" width="${qrContent}" height="${qrContent}"/>
        </g>
        <g filter="url(#posterShadow)" transform="translate(${labelX} ${labelY})">
          <rect width="${labelWidth}" height="${labelHeight}" rx="24" fill="${template.inlineQrLabelBackground ?? template.accent}" stroke="#ffffff" stroke-width="5"/>
          <text x="${labelWidth / 2}" y="${labelHeight / 2 + 8}" text-anchor="middle" fill="${template.inlineQrLabelTextColor ?? "#ffffff"}" font-family="${SAFE_FONT}" font-size="22" font-weight="800" letter-spacing="0.4" textLength="${labelWidth - 34}" lengthAdjust="spacingAndGlyphs">SCANNEZ POUR JOUER</text>
        </g>
      `;
    }

    return `
      <g filter="url(#posterShadow)" transform="translate(${template.qrX} ${template.qrY})">
        <rect x="-18" y="-18" width="${cardWidth}" height="${cardHeight}" rx="28" fill="#ffffff" stroke="${accent}" stroke-width="2"/>
        <image href="${escapeXml(qrDataUrl)}" x="${qrContentX}" y="${qrContentY}" width="${qrContentSize}" height="${qrContentSize}"/>
        <text x="${qrLabelX}" y="${qrLabelY}" text-anchor="middle" fill="#111111" font-family="${SAFE_FONT}" font-size="${qrLabelFontSize}" font-weight="800" letter-spacing="0.8">SCANNEZ POUR JOUER</text>
      </g>
    `;
  }

  if (template.id === "botanical-editorial-poster") {
    const frameInset = 18;
    return `
      <g filter="url(#posterShadow)" transform="translate(${template.qrX} ${template.qrY})">
        <rect x="-${frameInset}" y="-${frameInset}" width="${template.qrSize + frameInset * 2}" height="${template.qrSize + frameInset * 2}" rx="26" fill="#fffefa" stroke="${template.qrFrame}" stroke-width="5"/>
        <rect x="-${frameInset - 5}" y="-${frameInset - 5}" width="${template.qrSize + (frameInset - 5) * 2}" height="${template.qrSize + (frameInset - 5) * 2}" rx="21" fill="none" stroke="#ffffff" stroke-width="2"/>
        <image href="${escapeXml(qrDataUrl)}" x="0" y="0" width="${template.qrSize}" height="${template.qrSize}"/>
      </g>
    `;
  }

  if (template.id === "soft-gradient-wheel") {
    return `
      <g filter="url(#posterShadow)" transform="translate(${template.qrX} ${template.qrY})">
        <rect x="-18" y="-18" width="${template.qrSize + 36}" height="${template.qrSize + 36}" rx="30" fill="#ffffff" stroke="${template.qrFrame}" stroke-width="${template.qrBorderWidth ?? 1.5}"/>
        <image href="${escapeXml(qrDataUrl)}" x="0" y="0" width="${template.qrSize}" height="${template.qrSize}"/>
      </g>
      <g filter="url(#posterShadow)" transform="translate(${template.ctaX} ${ctaY}) rotate(${template.ctaRotation} ${template.ctaWidth / 2} ${template.ctaHeight / 2})">
        <rect width="${template.ctaWidth}" height="${template.ctaHeight}" rx="${template.ctaCornerRadius ?? 24}" fill="${accent}" stroke="#ffffff" stroke-width="${template.ctaBorderWidth ?? 7}"/>
        <text x="${template.ctaWidth / 2}" y="${template.ctaHeight / 2 + 9}" text-anchor="middle" fill="#ffffff" font-family="${SAFE_FONT}" font-size="27" font-weight="900" letter-spacing="0.5">Scannez pour jouer</text>
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
      <rect width="${template.ctaWidth}" height="${template.ctaHeight}" rx="${template.ctaCornerRadius ?? 24}" fill="${accent}" stroke="#ffffff" stroke-width="${template.ctaBorderWidth ?? 7}"/>
      <text x="${template.ctaWidth / 2}" y="${template.ctaHeight / 2 + 11}" text-anchor="middle" fill="#ffffff" font-family="${SAFE_FONT}" font-size="26" font-weight="900" letter-spacing="0.5">SCANNEZ POUR JOUER</text>
    </g>
  `;
}

function renderSteps(template: PosterTemplateConfig, gameType: Campaign["gameType"]) {
  const action = gameType === "wheel" ? "Jouez" : "Grattez";
  const gift = "Gagnez";

  if (template.id === "ivory-editorial-wheel") return "";

  if (template.id === "pastel-editorial-wheel") {
    const steps = [
      { number: "1.", label: "SCANNEZ", cy: 605 },
      { number: "2.", label: gameType === "wheel" ? "JOUEZ" : "GRATTEZ", cy: 784 },
      { number: "3.", label: "GAGNEZ", cy: 963 },
    ];
    return `
      <g>
        ${steps.map(({ number, label, cy }, index) => `
          <circle cx="638" cy="${cy}" r="60" fill="#fffaf7" fill-opacity="0.54" stroke="#ffffff" stroke-width="4"/>
          ${index === 0 ? `
            <g transform="translate(638 ${cy}) scale(0.9)" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="-23" y="-39" width="46" height="78" rx="8"/>
              <path d="M-21 -27 H21 M-21 27 H21"/>
              <circle cx="0" cy="33" r="2.5" fill="#111111" stroke="none"/>
            </g>
          ` : index === 1 ? gameType === "wheel" ? `
            <g transform="translate(638 ${cy}) scale(0.9)" fill="none" stroke="#111111" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M0 -35 V-7 M24.75 -24.75 5 -5 M35 0 H7 M24.75 24.75 5 5 M0 35 V7 M-24.75 24.75 -5 5 M-35 0 H-7 M-24.75 -24.75 -5 -5"/>
              <circle r="34" stroke-width="5"/>
              <circle r="6" fill="#111111" stroke="none"/>
              <path d="M0 -35 -9 -49 H9 Z" fill="#111111" stroke="none"/>
            </g>
          ` : `
            <g transform="translate(638 ${cy}) scale(0.9)" fill="none" stroke="#111111" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="-30" y="-36" width="60" height="72" rx="8"/>
              <path d="M-20 -15 H20 M-20 0 H20 M-20 15 H20" stroke-dasharray="5 6"/>
              <path d="M-30 -24 H30 M-30 24 H30"/>
            </g>
          ` : `
            <g transform="translate(638 ${cy}) scale(0.9)" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M-29 -9 H29 V29 H-29 Z M-36 -23 H36 V-9 H-36 Z M0 -23 V29"/>
              <path d="M0 -23 C-27 -23 -31 -38 -20 -40 C-11 -42 -4 -32 0 -23 Z M0 -23 C27 -23 31 -38 20 -40 C11 -42 4 -32 0 -23 Z"/>
            </g>
          `}
          <text x="638" y="${cy + 96}" text-anchor="middle" fill="#111111" font-family="${SAFE_FONT}" font-size="20" font-weight="600" letter-spacing="3.2">${number} ${label}</text>
        `).join("")}
      </g>
    `;
  }

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

  if (template.footerVariant === "botanical-editorial") {
    const editorialAction = gameType === "wheel" ? "JOUEZ" : "GRATTEZ";
    const points = [190, 397, 604];
    const iconColor = template.accentDark;
    const scanIcon = (x: number) => `<g transform="translate(${x} 72) scale(.78)" fill="none" stroke="${iconColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="-22" y="-35" width="44" height="70" rx="7"/><path d="M-14-23h28M-14 22h28" stroke-width="3"/><circle cx="0" cy="28" r="2" fill="${iconColor}"/></g>`;
    const wheelIcon = (x: number) => `<g transform="translate(${x} 72) scale(.8)" fill="none" stroke="${iconColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><circle r="34"/><circle r="4" fill="${iconColor}" stroke="none"/><path d="M0-30v60M-30 0h60M-21-21l42 42M21-21l-42 42"/></g>`;
    const scratchIcon = (x: number) => `<g transform="translate(${x} 72) scale(.78)" fill="none" stroke="${iconColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M-25-31h42l9 9v52h-51z"/><path d="M17-31v10h9M-14-9h22M-14 3h22M-14 15h15"/><circle cx="15" cy="18" r="8" fill="#f5f1e2" stroke="${iconColor}"/></g>`;
    const gameIcon = (x: number) => gameType === "wheel" ? wheelIcon(x) : scratchIcon(x);
    // Lucide Gift icon geometry (24x24), reused verbatim in this static SVG renderer.
    const giftIcon = (x: number) => `<g transform="translate(${x} 72) scale(2.25) translate(-12 -12)" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></g>`;
    return `
      <g transform="translate(0 908)">
        <rect width="${A4_WIDTH}" height="${A4_HEIGHT - 908}" fill="#fbf9f1" fill-opacity=".84"/>
        <path d="M268 72h48" stroke="${template.accentDark}" stroke-width="2" marker-end="url(#posterArrow)"/>
        <path d="M475 72h48" stroke="${template.accentDark}" stroke-width="2" marker-end="url(#posterArrow)"/>
        ${points.map((x, index) => `<circle cx="${x}" cy="72" r="47" fill="#f5f1e2" fill-opacity=".94" stroke="${template.accent}" stroke-opacity=".72" stroke-width="2.5"/>${index === 0 ? scanIcon(x) : index === 1 ? gameIcon(x) : giftIcon(x)}<text x="${x}" y="155" text-anchor="middle" fill="${template.accentDark}" font-family="${SAFE_FONT}" font-size="22" font-weight="700" letter-spacing="2">${index === 0 ? "1. SCANNEZ" : index === 1 ? `2. ${editorialAction}` : "3. GAGNEZ"}</text>`).join("")}
      </g>
    `;
  }

  if (template.footerVariant === "botanical") {
    const botanicalAction = gameType === "wheel" ? "Jouez" : "Grattez";
    return `
      <g transform="translate(0 944)">
        <rect width="${A4_WIDTH}" height="${A4_HEIGHT - 944}" fill="#fbf8f2" opacity="0.74"/>
        <line x1="281" y1="43" x2="281" y2="133" stroke="${template.accent}" stroke-width="2"/>
        <line x1="513" y1="43" x2="513" y2="133" stroke="${template.accent}" stroke-width="2"/>
        <g transform="translate(33 6)">
          <circle cx="132" cy="48" r="35" fill="${template.accent}"/>
          <g transform="translate(132 48) scale(0.72) translate(-132 -48)">
            <path transform="translate(0 -7)" d="M116 29 h31 a6 6 0 0 1 6 6 v42 a6 6 0 0 1 -6 6 h-31 a6 6 0 0 1 -6 -6 v-42 a6 6 0 0 1 6 -6 Z M118 42 h27 M118 53 h20 M118 64 h23" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
          </g>
          <text x="132" y="124" text-anchor="middle" fill="${template.accentDark}" font-family="${SAFE_FONT}" font-size="28" font-weight="700">Scannez</text>
        </g>
        <g transform="translate(264 6)">
          <circle cx="132" cy="48" r="35" fill="${template.accent}"/>
          <circle cx="132" cy="48" r="21" fill="none" stroke="#ffffff" stroke-width="3.5"/>
          <path d="M132 27 v42 M111 48 h42 M116 32 l32 32 M148 32 l-32 32" stroke="#ffffff" stroke-width="2.6"/>
          <text x="132" y="124" text-anchor="middle" fill="${template.accentDark}" font-family="${SAFE_FONT}" font-size="28" font-weight="700">${botanicalAction}</text>
        </g>
        <g transform="translate(497 6)">
          <circle cx="132" cy="48" r="35" fill="${template.accent}"/>
          <g transform="translate(132 48) scale(1.6)">
            <rect x="-13" y="-5" width="26" height="19" rx="2" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M-15-5h30v7h-30z" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M0-5v19" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M0-5c-7 0-11-2-10-6 1-4 7-3 10 6Z" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M0-5c7 0 11-2 10-6-1-4-7-3-10 6Z" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <text x="132" y="124" text-anchor="middle" fill="${template.accentDark}" font-family="${SAFE_FONT}" font-size="28" font-weight="700">${gift}</text>
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
  posterSubtitleFontSource?: string;
  premiumBackdropSource?: string;
  measureHeadline?: (text: string, size: number) => number;
}) {
  const {
    campaign,
    poster,
    prizes,
    qrDataUrl,
    posterFontSource,
    posterSubtitleFontSource,
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
  const posterSubtitleFont = getPosterSubtitleFont(campaign.presentation.heading.fontFamily);
  const posterSubtitleFontAsset = getPosterFontAsset(posterSubtitleFont);
  const posterSubtitleFontFace = posterSubtitleFontAsset
    ? `
            @font-face {
              font-family: "${posterSubtitleFontAsset.familyName}";
              src: url("${posterSubtitleFontSource ?? `/fonts/poster/${posterSubtitleFontAsset.fileName}`}") format("truetype");
              font-weight: ${posterSubtitleFontAsset.fontWeight};
              font-style: normal;
            }`
    : "";
  const baseTemplate = getPosterTemplate(poster.templateId, poster.backgroundMotif);
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
    campaign.gameType === "wheel" && !template.backgroundOnly
      ? renderWheel(template, effectivePoster, prizes)
      : campaign.gameType === "scratch" && !template.backgroundOnly
        ? renderScratch(template, effectivePoster)
        : "";
  const subtitleLayout = getPosterSubtitleLayout(campaign, effectivePoster, template, measureHeadline);
  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="${A4_WIDTH}" height="${A4_HEIGHT}" viewBox="0 0 ${A4_WIDTH} ${A4_HEIGHT}">
      <defs>
        <style>
          <![CDATA[
            ${posterFontFace}
            ${posterSubtitleFontFace}
          ]]>
        </style>
        <filter id="posterShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#020617" flood-opacity="0.25"/>
        </filter>
        <marker id="posterArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10" fill="none" stroke="${template.accentDark}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </marker>
        <filter id="posterSoftShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="9" stdDeviation="12" flood-color="#6b425b" flood-opacity="0.14"/>
        </filter>
        <radialGradient id="posterIvoryBackdrop" cx="50%" cy="38%" r="85%">
          <stop offset="0%" stop-color="#fffefa"/>
          <stop offset="72%" stop-color="#fffdf8"/>
          <stop offset="100%" stop-color="#f8f4eb"/>
        </radialGradient>
        <linearGradient id="posterPastelBase" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffe3d4"/>
          <stop offset="49%" stop-color="#f5d0df"/>
          <stop offset="100%" stop-color="#e6d2f3"/>
        </linearGradient>
        <linearGradient id="posterPastelSweep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f6adc3"/>
          <stop offset="55%" stop-color="#f8c2c5"/>
          <stop offset="100%" stop-color="#ffdacc"/>
        </linearGradient>
        <linearGradient id="posterPastelLilac" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stop-color="#e3c7ed"/>
          <stop offset="100%" stop-color="#f4cbdc"/>
        </linearGradient>
        <linearGradient id="scratchMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#dbe2ee"/>
          <stop offset="48%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#aeb9ce"/>
        </linearGradient>
      </defs>

      ${renderBackground(effectivePoster, template, premiumBackdropSource)}
      ${renderLogo(campaign, effectivePoster, template)}
      ${renderHeadline(campaign, effectivePoster, template, measureHeadline, subtitleLayout)}
      ${renderPosterSubtitle(subtitleLayout)}
      ${renderSupportingText(template)}
      ${gameMarkup}
      ${renderQrAndCta(qrDataUrl, template)}
      ${renderSteps(template, campaign.gameType)}
    </svg>
  `;
}

/** Build a privacy-safe selector preview with the same renderer as the printable poster. */
export function buildClassicPosterThumbnailSvg(gameType: Campaign["gameType"], backgroundMotif: CampaignPosterSettings["backgroundMotif"]) {
  const template = getPosterTemplate("classic-wheel", backgroundMotif);
  const poster: CampaignPosterSettings = {
    templateId: "classic-wheel",
    backgroundMotif,
    logoMode: "text",
    logoText: "Votre établissement",
    logoSizePercent: 70,
    logoBottomMarginPx: 10,
    posterSubtitleEnabled: true,
    backgroundMode: "color",
    backgroundColor: template.background,
    backgroundImageUrl: "",
    headline: "Scannez, jouez, récupérez votre cadeau !",
    headlineTextColor: template.headlineTextColor,
    headlineFontSizePx: template.headlineFontSizePx,
    headlineFontFamily: template.headlineFontFamily ?? "geogrotesque",
    wheel: { ...template.wheel },
    footerBackgroundColor: "transparent",
  };
  const campaign: Campaign = {
    id: "poster-template-thumbnail",
    merchantId: "poster-template-thumbnail",
    title: "Aperçu du template",
    subtitle: "Scannez, jouez, récupérez votre cadeau !",
    goalType: null,
    emailCaptureEnabled: false,
    ctaLabel: "Scannez pour jouer",
    successMetric: "",
    isActive: false,
    createdAt: "",
    accent: { ink: template.accentDark, paper: template.background, signal: template.accent },
    gameType,
    logoMode: "text",
    logoText: "Votre établissement",
    presentation: {
      logo: { sizePercent: 70, marginBottomPx: 10, align: "center", textColor: template.headlineTextColor },
      background: { mode: "color", color: template.background },
      heading: { textColor: template.headlineTextColor, fontSizePx: template.headlineFontSizePx, fontFamily: "geogrotesque", fontWeight: 700, align: "center" },
      button: { backgroundColor: template.accent, textColor: "#ffffff", borderColor: "#ffffff", size: "md", textSizePx: 16, isBold: true },
      layout: { blockSpacingPx: 20, templateId: "classic", wheelSubtitle: "Des cadeaux à gagner dans votre établissement.", subtitleSpacingPx: 15 },
      wheel: { ...template.wheel },
      poster,
      email: { senderName: "Votre établissement", replyTo: "", subject: "", preheader: "", headline: "", body: "", buttonLabel: "", footerNote: "", accentColor: template.accent },
    },
    actions: [],
    rewardRules: { rewardExpiryMinutes: 0, purchaseRequired: false, availableAfterHours: 0, availabilityDurationDays: 30, participationIntervalDays: 0, isWinningEveryTime: false },
  };
  const prizes: Array<Pick<Prize, "label">> = [
    { label: "-10 % prochaine visite" },
    { label: "Soin découverte" },
    { label: "Cadeau surprise" },
  ];

  return buildPosterSvg({ campaign, poster, prizes, qrDataUrl: createPosterPreviewQrDataUrl() });
}

