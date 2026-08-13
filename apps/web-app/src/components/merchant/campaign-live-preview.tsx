"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ImmersiveScratchTicket } from "@/components/public/immersive-scratch-ticket";
import { fluidType } from "@/lib/responsive";
import {
  campaignLogoTextSizePx,
  clampCampaignLogoSizePercent,
  DEFAULT_SCRATCH_SUBTITLE,
  limitCampaignSubtitleLines,
  resolveScratchAccent,
  scratchTemplatePrimaryColor,
} from "@/lib/campaign-defaults";
import { buildWheelVisualSegments, WheelVisualSegment } from "@/lib/wheel-segments";
import {
  CampaignSetupInput,
  GamePageTemplateId,
  GameType,
  Merchant,
} from "@/lib/types";

const WheelOfFortune = dynamic(
  () => import("@/components/public/wheel-of-fortune").then((mod) => mod.WheelOfFortune),
  { ssr: false },
);
const ImmersiveWheel = dynamic(
  () => import("@/components/public/immersive-wheel").then((mod) => mod.ImmersiveWheel),
  { ssr: false },
);
const ScratchGame = dynamic(
  () => import("@/components/public/scratch-game").then((mod) => mod.ScratchGame),
  { ssr: false },
);

type PreviewSegment = WheelVisualSegment;

export type CampaignEditorPreviewModel = {
  formId: string;
  backgroundStyle: {
    backgroundColor: string;
    backgroundImage: string;
    backgroundPosition: string;
    backgroundSize: string;
  };
  logoMode: CampaignSetupInput["logoMode"];
  logoAlignmentClass: string;
  logoBottomSpacingPx: number;
  logoWidthPx: number;
  logoTextSizePx: number;
  logoUrl: string;
  logoText: string;
  headingAlignmentClass: string;
  headingFontClass: string;
  headingTextColor: string;
  headingFontSizePx: number;
  headingFontWeight: number;
  subtitle: string;
  blockSpacingPx: number;
  gamePageTemplateId: GamePageTemplateId;
  gameType: GameType;
  accent: CampaignSetupInput["accent"];
  wheelStyle: CampaignSetupInput["presentation"]["wheel"];
  buttonStyle: {
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    textSizePx: number;
    isBold: boolean;
  };
  previewSegments: PreviewSegment[];
  winningSegmentId: string;
  previewPrize: string;
  ctaLabel: string;
  previewCtaClass: string;
};

const buttonSizeMap = {
  sm: "px-4 py-3 text-sm",
  md: "px-5 py-4 text-base",
  lg: "px-6 py-5 text-lg",
} as const;

function withHexAlpha(color: string | undefined, alpha: string) {
  const normalized = color?.trim();
  if (!normalized) return `#5b27d9${alpha}`;
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return `${normalized}${alpha}`;
  return normalized;
}

function getRestaurantPopTextLines(text: string) {
  const rawLines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lines = rawLines.reduce<string[]>((normalizedLines, line) => {
    if (/^[!?.,;:]+$/.test(line) && normalizedLines.length > 0) {
      const previousLineIndex = normalizedLines.length - 1;
      normalizedLines[previousLineIndex] = `${normalizedLines[previousLineIndex]}\u00a0${line}`;
      return normalizedLines;
    }
    normalizedLines.push(line);
    return normalizedLines;
  }, []);
  if (lines.length !== 1) return lines;
  const words = lines[0].split(/\s+/).filter(Boolean);
  if (words.length < 3) return lines;
  const joinIndex = words.findIndex((word) => /^(pour|et|puis|avec)$/i.test(word));
  if (joinIndex > 0 && joinIndex < words.length - 1) {
    const secondLine = words.slice(joinIndex).join(" ").replace(/\s+([!?.,;:])/g, "\u00a0$1");
    return [words.slice(0, joinIndex).join(" "), secondLine];
  }
  const lastWord = words.at(-1)?.replace(/\s+([!?.,;:])/g, "\u00a0$1") ?? "";
  return [words.slice(0, -1).join(" "), lastWord];
}

function buildRestaurantPopHeadingLines(text: string) {
  return getRestaurantPopTextLines(text).map((line, lineIndex) =>
    line.split(/(\s+)/).map((part) => ({ text: part, secondary: lineIndex === 1 })),
  );
}

function buildPreviewSegments(prizes: CampaignSetupInput["prizes"]): PreviewSegment[] {
  return buildWheelVisualSegments(
    prizes.map((prize, index) => ({
      id: prize.id || `preview-win-${index}`,
      label: prize.label,
      probability: prize.probability,
    })),
  );
}

function headingFontClassFor(form: CampaignSetupInput) {
  return form.presentation.heading.fontFamily === "anton"
    ? "font-anton"
    : form.presentation.heading.fontFamily === "serif" || form.presentation.heading.fontFamily === "cormorant"
      ? form.presentation.heading.fontFamily === "cormorant" ? "font-cormorant" : "font-serif"
      : form.presentation.heading.fontFamily === "fredoka"
        ? "font-fredoka"
        : form.presentation.heading.fontFamily === "inter" || form.presentation.heading.fontFamily === "sans"
          ? "font-inter"
          : form.presentation.heading.fontFamily === "bebas" ? "font-bebas" : "font-display";
}

