"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ImmersiveScratchTicket } from "@/components/public/immersive-scratch-ticket";
import { fluidType } from "@/lib/responsive";
import { textFontClass } from "@/lib/format";
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
  return textFontClass(form.presentation.heading.fontFamily);
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
    return `radial-gradient(circle at 50% 108%, ${withHexAlpha(form.accent.signal, "58")} 0 27%, transparent 48%), radial-gradient(circle at 15% 10%, ${withHexAlpha(form.presentation.wheel.winColor, "4d")} 0 12%, transparent 22%), linear-gradient(155deg, #071126b8 0%, #111b3b99 56%, #071126b8 100%)`;
  }
  if (templateId === "scratch-confetti") {
    const templatePrimary = scratchTemplatePrimaryColor(form.accent.signal, templateId);
    return `radial-gradient(circle at 12% 9%, ${withHexAlpha(templatePrimary, "52")} 0 10%, transparent 11%), radial-gradient(circle at 94% 12%, ${withHexAlpha(form.presentation.wheel.winColor, "30")} 0 12%, transparent 13%), linear-gradient(180deg, #f59e0b99 0%, #f9731680 58%, #ea580c99 100%)`;
  }
  if (templateId === "sunburst-festival") {
    return `radial-gradient(circle at 12% 10%, ${withHexAlpha(form.presentation.wheel.loseColor, "33")} 0 12%, transparent 13%), radial-gradient(circle at 94% 18%, ${withHexAlpha(form.presentation.wheel.winColor, "38")} 0 14%, transparent 15%), linear-gradient(180deg, #fffdf5 0%, #fff8e8 56%, #fff2ce 100%)`;
  }
  if (templateId === "scratch-coral") {
    return `radial-gradient(circle at 50% 0%, ${withHexAlpha(form.accent.signal, "24")} 0 18%, transparent 42%), linear-gradient(180deg, #fffaf580 0%, #ffffff66 72%, #fff3e880 100%)`;
  }
  if (templateId === "scratch-lilac") {
    const templatePrimary = scratchTemplatePrimaryColor(form.accent.signal, templateId);
    return `radial-gradient(circle at 50% 0%, ${withHexAlpha(templatePrimary, "2c")} 0 20%, transparent 44%), linear-gradient(180deg, #fffaff80 0%, #f7edff80 100%)`;
  }
  if (templateId === "scratch-sunburst") {
    return `repeating-conic-gradient(from -18deg at 50% -2%, ${withHexAlpha(form.accent.signal, "52")} 0deg 12deg, transparent 12deg 24deg), linear-gradient(180deg, #fff4bf99 0%, #ffdc5880 68%, #fff0c599 100%)`;
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
    // The public game uses the logo margin directly. Keep the wizard preview
    // on that same spacing scale for wheel and scratch experiences.
    logoBottomSpacingPx: form.presentation.logo.marginBottomPx,
    logoWidthPx: Math.round(Math.max(56, Math.min(720, logoSizePercent * 3))),
    logoTextSizePx: campaignLogoTextSizePx(logoSizePercent, form.gameType),
    logoUrl: form.logoUrl ?? "",
    logoText: form.logoText?.trim() || merchant.companyName,
    headingAlignmentClass,
    headingFontClass: headingFontClassFor(form),
    headingTextColor: templateId === "cosmic-orbit" ? "#f8fbff" : form.gameType === "scratch" && form.presentation.heading.textColor.toLowerCase() === "#1f2937" ? previewAccent.ink : form.presentation.heading.textColor,
    headingFontSizePx: form.presentation.heading.fontSizePx,
    headingFontWeight: form.presentation.heading.fontWeight ?? 600,
    subtitle: limitCampaignSubtitleLines(form.subtitle),
    blockSpacingPx: form.presentation.layout.blockSpacingPx,
    gamePageTemplateId: templateId,
    gameType: form.gameType,
    accent: previewAccent,
    wheelStyle: form.presentation.wheel,
    buttonStyle: {
      backgroundColor: form.gameType === "wheel" ? form.presentation.wheel.loseColor : form.presentation.button.backgroundColor,
      textColor: form.presentation.button.textColor,
      borderColor: form.gameType === "wheel" ? form.presentation.wheel.rimColor : form.presentation.button.borderColor,
      textSizePx: form.presentation.button.textSizePx,
      isBold: form.presentation.button.isBold ?? true,
    },
    previewSegments,
    winningSegmentId,
    previewPrize: form.prizes[0]?.label || "Cadeau surprise",
    ctaLabel: form.ctaLabel,
    previewCtaClass: buttonSizeMap[form.presentation.button.size],
  };
}

