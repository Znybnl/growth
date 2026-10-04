"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { memo } from "react";

import { BrandMark } from "@/components/brand-mark";
import { HalloweenCampaignPreview } from "./halloween-campaign-preview";
import { BeautyWheelDecorations } from "@/components/public/beauty-wheel-decorations";
import { beautyWheelBackground, isBeautyWheelTemplate } from "@/lib/beauty-wheel-themes";
import { beautyScratchTemplate, isImmersiveScratchTemplate as isImmersiveScratchPageTemplate, type ImmersiveScratchTemplateId } from "@/lib/beauty-scratch-templates";
import { RosePowderDecor } from "@/components/public/rose-powder-decor";
import { CocoricoPromoText } from "@/components/public/cocorico-promo-text";
import { ImmersiveScratchTicket } from "@/components/public/immersive-scratch-ticket";
import { fluidType } from "@/lib/responsive";
import { userBackgroundImageStyle } from "@/lib/campaign-background";
import { textFontClass, textFontFamily, wheelSubtitleFontFamily } from "@/lib/format";
import {
  campaignLogoTextSizePx,
  campaignWheelBlockSpacingPx,
  clampCampaignLogoSizePercent,
  clampCampaignSpacingPx,
  defaultWheelSubtitleSpacingForTemplate,
  DEFAULT_GAME_PAGE_TEMPLATE_ID,
  DEFAULT_SCRATCH_SUBTITLE,
  MAX_BEAUTY_WHEEL_TITLE_LINES,
  limitCampaignSubtitleLines,
  resolveScratchAccent,
  resolveCocoricoPrimaryColor,
  isCocoricoWheelTemplate,
  resolveCocoricoBackgroundColor,
  restaurantPopBackground,
  classicWheelBackground,
  roseInstitutWheelBackground,
  deriveLighterHex,
  scratchTemplatePrimaryColor,
  scratchTemplateDefaultBackground,
  resolveScratchTemplateTextColor,
  resolvePromoStrokeColor,
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
const CocoricoWheel = dynamic(
  () => import("@/components/public/cocorico-wheel").then((mod) => mod.CocoricoWheel),
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
    fontFamily: string;
  };
  hasCustomBackgroundImage: boolean;
  logoMode: CampaignSetupInput["logoMode"];
  logoAlignmentClass: string;
  logoBottomSpacingPx: number;
  logoWidthPx: number;
  logoTextSizePx: number;
  logoUrl: string;
  logoText: string;
  logoTextColor: string;
  headingAlignmentClass: string;
  headingFontClass: string;
  headingFontFamily: CampaignSetupInput["presentation"]["heading"]["fontFamily"];
  headingTextColor: string;
  headingFontSizePx: number;
  headingFontWeight: number;
  subtitle: string;
  scratchSubtitle: string;
  wheelSubtitle: string;
  blockSpacingPx: number;
  subtitleSpacingPx: number;
  gamePageTemplateId: GamePageTemplateId;
  gameType: GameType;
  accent: CampaignSetupInput["accent"];
  wheelStyle: CampaignSetupInput["presentation"]["wheel"];
  wheelPrimaryColor: string;
  cocoricoPrimaryColor: string;
  cocoricoSecondaryColor: string;
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

function previewBackgroundImage(
  form: CampaignSetupInput,
  templateId: GamePageTemplateId,
  accent: CampaignSetupInput["accent"],
) {
  if (form.presentation.background.mode === "image" && form.presentation.background.imageUrl) {
    return userBackgroundImageStyle(form.presentation.background.imageUrl);
  }
  const templateBackground = scratchTemplateDefaultBackground(templateId, form.presentation.background);
  if (templateBackground) return `url("${templateBackground}")`;
  const beautyTheme = beautyScratchTemplate(templateId);
  if (beautyTheme) return `url("${beautyTheme.background}")`;
  if (templateId === "restaurant-pop") {
    return restaurantPopBackground(form.presentation.background.color, form.presentation.wheel.loseColor);
  }
  if (templateId === "classic") {
    return classicWheelBackground(form.presentation.wheel.loseColor);
  }
  if (templateId === "rose-institut") {
    return roseInstitutWheelBackground(form.presentation.background.color);
  }
  if (isBeautyWheelTemplate(templateId)) {
    return beautyWheelBackground(templateId, form.presentation.background.color, form.presentation.wheel.loseColor);
  }
  if (isCocoricoWheelTemplate(templateId)) {
    const backgroundColor = resolveCocoricoBackgroundColor(form.presentation.background.color);
    return `radial-gradient(circle at 14% 12%, ${withHexAlpha(deriveLighterHex(backgroundColor, 0.32), "e6")} 0 10%, transparent 11%), radial-gradient(circle at 88% 26%, ${withHexAlpha(deriveLighterHex(backgroundColor, 0.12), "b3")} 0 15%, transparent 16%), linear-gradient(160deg, ${backgroundColor} 0%, ${backgroundColor} 48%, #063d78 100%)`;
  }
  if (templateId === "cosmic-orbit") {
    return `radial-gradient(circle at 50% 112%, ${withHexAlpha(form.presentation.wheel.loseColor, "52")} 0 24%, transparent 43%), radial-gradient(circle at 9% 12%, ${withHexAlpha(form.presentation.wheel.winColor, "2b")} 0 14%, transparent 25%), linear-gradient(155deg, #07142e 0%, #0b1d42 55%, #071126 100%)`;
  }
  if (templateId === "scratch-vault") {
    return `radial-gradient(circle at 50% 108%, ${withHexAlpha(accent.signal, "58")} 0 27%, transparent 48%), radial-gradient(circle at 15% 10%, ${withHexAlpha(form.presentation.wheel.winColor, "4d")} 0 12%, transparent 22%), linear-gradient(155deg, #071126b8 0%, #111b3b99 56%, #071126b8 100%)`;
  }
  if (templateId === "scratch-confetti") {
    const templatePrimary = scratchTemplatePrimaryColor(form.accent.signal, templateId);
    return `radial-gradient(circle at 12% 9%, ${withHexAlpha(templatePrimary, "52")} 0 10%, transparent 11%), radial-gradient(circle at 94% 12%, ${withHexAlpha(form.presentation.wheel.winColor, "30")} 0 12%, transparent 13%), linear-gradient(180deg, #f59e0b99 0%, #f9731680 58%, #ea580c99 100%)`;
  }
  if (templateId === "sunburst-festival") {
    return `radial-gradient(circle at 12% 10%, ${withHexAlpha(form.presentation.wheel.loseColor, "33")} 0 12%, transparent 13%), radial-gradient(circle at 94% 18%, ${withHexAlpha(form.presentation.wheel.winColor, "38")} 0 14%, transparent 15%), linear-gradient(180deg, #fffdf5 0%, #fff8e8 56%, #fff2ce 100%)`;
  }
  if (templateId === "scratch-coral") {
    return `radial-gradient(ellipse at 50% 112%, ${withHexAlpha(accent.signal, "36")} 0 8%, transparent 56%), radial-gradient(circle at 50% 0%, ${withHexAlpha(accent.signal, "24")} 0 18%, transparent 42%), linear-gradient(180deg, #fffaf580 0%, #ffffff66 72%, #fff3e880 100%)`;
  }
  if (templateId === "scratch-lilac") {
    const templatePrimary = scratchTemplatePrimaryColor(form.accent.signal, templateId);
    return `radial-gradient(circle at 50% 0%, ${withHexAlpha(templatePrimary, "2c")} 0 20%, transparent 44%), linear-gradient(180deg, #fffaff80 0%, #f7edff80 100%)`;
  }
  if (templateId === "scratch-sunburst") {
    return `repeating-conic-gradient(from -18deg at 50% -2%, ${withHexAlpha(accent.signal, "52")} 0deg 12deg, transparent 12deg 24deg), linear-gradient(180deg, #fff4bf99 0%, #ffdc5880 68%, #fff0c599 100%)`;
  }
  return "";
}

export function buildCampaignLivePreviewModel(form: CampaignSetupInput, merchant: Merchant): CampaignEditorPreviewModel {
  const templateId = form.presentation.layout.templateId ?? DEFAULT_GAME_PAGE_TEMPLATE_ID;
  const previewAccent = form.gameType === "scratch" ? resolveScratchAccent(form.accent, templateId) : form.accent;
  const previewSegments = buildPreviewSegments(form.prizes);
  const previewWinningSegment = previewSegments.find((segment) => segment.tone === "win") ?? previewSegments[0];
  const winningSegmentId = previewWinningSegment?.id ?? "win";
  const logoSizePercent = clampCampaignLogoSizePercent(form.presentation.logo.sizePercent);
  const logoAlignmentClass = form.presentation.logo.align === "left" ? "justify-start" : form.presentation.logo.align === "right" ? "justify-end" : "justify-center";
  const headingAlignmentClass = form.presentation.heading.align === "left" ? "text-left" : form.presentation.heading.align === "right" ? "text-right" : "text-center";
  return {
    formId: form.id ?? "new-campaign",
    backgroundStyle: {
      backgroundColor: form.presentation.background.color,
      backgroundImage: previewBackgroundImage(form, templateId, previewAccent),
      backgroundPosition: "center",
      backgroundSize: "cover",
      fontFamily: textFontFamily(form.presentation.heading.fontFamily),
    },
    hasCustomBackgroundImage: form.presentation.background.mode === "image" && Boolean(form.presentation.background.imageUrl),
    logoMode: form.logoMode,
    logoAlignmentClass,
    // The public game uses the logo margin directly. Keep the wizard preview
    // on that same spacing scale for wheel and scratch experiences.
    logoBottomSpacingPx: clampCampaignSpacingPx(form.presentation.logo.marginBottomPx),
    logoWidthPx: Math.round(Math.max(56, Math.min(720, logoSizePercent * 3))),
    logoTextSizePx: Math.round(campaignLogoTextSizePx(logoSizePercent, form.gameType) * (isBeautyWheelTemplate(templateId) || templateId === "rose-institut" ? 0.9 : 1)),
    logoUrl: form.logoUrl ?? "",
    logoText: form.logoText?.trim() || merchant.companyName,
    logoTextColor: form.gameType === "scratch"
      ? resolveScratchTemplateTextColor(form.presentation.logo.textColor ?? form.presentation.heading.textColor, templateId)
      : form.presentation.logo.textColor ?? form.presentation.heading.textColor,
    headingAlignmentClass,
    headingFontClass: headingFontClassFor(form),
    headingFontFamily: form.presentation.heading.fontFamily,
    headingTextColor: templateId === "cosmic-orbit" ? "#f8fbff" : isCocoricoWheelTemplate(templateId) ? "#ffffff" : form.gameType === "scratch" ? resolveScratchTemplateTextColor(form.presentation.heading.textColor.toLowerCase() === "#1f2937" ? previewAccent.ink : form.presentation.heading.textColor, templateId) : form.presentation.heading.textColor,
    headingFontSizePx: form.presentation.heading.fontSizePx,
    headingFontWeight: isCocoricoWheelTemplate(templateId)
      ? 900
      : templateId === "rose-institut"
        ? 800
        : form.presentation.heading.fontWeight ?? 600,
    subtitle: limitCampaignSubtitleLines(
      form.subtitle,
      form.gameType === "wheel" && isBeautyWheelTemplate(templateId)
        ? MAX_BEAUTY_WHEEL_TITLE_LINES
        : undefined,
    ),
    scratchSubtitle: limitCampaignSubtitleLines(form.presentation.layout.scratchSubtitle ?? ""),
    wheelSubtitle: limitCampaignSubtitleLines(form.presentation.layout.wheelSubtitle ?? ""),
    blockSpacingPx: clampCampaignSpacingPx(form.presentation.layout.blockSpacingPx),
    subtitleSpacingPx: clampCampaignSpacingPx(
      form.presentation.layout.subtitleSpacingPx,
      defaultWheelSubtitleSpacingForTemplate(templateId),
    ),
    gamePageTemplateId: templateId,
    gameType: form.gameType,
    accent: previewAccent,
    wheelStyle: form.presentation.wheel,
    wheelPrimaryColor: form.presentation.wheel.loseColor,
    cocoricoPrimaryColor:
      templateId === "cocorico-duo-wheel"
        ? form.presentation.wheel.loseColor
        : resolveCocoricoPrimaryColor(form.presentation.wheel.loseColor),
    cocoricoSecondaryColor: form.presentation.wheel.alternateLoseColor,
    buttonStyle: {
      backgroundColor: form.presentation.button.backgroundColor,
      textColor: form.presentation.button.textColor,
      borderColor: form.gameType === "wheel" ? form.presentation.wheel.rimColor : form.presentation.button.borderColor,
      textSizePx: form.presentation.button.textSizePx,
      isBold: form.presentation.button.isBold ?? true,
    },
    previewSegments,
    winningSegmentId,
    previewPrize: form.prizes.find((prize) => prize.id === previewWinningSegment?.id)?.label || previewWinningSegment?.label || "Cadeau surprise",
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
  const isRoseInstitutTemplate = preview.gamePageTemplateId === "rose-institut";
  const isRosePowderTemplate = preview.gamePageTemplateId === "beauty-rose";
  const isBeautyTemplate = isBeautyWheelTemplate(preview.gamePageTemplateId);
  const isCocoricoTemplate = isCocoricoWheelTemplate(preview.gamePageTemplateId);
  const isCocoricoDuoTemplate = preview.gamePageTemplateId === "cocorico-duo-wheel";
  const isCosmicTemplate = preview.gamePageTemplateId === "cosmic-orbit";
  const isImmersiveTemplate = isCosmicTemplate || preview.gamePageTemplateId === "sunburst-festival";
  const isImmersiveScratchTemplate = isImmersiveScratchPageTemplate(preview.gamePageTemplateId);
  const beautyScratchTheme = beautyScratchTemplate(preview.gamePageTemplateId);
  const useBeautyScratchThemeBackground = Boolean(beautyScratchTheme && !preview.hasCustomBackgroundImage);
  const showStandardHeader = !isImmersiveScratchTemplate;
  // The compact preview has 254px of usable content width inside its phone
  // frame. A .74 ratio mirrors a 375px mobile viewport while container query
  // units keep typography independent from the merchant desktop viewport.
  const previewScale = compact ? 0.74 : 1;
  const previewHeadingScale = compact ? 0.65 : 1;
  const scalePreviewValue = (value: number) => Math.round(value * previewScale);
  const previewHeadingFontSize = isBeautyTemplate
    ? `${Math.round(preview.headingFontSizePx * previewHeadingScale)}px`
    : fluidType(Math.round(preview.headingFontSizePx * previewHeadingScale), {
        minRatio: 0.82,
        maxRatio: 1.08,
        viewportStep: 0.3,
        viewportUnit: compact ? "cqw" : "vw",
      });
  const previewHeadingTextColor = isCosmicTemplate || isCocoricoTemplate ? "#ffffff" : (preview.gamePageTemplateId === "scratch-vault" && preview.headingTextColor.toLowerCase() === "#1f2937") ? "#f8fbff" : preview.gamePageTemplateId === "scratch-lilac" ? resolveScratchTemplateTextColor(preview.headingTextColor, preview.gamePageTemplateId) : preview.headingTextColor;
  const previewFrameClass = `${compact ? "relative isolate h-full min-h-0 max-w-none rounded-[30px] px-3 pb-5 pt-7" : "relative isolate min-h-[600px] max-w-[450px] rounded-[38px] px-4 pb-6 pt-8"} ${beautyScratchTheme ? "flex flex-col" : ""}`;
  const previewWrapperClass = compact ? "h-full" : flushTop ? "" : "mt-6";
  const wheelPreviewHeight = compact ? "330px" : "470px";

  if (preview.gameType === "wheel" && preview.gamePageTemplateId === "halloween-gold") {
    return <HalloweenCampaignPreview preview={preview} compact={compact} />;
  }

  return (
    <div className={`okado-preview-surface ${previewWrapperClass}`} data-template-id={preview.gamePageTemplateId}>
      <div className={`mx-auto w-full ${(isRosePowderTemplate || isRoseInstitutTemplate) && compact ? "overflow-x-hidden overflow-y-auto" : "overflow-hidden"} border border-[#ced7e6] shadow-[0_30px_70px_rgba(18,24,39,0.18)] ${previewFrameClass} ${isRosePowderTemplate ? "okado-rose-powder-surface relative" : ""}`} style={{ ...preview.backgroundStyle, backgroundImage: useBeautyScratchThemeBackground ? "none" : preview.backgroundStyle.backgroundImage, backgroundRepeat: "no-repeat", ...(compact ? { containerType: "inline-size" } : {}) }}>
        {useBeautyScratchThemeBackground && beautyScratchTheme ? (
          <Image
            src={beautyScratchTheme.background}
            alt=""
            fill
            priority
            sizes={compact ? "260px" : "450px"}
            data-template-art={beautyScratchTheme.id}
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
          />
        ) : null}
        {(isBeautyTemplate || isRoseInstitutTemplate) && preview.gameType === "wheel" && !preview.hasCustomBackgroundImage ? (
          isRosePowderTemplate ? (
            <RosePowderDecor primaryColor={preview.wheelStyle.loseColor} />
          ) : (
            <BeautyWheelDecorations templateId={preview.gamePageTemplateId} primaryColor={preview.wheelPrimaryColor} />
          )
        ) : null}
        <div className="relative z-10">
        {showStandardHeader ? (
          <>
            {preview.logoMode === "image" && preview.logoUrl ? <div className={`flex ${preview.logoAlignmentClass}`}><div style={{ marginBottom: `${scalePreviewValue(preview.logoBottomSpacingPx)}px` }}><BrandMark logoText={merchant.logoText} logoUrl={preview.logoUrl} size="lg" variant="transparent" imageWidthPx={scalePreviewValue(preview.logoWidthPx)} /></div></div> : null}
            {preview.logoMode === "text" ? <div className={`flex ${preview.logoAlignmentClass}`}><div style={{ marginBottom: `${scalePreviewValue(preview.logoBottomSpacingPx)}px` }}><BrandMark logoText={preview.logoText} size="lg" variant="transparent" imageWidthPx={scalePreviewValue(preview.logoWidthPx)} textSizePx={scalePreviewValue(preview.logoTextSizePx) * (isBeautyTemplate || isRoseInstitutTemplate ? 0.9 : 1)} textColor={preview.logoTextColor} textClassName="text-2xl" textFontWeight={isBeautyTemplate || isRoseInstitutTemplate ? 600 : undefined} /></div></div> : null}
            {preview.gameType === "scratch" && preview.logoMode === "none" ? <div className={`flex ${preview.logoAlignmentClass}`}><div style={{ marginBottom: `${scalePreviewValue(preview.logoBottomSpacingPx)}px` }}><BrandMark logoText={preview.logoText || merchant.companyName} size="lg" variant="transparent" imageWidthPx={scalePreviewValue(preview.logoWidthPx)} textSizePx={scalePreviewValue(preview.logoTextSizePx) * (isBeautyTemplate ? 0.9 : 1)} textColor={preview.logoTextColor} textClassName="text-2xl" textFontWeight={isBeautyTemplate ? 600 : undefined} /></div></div> : null}
            {preview.logoMode === "none" || (preview.logoMode === "image" && !preview.logoUrl) ? <div aria-hidden="true" className="h-5" /> : null}
            <div className={preview.headingAlignmentClass}>
              {isCocoricoTemplate || isRestaurantPopTemplate || preview.gamePageTemplateId === "classic" ? (
                <CocoricoPromoText
                  text={preview.subtitle.trim() || (preview.gameType === "scratch" ? DEFAULT_SCRATCH_SUBTITLE : "Découvrez votre animation")}
                  as="h3"
                  fontFamily={textFontFamily(preview.headingFontFamily)}
                  fontSize={fluidType(Math.round(preview.headingFontSizePx * previewHeadingScale), { minRatio: 0.82, maxRatio: 1.08, viewportStep: 0.3, viewportUnit: compact ? "cqw" : "vw" })}
                  fontWeight={isCocoricoTemplate ? undefined : preview.gamePageTemplateId === "classic" ? 850 : 700}
                  textColor={isCocoricoTemplate ? undefined : previewHeadingTextColor}
                  secondaryTextColor={isCocoricoTemplate ? undefined : previewHeadingTextColor}
                  strokeColor={isCocoricoTemplate ? undefined : resolvePromoStrokeColor(previewHeadingTextColor)}
                  strokeWidth={isCocoricoTemplate ? undefined : preview.gamePageTemplateId === "classic" ? 1.5 : 0}
                  variant={isCocoricoTemplate ? "cocorico" : "inspired"}
                  rotate={isCocoricoTemplate}
                />
              ) : (
                <h3
                  className={`${preview.headingFontClass} ${isBeautyTemplate ? "okado-beauty-heading" : isRoseInstitutTemplate ? "line-clamp-5 leading-[1]" : "line-clamp-3 leading-[1]"} whitespace-pre-line`}
                  style={{ color: previewHeadingTextColor, fontSize: previewHeadingFontSize, fontWeight: isRoseInstitutTemplate ? 600 : preview.headingFontWeight }}
                >
                  {preview.subtitle.trim() || (preview.gameType === "scratch" ? DEFAULT_SCRATCH_SUBTITLE : "Découvrez votre animation")}
                </h3>
              )}
            </div>
            {preview.gameType === "wheel" && preview.wheelSubtitle.trim() ? <p className={`okado-wheel-subtitle ${preview.headingAlignmentClass}`} style={{ color: preview.logoTextColor, fontFamily: wheelSubtitleFontFamily(preview.headingFontFamily), marginTop: `${preview.subtitleSpacingPx}px` }}>{preview.wheelSubtitle}</p> : null}
          </>
        ) : null}
        <div className={preview.gameType === "wheel" ? compact ? "-mx-3" : "-mx-4" : isImmersiveScratchTemplate ? "flex min-h-0 flex-1 flex-col" : undefined} style={{ marginTop: `${isImmersiveScratchTemplate ? 0 : scalePreviewValue(preview.gameType === "wheel" ? campaignWheelBlockSpacingPx(preview.blockSpacingPx) : preview.blockSpacingPx)}px`, height: preview.gameType === "wheel" && !isRoseInstitutTemplate ? wheelPreviewHeight : undefined, aspectRatio: preview.gameType === "wheel" && isRoseInstitutTemplate ? "1 / 1.22" : undefined, marginBottom: preview.gameType === "wheel" ? compact ? "-12px" : "-24px" : undefined }}>
         {preview.gameType === "wheel" ? isCocoricoTemplate ? <CocoricoWheel primaryColor={preview.cocoricoPrimaryColor} secondaryColor={isCocoricoDuoTemplate ? preview.cocoricoSecondaryColor : undefined} palette={isCocoricoDuoTemplate ? "duo" : "classic"} segments={preview.previewSegments} winningSegmentId={preview.winningSegmentId} buttonStyle={{ backgroundColor: preview.buttonStyle.backgroundColor, textColor: preview.buttonStyle.textColor }} buttonEnabled framing={compact ? "mobile-preview" : "editor"} /> : isImmersiveTemplate ? <ImmersiveWheel accent={preview.accent} wheelStyle={preview.wheelStyle} template={preview.gamePageTemplateId as "cosmic-orbit" | "sunburst-festival"} buttonStyle={{ backgroundColor: preview.buttonStyle.backgroundColor, textColor: preview.buttonStyle.textColor, borderColor: preview.buttonStyle.borderColor }} segments={preview.previewSegments} buttonEnabled winningSegmentId={preview.winningSegmentId} framing={compact ? "mobile-preview" : "editor"} /> : <WheelOfFortune accent={preview.accent} wheelStyle={preview.wheelStyle} pageTemplate={preview.gamePageTemplateId === "restaurant-pop" ? "restaurant-pop" : isRoseInstitutTemplate ? "rose-institut" : isBeautyWheelTemplate(preview.gamePageTemplateId) ? preview.gamePageTemplateId : "classic"} buttonStyle={{ backgroundColor: preview.buttonStyle.backgroundColor, textColor: preview.buttonStyle.textColor, borderColor: preview.buttonStyle.borderColor }} segments={preview.previewSegments} buttonEnabled winningSegmentId={preview.winningSegmentId} framing={compact ? "mobile-preview" : "editor"} /> : isImmersiveScratchTemplate ? <ImmersiveScratchTicket accent={preview.accent} resultLabel={preview.previewPrize} enabled={false} onReveal={() => undefined} logoMode={preview.logoMode} logoText={preview.logoText} logoUrl={preview.logoUrl} headline={preview.subtitle} secondaryText={preview.scratchSubtitle} headingTextColor={previewHeadingTextColor} logoTextColor={preview.logoTextColor} headingFontClass={preview.headingFontClass} headingFontSize={fluidType(scalePreviewValue(preview.headingFontSizePx), { minRatio: 0.82, maxRatio: 1.08, viewportStep: 0.3, viewportUnit: compact ? "cqw" : "vw" })} headingFontWeight={preview.headingFontWeight} headingAlignmentClass={preview.headingAlignmentClass} logoAlignmentClass={preview.logoAlignmentClass} logoBottomSpacingPx={scalePreviewValue(preview.logoBottomSpacingPx)} textToScratchSpacingPx={scalePreviewValue(preview.blockSpacingPx)} subtitleSpacingPx={scalePreviewValue(preview.subtitleSpacingPx)} logoWidthPx={scalePreviewValue(preview.logoWidthPx)} logoTextSizePx={scalePreviewValue(preview.logoTextSizePx)} fitContainer template={preview.gamePageTemplateId as ImmersiveScratchTemplateId} /> : <ScratchGame accent={preview.accent} resultLabel={preview.previewPrize} enabled={false} onReveal={() => undefined} />}
        </div>
        {preview.gameType !== "wheel" && !isImmersiveScratchTemplate ? <button type="button" className={`okado-preview-cta mx-auto block w-full max-w-[360px] rounded-[24px] border font-semibold ${preview.previewCtaClass}`} style={{ marginTop: `${scalePreviewValue(preview.blockSpacingPx)}px`, backgroundColor: preview.buttonStyle.backgroundColor, color: preview.buttonStyle.textColor, borderColor: preview.buttonStyle.borderColor, fontSize: fluidType(scalePreviewValue(preview.buttonStyle.textSizePx), { minRatio: 0.86, maxRatio: 1.08, viewportStep: 0.24, viewportUnit: compact ? "cqw" : "vw" }), fontWeight: preview.buttonStyle.isBold ? 700 : 400 }}>{preview.ctaLabel}</button> : null}
        </div>
      </div>
    </div>
  );
});