function previewBackgroundImage(form: CampaignSetupInput, templateId: GamePageTemplateId) {
  if (form.presentation.background.mode === "image" && form.presentation.background.imageUrl) {
    return `linear-gradient(rgba(15,23,40,0.32), rgba(15,23,40,0.52)), url("${form.presentation.background.imageUrl}")`;
  }
  if (templateId === "restaurant-pop") {
    return `radial-gradient(circle at -10% -8%, ${withHexAlpha(form.presentation.wheel.loseColor, "f2")} 0 18%, transparent 19%), radial-gradient(circle at 110% 0%, ${withHexAlpha(form.presentation.wheel.winColor, "f2")} 0 13%, transparent 14%), linear-gradient(180deg, #fff2dd 0%, #fffaf1 48%, #fff4e5 100%)`;
  }
  if (templateId === "cosmic-orbit") {
    return `radial-gradient(circle at 50% 112%, ${withHexAlpha(form.presentation.wheel.loseColor, "52")} 0 24%, transparent 43%), radial-gradient(circle at 9% 12%, ${withHexAlpha(form.presentation.wheel.winColor, "2b")} 0 14%, transparent 25%), linear-gradient(155deg, #07142e 0%, #0b1d42 55%, #071126 100%)`;
  }
  if (templateId === "scratch-vault") {
    return `radial-gradient(circle at 50% 108%, ${withHexAlpha(form.accent.signal, "58")} 0 27%, transparent 48%), radial-gradient(circle at 15% 10%, ${withHexAlpha(form.presentation.wheel.winColor, "4d")} 0 12%, transparent 22%), linear-gradient(155deg, #071126 0%, #111b3b 56%, #071126 100%)`;
  }
  if (templateId === "scratch-confetti") {
    const templatePrimary = scratchTemplatePrimaryColor(form.accent.signal, templateId);
    return `radial-gradient(circle at 12% 9%, ${withHexAlpha(templatePrimary, "52")} 0 10%, transparent 11%), radial-gradient(circle at 94% 12%, ${withHexAlpha(form.presentation.wheel.winColor, "30")} 0 12%, transparent 13%), linear-gradient(180deg, #f59e0b 0%, #f97316 58%, #ea580c 100%)`;
  }
  if (templateId === "sunburst-festival") {
    return `radial-gradient(circle at 12% 10%, ${withHexAlpha(form.presentation.wheel.loseColor, "33")} 0 12%, transparent 13%), radial-gradient(circle at 94% 18%, ${withHexAlpha(form.presentation.wheel.winColor, "38")} 0 14%, transparent 15%), linear-gradient(180deg, #fffdf5 0%, #fff8e8 56%, #fff2ce 100%)`;
  }
  if (templateId === "scratch-coral") {
    return `radial-gradient(circle at 50% 0%, ${withHexAlpha(form.accent.signal, "24")} 0 18%, transparent 42%), linear-gradient(180deg, #fffaf5 0%, #ffffff 72%, #fff3e8 100%)`;
  }
  if (templateId === "scratch-lilac") {
    const templatePrimary = scratchTemplatePrimaryColor(form.accent.signal, templateId);
    return `radial-gradient(circle at 50% 0%, ${withHexAlpha(templatePrimary, "2c")} 0 20%, transparent 44%), linear-gradient(180deg, #fffaff 0%, #f7edff 100%)`;
  }
  if (templateId === "scratch-sunburst") {
    return `repeating-conic-gradient(from -18deg at 50% -2%, ${withHexAlpha(form.accent.signal, "52")} 0deg 12deg, transparent 12deg 24deg), linear-gradient(180deg, #fff4bf 0%, #ffdc58 68%, #fff0c5 100%)`;
  }
  return "";
}

export function buildCampaignLivePreviewModel(form: CampaignSetupInput, merchant: Merchant): CampaignEditorPreviewModel {
  const templateId = form.presentation.layout.templateId ?? "classic";
  const previewAccent = form.gameType === "scratch" ? resolveScratchAccent(form.accent, templateId) : form.accent;
  const previewSegments = buildPreviewSegments(form.prizes);
  const winningSegmentId = previewSegments.find((segment) => segment.tone === "win")?.id ?? previewSegments[0]?.id ?? "win";
  const logoSizePercent = clampCampaignLogoSizePercent(form.presentation.logo.sizePercent);
  const logoAlignmentClass = form.presentation.logo.align === "left" ? "justify-start" : form.presentation.logo.align === "right" ? "justify-end" : "justify-center";
  const headingAlignmentClass = form.presentation.heading.align === "left" ? "text-left" : form.presentation.heading.align === "right" ? "text-right" : "text-center";
  return {
    formId: form.id ?? "new-campaign",
    backgroundStyle: {
      backgroundColor: form.presentation.background.color,
      backgroundImage: previewBackgroundImage(form, templateId),
      backgroundPosition: "center",
      backgroundSize: "cover",
    },
    logoMode: form.logoMode,
    logoAlignmentClass,
    logoBottomSpacingPx: form.presentation.logo.marginBottomPx + form.presentation.layout.blockSpacingPx,
    logoWidthPx: Math.round(Math.max(56, Math.min(720, logoSizePercent * 3))),
    logoTextSizePx: campaignLogoTextSizePx(logoSizePercent, form.gameType),
    logoUrl: form.logoUrl ?? "",
    logoText: form.logoText?.trim() || merchant.companyName,
    headingAlignmentClass,
    headingFontClass: headingFontClassFor(form),
    headingTextColor: templateId === "cosmic-orbit" ? "#f8fbff" : form.gameType === "scratch" && form.presentation.heading.textColor.toLowerCase() === "#1f2937" ? previewAccent.ink : form.presentation.heading.textColor,
    headingFontSizePx: form.presentation.headin