export const CampaignLivePreview = memo(function CampaignLivePreview({
  merchant,
  preview,
  compact = false,
  flushTop = false,
}: { merchant: Merchant; preview: CampaignEditorPreviewModel; compact?: boolean; flushTop?: boolean }) {
  const isRestaurantPopTemplate = preview.gamePageTemplateId === "restaurant-pop";
  const isCosmicTemplate = preview.gamePageTemplateId === "cosmic-orbit";
  const isImmersiveTemplate = isCosmicTemplate || preview.gamePageTemplateId === "sunburst-festival";
  const isImmersiveScratchTemplate = ["scratch-vault", "scratch-confetti", "scratch-coral", "scratch-lilac", "scratch-sunburst"].includes(preview.gamePageTemplateId);
  const showStandardHeader = !isImmersiveScratchTemplate;
  // The compact preview has 254px of usable content width inside its phone
  // frame. A .74 ratio mirrors a 375px mobile viewport while container query
  // units keep typography independent from the merchant desktop viewport.
  const previewScale = compact ? 0.74 : 1;
  const scalePreviewValue = (value: number) => Math.round(value * previewScale);
  const previewHeadingTextColor = isCosmicTemplate || (preview.gamePageTemplateId === "scratch-vault" && preview.headingTextColor.toLowerCase() === "#1f2937") ? "#f8fbff" : preview.headingTextColor;
  const restaurantPopHeadingLines = buildRestaurantPopHeadingLines(preview.subtitle);
  const previewFrameClass = compact ? "h-full min-h-0 max-w-none rounded-[30px] px-3 pb-5 pt-7" : "min-h-[600px] max-w-[450px] rounded-[38px] px-4 pb-6 pt-8";
  const previewWrapperClass = compact ? "h-full" : flushTop ? "" : "mt-6";

  return (
    <div className={previewWrapperClass}>
      <div className={`mx-auto w-full overflow-hidden border border-[#ced7e6] shadow-[0_30px_70px_rgba(18,24,39,0.18)] ${previewFrameClass}`} style={{ ...preview.backgroundStyle, ...(compact ? { containerType: "inline-size" } : {}) }}>
        {showStandardHeader ? (
          <>
            {preview.logoMode === "image" && preview.logoUrl ? <div className={`flex ${preview.logoAlignmentClass}`}><div style={{ marginBottom: `${scalePreviewValue(preview.logoBottomSpacingPx)}px` }}><BrandMark logoText={merchant.logoText} logoUrl={preview.logoUrl} size="lg" variant="transparent" imageWidthPx={scalePreviewValue(preview.logoWidthPx)} /></div></div> : null}
            {preview.logoMode === "text" ? <div className={`flex ${preview.logoAlignmentClass}`}><div style={{ marginBottom: `${scalePreviewValue(preview.logoBottomSpacingPx)}px` }}><BrandMark logoText={preview.logoText} size="lg" variant="transparent" imageWidthPx={scalePreviewValue(preview.logoWidthPx)} textSizePx={scalePreviewValue(preview.logoTextSizePx)} textColor={previewHeadingTextColor} textClassName="text-2xl" /></div></div> : null}
            {preview.gameType === "scratch" && preview.logoMode === "none" ? <div className={`flex ${preview.logoAlignmentClass}`}><div style={{ marginBottom: `${scalePreviewValue(preview.logoBottomSpacingPx)}px` }}><BrandMark logoText={preview.logoText || merchant.companyName} size="lg" variant="transparent" imageWidthPx={scalePreviewValue(preview.logoWidthPx)} textSizePx={scalePreviewValue(preview.logoTextSizePx)} textColor={previewHeadingTextColor} textClassName="text-2xl" /></div></div> : null}
            {preview.logoMode === "none" || (preview.logoMode === "image" && !preview.logoUrl) ? <div aria-hidden="true" className="h-5" /> : null}
            <div className={preview.headingAlignmentClass}><h3 className={`${preview.headingFontClass} line-clamp-3 whitespace-pre-line ${isRestaurantPopTemplate ? "tracking-[0.038em] drop-shadow-[0_4px_0_rgba(0,0,0,0.08)]" : ""} pb-[25px] leading-[1]`} style={{ color: previewHeadingTextColor, fontSize: fluidType(scalePreviewValue(preview.headingFontSizePx), { minRatio: 0.82, maxRatio: 1.08, viewportStep: 0.3, viewportUnit: compact ? "cqw" : "vw" }), fontWeight: preview.headingFontWeight }}>{isRestaurantPopTemplate ? restaurantPopHeadingLines.map((line, lineIndex) => <span key={`preview-heading-line-${lineIndex}`} className="block">{line.map((part, partIndex) => <span key={`preview-heading-line-${lineIndex}-${partIndex}`} style={{ color: part.secondary ? preview.wheelStyle.winColor : previewHeadingTextColor }}>{part.text}</span>)}</span>) : preview.subtitle.trim() || (preview.gameType === "scratch" ? DEFAULT_SCRATCH_SUBTITLE : "Découvrez votre animation")}</h3></div>
          </>
        ) : null}
        <div className={preview.gameType === "wheel" ? compact ? "-mx-3" : "-mx-4" : undefined} style={{ marginTop: `${isImmersiveScratchTemplate ? 0 : compact ? Math.min(scalePreviewValue(preview.blockSpacingPx), 24) : scalePreviewValue(preview.blockSpacingPx)}px`, height: preview.gameType === "wheel" ? compact ? "330px" : "470px" : undefined, marginBottom: preview.gameType === "wheel" ? compact ? "-12px" : "-24px" : undefined }}>
         {preview.gameType === "wheel" ? isImmersiveTemplate ? <ImmersiveWheel accent={preview.accent} wheelStyle={preview.wheelStyle} template={preview.gamePageTemplateId as "cosmic-orbit" | "sunburst-festival"} buttonStyle={{ backgroundColor: preview.buttonStyle.backgroundColor, textColor: preview.buttonStyle.textColor, borderColor: preview.buttonStyle.borderColor }} segments={preview.previewSegments} buttonEnabled winningSegmentId={preview.winningSegmentId} framing={compact ? "mobile-preview" : "editor"} /> : <WheelOfFortune accent={preview.accent} wheelStyle={preview.wheelStyle} pageTemplate={preview.gamePageTemplateId === "restaurant-pop" ? "restaurant-pop" : "classic"} buttonStyle={{ backgroundColor: preview.buttonStyle.backgroundColor, textColor: preview.buttonStyle.textColor, borderColor: preview.buttonStyle.borderColor }} segments={preview.previewSegments} buttonEnabled winningSegmentId={preview.winningSegmentId} framing={compact ? "mobile-preview" : "editor"} /> : isImmersiveScratchTemplate ? <ImmersiveScratchTicket accent={preview.accent} resultLabel={preview.previewPrize} enabled={false} onReveal={() => undefined} logoMode={preview.logoMode} logoText={preview.logoText} logoUrl={preview.logoUrl} headline={preview.subtitle} headingTextColor={previewHeadingTextColor} headingFontClass={preview.headingFontClass} headingFontSize={fluidType(scalePreviewValue(preview.headingFontSizePx), { minRatio: 0.82, maxRatio: 1.08, viewportStep: 0.3, viewportUnit: compact ? "cqw" : "vw" })} headingFontWeight={preview.headingFontWeight} headingAlignmentClass={preview.headingAlignmentClass} logoAlignmentClass={preview.logoAlignmentClass} logoBottomSpacingPx={scalePreviewValue(preview.logoBottomSpacingPx)} logoWidthPx={scalePreviewValue(preview.logoWidthPx)} logoTextSizePx={scalePreviewValue(preview.logoTextSizePx)} fitContainer template={preview.gamePageTemplateId as "scratch-vault" | "scratch-confetti" | "scratch-coral" | "scratch-lilac" | "scratch-sunburst"} /> : <ScratchGame accent={preview.accent} resultLabel={preview.previewPrize} enabled={false} onReveal={() => undefined} />}
        </div>
        {preview.gameType !== "wheel" && !isImmersiveScratchTemplate ? <button type="button" className={`mx-auto block w-full max-w-[360px] rounded-[24px] border font-semibold ${preview.previewCtaClass}`} style={{ marginTop: `${scalePreviewValue(preview.blockSpacingPx)}px`, backgroundColor: preview.buttonStyle.backgroundColor, color: preview.buttonStyle.textColor, borderColor: preview.buttonStyle.borderColor, fontSize: fluidType(scalePreviewValue(preview.buttonStyle.textSizePx), { minRatio: 0.86, maxRatio: 1.08, viewportStep: 0.24, viewportUnit: compact ? "cqw" : "vw" }), fontWeight: preview.buttonStyle.isBold ? 700 : 400 }}>{preview.ctaLabel}</button> : null}
      </div>
    </div>
  );
});
