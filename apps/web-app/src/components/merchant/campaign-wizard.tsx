"use client";

import { prizeFieldsFromSuggestion } from "@/lib/prize-suggestion-fields";
import { usePrizeSuggestionCatalog } from "@/lib/use-prize-suggestions";
import { isSuggestionInPrizes, suggestedWizardPrizeId } from "@/lib/wizard-prize-suggestions";
import { WizardPrizeLibrary } from "@/components/merchant/wizard-prize-library";
import { copyReusablePrize, isReusablePrizeAdded, type ReusablePrize } from "@/lib/reusable-prizes";
import { buildPrizeCompositions, copyPrizeComposition, type PrizeComposition } from "@/lib/prize-compositions";
import { WizardPrizeCompositions } from "@/components/merchant/wizard-prize-compositions";
import { isPrizeCostKnown, prizeRuleErrors } from "@/lib/prize-budget";
import { WizardPrizeBudget } from "@/components/merchant/wizard-prize-budget";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Info,
  Loader2,
  LibraryBig,
  History,
  Copy,
  Pencil,
  Plus,
  QrCode,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { type ChangeEvent, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { MarketingActionsStep } from "@/components/merchant/marketing-actions-step";
import { GoogleClickSetting } from "@/components/merchant/google-click-setting";
import { useNoMarketingActionConfirmation } from "@/components/merchant/no-marketing-action-dialog";
import { marketingActionEntry, marketingActionKey, normalizeMarketingActionUrl } from "@/lib/marketing-action-library";
import { CampaignPreviewQrDialog } from "@/components/merchant/campaign-preview-qr";
import { CampaignPreviewDialog, openCampaignPreview } from "@/components/merchant/campaign-preview-dialog";
import { CampaignSavedDialog } from "@/components/merchant/campaign-saved-dialog";
import { AdminCampaignQrDownload } from "@/components/merchant/admin-campaign-qr-download";
import { CampaignQrDownloadDialog } from "@/components/merchant/campaign-qr-download";
import { CampaignSpacingControls } from "@/components/merchant/campaign-spacing-controls";
import { GameTypeChoice } from "@/components/merchant/game-type-choice";
import { useWizardLayout, WizardResponsivePreview } from "@/components/merchant/wizard-responsive-layout";
import { BeautyWheelTemplateGallery } from "@/components/merchant/beauty-wheel-template-gallery";
import { BeautyScratchTemplateGallery } from "@/components/merchant/beauty-scratch-template-gallery";
import { ScratchTemplateThumbnail } from "@/components/merchant/scratch-template-thumbnail";
import { WheelTemplateThumbnail } from "@/components/merchant/wheel-template-thumbnail";
import { GameTemplateCard } from "@/components/merchant/game-template-card";
import { DraftPreviewViewport } from "@/components/merchant/draft-preview-viewport";
import { WIZARD_PHONE_SIZE } from "@/lib/game-preview-viewport";
import { DialogShell } from "@/components/ui/dialog";
import { ValidationDialog } from "@/components/ui/validation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  buildCampaignLivePreviewModel,
  CampaignLivePreview,
} from "@/components/merchant/campaign-live-preview";
import { actionKindCta, textFontClass, textFontLabel } from "@/lib/format";
import { getPrizeValidationMessages } from "@/lib/prize-validation";
import { createCampaignEmailDefaults } from "@/lib/email-settings";
import { normalizeCampaignEmailSettings } from "@/lib/email-settings";
import { captureClientError } from "@/lib/client-observability";
import { captureClientProductEvent } from "@/lib/client-product-analytics";
import { uploadMerchantImageFile, MERCHANT_IMAGE_ACCEPT } from "@/lib/merchant-image-upload";
import { postCampaignSetup } from "@/lib/campaign-setup-request";
import { beautyWheelFontOptions, beautyWheelLogoColor, beautyWheelTheme, isBeautyIndustry, isBeautyWheelTemplate } from "@/lib/beauty-wheel-themes";
import { CHRISTMAS_WHEEL_THEMES, christmasWheelTheme } from "@/lib/christmas-wheel-themes";
import { beautyScratchTemplate, scratchVisualTheme, isHiddenScratchTemplate, isImmersiveScratchTemplate, type BeautyScratchTemplateId } from "@/lib/beauty-scratch-templates";
import { createPosterSettingsDefaults, normalizePosterSettings } from "@/lib/poster-utils";
import {
  createAdminWizardMarketingActionDefaults,
  createWizardMarketingActionDefaults,
  wizardMarketingActionUrl,
} from "@/lib/wizard-marketing-actions.mjs";
import {
  createDefaultPosterSettings,
  createDefaultWheelSettings,
  DEFAULT_SCRATCH_PRIMARY_COLOR,
  DEFAULT_SCRATCH_CORAL_COLOR,
  DEFAULT_SCRATCH_HEADING_FONT_SIZE_PX,
  defaultScratchTemplateFont,
  defaultScratchTemplateForIndustry,
  defaultScratchTextColor,
  scratchTemplateDefaultPrimaryColor,
  scratchTemplateUsesFixedPrimaryColor,
  shouldApplyScratchTemplateDefaultPrimaryColor,
  DEFAULT_WHEEL_SUBTITLE,
  campaignSubtitleForGameTypeChange,
  DEFAULT_GAME_PAGE_TEMPLATE_ID,
  DEFAULT_COCORICO_PRIMARY_COLOR,
  DEFAULT_ROSE_INSTITUT_TEXT_COLOR,
  DEFAULT_ROSE_INSTITUT_HEADING_FONT_FAMILY,
  DEFAULT_WHEEL_HEADING_FONT_SIZE_PX,
  MAX_BEAUTY_WHEEL_TITLE_LINES,
  DEFAULT_WHEEL_SPACING_PX,
  defaultWheelBlockSpacingForTemplate,
  DEFAULT_WHEEL_SUBTITLE_SPACING_PX,
  defaultWheelSubtitleSpacingForTemplate,
  deriveLighterHex,
  limitCampaignSubtitleLines,
  MAX_CAMPAIGN_SUBTITLE_LENGTH,
  clampCampaignSpacingPx,
  normalizeScratchAccent,
  normalizeWheelSubtitle,
  resolveWheelPrimaryColorAfterGameTypeSwitch,
  isClassicPopWheelTemplate,
  isCocoricoWheelTemplate,
  scratchTemplateUsesTicketTextColor,
  wheelBackgroundForTemplate,
  wheelBackgroundAfterPrimaryColorChange,
  resolveScratchTemplateTextColor,
  wheelBackgroundForTemplateSelection,
  wheelHeadingColorForTemplateSelection,
  wheelHeadingFontForTemplateSelection,
  wheelLogoGapForTemplateSelection,
  wheelLogoColorForTemplateSelection,
  wheelPaletteForTemplate,
} from "@/lib/campaign-defaults";
import {
  CampaignAction,
  CampaignPerformance,
  CampaignSetupInput,
  GamePageTemplateId,
  BackgroundLibraryAsset,
  Merchant,
  PrizeSuggestion,
  TextFont,
} from "@/lib/types";

type WizardStepId =
  "identity" | "game" | "prizes" | "action" | "appearance";

type WizardStep = {
  id: WizardStepId;
  number: string;
  title: string;
  description: string;
};

type WizardError = {
  step: WizardStepId;
  message: string;
};

type WizardDraft = CampaignSetupInput;
type WizardPrize = WizardDraft["prizes"][number];

type PrizeEditorState = {
  mode: "create" | "edit" | "duplicate";
  value: WizardPrize;
  original: WizardPrize | null;
  discardPrompt: boolean;
  error: string | null;
};

type GameTypeState = {
  subtitle: WizardDraft["subtitle"];
  accent: WizardDraft["accent"];
  presentation: Pick<
    WizardDraft["presentation"],
    "background" | "heading" | "button" | "layout" | "wheel"
  >;
};

function snapshotGameTypeState(draft: WizardDraft): GameTypeState {
  return {
    subtitle: draft.subtitle,
    accent: { ...draft.accent },
    presentation: {
      background: { ...draft.presentation.background },
      heading: { ...draft.presentation.heading },
      button: { ...draft.presentation.button },
      layout: { ...draft.presentation.layout },
      wheel: { ...draft.presentation.wheel },
    },
  };
}

type PendingWizardNavigation = {
  href: string;
};

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "game",
    number: "01",
    title: "Le jeu",
    description: "Le type de jeu.",
  },
  {
    id: "identity",
    number: "02",
    title: "La promesse",
    description: "Le texte affiché à vos clients.",
  },
  {
    id: "appearance",
    number: "03",
    title: "L’apparence",
    description: "Donnez à la campagne votre signature.",
  },
  {
    id: "prizes",
    number: "04",
    title: "Les lots",
    description: "Configurez vos récompenses et leurs probabilités.",
  },
  {
    id: "action",
    number: "05",
    title: "Les actions",
    description: "Composez les actions proposées avant le jeu.",
  },
];

const WIZARD_TEXT_FONTS: TextFont[] = [
  "roboto",
  "geogrotesque",
  "comfortaa",
  "days-one",
  "delius-unicase",
  "lato",
  "lobster",
  "pacifico",
  "syncopate",
  "cormorant",
  "playfair",
  "dm-sans",
  "poppins",
  "bodoni",
  "space-grotesk",
  "fredoka",
];
const COCORICO_TEXT_FONTS: TextFont[] = ["roboto", "days-one", "fredoka"];

function uploadWizardImage(
  event: ChangeEvent<HTMLInputElement>,
  onLoaded: (value: string) => void,
  onError: (message: string) => void,
  kind: "logo" | "background",
  adminTarget?: { accountMerchantId: string; locationId: string },
  onUploadStateChange?: (isUploading: boolean) => void,
) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = "";
  onUploadStateChange?.(true);
  void uploadMerchantImageFile(file, kind, adminTarget)
    .then(({ url }) => onLoaded(url))
    .catch((error: unknown) => onError(error instanceof Error ? error.message : "Import de l’image impossible."))
    .finally(() => onUploadStateChange?.(false));
}

const GOOGLE_REVIEW_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "search.google.com",
  "maps.google.com",
  "g.page",
  "maps.app.goo.gl",
]);

const INCENTIVE_COPY_PATTERN =
  /(?:avis|note|5\s*étoiles|bonne note).{0,80}(?:gagn(?:e|er|é)|cadeau|lot|récompens)|(?:gagn(?:e|er|é)|cadeau|lot|récompens).{0,80}(?:avis|note|5\s*étoiles|bonne note)/iu;

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function createWizardActions(
  merchant: Merchant,
  goalType: WizardDraft["goalType"],
): CampaignAction[] {
  return createWizardMarketingActionDefaults(merchant, goalType).map((action) => ({
    ...action,
    label: actionKindCta(action.kind),
  }));
}

function createAdminWizardActions(merchant: Merchant): CampaignAction[] {
  return createAdminWizardMarketingActionDefaults(merchant).map((action) => ({
    ...action,
    label: action.label ?? actionKindCta(action.kind),
  }));
}

function createWizardDraft(merchant: Merchant): WizardDraft {
  const wheel = createDefaultWheelSettings(DEFAULT_COCORICO_PRIMARY_COLOR);

  return {
    merchantId: merchant.id,
    title: "",
    subtitle: DEFAULT_WHEEL_SUBTITLE,
    goalType: "review_prompt",
    emailCaptureEnabled: false,
    ctaLabel: "Je participe",
    successMetric: "Avis Google",
    targetUrl: wizardMarketingActionUrl(merchant, "google") || undefined,
    isActive: false,
    logoMode: "text",
    logoText: merchant.companyName || merchant.logoText,
    accent: { ink: "#111827", paper: "#eef2ff", signal: DEFAULT_SCRATCH_PRIMARY_COLOR },
    gameType: "wheel",
    presentation: {
      logo: {
        sizePercent: 100,
        marginBottomPx: DEFAULT_WHEEL_SPACING_PX,
        align: "center",
        textColor: wheelLogoColorForTemplateSelection(DEFAULT_GAME_PAGE_TEMPLATE_ID, "#1f2937"),
      },
      background: { mode: "color", color: "#ffffff", imageUrl: "" },
      heading: {
        textColor: "#1f2937",
        fontSizePx: 40,
        fontFamily: "fredoka",
        fontWeight: 600,
        align: "center",
      },
      button: {
        backgroundColor: DEFAULT_COCORICO_PRIMARY_COLOR,
        textColor: "#ffffff",
        borderColor: "#f4c14a",
        size: "sm",
        textSizePx: 24,
        isBold: true,
      },
      layout: {
        blockSpacingPx: DEFAULT_WHEEL_SPACING_PX,
        templateId: DEFAULT_GAME_PAGE_TEMPLATE_ID,
        wheelSubtitle: "",
        subtitleSpacingPx: defaultWheelSubtitleSpacingForTemplate(DEFAULT_GAME_PAGE_TEMPLATE_ID),
      },
      wheel,
      poster: createDefaultPosterSettings(merchant, wheel.loseColor),
      email: createCampaignEmailDefaults(merchant),
    },
    actions: createWizardActions(merchant, "review_prompt"),
    rewardRules: {
      rewardExpiryMinutes: 20,
      purchaseRequired: false,
      availableAfterHours: 24,
      availabilityDurationDays: 30,
      participationIntervalDays: 1,
      isWinningEveryTime: false,
    },
    prizes: [],
  };
}

function validateStep(
  step: WizardStepId,
  draft: WizardDraft,
  actionEnabled: boolean,
): string | null {
  if (step === "identity") {
    if (draft.title.trim().length < 3)
      return "Donnez un nom de trois caractères minimum à votre animation.";
    if (!draft.subtitle.trim())
      return "Ajoutez une phrase courte pour expliquer la promesse du jeu.";
  }

  if (step === "prizes") {
    const invalidRule = Object.values(prizeRuleErrors(draft.rewardRules))[0];
    if (invalidRule) return invalidRule;
    if (!draft.prizes.length)
      return "Ajoutez au moins un lot avant de continuer.";
    if (draft.prizes.some((prize) => !prize.label.trim()))
      return "Chaque lot doit avoir un nom lisible.";
    if (
      draft.prizes.some(
        (prize) => prize.totalQuantity !== null && prize.totalQuantity <= 0,
      )
    ) {
      return "La quantité d’un lot doit être supérieure à 0 (ou illimitée).";
    }
    const total = draft.prizes.reduce(
      (sum, prize) => sum + Number(prize.probability || 0),
      0,
    );
    if (total > 100.0001)
      return "Le total des probabilités ne peut pas dépasser 100 %.";
    if (total <= 0)
      return "Ajoutez au moins un lot avec une chance de gain supérieure à 0 %.";
    if (draft.rewardRules.isWinningEveryTime && total < 99.9999)
      return "Un jeu 100 % gagnant doit totaliser exactement 100 % de probabilités.";
  }

  if (step === "action" && actionEnabled) {
    for (const action of draft.actions) {
      if (action.kind === "crm") continue;
      if (!action.url.trim())
        return "Une action marketing doit être corrigée avant de publier la campagne.";
      try {
        const key = marketingActionKey(action);
        if (key) normalizeMarketingActionUrl(key, action.url);
        const parsed = new URL(normalizeUrl(action.url));
        if (parsed.protocol !== "https:")
          return "Le lien doit utiliser HTTPS pour protéger les joueurs.";
        if (
          action.kind === "google" &&
          !GOOGLE_REVIEW_HOSTS.has(parsed.hostname.toLowerCase())
        ) {
          return "Utilisez une adresse Google officielle pour l’invitation à laisser un avis.";
        }
        if (
          action.kind === "google" &&
          [draft.subtitle, action.label, draft.ctaLabel].some((copy) =>
            INCENTIVE_COPY_PATTERN.test(copy),
          )
        ) {
          return "L’invitation ne peut pas promettre un lot en échange d’un avis.";
        }
      } catch {
        return "Une action marketing doit être corrigée avant de publier la campagne.";
      }
    }
  }

  return null;
}

function collectErrors(
  draft: WizardDraft,
  actionEnabled: boolean,
): WizardError[] {
  return WIZARD_STEPS.map((step) => {
    const message = validateStep(step.id, draft, actionEnabled);
    return message ? { step: step.id, message } : null;
  }).filter((error): error is WizardError => Boolean(error));
}

function updatePrize(
  draft: WizardDraft,
  prizeId: string | undefined,
  patch: Partial<WizardDraft["prizes"][number]>,
) {
  return {
    ...draft,
    prizes: draft.prizes.map((prize) =>
      prize.id === prizeId ? { ...prize, ...patch } : prize,
    ),
  };
}

function createWizardPrizeId() {
  return `wizard-prize-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function WizardPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div data-testid="wizard-phone-preview" style={WIZARD_PHONE_SIZE} className="okado-preview-surface relative mx-auto box-border rounded-[40px] border-[5px] border-[#172033] bg-[#172033] p-[7px] shadow-[0_24px_54px_rgba(18,24,39,0.2)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-2 z-20 h-1.5 w-14 -translate-x-1/2 rounded-full bg-[#6d7890]/70"
      />
      <div className="h-full overflow-hidden rounded-[29px] bg-[#f8fafc]">
        {children}
      </div>
    </div>
  );
}

function WizardGamePreview({
  draft,
  merchant,
}: {
  draft: WizardDraft;
  merchant: Merchant;
}) {
  const preview = buildCampaignLivePreviewModel(draft, merchant);
  return (
    <WizardPhoneFrame>
      <DraftPreviewViewport><CampaignLivePreview
        merchant={merchant}
        preview={preview}
        mobileViewport
        flushTop
      /></DraftPreviewViewport>
    </WizardPhoneFrame>
  );
}

function draftFromCampaign(merchant: Merchant, performance: CampaignPerformance): WizardDraft {
  const campaign = performance.campaign;
  const templateId = campaign.presentation.layout.templateId ?? "classic";
  const defaultSubtitleSpacing = defaultWheelSubtitleSpacingForTemplate(templateId);
  const posterDefaults = createPosterSettingsDefaults({
    logoMode: campaign.logoMode ?? "text",
    logoText: campaign.logoText ?? merchant.companyName,
    logoUrl: campaign.logoUrl,
    logoSizePercent: campaign.presentation.logo.sizePercent,
    logoBottomMarginPx: campaign.presentation.poster?.logoBottomMarginPx ?? 10,
    backgroundMode: campaign.presentation.background.mode,
    backgroundColor: campaign.presentation.background.color,
    backgroundImageUrl: campaign.presentation.background.imageUrl ?? "",
    headline: campaign.subtitle,
    headlineTextColor: campaign.presentation.heading.textColor,
    headlineFontSizePx: campaign.presentation.heading.fontSizePx,
    headlineFontFamily: campaign.presentation.poster?.headlineFontFamily ?? "geogrotesque",
    wheel: campaign.presentation.wheel,
    footerBackgroundColor: campaign.accent.signal,
  });

  return {
    id: campaign.id,
    merchantId: merchant.id,
    creationMode: "wizard",
    title: campaign.title,
    subtitle: limitCampaignSubtitleLines(
      campaign.gameType === "wheel"
        ? normalizeWheelSubtitle(campaign.subtitle)
        : campaign.subtitle,
      campaign.gameType === "wheel" && (isBeautyIndustry(merchant.industry) || isBeautyWheelTemplate(templateId))
        ? MAX_BEAUTY_WHEEL_TITLE_LINES
        : undefined,
    ),
    goalType: campaign.goalType,
    googleClickRequired: campaign.googleClickRequired,
    googleClickAcceptanceId: campaign.googleClickAcceptanceId,
    emailCaptureEnabled:
      campaign.emailCaptureEnabled ||
      campaign.actions.some((action) => action.kind === "crm"),
    ctaLabel: campaign.ctaLabel,
    successMetric: campaign.successMetric,
    targetUrl: campaign.targetUrl,
    isActive: campaign.isActive,
    logoMode: campaign.logoMode ?? (campaign.logoUrl ? "image" : "text"),
    logoText: campaign.logoText ?? merchant.companyName,
    logoUrl: campaign.logoUrl,
    accent: campaign.gameType === "scratch"
      ? normalizeScratchAccent(campaign.accent, campaign.presentation.layout.templateId)
      : campaign.accent,
    gameType: campaign.gameType,
    presentation: {
      ...campaign.presentation,
      background: {
        ...campaign.presentation.background,
        color: wheelBackgroundForTemplate(
          templateId,
          campaign.presentation.background.color,
          campaign.presentation.wheel.loseColor,
        ),
      },
      logo: {
        ...campaign.presentation.logo,
        textColor: campaign.gameType === "scratch"
          ? resolveScratchTemplateTextColor(campaign.presentation.logo.textColor ?? campaign.presentation.heading.textColor, templateId)
          : campaign.presentation.logo.textColor,
        marginBottomPx: clampCampaignSpacingPx(
          campaign.presentation.logo.marginBottomPx ??
            (campaign.gameType === "wheel" ? DEFAULT_WHEEL_SPACING_PX : 20),
        ),
        align: isBeautyWheelTemplate(templateId) ? campaign.presentation.logo.align : "center",
      },
      heading: { ...campaign.presentation.heading, align: isBeautyWheelTemplate(templateId) ? campaign.presentation.heading.align : "center", textColor: campaign.gameType === "scratch" ? resolveScratchTemplateTextColor(campaign.presentation.heading.textColor, templateId) : campaign.presentation.heading.textColor },
      layout: {
        ...campaign.presentation.layout,
        blockSpacingPx: clampCampaignSpacingPx(
          campaign.presentation.layout.blockSpacingPx ??
            (campaign.gameType === "wheel" ? defaultWheelBlockSpacingForTemplate(templateId) : 20),
        ),
        subtitleSpacingPx: clampCampaignSpacingPx(
          campaign.presentation.layout.subtitleSpacingPx,
          defaultSubtitleSpacing,
        ),
      },
      poster: normalizePosterSettings(campaign.presentation.poster, posterDefaults),
      email: normalizeCampaignEmailSettings(
        campaign.presentation.email,
        createCampaignEmailDefaults(merchant),
      ),
    },
    actions: campaign.actions.filter((action) => action.kind !== "crm"),
    rewardRules: campaign.rewardRules,
    prizes: performance.prizes.map((prize) => ({
      id: prize.id,
      label: prize.label,
      totalQuantity: prize.totalQuantity,
      remainingQuantity: prize.remainingQuantity,
      probability: prize.probability,
      estimatedUnitCost: prize.estimatedUnitCost,
      estimatedUnitCostKnown: prize.estimatedUnitCostKnown,
      purchaseRequired: Boolean(prize.purchaseRequired),
      usageConditions: prize.usageConditions ?? "",
    })),
  };
}

function PrizeEditorPanel({
  editor,
  campaignIsBeingEdited,
  remainingProbability,
  onChange,
  onClose,
  onDiscard,
  onSave,
}: {
  editor: PrizeEditorState | null;
  campaignIsBeingEdited: boolean;
  remainingProbability: number;
  onChange: (patch: Partial<WizardPrize>) => void;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  if (!editor) return null;
  const value = editor.value;
  const isEditingPrize = editor.mode === "edit";
  const heading = isEditingPrize
    ? "Modifier le lot"
    : editor.mode === "duplicate"
      ? "Dupliquer un lot"
      : "Créer un lot";
  const editsExistingPrize = campaignIsBeingEdited && isEditingPrize;
  const quantityValue = editsExistingPrize
    ? (value.remainingQuantity === undefined ? value.totalQuantity : value.remainingQuantity) ?? ""
    : value.totalQuantity ?? "";
  const projectedTotal = 100 - remainingProbability + Number(value.probability || 0);
  const exceedsProbabilityTotal = projectedTotal > 100.0001;

  return (
    <DialogShell
      open={Boolean(editor)}
      onClose={onClose}
      labelledBy="wizard-prize-editor-title"
      describedBy="wizard-prize-editor-description"
      className="okado-prize-editor"
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#eee8f0] bg-white px-5 py-5 sm:px-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#716b78]">
            Récompense
          </p>
          <h2 id="wizard-prize-editor-title" className="mt-1 text-xl font-semibold text-[#242126]">
            {heading}
          </h2>
          <p id="wizard-prize-editor-description" className="mt-2 text-sm leading-5 text-[#716b78]">
            Les changements restent dans l’éditeur jusqu’à l’enregistrement du jeu.
          </p>
        </div>
        <button type="button" aria-label="Fermer l’édition du lot" onClick={onClose} className="okado-dialog-dismiss">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      <div className="space-y-5 px-5 py-6 sm:px-7">
        <div>
        <label className="block text-sm font-medium text-[#242126]">
          Nom du lot <span className="text-[#b42318]">*</span>
          <input
            autoFocus
            maxLength={120}
            aria-describedby="wizard-prize-label-count"
            value={value.label}
            onChange={(event) => onChange({ label: event.target.value })}
            placeholder="Ex. : MASQUE OFFERT"
            className="mt-2 w-full rounded-[10px] border border-[#e8e2ea] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#64206f] focus:ring-2 focus:ring-[#64206f]/15"
          />
        </label>
        <p id="wizard-prize-label-count" className="mt-1 text-right text-xs text-[#716b78]">{value.label.length}/120 caractères</p>
        {value.label.length > 36 ? <p className="mt-1 text-xs leading-5 text-[#714400]">Ce nom est long : vérifiez sa lisibilité sur la roue ou le ticket à gratter.</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#242126]">
              <span className="block min-h-10 min-[360px]:min-h-0">Chance de gain (%) <span className="text-[#b42318]">*</span></span>
              <input
                type="number"
                min={0}
                max={100}
                step="any"
                value={value.probability}
                onChange={(event) => onChange({ probability: Number(event.target.value || 0) })}
                className="mt-2 w-full rounded-[10px] border border-[#e8e2ea] bg-white px-3 py-3 text-sm outline-none focus:border-[#64206f] focus:ring-2 focus:ring-[#64206f]/15"
              />
            </label>
            <p className="mt-1 text-xs text-[#716b78]">
              {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Math.max(0, remainingProbability))} % disponibles pour ce lot.
            </p>
          </div>
          <label className="block text-sm font-medium text-[#242126]">
            <span className="block min-h-10 min-[360px]:min-h-0">Stock disponible</span>
            <input
              type="number"
              min={editsExistingPrize ? 0 : 1}
              step={1}
              placeholder="Illimité"
              value={quantityValue}
              onChange={(event) => {
                const quantity = event.target.value === "" ? null : Number(event.target.value);
                onChange(editsExistingPrize
                  ? { remainingQuantity: quantity }
                  : { totalQuantity: quantity, remainingQuantity: quantity });
              }}
              className="mt-2 w-full rounded-[10px] border border-[#e8e2ea] bg-white px-3 py-3 text-sm outline-none focus:border-[#64206f] focus:ring-2 focus:ring-[#64206f]/15"
            />
          </label>
        </div>
        <p className="-mt-3 text-xs leading-5 text-[#716b78]">
          Laissez vide pour un stock illimité.
        </p>

        <label className="block text-sm font-medium text-[#242126]">
          Coût unitaire estimé (€)
          <input
            type="number"
            min={0}
            step="0.1"
            max={100000}
            placeholder="Non renseigné"
            value={value.estimatedUnitCostKnown === false ? "" : value.estimatedUnitCost}
            onChange={(event) => onChange({ estimatedUnitCost: Number(event.target.value || 0), estimatedUnitCostKnown: event.target.value !== "" })}
            className="mt-2 w-full rounded-[10px] border border-[#e8e2ea] bg-white px-3 py-3 text-sm outline-none focus:border-[#64206f] focus:ring-2 focus:ring-[#64206f]/15"
          />
          <span className="mt-1 block text-xs font-normal leading-5 text-[#716b78]">
            Estimez le coût réel pour votre établissement. Laissez vide si inconnu ; saisissez 0 uniquement si le coût est réellement nul.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#e8e2ea] bg-[#fcfafc] p-4 text-sm text-[#242126]">
          <input
            type="checkbox"
            checked={Boolean(value.purchaseRequired)}
            onChange={(event) => onChange({ purchaseRequired: event.target.checked })}
            className="mt-0.5 h-4 w-4 accent-[#64206f]"
          />
          <span>
            <span className="block font-semibold">Un achat est nécessaire pour utiliser ce gain</span>
            <span className="mt-1 block text-xs leading-5 text-[#716b78]">
              À activer si le lot nécessite une prestation ou un achat payant.
            </span>
          </span>
        </label>

        <label className="block text-sm font-medium text-[#242126]">
          Conditions d’utilisation
          <textarea
            rows={3}
            value={value.usageConditions ?? ""}
            onChange={(event) => onChange({ usageConditions: event.target.value })}
            placeholder="Ex. : Valable avec un soin visage payant."
            className="mt-2 w-full resize-y rounded-[10px] border border-[#e8e2ea] bg-white px-3 py-3 text-sm outline-none focus:border-[#64206f] focus:ring-2 focus:ring-[#64206f]/15"
          />
        </label>

        {editor.discardPrompt ? (
          <div role="alert" className="rounded-[12px] border border-[#e8e2ea] bg-[#f6f0fa] p-4">
            <p className="font-semibold text-[#242126]">Abandonner les modifications ?</p>
            <p className="mt-1 text-sm leading-5 text-[#716b78]">Les changements non enregistrés dans ce panneau seront annulés.</p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onClose} className="okado-secondary-action px-3 text-sm">Continuer l’édition</button>
              <button type="button" onClick={onDiscard} className="okado-filled-action px-3 text-sm">Abandonner</button>
            </div>
          </div>
        ) : null}
      </div>
      {!editor.discardPrompt ? (
        <footer className="sticky bottom-0 space-y-3 border-t border-[#eee8f0] bg-white px-5 py-4 sm:px-7">
          {exceedsProbabilityTotal && !editor.error ? (
            <p role="alert" data-testid="wizard-prize-probability-warning" className="rounded-[10px] border border-[#f1c8c6] bg-[#fff6f5] px-3 py-3 text-sm leading-5 text-[#b42318]">
              Les probabilités dépassent 100 % de {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(projectedTotal - 100)} points. Vous pouvez enregistrer ce lot, puis ajuster les chances dans la liste avant d’enregistrer le jeu.
            </p>
          ) : null}
          {editor.error ? <p role="alert" className="rounded-[10px] border border-[#f1c8c6] bg-[#fff6f5] px-3 py-2 text-sm leading-5 text-[#b42318]">{editor.error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="okado-secondary-action px-4 text-sm">Annuler</button>
            <button type="button" onClick={onSave} className="okado-filled-action px-4 text-sm">
              {isEditingPrize ? "Enregistrer le lot" : "Ajouter le lot"}
            </button>
          </div>
        </footer>
      ) : null}
    </DialogShell>
  );
}

function WizardBackgroundLibraryDialog({
  open,
  items,
  isLoading,
  error,
  selectedImageUrl,
  onSelect,
  onClose,
}: {
  open: boolean;
  items: BackgroundLibraryAsset[];
  isLoading: boolean;
  error: string | null;
  selectedImageUrl?: string;
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <DialogShell open={open} onClose={onClose} labelledBy="wizard-background-library-title" className="max-h-[86vh] max-w-4xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-aubergine">Bibliothèque d&apos;images</p>
            <h3 id="wizard-background-library-title" className="mt-2 text-xl font-semibold text-carbon">Choisissez une image de fond</h3>
            <p className="mt-1 text-sm text-ash">Les visuels de la bibliothèque sont disponibles pour votre page de jeu.</p>
          </div>
          <button type="button" onClick={onClose} className="okado-secondary-action px-3 text-sm">Fermer</button>
        </div>
        {error ? <p className="mt-4 rounded-[8px] border border-coral-alert/30 bg-coral-alert/10 px-3 py-2 text-sm text-coral-alert">{error}</p> : null}
        {isLoading ? <p className="mt-5 text-sm text-ash">Chargement de la bibliothèque…</p> : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item.imageUrl); onClose(); }}
                className={`cursor-pointer overflow-hidden rounded-[12px] border text-left ${selectedImageUrl === item.imageUrl ? "border-aubergine ring-2 ring-lavender-mist/70" : "border-fog"}`}
              >
                <div className="relative aspect-[4/3]">
                  <Image src={item.thumbnailUrl} alt={item.label} fill unoptimized className="object-cover" />
                </div>
                <div className="px-3 py-2.5 text-sm font-semibold text-carbon">{item.label}</div>
              </button>
            ))}
          </div>
        )}
    </DialogShell>
  );
}

export function CampaignWizard({
  merchant,
  initialCampaign,
  deferInlineAssets = false,
  adminSaveEndpoint,
  adminAssetsEndpoint,
  adminAccountMerchantId,
}: {
  merchant: Merchant;
  initialCampaign?: CampaignPerformance | null;
  deferInlineAssets?: boolean;
  adminSaveEndpoint?: string;
  adminAssetsEndpoint?: string;
  adminAccountMerchantId?: string;
}) {
  const router = useRouter();
  const { confirmNoMarketingAction, noMarketingActionDialog } = useNoMarketingActionConfirmation();
  const [marketingLinks, setMarketingLinks] = useState(merchant);
  const isEditing = Boolean(initialCampaign);
  useEffect(() => {
    if (!isEditing && !adminSaveEndpoint) {
      captureClientProductEvent("campaign_creation_started", { wizardMode: "guided" });
    }
  }, [adminSaveEndpoint, isEditing]);
  const [draft, setDraft] = useState<WizardDraft>(() => {
    if (initialCampaign) return draftFromCampaign(merchant, initialCampaign);
    const initialDraft = createWizardDraft(merchant);
    if (!adminSaveEndpoint) return initialDraft;
    return {
      ...initialDraft,
      logoMode: merchant.logoUrl ? "image" : "text",
      logoText: merchant.logoText || merchant.companyName,
      logoUrl: merchant.logoUrl,
      targetUrl: merchant.googleReviewUrl || undefined,
      actions: createAdminWizardActions(merchant),
    };
  });
  const [stepIndex, setStepIndex] = useState(0);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepIndexRef = useRef(stepIndex);
  useLayoutEffect(() => {
    if (previousStepIndexRef.current === stepIndex) return;
    previousStepIndexRef.current = stepIndex;
    const scrollContainer = stepHeadingRef.current?.closest<HTMLElement>("main[aria-busy]");
    stepHeadingRef.current?.focus({ preventScroll: true });
    if (scrollContainer) scrollContainer.scrollTop = 0;
    else window.scrollTo(0, 0);
  }, [stepIndex]);
  const [furthestStepIndex, setFurthestStepIndex] = useState(() =>
    initialCampaign ? WIZARD_STEPS.length - 1 : 0,
  );
  const actionEnabled = true;
  const prizeCatalog = usePrizeSuggestionCatalog(merchant);
  const prizeSuggestions = prizeCatalog.suggestions;
  const starterCompositions = useMemo(() => buildPrizeCompositions(prizeSuggestions, merchant), [prizeSuggestions, merchant]);
  const [prizeSuggestionScope] = useState(createWizardPrizeId);
  const reusedPrizeCopies = useRef(new Map<string, string>());
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [libraryInitialTab, setLibraryInitialTab] = useState<"suggestions" | "mine" | "compositions">("suggestions");
  const [libraryCompositionId, setLibraryCompositionId] = useState<string>();
  const [prizeEditor, setPrizeEditor] = useState<PrizeEditorState | null>(null);
  const [pendingDeletePrize, setPendingDeletePrize] = useState<{ id?: string; index: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveRequestInFlightRef = useRef(false);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  function restoreSavedDialogFocus() {
    // Modal teardown first restores its own trigger, which may now be detached.
    // Return to the stable save action after confirmation → preview transitions.
    window.requestAnimationFrame(() => saveButtonRef.current?.focus({ preventScroll: true }));
  }
  const [previewSaveDialogOpen, setPreviewSaveDialogOpen] = useState(false);
  const [previewSaveError, setPreviewSaveError] = useState<string | null>(null);
  const [isSavingBeforePreview, setIsSavingBeforePreview] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);
  const [savedPreviewCampaignId, setSavedPreviewCampaignId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [diffusionQrOpen, setDiffusionQrOpen] = useState(false);
  const { ref: wizardLayoutRef, layout: wizardLayout, inlinePreview } = useWizardLayout();
  const [backgroundLibrary, setBackgroundLibrary] = useState<BackgroundLibraryAsset[]>([]);
  const [backgroundLibraryOpen, setBackgroundLibraryOpen] = useState(false);
  const [backgroundLibraryError, setBackgroundLibraryError] = useState<string | null>(null);
  const [deferredAssetsLoaded, setDeferredAssetsLoaded] = useState(false);
  const backgroundLibraryLoading = backgroundLibraryOpen && backgroundLibrary.length === 0 && !backgroundLibraryError;
  const [imageUploadErrors, setImageUploadErrors] = useState<{
    logo?: string;
    background?: string;
  }>({});
  const [imageUploads, setImageUploads] = useState<{ logo?: boolean; background?: boolean }>({});
  const [lastSavedDraftSnapshot, setLastSavedDraftSnapshot] = useState(() => {
    if (initialCampaign) return JSON.stringify(draftFromCampaign(merchant, initialCampaign));
    const initialDraft = createWizardDraft(merchant);
    return JSON.stringify(adminSaveEndpoint
      ? {
          ...initialDraft,
          logoMode: merchant.logoUrl ? "image" : "text",
          logoText: merchant.logoText || merchant.companyName,
          logoUrl: merchant.logoUrl,
          targetUrl: merchant.googleReviewUrl || undefined,
          actions: createAdminWizardActions(merchant),
        }
      : initialDraft);
  });
  const isDirty = lastSavedDraftSnapshot !== JSON.stringify(draft);
  const saveActionLabel = draft.isActive ? "Enregistrer les modifications" : "Enregistrer le brouillon";
  const [pendingNavigation, setPendingNavigation] = useState<PendingWizardNavigation | null>(null);
  const [isSavingBeforeNavigation, setIsSavingBeforeNavigation] = useState(false);
  const wheelTemplateState = useRef<NonNullable<CampaignSetupInput["presentation"]["layout"]["wheelTemplateStyles"]>>(
    initialCampaign?.campaign.presentation.layout.wheelTemplateStyles ?? {},
  );
  const gameTypeState = useRef<Partial<Record<WizardDraft["gameType"], GameTypeState>>>({});

  function selectBeautyWheelTemplate(templateId: GamePageTemplateId) {
    if (templateId === "rose-institut") {
      captureClientProductEvent("campaign_template_selected", {
        campaignType: "wheel",
        templateKey: templateId,
        wizardMode: "guided",
      });
      setDraft((current) => {
        const previousId = current.presentation.layout.templateId ?? DEFAULT_GAME_PAGE_TEMPLATE_ID;
        if (previousId === templateId) return current;
        wheelTemplateState.current[previousId] = {
          wheel: current.presentation.wheel,
          backgroundColor: current.presentation.background.color,
          scratchSignal: current.accent.signal,
          scratchTextColor: current.accent.ink,
          headingTextColor: current.presentation.heading.textColor,
          logoTextColor: current.presentation.logo.textColor ?? current.presentation.heading.textColor,
          headingFontFamily: current.presentation.heading.fontFamily,
          headingAlign: current.presentation.heading.align,
          logoAlign: current.presentation.logo.align,
          logoBottomSpacingPx: current.presentation.logo.marginBottomPx,
          buttonBackgroundColor: current.presentation.button.backgroundColor,
          subtitleSpacingPx: current.presentation.layout.subtitleSpacingPx,
        };
        const remembered = wheelTemplateState.current[templateId];
        const wheel = remembered?.wheel ?? wheelPaletteForTemplate(templateId, current.presentation.wheel);
        return {
          ...current,
          presentation: {
            ...current.presentation,
            layout: {
              ...current.presentation.layout,
              templateId,
              wheelTemplateStyles: { ...current.presentation.layout.wheelTemplateStyles, [previousId]: wheelTemplateState.current[previousId] },
              subtitleSpacingPx: remembered?.subtitleSpacingPx ?? defaultWheelSubtitleSpacingForTemplate(templateId),
            },
            background: {
              ...current.presentation.background,
              color: remembered?.backgroundColor ?? wheelBackgroundForTemplateSelection(templateId, current.presentation.background.color),
            },
            wheel,
            heading: {
              ...current.presentation.heading,
              fontFamily: remembered?.headingFontFamily ?? DEFAULT_ROSE_INSTITUT_HEADING_FONT_FAMILY,
              textColor: remembered?.headingTextColor ?? DEFAULT_ROSE_INSTITUT_TEXT_COLOR,
              fontSizePx: [34, 40, 42].includes(current.presentation.heading.fontSizePx)
                ? DEFAULT_WHEEL_HEADING_FONT_SIZE_PX
                : current.presentation.heading.fontSizePx,
              align: remembered?.headingAlign ?? "center",
            },
            logo: {
              ...current.presentation.logo,
              textColor: remembered?.logoTextColor ?? DEFAULT_ROSE_INSTITUT_TEXT_COLOR,
              marginBottomPx: wheelLogoGapForTemplateSelection(templateId, previousId, current.presentation.logo.marginBottomPx, remembered?.logoBottomSpacingPx),
              align: remembered?.logoAlign ?? "center",
            },
            button: {
              ...current.presentation.button,
              backgroundColor: remembered?.buttonBackgroundColor ?? DEFAULT_ROSE_INSTITUT_TEXT_COLOR,
            },
          },
        };
      });
      return;
    }
    const theme = beautyWheelTheme(templateId)!;
    captureClientProductEvent("campaign_template_selected", {
      campaignType: "wheel",
      templateKey: templateId,
      wizardMode: "guided",
    });
    setDraft((current) => {
      const previousId = current.presentation.layout.templateId ?? DEFAULT_GAME_PAGE_TEMPLATE_ID;
      if (previousId === templateId) return current;
      wheelTemplateState.current[previousId] = {
        wheel: current.presentation.wheel,
        backgroundColor: current.presentation.background.color,
        scratchSignal: current.accent.signal,
        scratchTextColor: current.accent.ink,
        headingTextColor: current.presentation.heading.textColor,
        logoTextColor: current.presentation.logo.textColor ?? current.presentation.heading.textColor,
        headingFontFamily: current.presentation.heading.fontFamily,
        headingAlign: current.presentation.heading.align,
        logoAlign: current.presentation.logo.align,
        logoBottomSpacingPx: current.presentation.logo.marginBottomPx,
        buttonBackgroundColor: current.presentation.button.backgroundColor,
        blockSpacingPx: current.presentation.layout.blockSpacingPx,
        subtitleSpacingPx: current.presentation.layout.subtitleSpacingPx,
      };
      const remembered = wheelTemplateState.current[templateId];
      return {
        ...current,
        presentation: {
          ...current.presentation,
          layout: { ...current.presentation.layout, templateId, blockSpacingPx: remembered?.blockSpacingPx ?? defaultWheelBlockSpacingForTemplate(templateId), subtitleSpacingPx: remembered?.subtitleSpacingPx ?? defaultWheelSubtitleSpacingForTemplate(templateId), wheelTemplateStyles: { ...current.presentation.layout.wheelTemplateStyles, [previousId]: wheelTemplateState.current[previousId] } },
          background: { ...current.presentation.background, color: remembered?.backgroundColor ?? theme.background },
          wheel: remembered?.wheel ?? wheelPaletteForTemplate(templateId, current.presentation.wheel),
          heading: { ...current.presentation.heading, fontFamily: remembered?.headingFontFamily ?? theme.font, textColor: remembered?.headingTextColor ?? theme.text, align: remembered?.headingAlign ?? "center" },
          logo: { ...current.presentation.logo, marginBottomPx: wheelLogoGapForTemplateSelection(templateId, previousId, current.presentation.logo.marginBottomPx, remembered?.logoBottomSpacingPx), textColor: remembered?.logoTextColor ?? beautyWheelLogoColor(theme.id), align: remembered?.logoAlign ?? "center" },
          button: { ...current.presentation.button, backgroundColor: remembered?.buttonBackgroundColor ?? theme.primary },
        },
      };
    });
  }

  function selectBeautyScratchTemplate(templateId: BeautyScratchTemplateId) {
    const theme = beautyScratchTemplate(templateId);
    if (!theme) return;
    captureClientProductEvent("campaign_template_selected", {
      campaignType: "scratch",
      templateKey: templateId,
      wizardMode: "guided",
    });
    setDraft((current) => {
      if (current.presentation.layout.templateId === templateId) return current;
      const previousId = current.presentation.layout.templateId ?? DEFAULT_GAME_PAGE_TEMPLATE_ID;
      wheelTemplateState.current[previousId] = {
        wheel: current.presentation.wheel,
        backgroundColor: current.presentation.background.color,
        scratchSignal: current.accent.signal,
        scratchTextColor: current.accent.ink,
        headingTextColor: current.presentation.heading.textColor,
        logoTextColor: current.presentation.logo.textColor ?? current.presentation.heading.textColor,
        headingFontFamily: current.presentation.heading.fontFamily,
        headingAlign: current.presentation.heading.align,
        logoAlign: current.presentation.logo.align,
        logoBottomSpacingPx: current.presentation.logo.marginBottomPx,
        buttonBackgroundColor: current.presentation.button.backgroundColor,
        blockSpacingPx: current.presentation.layout.blockSpacingPx,
        subtitleSpacingPx: current.presentation.layout.subtitleSpacingPx,
      };
      const remembered = wheelTemplateState.current[templateId];
      const textColor = remembered?.scratchTextColor ?? theme.text;
      return {
        ...current,
        presentation: {
          ...current.presentation,
          layout: {
            ...current.presentation.layout,
            templateId,
            wheelTemplateStyles: {
              ...current.presentation.layout.wheelTemplateStyles,
              [previousId]: wheelTemplateState.current[previousId],
            },
          },
          heading: {
            ...current.presentation.heading,
            fontFamily: remembered?.headingFontFamily ?? theme.font,
            textColor: remembered?.headingTextColor ?? theme.text,
          },
          logo: {
            ...current.presentation.logo,
            textColor: remembered?.logoTextColor ?? theme.text,
            marginBottomPx: wheelLogoGapForTemplateSelection(templateId, previousId, current.presentation.logo.marginBottomPx, remembered?.logoBottomSpacingPx),
          },
        },
        accent: {
          ...normalizeScratchAccent(current.accent, templateId),
          signal: remembered?.scratchSignal ?? theme.scratch.base,
          ink: textColor,
        },
      };
    });
  }


  useEffect(() => {
    if (!backgroundLibraryOpen || backgroundLibrary.length) return;
    let cancelled = false;
    fetch("/api/background-library", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { items?: BackgroundLibraryAsset[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Chargement de la bibliothèque impossible.");
        if (!cancelled) setBackgroundLibrary(payload.items ?? []);
      })
      .catch((loadError) => {
        if (!cancelled) setBackgroundLibraryError(loadError instanceof Error ? loadError.message : "Chargement de la bibliothèque impossible.");
      })
    return () => {
      cancelled = true;
    };
  }, [backgroundLibrary.length, backgroundLibraryOpen]);

  useEffect(() => {
    if (!deferInlineAssets || !draft.id || deferredAssetsLoaded) return;
    let cancelled = false;

    fetch(
      adminAssetsEndpoint ?? `/api/campaigns/${draft.id}/assets?includeLogo=false`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          assets?: {
            logoUrl?: string;
            backgroundImageUrl?: string;
            posterLogoUrl?: string;
            posterBackgroundImageUrl?: string;
          };
        } | null;
        if (!response.ok || !payload?.assets || cancelled) return;
        const nextDraft = {
          ...draft,
          logoUrl: payload.assets?.logoUrl ?? draft.logoUrl,
          presentation: {
            ...draft.presentation,
            background: {
              ...draft.presentation.background,
              imageUrl: payload.assets?.backgroundImageUrl ?? draft.presentation.background.imageUrl,
            },
            poster: {
              ...draft.presentation.poster,
              logoUrl: payload.assets?.posterLogoUrl ?? draft.presentation.poster.logoUrl,
              backgroundImageUrl:
                payload.assets?.posterBackgroundImageUrl ?? draft.presentation.poster.backgroundImageUrl,
            },
          },
        };
        setDraft(nextDraft);
        setLastSavedDraftSnapshot(JSON.stringify(nextDraft));
        setDeferredAssetsLoaded(true);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [adminAssetsEndpoint, deferInlineAssets, draft, deferredAssetsLoaded]);

  useEffect(() => {
    // The completion screen is already backed by a saved campaign. Do not let
    // the draft guard interfere with its follow-up navigation, even during the
    // short render/effect transition after the save response.
    if (!isDirty || savedCampaignId) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "Quitter l’éditeur ?";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, savedCampaignId]);

  useEffect(() => {
    if (!isDirty || savedCampaignId) return;

    function handleInternalNavigation(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;

      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const current = new URL(window.location.href);
      if (destination.href === current.href) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation({
        href: `${destination.pathname}${destination.search}${destination.hash}`,
      });
    }

    window.addEventListener("click", handleInternalNavigation, true);
    return () => window.removeEventListener("click", handleInternalNavigation, true);
  }, [isDirty, savedCampaignId]);

  const step = WIZARD_STEPS[stepIndex];
  const previewCampaignId = savedCampaignId ?? draft.id;
  const totalProbability = useMemo(
    () =>
      draft.prizes.reduce(
        (sum, prize) => sum + Number(prize.probability || 0),
        0,
      ),
    [draft.prizes],
  );
  const ruleErrors = prizeRuleErrors(draft.rewardRules);
  const prizeValidationMessages = useMemo(
    () =>
      getPrizeValidationMessages(
        draft.prizes,
        draft.rewardRules.isWinningEveryTime,
      ),
    [draft.prizes, draft.rewardRules.isWinningEveryTime],
  );

  function patchDraft(patch: Partial<WizardDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      const actionsWereCustomized =
        JSON.stringify(current.actions) !==
        JSON.stringify(createWizardActions(merchant, current.goalType));
      return patch.goalType && !isEditing && !actionsWereCustomized
        ? {
            ...next,
            emailCaptureEnabled:
              patch.goalType === "lead_capture"
                ? true
                : next.emailCaptureEnabled,
            actions: createWizardActions(merchant, patch.goalType),
          }
        : next;
    });
    setError(null);
  }


  function addSuggestedPrize(suggestion: PrizeSuggestion, probability: number) {
    setDraft((current) => isSuggestionInPrizes(suggestion, current.prizes) ? current : ({
      ...current,
      prizes: [...current.prizes, {
        ...prizeFieldsFromSuggestion(suggestion),
        id: suggestedWizardPrizeId(suggestion, prizeSuggestionScope),
        probability,
      }],
    }));
    setError(null);
  }

  function openPrizeLibrary(tab: typeof libraryInitialTab = "suggestions") {
    setLibraryCompositionId(undefined);
    setLibraryInitialTab(tab);
    setError(null);
    setSuggestionsOpen(true);
  }

  function reusePrize(prize: ReusablePrize, probability: number, quantity: number | null) {
    const copy = copyReusablePrize(prize, prizeSuggestionScope, probability, quantity);
    copy.id = reusedPrizeCopies.current.get(prize.id) ?? copy.id;
    reusedPrizeCopies.current.set(prize.id, copy.id);
    setDraft((current) => isReusablePrizeAdded(prize, current.prizes, reusedPrizeCopies.current) ? current : ({
      ...current, prizes: [...current.prizes, copy],
    }));
    setError(null);
  }

  function applyPrizeComposition(composition: PrizeComposition) {
    const prizes = copyPrizeComposition(composition, prizeSuggestionScope);
    if (!prizes.length || prizes.reduce((total, prize) => total + prize.probability, 0) > 100.0001) return;
    setDraft((current) => ({ ...current, prizes }));
    reusedPrizeCopies.current.clear();
    setError(null);
    setSuggestionsOpen(false);
  }

  function removePrize(prizeId: string | undefined, prizeIndex: number) {
    setDraft((current) => ({
      ...current,
      prizes: current.prizes.filter((prize, index) =>
        prizeId ? prize.id !== prizeId : index !== prizeIndex,
      ),
    }));
    setError(null);
  }

  function openPrizeEditor(mode: PrizeEditorState["mode"], prize?: WizardPrize) {
    const value = prize
      ? { ...prize, ...(mode === "duplicate" ? { remainingQuantity: prize.totalQuantity } : {}) }
      : {
          id: createWizardPrizeId(),
          label: "",
          totalQuantity: null,
          probability: Math.min(10, Math.max(0, 100 - totalProbability)),
          estimatedUnitCost: 0,
          estimatedUnitCostKnown: false,
          purchaseRequired: false,
          usageConditions: "",
        };
    setPrizeEditor({
      mode,
      value,
      original: { ...value },
      discardPrompt: false,
      error: null,
    });
  }

  function changePrizeEditor(patch: Partial<WizardPrize>) {
    if (!prizeEditor) return;
    const value = { ...prizeEditor.value, ...patch };
    setPrizeEditor({ ...prizeEditor, value, discardPrompt: false, error: null });
    if (prizeEditor.mode === "edit") {
      setDraft((draft) => updatePrize(draft, value.id, patch));
    }
  }

  function abandonPrizeEditor() {
    if (prizeEditor?.mode === "edit" && prizeEditor.original) {
      setDraft((current) => updatePrize(current, prizeEditor.value.id, prizeEditor.original!));
    }
    setPrizeEditor(null);
  }

  function requestClosePrizeEditor() {
    if (!prizeEditor) return;
    if (prizeEditor.discardPrompt) {
      setPrizeEditor({ ...prizeEditor, discardPrompt: false });
      return;
    }
    if (JSON.stringify(prizeEditor.value) !== JSON.stringify(prizeEditor.original)) {
      setPrizeEditor((current) => current ? { ...current, discardPrompt: true, error: null } : null);
      return;
    }
    abandonPrizeEditor();
  }

  function savePrizeEditor() {
    if (!prizeEditor) return;
    const value = prizeEditor.value;
    const probability = Number(value.probability);
    const editsExistingPrize = isEditing && prizeEditor.mode === "edit";
    const quantity = editsExistingPrize
      ? (value.remainingQuantity === undefined ? value.totalQuantity : value.remainingQuantity)
      : value.totalQuantity;
    let validationError: string | null = null;

    if (!value.label.trim()) validationError = "Indiquez un nom pour ce lot.";
    else if (!Number.isFinite(probability) || probability < 0 || probability > 100)
      validationError = "La chance de gain doit être comprise entre 0 et 100 %.";
    else if (quantity !== null && quantity !== undefined && (!Number.isInteger(quantity) || quantity < (editsExistingPrize ? 0 : 1)))
      validationError = editsExistingPrize
        ? "Le stock disponible doit être une quantité entière positive ou nulle, ou rester vide pour être illimité."
        : "Le stock doit être une quantité entière supérieure à 0, ou rester vide pour être illimité.";
    else if (value.estimatedUnitCostKnown !== false && (!Number.isFinite(value.estimatedUnitCost) || value.estimatedUnitCost < 0 || value.estimatedUnitCost > 100000))
      validationError = "Le coût unitaire doit être compris entre 0 et 100 000 €, ou laissé vide s’il est inconnu.";
    else if (value.purchaseRequired && !(value.usageConditions ?? "").trim())
      validationError = "Précisez les conditions d’utilisation lorsque l’achat est requis.";

    if (validationError) {
      setPrizeEditor((current) => current ? { ...current, error: validationError } : null);
      return;
    }

    if (prizeEditor.mode === "edit") {
      setDraft((current) => updatePrize(current, value.id, value));
    } else {
      setDraft((current) => ({ ...current, prizes: [...current.prizes, value] }));
    }
    setPrizeEditor(null);
    setError(null);
  }

  function nextStep() {
    if (step.id === "prizes" && (totalProbability > 100.0001 || totalProbability <= 0)) {
      setError(null);
      return;
    }
    const validationError = validateStep(step.id, draft, actionEnabled);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStepIndex((current) => {
      const next = Math.min(WIZARD_STEPS.length - 1, current + 1);
      setFurthestStepIndex((furthest) => Math.max(furthest, next));
      return next;
    });
  }

  function previousStep() {
    setError(null);
    setStepIndex((current) => Math.max(0, current - 1));
  }

  async function saveCampaign(
    mode: "save" | "publish",
    options?: {
      suppressSuccessDialog?: boolean;
      suppressErrorDialog?: boolean;
      onError?: (message: string) => void;
    },
  ): Promise<string | null> {
    const targetIsActive = mode === "publish" || draft.isActive;
    const invalidRule = Object.values(prizeRuleErrors(draft.rewardRules))[0];
    if (invalidRule) {
      setStepIndex(WIZARD_STEPS.findIndex((item) => item.id === "prizes"));
      setError(invalidRule);
      options?.onError?.(invalidRule);
      return null;
    }
    if (totalProbability > 100.0001) {
      setStepIndex(WIZARD_STEPS.findIndex((item) => item.id === "prizes"));
      setError(null);
      options?.onError?.("Le total des probabilités ne peut pas dépasser 100 %.");
      return null;
    }
    const errorsToShow = targetIsActive ? collectErrors(draft, actionEnabled) : [];
    if (errorsToShow.length) {
      const first = errorsToShow[0];
      setError(first.step === "prizes" && prizeValidationMessages.length ? null : first.message);
      setStepIndex(WIZARD_STEPS.findIndex((item) => item.id === first.step));
      options?.onError?.(first.message);
      return null;
    }
    if (saveRequestInFlightRef.current) return null;
    if (targetIsActive && !draft.actions.length && !await confirmNoMarketingAction()) return null;
    saveRequestInFlightRef.current = true;
    setIsSaving(true);
    setError(null);
    setSaveError(null);
    try {
      const { response, payload } = await postCampaignSetup<{
        campaign?: { campaign?: { id?: string }; id?: string };
        error?: string;
      }>({
        ...draft,
        creationMode: "wizard",
        isActive: targetIsActive,
        rewardRules: {
          ...draft.rewardRules,
          purchaseRequired: false,
        },
        actions: actionEnabled
          ? draft.actions.map((action) => ({
              ...action,
              url: normalizeUrl(action.url),
            }))
          : [],
        prizes: draft.prizes.map((prize) => ({
          ...prize,
          probability: Number(prize.probability || 0),
        })),
      }, adminSaveEndpoint);
      if (!response.ok)
        throw new Error(
          payload?.error || "La campagne n’a pas pu être enregistrée.",
        );
      const campaignId = payload?.campaign?.campaign?.id ?? payload?.campaign?.id;
      if (campaignId) {
        const savedDraft = { ...draft, id: campaignId, isActive: targetIsActive };
        setDraft(savedDraft);
        setLastSavedDraftSnapshot(JSON.stringify(savedDraft));
        window.dispatchEvent(new Event("campaigns-updated"));
        if (!options?.suppressSuccessDialog) setSavedCampaignId(campaignId);
      }
      return campaignId ?? null;
    } catch (saveFailure) {
      captureClientError("campaign_setup_failed", saveFailure, {
        campaign_id: draft.id,
        creation_mode: "wizard",
        editor_mode: isEditing ? "edit" : "create",
      });
      const message = saveFailure instanceof Error ? saveFailure.message : "";
      const readableMessage =
        message.toLowerCase().includes("duplicate key")
          ? "Impossible d’enregistrer cette campagne pour le moment. Vérifiez les actions marketing puis réessayez."
          : "La campagne n’a pas pu être enregistrée. Vérifiez les informations puis réessayez.";
      options?.onError?.(readableMessage);
      if (!options?.suppressErrorDialog) setSaveError(readableMessage);
      return null;
    } finally {
      saveRequestInFlightRef.current = false;
      setIsSaving(false);
    }
  }

  function openPreviewForCampaign(campaignId: string) {
    openCampaignPreview(
      campaignId,
      () => {
        captureClientProductEvent("campaign_preview_opened", {
          campaignType: draft.gameType,
          templateKey: draft.presentation.layout.templateId ?? "classic",
        });
        setPreviewOpen(true);
      },
      (path) => router.push(path),
      adminSaveEndpoint ? `/api/admin/campaigns/${encodeURIComponent(campaignId)}/preview` : undefined,
    );
  }

  function requestPreview() {
    if (!draft.id || isSaving || isSavingBeforePreview) return;
    if (isDirty) {
      setPreviewSaveError(null);
      setPreviewSaveDialogOpen(true);
      return;
    }
    openPreviewForCampaign(draft.id);
  }

  async function saveAndPreview() {
    if (!draft.id || isSavingBeforePreview) return;
    setPreviewSaveError(null);
    setIsSavingBeforePreview(true);
    const campaignId = await saveCampaign("save", {
      suppressSuccessDialog: true,
      suppressErrorDialog: true,
      onError: setPreviewSaveError,
    });
    setIsSavingBeforePreview(false);
    if (!campaignId) return;
    setPreviewSaveDialogOpen(false);
    openPreviewForCampaign(campaignId);
  }

  function previewWithoutSaving() {
    if (!draft.id || isSavingBeforePreview) return;
    setPreviewSaveDialogOpen(false);
    setPreviewSaveError(null);
    openPreviewForCampaign(draft.id);
  }

  async function saveAndLeave() {
    if (!pendingNavigation || isSavingBeforeNavigation) return;
    const destination = pendingNavigation.href;
    setIsSavingBeforeNavigation(true);
    const saved = await saveCampaign("save", { suppressSuccessDialog: true });
    setIsSavingBeforeNavigation(false);
    if (!saved) {
      setPendingNavigation(null);
      return;
    }
    setPendingNavigation(null);
    window.dispatchEvent(new Event("merchant-navigation-guard-complete"));
    router.push(destination);
  }

  function leaveWithoutSaving() {
    if (!pendingNavigation || isSavingBeforeNavigation) return;
    const destination = pendingNavigation.href;
    setPendingNavigation(null);
    window.dispatchEvent(new Event("merchant-navigation-guard-complete"));
    router.push(destination);
  }

  const logoSettings = (
    <section className="rounded-[16px] border border-lavender-mist bg-white p-4">
      <p className="text-sm font-semibold text-carbon">Logo</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {([{ value: "text", label: "Texte" }, { value: "image", label: "Image" }, { value: "none", label: "Aucun" }] as const).map((mode) => (
          <button key={mode.value} type="button" onClick={() => patchDraft({ logoMode: mode.value, logoText: mode.value === "text" ? draft.logoText?.trim() || merchant.companyName : draft.logoText })} className={`cursor-pointer rounded-[4px] border px-3 py-2.5 text-sm font-semibold ${draft.logoMode === mode.value ? "border-aubergine bg-purple-haze text-deep-plum" : "border-fog bg-white text-charcoal"}`}>{mode.label}</button>
        ))}
      </div>
      {draft.logoMode === "text" ? <label className="mt-3 block text-sm"><span className="mb-2 block font-semibold text-carbon">Texte du logo</span><input value={draft.logoText ?? merchant.companyName} onChange={(event) => patchDraft({ logoText: event.target.value })} className="w-full rounded-[12px] border border-fog bg-white px-3 py-3 text-carbon outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15" /></label> : null}
      {draft.logoMode === "image" ? <label aria-live="polite" className={`mt-3 flex items-center justify-between rounded-[12px] border border-dashed border-[#b8c5d8] px-3 py-3 text-sm font-semibold ${imageUploads.logo ? "cursor-wait opacity-75" : "cursor-pointer"}`}><span className="inline-flex items-center gap-2">{imageUploads.logo ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Import et optimisation…</> : "Importer un logo"}</span><input type="file" accept={MERCHANT_IMAGE_ACCEPT} className="hidden" disabled={imageUploads.logo} onChange={(event) => uploadWizardImage(event, (value) => { setImageUploadErrors((current) => ({ ...current, logo: undefined })); patchDraft({ logoUrl: value, logoMode: "image" }); }, (message) => setImageUploadErrors((current) => ({ ...current, logo: message })), "logo", adminAccountMerchantId ? { accountMerchantId: adminAccountMerchantId, locationId: merchant.id } : undefined, (isUploading) => setImageUploads((current) => ({ ...current, logo: isUploading })))} /></label> : null}
      {imageUploadErrors.logo ? <p role="alert" className="mt-2 text-xs text-coral-alert">{imageUploadErrors.logo}</p> : null}
      {draft.logoMode !== "none" ? <div className="mt-3"><label className="block text-sm"><span className="mb-2 flex items-center justify-between gap-3 font-semibold"><span>Taille du logo</span><output className="text-aubergine">{draft.presentation.logo.sizePercent}%</output></span><input type="range" min={0} max={200} value={draft.presentation.logo.sizePercent} onChange={(event) => patchDraft({ presentation: { ...draft.presentation, logo: { ...draft.presentation.logo, sizePercent: Number(event.target.value) } } })} className="w-full cursor-pointer accent-aubergine" aria-label="Taille du logo" /></label></div> : null}
    </section>
  );

  return (
    <div ref={wizardLayoutRef} data-layout={wizardLayout} data-inline-preview={inlinePreview} className="okado-wizard space-y-6 pb-10">
      {noMarketingActionDialog}
      <div className="wizard-save-toolbar sticky top-0 z-30 -mx-3 -mt-6 border-b border-fog bg-soft-white/95 px-3 py-3 backdrop-blur-sm lg:-mx-6 lg:px-6" data-testid="wizard-save-toolbar">
        <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {adminSaveEndpoint ? <StatusBadge tone="muted">Administration · {merchant.companyName}</StatusBadge> : (
              <StatusBadge tone={!draft.id || !draft.isActive ? "muted" : "active"}>
                {!draft.id ? "En création" : draft.isActive ? "En ligne" : "Brouillon"}
              </StatusBadge>
            )}
            {draft.id ? <>
              <button type="button" onClick={requestPreview} disabled={isSaving || isSavingBeforePreview} className="okado-secondary-action gap-2 px-4 text-sm">
                <Eye className="h-4 w-4" aria-hidden="true" /> Prévisualiser
              </button>
              {adminSaveEndpoint ? <>
                <button type="button" onClick={() => setQrPreviewOpen(true)} className="okado-secondary-action gap-2 px-4 text-sm">
                  <QrCode className="h-4 w-4" aria-hidden="true" /> QR code
                </button>
                <AdminCampaignQrDownload campaignId={draft.id} isActive={draft.isActive} />
                <Link href={`/admin/campaigns/${encodeURIComponent(draft.id)}/poster`} prefetch={false} className="okado-secondary-action px-4 text-sm">Affiche</Link>
              </> : <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="okado-secondary-action gap-2 px-4 text-sm" aria-label="Options du QR code">
                      <QrCode className="h-4 w-4" aria-hidden="true" />
                      <span>QR code</span>
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[250px] rounded-[var(--okado-radius-control)] border-border p-1.5 shadow-[var(--shadow-product-card)]">
                    <DropdownMenuItem onSelect={() => setDiffusionQrOpen(true)} className="cursor-pointer gap-2 rounded-[10px] px-3 py-2.5">
                      <Download className="h-4 w-4" aria-hidden="true" />
                      <span>Télécharger le QR code</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setQrPreviewOpen(true)} className="cursor-pointer gap-2 rounded-[10px] px-3 py-2.5">
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      <span>QR code de prévisualisation</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Link href={`/campaigns/${draft.id}/poster`} prefetch={false} className="okado-secondary-action px-4 text-sm">Affiche</Link>
                <Link href={`/campaigns/${draft.id}/email`} prefetch={false} className="okado-secondary-action px-4 text-sm">Modifier l&apos;e-mail de gain</Link>
              </>}
              {adminSaveEndpoint && !draft.isActive ? <p className="basis-full text-xs text-ash">Le QR de diffusion n’ouvre le jeu qu’après sa publication.</p> : null}
            </> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Link href="/campaigns" prefetch={false} className="okado-secondary-action px-4 text-sm">
              Retour aux jeux
            </Link>
            <button ref={saveButtonRef} type="button" onClick={() => void saveCampaign("save")} disabled={isSaving} className={`${draft.isActive ? "okado-filled-action" : "okado-secondary-action"} px-4 text-sm disabled:opacity-50`}>
              {isSaving ? "Enregistrement…" : saveActionLabel}
            </button>
            {!draft.isActive && (isEditing || stepIndex === WIZARD_STEPS.length - 1) ? (
              <button type="button" onClick={() => void saveCampaign("publish")} disabled={isSaving} className="okado-filled-action px-4 text-sm disabled:opacity-50">
                {isSaving ? "Enregistrement…" : "Publier"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <section data-mode={isEditing ? "edit" : "create"} className="wizard-heading flex flex-col gap-5 px-1 py-2 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="okado-label">Assistant de création</p>
          <h1 className="okado-page-title mt-3">
            {adminSaveEndpoint
              ? isEditing
                ? `Modifier le jeu pour ${merchant.companyName}`
                : `Créer un jeu pour ${merchant.companyName}`
              : "Créer une campagne"}
          </h1>
          {draft.isActive ? <p className="mt-2 text-sm leading-6 text-ash">Les modifications enregistrées sont immédiatement visibles sur le jeu en ligne.</p> : null}
        </div>
      </section>

      <div className="wizard-layout grid items-start gap-5">
        <aside className="wizard-progress okado-card min-w-0 p-3">
          <p className="px-3 text-[10px] uppercase tracking-[0.22em] text-[#8993a6]">
            Progression
          </p>
          {wizardLayout === "narrow" ? <label className="mt-2 block text-sm font-semibold">
            <span className="sr-only">Étape de création</span>
            <select aria-label="Étape de création" value={stepIndex} onChange={(event) => setStepIndex(Number(event.target.value))} className="w-full rounded-[12px] border border-fog bg-white px-3 py-3 text-sm text-carbon">
              {WIZARD_STEPS.map((item, index) => <option key={item.id} value={index} disabled={!(isEditing || Boolean(draft.id) || index <= furthestStepIndex)}>
                Étape {index + 1}/5 — {item.title}{!isEditing && !draft.id && index < stepIndex ? " · Terminée" : ""}
              </option>)}
            </select>
          </label> : <nav className={`mt-3 ${wizardLayout === "compact" ? "grid grid-cols-5 gap-1" : "space-y-1"}`} aria-label="Étapes de création">
            {WIZARD_STEPS.map((item, index) => {
              const active = index === stepIndex;
              const canAccessStep = isEditing || Boolean(draft.id) || index <= furthestStepIndex;
              const complete = !isEditing && !draft.id && index < stepIndex;
              const visited = canAccessStep;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => canAccessStep && setStepIndex(index)}
                  disabled={!canAccessStep}
                  aria-current={active ? "step" : undefined}
                  className={`flex w-full items-start gap-2 rounded-[4px] px-2 py-3 text-left transition ${active ? "bg-deep-plum text-white" : visited ? "text-[#18864b] hover:bg-purple-haze" : "text-[#a0a9b9]"}`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold ${active ? "bg-white text-aubergine" : complete ? "bg-[#e9f8ec] text-[#18864b]" : visited ? "bg-purple-haze text-aubergine" : "bg-[#f2f4f7]"}`}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : item.number}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {item.title}
                    </span>
                    <span className={`${wizardLayout === "compact" ? "hidden" : "block"} mt-1 text-xs leading-5 opacity-75`}>
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>}
        </aside>

        <main className="wizard-form okado-card min-w-0 p-4 sm:p-5" data-testid="wizard-form">
          <div className="flex items-start justify-between gap-4 border-b border-[#edf0f4] pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-aubergine">
                Étape {step.number}
              </p>
              <h2 ref={stepHeadingRef} tabIndex={-1} className="okado-section-title mt-2">{step.id === "prizes" ? "Composez vos lots" : step.title}</h2>
              {step.description ? (
                <p className="mt-2 hidden text-sm text-[#7a8498]">{step.description}</p>
              ) : null}
            </div>
            {inlinePreview ? <div className="hidden rounded-[4px] bg-purple-haze p-3 text-aubergine sm:block">
              <Sparkles className="h-5 w-5" />
            </div> : <WizardResponsivePreview inline={false}>
              <WizardGamePreview draft={draft} merchant={merchant} />
            </WizardResponsivePreview>}
          </div>

          {step.id === "identity" ? (
            <div className="mt-7 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold text-[#182033]">
                  Nom de l’animation <span className="text-[#b42318]">*</span>
                </span>
                <span className="mt-1 block text-xs text-[#8993a6]">
                  Visible dans votre espace marchand et dans vos statistiques.
                </span>
                <input
                  autoFocus
                  required
                  aria-required="true"
                  value={draft.title}
                  onChange={(event) =>
                    patchDraft({ title: event.target.value })
                  }
                  placeholder="Ex. La roue gourmande de juin"
                  className="mt-3 w-full rounded-[12px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3.5 text-sm text-[#182033] outline-none transition focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[#182033]">
                  Promesse affichée au client <span className="text-[#b42318]">*</span>
                </span>
                <span className="mt-1 block text-xs text-[#8993a6]">
                  Une phrase courte, concrète et facile à comprendre sur mobile.
                </span>
                <textarea
                  value={draft.subtitle}
                  onChange={(event) =>
                    patchDraft({
                      subtitle: limitCampaignSubtitleLines(
                        event.target.value,
                        draft.gameType === "wheel" && (isBeautyIndustry(merchant.industry) || isBeautyWheelTemplate(draft.presentation.layout.templateId))
                          ? MAX_BEAUTY_WHEEL_TITLE_LINES
                          : undefined,
                      ),
                    })
                  }
                  rows={3}
                  maxLength={MAX_CAMPAIGN_SUBTITLE_LENGTH}
                  className="mt-3 w-full resize-none rounded-[12px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3.5 text-sm leading-6 text-[#182033] outline-none transition focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
                />
                <span className="mt-1 block text-xs text-[#8993a6]">
                  {draft.subtitle.length}/{MAX_CAMPAIGN_SUBTITLE_LENGTH} caractères · 3 lignes conseillées pour conserver un rendu lisible sur mobile.
                </span>
              </label>
              {draft.gameType === "scratch" && isImmersiveScratchTemplate(draft.presentation.layout.templateId) ? (
                <label className="block">
                  <span className="text-sm font-semibold text-[#182033]">
                    Sous-titre du ticket <span className="font-normal text-[#8993a6]">(optionnel)</span>
                  </span>
                  <textarea
                    value={draft.presentation.layout.scratchSubtitle ?? ""}
                    onChange={(event) =>
                      patchDraft({
                        presentation: {
                          ...draft.presentation,
                          layout: {
                            ...draft.presentation.layout,
                            scratchSubtitle: limitCampaignSubtitleLines(event.target.value),
                          },
                        },
                      })
                    }
                    rows={2}
                    maxLength={MAX_CAMPAIGN_SUBTITLE_LENGTH}
                    placeholder="Ex. De belles surprises pour prendre soin de vous"
                    className="mt-3 w-full resize-none rounded-[12px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3.5 text-sm leading-6 text-[#182033] outline-none transition focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
                  />
                  <span className="mt-1 block text-xs text-[#8993a6]">
                    {(draft.presentation.layout.scratchSubtitle ?? "").length}/{MAX_CAMPAIGN_SUBTITLE_LENGTH} caractères · s’affiche sous le texte principal.
                  </span>
                </label>
              ) : null}
              {draft.gameType === "wheel" ? (
                <label className="block">
                  <span className="text-sm font-semibold text-[#182033]">
                    Sous-titre de la roue <span className="font-normal text-[#8993a6]">(optionnel)</span>
                  </span>
                  <textarea
                    value={draft.presentation.layout.wheelSubtitle ?? ""}
                    onChange={(event) =>
                      patchDraft({
                        presentation: {
                          ...draft.presentation,
                          layout: {
                            ...draft.presentation.layout,
                            wheelSubtitle: limitCampaignSubtitleLines(event.target.value),
                          },
                        },
                      })
                    }
                    rows={3}
                    maxLength={MAX_CAMPAIGN_SUBTITLE_LENGTH}
                    placeholder="Ex. Tentez votre chance !"
                    className="mt-3 w-full resize-none rounded-[12px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3.5 text-sm leading-6 text-[#182033] outline-none transition focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
                  />
                  <span className="mt-1 block text-xs text-[#8993a6]">
                    {(draft.presentation.layout.wheelSubtitle ?? "").length}/{MAX_CAMPAIGN_SUBTITLE_LENGTH} caractères · 3 lignes maximum.
                  </span>
                </label>
              ) : null}
              <div className="grid gap-4">
                <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3 text-sm text-[#182033]">
                    <input
                      type="checkbox"
                      checked={draft.emailCaptureEnabled}
                      onChange={(event) =>
                        patchDraft({ emailCaptureEnabled: event.target.checked })
                      }
                      className="mt-1 h-4 w-4 accent-aubergine"
                    />
                    <span>
                      <span className="block font-semibold">Collecter l’e-mail avant le jeu</span>
                      <span className="mt-1 block text-xs leading-5 text-[#8993a6]">
                        Le joueur saisira son prénom et son e-mail avant de jouer. Sinon, l’e-mail est demandé uniquement après un gain.
                      </span>
                    </span>
                </label>
              </div>
            </div>
          ) : null}

          {step.id === "game" ? (
            <div className="mt-7 space-y-5">
               <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4" data-testid="wizard-game-choices">
                {(
                  [
                    {
                      value: "wheel",
                      label: "Roue de la fortune",
                      text: "Un moment spectaculaire, idéal sur un comptoir.",
                    },
                    {
                      value: "scratch",
                      label: "Ticket à gratter",
                      text: "Un geste tactile simple et immédiat sur mobile.",
                    },
                  ] as const
                ).map((option) => (
                  <GameTypeChoice
                    key={option.value}
                    type={option.value}
                    title={option.label}
                    description={option.text}
                    selected={draft.gameType === option.value}
                    onSelect={() =>
                      setDraft((current) => {
                        if (current.gameType === option.value) {
                          return current;
                        }

                        gameTypeState.current[current.gameType] = snapshotGameTypeState(current);
                        const remembered = gameTypeState.current[option.value];

                        if (remembered) {
                          return {
                            ...current,
                            gameType: option.value,
                            subtitle: remembered.subtitle,
                            accent: { ...remembered.accent },
                            presentation: {
                              ...current.presentation,
                              ...remembered.presentation,
                            },
                          };
                        }

                        const scratchTemplateId = defaultScratchTemplateForIndustry(merchant.industry);
                        const beautyScratch = beautyScratchTemplate(scratchTemplateId);
                        const scratchTextColor = beautyScratch?.text ?? defaultScratchTextColor(scratchTemplateId);
                        const scratchFontFamily = beautyScratch?.font ?? defaultScratchTemplateFont(scratchTemplateId) ?? current.presentation.heading.fontFamily;

                        const nextPrimaryColor =
                          option.value === "wheel"
                            ? resolveWheelPrimaryColorAfterGameTypeSwitch(
                                current.presentation.wheel.loseColor,
                              )
                            : scratchTemplateDefaultPrimaryColor(scratchTemplateId) ?? DEFAULT_SCRATCH_CORAL_COLOR;

                        return {
                          ...current,
                          gameType: option.value,
                          presentation: {
                            ...current.presentation,
                            heading: {
                              ...current.presentation.heading,
                              textColor:
                                option.value === "scratch"
                                  ? scratchTextColor
                                  : current.presentation.heading.textColor,
                              fontFamily:
                                option.value === "scratch"
                                  ? scratchFontFamily
                                  : current.presentation.heading.fontFamily,
                              fontSizePx:
                                option.value === "scratch" && current.presentation.heading.fontSizePx === 40
                                  ? DEFAULT_SCRATCH_HEADING_FONT_SIZE_PX
                                  : option.value === "wheel" && current.presentation.heading.fontSizePx === DEFAULT_SCRATCH_HEADING_FONT_SIZE_PX
                                    ? 40
                                    : current.presentation.heading.fontSizePx,
                            },
                            logo: {
                              ...current.presentation.logo,
                              textColor:
                                option.value === "scratch"
                                  ? scratchTextColor
                                  : current.presentation.logo.textColor,
                            },
                            layout: {
                              ...current.presentation.layout,
                              templateId:
                                option.value === "scratch"
                                  ? scratchTemplateId
                                  : "cocorico-wheel",
                            },
                            wheel:
                              option.value === "wheel"
                                ? {
                                    ...current.presentation.wheel,
                                    loseColor: nextPrimaryColor,
                                    alternateLoseColor: deriveLighterHex(nextPrimaryColor),
                                    rimColor: deriveLighterHex(nextPrimaryColor),
                                  }
                                : current.presentation.wheel,
                            button:
                              option.value === "wheel"
                                ? {
                                    ...current.presentation.button,
                                    backgroundColor: nextPrimaryColor,
                                  }
                                : current.presentation.button,
                          },
                        subtitle: campaignSubtitleForGameTypeChange(
                          draft.subtitle,
                          option.value,
                        ),
                          accent:
                            option.value === "scratch"
                              ? {
                                  ...normalizeScratchAccent(current.accent, scratchTemplateId),
                                  signal: nextPrimaryColor,
                                  ink: scratchTextColor,
                                }
                              : current.accent,
                        };
                      })
                    }
                  />
                ))}
              </div>
              <div className="hidden rounded-[16px] border border-[#e2e8f0] bg-[#fbfcfe] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#182033]">
                      Conditions de gain et de retrait
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#8993a6]">
                      Les règles ci-dessous s’appliquent immédiatement au
                      parcours client et au retrait en caisse.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-[16px] border border-[#e2e8f0] bg-white p-4 text-sm text-[#182033]">
                    <input
                      type="checkbox"
                      checked={draft.rewardRules.isWinningEveryTime}
                      onChange={(event) =>
                        patchDraft({
                          rewardRules: {
                            ...draft.rewardRules,
                            isWinningEveryTime: event.target.checked,
                          },
                        })
                      }
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-aubergine"
                    />
                    <span>
                      <span className="block font-semibold">
                        Jeu 100 % gagnant
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#7a8498]">
                        Chaque participation reçoit un lot. Le total des
                        probabilités doit être égal à 100 %.
                      </span>
                    </span>
                  </label>
                   <label className="hidden">
                    <input
                      type="checkbox"
                      checked={draft.rewardRules.purchaseRequired}
                      onChange={(event) =>
                        patchDraft({
                          rewardRules: {
                            ...draft.rewardRules,
                            purchaseRequired: event.target.checked,
                          },
                        })
                      }
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-aubergine"
                    />
                    <span>
                      <span className="block font-semibold">
                        Achat requis pour le retrait
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#7a8498]">
                        La caisse demandera une confirmation d’achat avant de
                        remettre le lot.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-[16px] border border-[#e2e8f0] bg-white p-4 text-sm text-[#182033]">
                    <input
                      type="checkbox"
                      checked={draft.rewardRules.availableAfterHours > 0}
                      onChange={(event) =>
                        patchDraft({
                          rewardRules: {
                            ...draft.rewardRules,
                            availableAfterHours: event.target.checked ? 24 : 0,
                          },
                        })
                      }
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-aubergine"
                    />
                    <span>
                      <span className="block font-semibold">
                        Lot disponible lors d&apos;une prochaine visite
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#7a8498]">
                        Le lot sera disponible 24 h après la participation, à partir du lendemain.
                      </span>
                    </span>
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div
                    className={`rounded-[14px] border px-4 py-3 ${draft.rewardRules.isWinningEveryTime ? "border-[#b7e4c7] bg-[#f0fbf3]" : "border-[#e2e8f0] bg-white"}`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8993a6]">
                      Gain
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#182033]">
                      {draft.rewardRules.isWinningEveryTime
                        ? "Un lot à chaque participation"
                        : "Gain selon les probabilités"}
                    </p>
                  </div>
                  <div className="hidden">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8993a6]">
                      Retrait
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#182033]">
                      {draft.rewardRules.purchaseRequired
                        ? "Achat vérifié en caisse"
                        : "Sans condition d’achat"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step.id === "prizes" ? (
            <div className="mt-7 space-y-5" data-testid="wizard-prizes-step">
              {!draft.prizes.length ? <section data-testid="wizard-starter-compositions" className="rounded-[14px] border border-[#e8e2ea] bg-white p-4 sm:p-5">
                <h3 className="text-base font-semibold">Choisissez votre point de départ</h3>
                <p className="mb-4 mt-2 text-sm leading-5 text-[#716b78]">Aucun lot n’est ajouté automatiquement. Vérifiez les offres disponibles chez vous, puis personnalisez-les.</p>
                {prizeCatalog.isLoading ? <p role="status" className="inline-flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Chargement des compositions…</p>
                  : prizeCatalog.error ? <div role="alert" className="text-sm"><p>{prizeCatalog.error}</p><button type="button" onClick={prizeCatalog.retry} className="okado-secondary-action mt-3 px-3">Réessayer</button></div>
                  : <WizardPrizeCompositions compositions={starterCompositions} selected={null} confirming={false} winningEveryTime={draft.rewardRules.isWinningEveryTime} onSelect={(id) => { openPrizeLibrary("compositions"); setLibraryCompositionId(id); }} onBack={() => {}} />}
              </section> : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm leading-5 text-[#716b78]">Choisissez les récompenses et définissez les chances de les gagner.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openPrizeLibrary()}
                      className="okado-filled-action inline-flex items-center gap-1.5 px-3 py-2 text-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Trouver des idées de lots
                    </button>
                  <button type="button" onClick={() => openPrizeEditor("create")} className="okado-secondary-action inline-flex items-center gap-1.5 px-3 py-2 text-xs">
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Créer un lot
                  </button>
                </div>
              </div>
              <section aria-labelledby="wizard-prize-distribution-title" className="rounded-[14px] border border-[#e8e2ea] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 id="wizard-prize-distribution-title" className="text-sm font-semibold text-[#242126]">Répartition des chances</h3>
                    <p className="mt-1 text-xs text-[#716b78]">Les chances restantes sont calculées comme des participations perdantes.</p>
                  </div>
                  <StatusBadge tone={totalProbability > 100.0001 ? "danger" : "active"}>
                    {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(totalProbability)} % {totalProbability > 100.0001 ? "au total" : "gagnants"}
                  </StatusBadge>
                </div>
                <div
                  role="img"
                  aria-label={`Répartition : ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(totalProbability)} % de chances de gagner et ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Math.max(0, 100 - totalProbability))} % de chances de perdre.`}
                  data-testid="wizard-prize-distribution"
                  className={`mt-4 flex h-3 w-full overflow-hidden rounded-full ${totalProbability > 100.0001 ? "bg-[#fee4e2]" : "bg-[#eeeaf0]"}`}
                >
                  {draft.prizes.map((prize, index) => (
                    <span key={prize.id} className="h-full min-w-0" style={{ flexGrow: Math.max(0, Number(prize.probability) || 0), flexBasis: 0, backgroundColor: ["#64206f", "#8c5b98", "#b28aba", "#d6bbdc", "#754f7e"][index % 5] }} />
                  ))}
                  {totalProbability <= 100.0001 && Math.max(0, 100 - totalProbability) > 0 ? (
                    <span data-testid="wizard-losing-probability-segment" className="h-full min-w-0 bg-[#e8e2ea]" style={{ flexGrow: Math.max(0, 100 - totalProbability), flexBasis: 0 }} />
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                  <span className="font-semibold text-[#242126]">
                    {totalProbability > 100.0001 ? "Répartition à ajuster" : totalProbability > 0 ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(totalProbability)} % de chances de gagner` : "Aucun lot gagnant configuré"}
                  </span>
                  {totalProbability <= 100.0001 ? <span className="text-[#716b78]">{new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Math.max(0, 100 - totalProbability))} % de chances de perdre</span> : null}
                </div>
              </section>
              {!prizeEditor && !suggestionsOpen && totalProbability > 100.0001 ? (
                <div
                  role="alert"
                  className="rounded-[12px] border border-[#f1c8c6] bg-[#fff6f5] px-4 py-3 text-sm leading-6 text-[#b42318]"
                >
                  Les probabilités dépassent 100 % de {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(totalProbability - 100)} points. Ajustez votre composition avant de continuer.
                </div>
              ) : null}
              <section aria-label="Lots gagnants" className="overflow-hidden rounded-[14px] border border-[#e8e2ea] bg-white" data-testid="wizard-prize-table">
                {draft.prizes.length ? <div data-testid="wizard-prize-table-header" className="hidden grid-cols-[minmax(0,1fr)_6rem_7rem_7rem_6.5rem] gap-3 border-b border-[#eee8f0] bg-[#fcfafc] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#716b78] sm:grid">
                  <span>Lot</span><span className="text-left">Chance</span><span className="text-left">Stock</span><span className="text-left">Coût de revient</span><span className="text-right">Actions</span>
                </div> : null}
                {draft.prizes.length ? draft.prizes.map((prize, index) => {
                  const stock = isEditing
                    ? (prize.remainingQuantity === undefined ? prize.totalQuantity : prize.remainingQuantity)
                    : prize.totalQuantity;
                  return (
                    <article key={prize.id} data-testid="wizard-prize-row" className="wizard-prize-row grid grid-cols-2 gap-x-4 gap-y-3 border-b border-[#eee8f0] px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_7rem_6.5rem] sm:items-center sm:gap-3">
                      <div className="col-span-2 min-w-0 sm:col-span-1">
                        <button type="button" title={prize.label} onClick={() => openPrizeEditor("edit", prize)} className="block max-w-full truncate rounded text-left text-sm font-semibold text-[#242126] hover:text-[#64206f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#64206f]">{prize.label || "Lot sans nom"}</button>
                        <p title={prize.usageConditions} className="mt-1 truncate text-xs text-[#716b78]">{prize.usageConditions?.trim() || "Aucune condition précisée"}</p>
                      </div>
                      <label className="flex min-w-0 items-center gap-1.5 text-sm text-[#242126]">
                        <span className="text-[10px] font-medium text-[#716b78] sm:hidden">Chance</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          aria-label={`Chance de gain pour ${prize.label || `le lot ${index + 1}`}`}
                          value={prize.probability}
                          onChange={(event) => {
                            setDraft((current) => updatePrize(current, prize.id, { probability: Number(event.target.value || 0) }));
                            setError(null);
                          }}
                          className="w-16 min-w-0 rounded-[8px] border border-[#e8e2ea] bg-white px-2 py-2 text-left text-sm font-semibold outline-none focus:border-[#64206f] focus:ring-2 focus:ring-[#64206f]/15"
                        />
                        <span aria-hidden="true">%</span>
                      </label>
                      <p className="text-sm text-[#242126]"><span className="mr-1 text-[10px] font-medium text-[#716b78] sm:hidden">Stock</span>{stock === null || stock === undefined ? "Illimité" : stock}</p>
                      <p className="text-sm text-[#242126]"><span className="mr-1 text-[10px] font-medium text-[#716b78] sm:hidden">Coût de revient</span>{isPrizeCostKnown(prize) ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(prize.estimatedUnitCost) : "À renseigner"}</p>
                      <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                        <button type="button" onClick={() => openPrizeEditor("edit", prize)} aria-label={`Modifier ${prize.label || `le lot ${index + 1}`}`} title="Modifier" className="rounded-[8px] p-2 text-[#64206f] transition hover:bg-[#f6f0fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#64206f]"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" onClick={() => openPrizeEditor("duplicate", { ...prize, id: createWizardPrizeId() })} aria-label={`Dupliquer ${prize.label || `le lot ${index + 1}`}`} title="Dupliquer" className="rounded-[8px] p-2 text-[#64206f] transition hover:bg-[#f6f0fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#64206f]"><Copy className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" onClick={() => setPendingDeletePrize({ id: prize.id, index })} aria-label={`Supprimer ${prize.label || `le lot ${index + 1}`}`} title="Supprimer" className="rounded-[8px] p-2 text-[#9a4440] transition hover:bg-[#fff2f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#64206f]"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="px-5 py-8 text-center">
                    <h3 className="text-base font-semibold text-[#242126]">Quels avantages souhaitez-vous faire gagner ?</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-[#716b78]">Commencez avec une composition suggérée ou créez vos propres lots.</p>
                    <div className="mt-5 grid gap-3 text-left sm:grid-cols-3">
                      {[
                        { title: "Créer rapidement", text: "Choisissez une composition prête à personnaliser.", Icon: Sparkles, action: () => openPrizeLibrary("compositions") },
                        { title: "Explorer les suggestions", text: "Découvrez des lots adaptés à votre activité.", Icon: LibraryBig, action: () => openPrizeLibrary("suggestions") },
                        { title: "Créer mes lots", text: "Ajoutez vos propres récompenses.", Icon: Plus, action: () => openPrizeEditor("create") },
                      ].map(({ title, text, Icon, action }) => <button key={title} type="button" onClick={action} className="rounded-xl border border-[#e8e2ea] p-4 text-left hover:bg-[#f6f0fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#64206f]"><Icon className="mb-2 size-5 text-[#64206f]" aria-hidden="true" /><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-[#716b78]">{text}</span></button>)}
                    </div>
                    <button type="button" onClick={() => openPrizeLibrary("mine")} className="okado-secondary-action mt-4 inline-flex items-center gap-2 px-4 text-sm"><History className="size-4" aria-hidden="true" />Retrouver mes lots précédents</button>
                  </div>
                )}
                {totalProbability <= 100.0001 && 100 - totalProbability > 0 ? (
                  <div data-testid="wizard-losing-probability" className="flex flex-wrap items-center justify-between gap-2 bg-[#f8f6f9] px-4 py-3 text-sm text-[#625d67]">
                    <span className="inline-flex items-center gap-2 font-semibold"><Info className="size-4 shrink-0" aria-hidden="true" /><span>PERDU <span className="font-normal">— chances restantes</span></span></span>
                    <span className="font-semibold">{new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(100 - totalProbability)} %</span>
                  </div>
                ) : null}
              </section>
              {!prizeEditor && !suggestionsOpen && totalProbability <= 100.0001 && prizeValidationMessages.length > 0 ? (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-[12px] border border-[#f3c8c8] bg-[#fff7f7] px-4 py-4 text-sm text-[#9f1239]"
                >
                  <p className="font-semibold text-[#861c35]">
                    Vérifiez la dotation avant de continuer
                  </p>
                  <ul className="mt-2 space-y-1.5 leading-6">
                    {prizeValidationMessages.map((validationMessage) => (
                      <li key={validationMessage} className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{validationMessage}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <details data-testid="wizard-prize-rules" className="group rounded-[14px] border border-[#e8e2ea] bg-white">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 text-left [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start gap-3">
                    <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-[#716b78]" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-semibold text-[#242126]">Règles de participation et de validité</span>
                      <span className="mt-1 block text-xs leading-5 text-[#716b78]">
                        {draft.rewardRules.availableAfterHours === 24 ? "Utilisable dès demain" : draft.rewardRules.availableAfterHours > 0 ? `Utilisable après ${draft.rewardRules.availableAfterHours} h` : "Utilisable le jour du jeu"}
                        {` · Valable ${draft.rewardRules.availabilityDurationDays} jours · ${draft.rewardRules.participationIntervalDays === 1 ? "1 participation / jour" : `1 participation tous les ${draft.rewardRules.participationIntervalDays} jours`}`}
                      </span>
                    </span>
                  </span>
                  <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[#716b78] transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="space-y-5 border-t border-[#eee8f0] p-4">
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-[#242126]">
                    <input type="checkbox" checked={draft.rewardRules.isWinningEveryTime}
                      onChange={(event) => patchDraft({ rewardRules: { ...draft.rewardRules, isWinningEveryTime: event.target.checked } })}
                      className="mt-0.5 h-4 w-4 accent-aubergine" />
                    <span><span className="block font-semibold">Jeu 100 % gagnant</span><span className="mt-1 block text-xs leading-5 text-[#716b78]">À la publication, les chances doivent totaliser 100 % et au moins un lot doit avoir un stock illimité. Cocher cette case ne modifie pas les chances saisies. Pendant le jeu, si un stock est épuisé, ses chances sont réparties proportionnellement entre les lots disponibles à chance positive. Un lot à 0 % ne peut pas être gagné. Sans lot éligible, aucune nouvelle partie ne peut démarrer.</span></span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-[#242126]">
                    <input type="checkbox" checked={draft.rewardRules.availableAfterHours > 0}
                      onChange={(event) => patchDraft({ rewardRules: { ...draft.rewardRules, availableAfterHours: event.target.checked ? 24 : 0 } })}
                      className="mt-0.5 h-4 w-4 accent-aubergine" />
                    <span>
                      <span className="block font-semibold">Le gain est utilisable à partir du lendemain</span>
                      <span className="mt-1 block text-xs leading-5 text-[#716b78]">Le participant ne peut pas utiliser son gain le jour où il joue.</span>
                    </span>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-2 block font-semibold text-[#242126]">Durée de validité du gain (jours)</span>
                      <input type="number" min={0} max={365} value={draft.rewardRules.availabilityDurationDays}
                        aria-invalid={Boolean(ruleErrors.availabilityDurationDays)} aria-describedby="wizard-validity-help"
                        onChange={(event) => patchDraft({ rewardRules: { ...draft.rewardRules, availabilityDurationDays: Number(event.target.value) } })}
                        className="w-full rounded-[10px] border border-[#e8e2ea] bg-white px-3 py-3 text-sm" />
                      <span id="wizard-validity-help" className={`mt-1 block text-xs leading-5 ${ruleErrors.availabilityDurationDays ? "text-[#b42318]" : "text-[#716b78]"}`}>{ruleErrors.availabilityDurationDays ?? "Nombre de jours pendant lesquels le participant peut utiliser son gain."}</span>
                    </label>
                    <label className="block text-sm">
                      <span className="mb-2 block font-semibold text-[#242126]">Délai minimum entre deux participations (jours)</span>
                      <input type="number" min={1} max={365} value={draft.rewardRules.participationIntervalDays}
                        aria-invalid={Boolean(ruleErrors.participationIntervalDays)} aria-describedby="wizard-interval-help"
                        onChange={(event) => patchDraft({ rewardRules: { ...draft.rewardRules, participationIntervalDays: Number(event.target.value) } })}
                        className="w-full rounded-[10px] border border-[#e8e2ea] bg-white px-3 py-3 text-sm" />
                      <span id="wizard-interval-help" className={`mt-1 block text-xs leading-5 ${ruleErrors.participationIntervalDays ? "text-[#b42318]" : "text-[#716b78]"}`}>{ruleErrors.participationIntervalDays ?? "Durée à attendre avant qu’un même participant puisse rejouer."}</span>
                    </label>
                  </div>
                </div>
              </details>
              <WizardPrizeBudget prizes={draft.prizes} onEdit={(index) => openPrizeEditor("edit", draft.prizes[index])} />
            </div>
          ) : null}

          {step.id === "action" ? (
            <div className="mt-7">
              <MarketingActionsStep merchant={merchant} links={marketingLinks} actions={draft.actions}
                adminAccountMerchantId={adminAccountMerchantId}
                onChange={actions => { setDraft(current => ({ ...current, actions })); setError(null); }}
                onLinkSaved={(key, url) => setMarketingLinks(current => ({ ...current, [marketingActionEntry(key).field]: url }))}
              />
              <GoogleClickSetting merchantId={merchant.id} adminAccountMerchantId={adminAccountMerchantId}
                required={draft.googleClickRequired} hasGoogle={draft.actions.some(action => action.kind === "google")}
                onChange={(googleClickRequired, googleClickAcceptanceId) => patchDraft({ googleClickRequired, googleClickAcceptanceId })} />
            </div>
          ) : null}

          {step.id === "appearance" ? (
            <div className="mt-7 space-y-5">
              {draft.gameType === "wheel" && isBeautyIndustry(merchant.industry) ? (
                <BeautyWheelTemplateGallery
                  selectedTemplateId={draft.presentation.layout.templateId}
                  onSelect={selectBeautyWheelTemplate}
                />
              ) : null}
              {draft.gameType === "scratch" && isBeautyIndustry(merchant.industry) ? (
                <BeautyScratchTemplateGallery
                  selectedTemplateId={draft.presentation.layout.templateId}
                  onSelect={selectBeautyScratchTemplate}
                />
              ) : null}
              {draft.gameType === "wheel" ? <h3 className="text-base font-semibold text-carbon">Autres templates de roue</h3> : null}
              <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3" data-testid="classic-template-options">
                {(
                  draft.gameType === "scratch"
                    ? [
                        { id: "scratch-nude-classic", label: "Nude", text: "Un fond doux et neutre, personnalisable avec votre image" },
                        { id: "scratch-vault", label: "Coffre néon", text: "Coffre illustré avant grattage" },
                        { id: "scratch-confetti", label: "Carte confettis", text: "Solaire et festif" },
                        { id: "scratch-coral", label: "Corail joyeux", text: "Clair et chaleureux" },
                        { id: "scratch-lilac", label: "Cadeau lilas", text: "Cadeau clair et contrasté" },
                        { id: "scratch-sunburst", label: "Rayons soleil", text: "Éclatant et visible" },
                      ] as const
                    : [
                     ...CHRISTMAS_WHEEL_THEMES.map(theme => ({ id: theme.id, label: theme.name, text: theme.description })),
                     { id: "halloween-gold", label: "Halloween doré", text: "Roses noires et dorures, décor et palette fixes" },
                     {
                       id: "cocorico-wheel",
                       label: "Moderne",
                       text: "Bleu, blanc et pictogrammes cadeaux",
                    },
                    {
                      id: "cocorico-duo-wheel",
                       label: "Bicolore",
                       text: "Bleu clair, jaune et pictogrammes cadeaux",
                     },
                     {
                       id: "rose-institut",
                       label: "Éclat",
                       text: "Roue lumineuse et personnalisable",
                     },
                     {
                       id: "classic",
                       label: "Dynamique",
                       text: "Rayonnant et spectaculaire",
                     },
                     {
                       id: "restaurant-pop",
                       label: "Signature",
                       text: "Épuré et raffiné",
                     },
                    {
                      id: "cosmic-orbit",
                      label: "Orbit néon",
                      text: "Immersif et nocturne",
                    },
                    {
                      id: "sunburst-festival",
                      label: "Soleil pop",
                      text: "Festif et lumineux",
                    },
                      ] as const
                )
                  .filter((template) => template.id !== "cosmic-orbit" && template.id !== "sunburst-festival")
                  .filter((template) => draft.gameType !== "scratch" || !isHiddenScratchTemplate(template.id))
                  .filter((template) => !isBeautyIndustry(merchant.industry) || template.id !== "rose-institut")
                  .slice()
                  .map((template) => (
                  <GameTemplateCard
                    key={template.id}
                    label={template.label}
                    description={template.text}
                    selected={draft.presentation.layout.templateId === template.id}
                    onSelect={() => {
                      captureClientProductEvent("campaign_template_selected", {
                        campaignType: draft.gameType,
                        templateKey: template.id,
                        wizardMode: "guided",
                      });
                      setDraft((current) => {
                        if (current.presentation.layout.templateId === template.id) {
                          return current;
                        }

                        const currentTemplateId = current.presentation.layout.templateId ?? "classic";
                        wheelTemplateState.current[currentTemplateId] = {
                          wheel: current.presentation.wheel,
                          backgroundColor: current.presentation.background.color,
                          scratchSignal: current.accent.signal,
                          scratchTextColor: current.accent.ink,
                          headingTextColor: current.presentation.heading.textColor,
                          logoTextColor: current.presentation.logo.textColor ?? current.presentation.heading.textColor,
                          headingFontFamily: current.presentation.heading.fontFamily,
                          headingAlign: current.presentation.heading.align,
                          logoAlign: current.presentation.logo.align,
                          logoBottomSpacingPx: current.presentation.logo.marginBottomPx,
                          buttonBackgroundColor: current.presentation.button.backgroundColor,
                          blockSpacingPx: current.presentation.layout.blockSpacingPx,
                          subtitleSpacingPx: current.presentation.layout.subtitleSpacingPx,
                        };
                        const remembered = wheelTemplateState.current[template.id];
                        const wheel = remembered?.wheel ?? wheelPaletteForTemplate(template.id, current.presentation.wheel);
                        const backgroundColor = remembered?.backgroundColor ?? wheelBackgroundForTemplateSelection(template.id, current.presentation.background.color, wheel.loseColor);
                        const headingTextColor = remembered?.headingTextColor ?? (current.gameType === "scratch" ? defaultScratchTextColor(template.id) : template.id === "rose-institut" ? DEFAULT_ROSE_INSTITUT_TEXT_COLOR : wheelHeadingColorForTemplateSelection(template.id, isBeautyWheelTemplate(currentTemplateId) ? "#1b2842" : current.presentation.heading.textColor));
                        const logoTextColor = remembered?.logoTextColor ?? (current.gameType === "scratch" ? defaultScratchTextColor(template.id) : template.id === "rose-institut" ? DEFAULT_ROSE_INSTITUT_TEXT_COLOR : wheelLogoColorForTemplateSelection(template.id, wheelHeadingColorForTemplateSelection(template.id, isBeautyWheelTemplate(currentTemplateId) ? "#1b2842" : current.presentation.logo.textColor ?? current.presentation.heading.textColor)));
                        const firstSelectionHeadingFont = wheelHeadingFontForTemplateSelection(template.id, current.presentation.heading.fontFamily);
                        const buttonBackgroundColor = remembered?.buttonBackgroundColor ?? christmasWheelTheme(template.id)?.button ?? (template.id === "rose-institut" ? DEFAULT_ROSE_INSTITUT_TEXT_COLOR : wheel.loseColor);
                        const scratchSignal =
                          remembered?.scratchSignal ??
                          (scratchTemplateDefaultPrimaryColor(template.id) &&
                          shouldApplyScratchTemplateDefaultPrimaryColor(current.accent.signal)
                            ? scratchTemplateDefaultPrimaryColor(template.id)!
                            : current.accent.signal);

                        return {
                          ...current,
                          subtitle: template.id === "halloween-gold" && current.subtitle === DEFAULT_WHEEL_SUBTITLE ? "TOURNEZ\nLA ROUE" : current.subtitle,
                          presentation: {
                            ...current.presentation,
                            background: {
                              ...current.presentation.background,
                              color: backgroundColor,
                            },
                            layout: {
                              ...current.presentation.layout,
                              templateId: template.id,
                              wheelTemplateStyles: { ...current.presentation.layout.wheelTemplateStyles, [currentTemplateId]: wheelTemplateState.current[currentTemplateId] },
                              blockSpacingPx: wheelTemplateState.current[template.id]?.blockSpacingPx ?? defaultWheelBlockSpacingForTemplate(template.id),
                              subtitleSpacingPx: remembered?.subtitleSpacingPx ?? defaultWheelSubtitleSpacingForTemplate(template.id),
                            },
                            heading:
                              {
                                ...current.presentation.heading,
                                textColor: headingTextColor,
                                align: remembered?.headingAlign ?? (isBeautyWheelTemplate(currentTemplateId) ? "center" : current.presentation.heading.align),
                                fontSizePx:
                                  template.id === "rose-institut" &&
                                  [34, 40, 42].includes(current.presentation.heading.fontSizePx)
                                    ? DEFAULT_WHEEL_HEADING_FONT_SIZE_PX
                                    : current.presentation.heading.fontSizePx,
                                fontFamily:
                                  remembered?.headingFontFamily ??
                                  (current.gameType === "scratch"
                                    ? defaultScratchTemplateFont(template.id) ?? current.presentation.heading.fontFamily
                                    : template.id === "rose-institut"
                                    ? DEFAULT_ROSE_INSTITUT_HEADING_FONT_FAMILY
                                    : template.id === "classic"
                                    ? firstSelectionHeadingFont
                                    : isCocoricoWheelTemplate(template.id) || isClassicPopWheelTemplate(template.id)
                                    ? template.id === "restaurant-pop" ? "lato" : "fredoka"
                                    : firstSelectionHeadingFont),
                              },
                            logo: {
                              ...current.presentation.logo,
                              textColor: current.gameType === "scratch" ? resolveScratchTemplateTextColor(logoTextColor, template.id) : logoTextColor,
                              marginBottomPx: wheelLogoGapForTemplateSelection(template.id, currentTemplateId, current.presentation.logo.marginBottomPx, remembered?.logoBottomSpacingPx),
                              align: remembered?.logoAlign ?? (isBeautyWheelTemplate(currentTemplateId) ? "center" : current.presentation.logo.align),
                            },
                            button:
                              current.gameType === "wheel"
                                ? {
                                    ...current.presentation.button,
                                    backgroundColor: buttonBackgroundColor,
                                  }
                                : current.presentation.button,
                            wheel,
                          },
                          accent:
                            current.gameType === "scratch"
                              ? {
                                  ...normalizeScratchAccent(current.accent, template.id),
                                  signal: scratchSignal,
                                  ink: remembered?.scratchTextColor ?? defaultScratchTextColor(template.id),
                                }
                              : current.accent,
                        };
                      });
                    }}
                  >
                    {draft.gameType === "wheel" ? <WheelTemplateThumbnail templateId={template.id as GamePageTemplateId} card /> : null}
                    {draft.gameType === "scratch" ? <ScratchTemplateThumbnail templateId={template.id} card /> : null}
                  </GameTemplateCard>
                ))}
               </div>

               <div className="space-y-4 rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                 <label className="block">
                   <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#182033]">
                     {draft.gameType === "wheel" ? "Couleur principale de la roue" : "Couleur principale du ticket"}
                     {draft.presentation.layout.templateId === "halloween-gold" || (draft.gameType === "scratch" &&
                     scratchTemplateUsesFixedPrimaryColor(draft.presentation.layout.templateId)) ? (
                       <span className="rounded-full bg-[#f1ebff] px-2 py-0.5 text-[11px] font-semibold text-[#6944a1]">Palette fixe</span>
                     ) : null}
                   </span>
                   <input
                     type="color"
                      disabled={draft.presentation.layout.templateId === "halloween-gold" || (draft.gameType === "scratch" && scratchTemplateUsesFixedPrimaryColor(draft.presentation.layout.templateId))}
                     value={draft.presentation.layout.templateId === "halloween-gold" ? "#ecac52" : draft.gameType === "wheel" ? draft.presentation.wheel.loseColor : draft.accent.signal}
                     onChange={(event) => {
                       const color = event.target.value;
                       setDraft((current) => {
                         const buttonFollowsPrimary =
                           current.presentation.button.backgroundColor.toLowerCase() ===
                           current.presentation.wheel.loseColor.toLowerCase();

                         return {
                           ...current,
                           accent: current.gameType === "scratch" ? { ...current.accent, signal: color } : current.accent,
                           presentation: {
                             ...current.presentation,
                             background: {
                               ...current.presentation.background,
                               color: wheelBackgroundAfterPrimaryColorChange(current.presentation.layout.templateId, current.presentation.background.color, current.presentation.wheel.loseColor, color),
                             },
                             button: current.gameType === "wheel"
                               ? {
                                   ...current.presentation.button,
                                   ...(buttonFollowsPrimary ? { backgroundColor: color } : {}),
                                   borderColor: color,
                                 }
                               : current.presentation.button,
                             wheel: current.gameType === "wheel"
                               ? {
                                   ...current.presentation.wheel,
                                   loseColor: color,
                                   alternateLoseColor:
                                     (current.presentation.layout.templateId === "classic" || current.presentation.layout.templateId === "cocorico-duo-wheel" || isBeautyWheelTemplate(current.presentation.layout.templateId))
                                       ? current.presentation.wheel.alternateLoseColor
                                       : deriveLighterHex(color),
                                   rimColor: isBeautyWheelTemplate(current.presentation.layout.templateId) ? color : deriveLighterHex(color),
                                 }
                               : current.presentation.wheel,
                           },
                         };
                       });
                     }}
                      className="mt-3 h-12 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] bg-white p-1 disabled:cursor-not-allowed disabled:opacity-55"
                   />
                 </label>

                 {draft.gameType === "wheel" && (draft.presentation.layout.templateId === "classic" || draft.presentation.layout.templateId === "restaurant-pop" || draft.presentation.layout.templateId === "cocorico-duo-wheel" || isBeautyWheelTemplate(draft.presentation.layout.templateId)) ? (
                   <label className="block">
                     <span className="text-sm font-semibold text-[#182033]">Couleur secondaire</span>
                     <input
                       type="color"
                       value={draft.presentation.layout.templateId === "classic" || draft.presentation.layout.templateId === "cocorico-duo-wheel" || isBeautyWheelTemplate(draft.presentation.layout.templateId) ? draft.presentation.wheel.alternateLoseColor : draft.presentation.wheel.winColor}
                       onChange={(event) =>
                         patchDraft({
                           presentation: {
                             ...draft.presentation,
                             wheel: draft.presentation.layout.templateId === "classic" || draft.presentation.layout.templateId === "cocorico-duo-wheel" || isBeautyWheelTemplate(draft.presentation.layout.templateId)
                               ? { ...draft.presentation.wheel, alternateLoseColor: event.target.value }
                               : { ...draft.presentation.wheel, winColor: event.target.value },
                           },
                         })
                       }
                       className="mt-3 h-12 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] bg-white p-1"
                     />
                   </label>
                 ) : null}

                 <label className="block">
                   <span className="text-sm font-semibold text-[#182033]">Police du texte</span>
                   <select
                     value={draft.presentation.heading.fontFamily}
                     onChange={(event) =>
                       patchDraft({
                         presentation: {
                           ...draft.presentation,
                           heading: {
                             ...draft.presentation.heading,
                             fontFamily: event.target.value as TextFont,
                           },
                         },
                       })
                     }
                     className="mt-3 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]"
                   >
                     {(beautyWheelFontOptions(draft.presentation.layout.templateId) ?? (isCocoricoWheelTemplate(draft.presentation.layout.templateId) ? COCORICO_TEXT_FONTS : WIZARD_TEXT_FONTS)).map((font) => (
                       <option key={font} value={font} className={textFontClass(font)}>{textFontLabel(font)}</option>
                     ))}
                   </select>
                 </label>

                 <label className="block">
                   <span className="flex items-center justify-between gap-3 text-sm font-semibold text-[#182033]">
                     <span>Taille du texte</span>
                     <output className="text-aubergine">{draft.presentation.heading.fontSizePx} px</output>
                   </span>
                   <input
                     type="range"
                     min={18}
                     max={72}
                     step={1}
                     value={draft.presentation.heading.fontSizePx}
                     onChange={(event) =>
                       patchDraft({
                         presentation: {
                           ...draft.presentation,
                           heading: {
                             ...draft.presentation.heading,
                             fontSizePx: Number(event.target.value),
                           },
                         },
                       })
                     }
                     className="mt-3 w-full cursor-pointer accent-aubergine"
                     aria-label="Taille de la police"
                   />
                 </label>
               </div>

               {logoSettings}

               <details className="group rounded-[16px] border border-[#e2e8f0] bg-[#fbfcfe]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-sm font-semibold text-[#182033] [&::-webkit-details-marker]:hidden">
                  <span>
                    Paramètres avancés <span className="font-normal text-[#8993a6]">(mode expert)</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#8993a6] transition-transform group-open:rotate-180" />
                </summary>
                 <div className="space-y-5 border-t border-[#e2e8f0] px-4 pb-4 pt-4">
                   <section className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                     <p className="text-sm font-semibold text-[#182033]">Espacements</p>
                     <div className="mt-4">
                       <CampaignSpacingControls
                         gameType={draft.gameType}
                         logoMode={draft.logoMode}
                         hasScratchSubtitle={Boolean(scratchVisualTheme(draft.presentation.layout.templateId))}
                         logoSpacingPx={draft.presentation.logo.marginBottomPx}
                         blockSpacingPx={draft.presentation.layout.blockSpacingPx}
                         subtitleSpacingPx={draft.presentation.layout.subtitleSpacingPx ?? DEFAULT_WHEEL_SUBTITLE_SPACING_PX}
                         onLogoSpacingChange={(value) =>
                           patchDraft({
                             presentation: {
                               ...draft.presentation,
                               logo: {
                                 ...draft.presentation.logo,
                                 marginBottomPx: clampCampaignSpacingPx(value),
                               },
                             },
                           })
                         }
                         onBlockSpacingChange={(value) =>
                           patchDraft({
                             presentation: {
                               ...draft.presentation,
                               layout: {
                                 ...draft.presentation.layout,
                                 blockSpacingPx: clampCampaignSpacingPx(value),
                               },
                             },
                           })
                         }
                         onSubtitleSpacingChange={(value) =>
                           patchDraft({
                             presentation: {
                               ...draft.presentation,
                               layout: {
                                 ...draft.presentation.layout,
                                 subtitleSpacingPx: clampCampaignSpacingPx(
                                   value,
                                   DEFAULT_WHEEL_SUBTITLE_SPACING_PX,
                                 ),
                               },
                             },
                           })
                         }
                       />
                     </div>
                   </section>
               <div className="hidden">
                    {draft.gameType === "wheel" ? (
                  <>
                {draft.presentation.layout.templateId === "classic" ? (
                <label className="block">
                  <span className="text-sm font-semibold text-[#182033]">
                    Couleur de fond
                  </span>
                  <input
                    type="color"
                    value={draft.presentation.background.color}
                    onChange={(event) =>
                      patchDraft({
                        presentation: {
                          ...draft.presentation,
                          background: {
                            ...draft.presentation.background,
                            color: event.target.value,
                          },
                        },
                      })
                    }
                    className="mt-3 h-12 w-full rounded-[12px] border border-[#dbe3ed] bg-white p-1"
                  />
                </label>
                ) : null}
                <label className="block">
                  <span className="text-sm font-semibold text-[#182033]">
                    Couleur principale de la roue
                  </span>
                  <input
                    type="color"
                    value={
                      draft.gameType === "wheel"
                        ? draft.presentation.wheel.loseColor
                        : draft.presentation.button.backgroundColor
                    }
                    onChange={(event) => {
                      const color = event.target.value;
                      setDraft((current) => ({
                        ...current,
                        presentation: {
                          ...current.presentation,
                          button: {
                            ...current.presentation.button,
                            backgroundColor: color,
                            borderColor: color,
                          },
                          wheel:
                            current.gameType === "wheel"
                              ? {
                                  ...current.presentation.wheel,
                                  loseColor: color,
                                  alternateLoseColor: current.presentation.layout.templateId === "classic" ? current.presentation.wheel.alternateLoseColor : deriveLighterHex(color),
                                  rimColor: deriveLighterHex(color),
                                }
                              : current.presentation.wheel,
                        },
                      }));
                    }}
                    className="mt-3 h-12 w-full rounded-[12px] border border-[#dbe3ed] bg-white p-1"
                  />
                 </label>
                 {draft.presentation.layout.templateId === "restaurant-pop" ? (
                   <label className="block">
                     <span className="text-sm font-semibold text-[#182033]">Couleur secondaire</span>
                     <span className="hidden">
                       Utilisée pour les accents graphiques du template Signature.
                     </span>
                     <input
                       type="color"
                       value={draft.presentation.wheel.winColor}
                       onChange={(event) =>
                         patchDraft({
                           presentation: {
                             ...draft.presentation,
                             wheel: {
                               ...draft.presentation.wheel,
                               winColor: event.target.value,
                             },
                           },
                         })
                       }
                       className="mt-3 h-12 w-full rounded-[12px] border border-[#dbe3ed] bg-white p-1"
                     />
                   </label>
                 ) : null}
                   </>
                ) : null}
              </div>
               {draft.gameType === "scratch" ? (
                 <label className="hidden">
                  <span className="text-sm font-semibold text-[#182033]">
                    Couleur principale du ticket
                  </span>
                  <span className="mt-1 block text-xs text-[#8993a6]">
                    {draft.presentation.layout.templateId === "scratch-confetti"
                      ? "Ce template utilise sa propre palette ; la couleur sélectionnée ici n’est pas utilisée."
                      : "Elle colore la zone à gratter et les éléments graphiques du template."}
                  </span>
                  <input
                    type="color"
                    value={draft.accent.signal}
                    onChange={(event) =>
                      patchDraft({
                        accent: { ...draft.accent, signal: event.target.value },
                      })
                    }
                    className="mt-3 h-12 w-full rounded-[12px] border border-[#dbe3ed] bg-white p-1"
                  />
                </label>
              ) : null}
               <div className="hidden rounded-[16px] border border-[#e2e8f0] bg-white p-4 sm:col-span-2">
                <p className="text-sm font-semibold text-[#182033]">Typographie</p>
                <p className="mt-1 text-xs leading-5 text-[#8993a6]">
                  Choisissez la police et la taille de la promesse affichée sur le jeu.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1.4fr] sm:items-end">
                  <label className="block text-sm">
                    <span className="mb-2 block font-semibold text-[#182033]">Police</span>
                    <select
                      value={draft.presentation.heading.fontFamily}
                      onChange={(event) =>
                        patchDraft({
                          presentation: {
                            ...draft.presentation,
                            heading: {
                              ...draft.presentation.heading,
                              fontFamily: event.target.value as TextFont,
                            },
                          },
                        })
                      }
                      className="w-full rounded-[12px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]"
                    >
                      {(beautyWheelFontOptions(draft.presentation.layout.templateId) ?? (isCocoricoWheelTemplate(draft.presentation.layout.templateId) ? COCORICO_TEXT_FONTS : WIZARD_TEXT_FONTS)).map((font) => (
                        <option key={font} value={font} className={textFontClass(font)}>
                          {textFontLabel(font)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-2 flex items-center justify-between gap-3 font-semibold text-[#182033]">
                      <span>Taille</span>
                     <output className="text-aubergine">{draft.presentation.heading.fontSizePx} px</output>
                    </span>
                    <input
                      type="range"
                      min={18}
                      max={72}
                      step={1}
                      value={draft.presentation.heading.fontSizePx}
                      onChange={(event) =>
                        patchDraft({
                          presentation: {
                            ...draft.presentation,
                            heading: {
                              ...draft.presentation.heading,
                              fontSizePx: Number(event.target.value),
                            },
                          },
                        })
                      }
                     className="w-full cursor-pointer accent-aubergine"
                      aria-label="Taille de la police"
                    />
                  </label>
                </div>
              </div>
                <div className="space-y-5">
                  <section className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                    <p className="text-sm font-semibold text-[#182033]">Fond</p>
                    {draft.presentation.layout.templateId === "halloween-gold" ? <p className="mt-3 text-sm text-[#526078]">Décor Halloween, dorures du titre et roue fixes. Le logo, les textes, leurs tailles et espacements restent personnalisables.</p> : <>
               <div className="mt-3 grid gap-3 sm:grid-cols-2">{([{ value: "color", label: "Couleur" }, { value: "image", label: "Image" }] as const).map((mode) => <button key={mode.value} type="button" onClick={() => patchDraft({ presentation: { ...draft.presentation, background: { ...draft.presentation.background, mode: mode.value } } })} className={`cursor-pointer rounded-[12px] border px-3 py-2.5 text-sm font-semibold ${draft.presentation.background.mode === mode.value ? "border-aubergine bg-purple-haze text-deep-plum" : "border-[#dbe3ed] bg-white text-[#526078]"}`}>{mode.label}</button>)}</div>
                    {draft.presentation.background.mode === "color" ? <label className="mt-3 block text-sm"><span className="mb-2 block font-semibold">Couleur de fond</span><input type="color" value={draft.presentation.background.color} onChange={(event) => patchDraft({ presentation: { ...draft.presentation, background: { ...draft.presentation.background, color: event.target.value } } })} className="h-12 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] p-1" /></label> : <label aria-live="polite" className={`mt-3 flex items-center justify-between rounded-[12px] border border-dashed border-[#b8c5d8] px-3 py-3 text-sm font-semibold ${imageUploads.background ? "cursor-wait opacity-75" : "cursor-pointer"}`}><span className="inline-flex items-center gap-2">{imageUploads.background ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Import et optimisation…</> : "Importer une image de fond"}</span><input type="file" accept={MERCHANT_IMAGE_ACCEPT} className="hidden" disabled={imageUploads.background} onChange={(event) => uploadWizardImage(event, (value) => { setImageUploadErrors((current) => ({ ...current, background: undefined })); patchDraft({ presentation: { ...draft.presentation, background: { ...draft.presentation.background, mode: "image", imageUrl: value } } }); }, (message) => setImageUploadErrors((current) => ({ ...current, background: message })), "background", adminAccountMerchantId ? { accountMerchantId: adminAccountMerchantId, locationId: merchant.id } : undefined, (isUploading) => setImageUploads((current) => ({ ...current, background: isUploading })))} /></label>}
                    {imageUploadErrors.background ? <p role="alert" className="mt-2 text-xs text-[#b42318]">{imageUploadErrors.background}</p> : null}
                    {draft.presentation.background.mode === "image" ? <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={() => setBackgroundLibraryOpen(true)} className="cursor-pointer rounded-[4px] border border-aubergine bg-aubergine px-3 py-2.5 text-sm font-semibold text-white">Choisir dans la bibliothèque</button>{draft.presentation.background.imageUrl ? <span className="rounded-full bg-[#e9f8ec] px-3 py-1.5 text-xs font-semibold text-[#18864b]">Image sélectionnée</span> : null}</div> : null}
                    </>}
                  </section>
                   <section className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                     <p className="text-sm font-semibold text-[#182033]">Couleur du texte</p>
                     <div className="mt-3 grid gap-4 sm:grid-cols-2">
                       {!isCocoricoWheelTemplate(draft.presentation.layout.templateId) && draft.presentation.layout.templateId !== "halloween-gold" ? <label className="block text-sm">
                         <span className="mb-2 block font-semibold">Couleur du texte principal</span>
                         <input type="color" value={draft.presentation.heading.textColor} onChange={(event) => patchDraft({ presentation: { ...draft.presentation, heading: { ...draft.presentation.heading, textColor: event.target.value } } })} className="h-12 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] p-1" aria-label="Couleur du texte principal" />
                       </label> : null}
                       <label className="block text-sm">
                         <span className="mb-2 flex items-center justify-between gap-2 font-semibold">Couleur du logo et sous-titre
                           {draft.presentation.layout.templateId === "halloween-gold" ? <span className="rounded-full bg-[#f1ebff] px-2 py-0.5 text-[11px] font-semibold text-[#6944a1]">Palette fixe</span> : null}
                         </span>
                         <input
                           type="color"
                           disabled={draft.presentation.layout.templateId === "halloween-gold"}
                           value={draft.presentation.layout.templateId === "halloween-gold" ? "#ffffff" : draft.presentation.logo.textColor ?? draft.presentation.heading.textColor}
                           onChange={(event) => patchDraft({ presentation: { ...draft.presentation, logo: { ...draft.presentation.logo, textColor: event.target.value } } })}
                           className="h-12 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] bg-white p-1 disabled:cursor-not-allowed"
                           aria-label="Couleur du logo et sous-titre"
                         />
                         {draft.presentation.layout.templateId === "halloween-gold" ? <span className="mt-2 block text-xs text-[#526078]">Logo blanc et sous-titre doré : couleurs fixes du template.</span> : null}
                       </label>
                   </div>
                   </section>
                   {draft.gameType === "wheel" && draft.presentation.layout.templateId !== "halloween-gold" ? <section className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                     <p className="text-sm font-semibold text-[#182033]">Bouton JOUER</p>
                     <p className="mt-1 text-xs leading-5 text-[#8993a6]">
                       Personnalisez la couleur du bouton central de la roue. Par défaut, elle reprend celle du texte principal.
                     </p>
                     <label className="mt-3 block text-sm">
                       <span className="mb-2 block font-semibold">Couleur du bouton JOUER</span>
                       <input
                         type="color"
                         value={draft.presentation.button.backgroundColor}
                         onChange={(event) =>
                           patchDraft({
                             presentation: {
                               ...draft.presentation,
                               button: {
                                 ...draft.presentation.button,
                                 backgroundColor: event.target.value,
                               },
                             },
                           })
                         }
                         className="h-12 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] p-1"
                         aria-label="Couleur du bouton JOUER"
                       />
                     </label>
                   </section> : null}
                   {draft.gameType !== "wheel" && scratchTemplateUsesTicketTextColor(draft.presentation.layout.templateId) ? <section className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                    <p className="text-sm font-semibold text-[#182033]">
                      Couleurs du ticket
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#8993a6]">
                      Ces réglages complètent la couleur principale sélectionnée précédemment.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {([ ["ink", "Texte du ticket", draft.accent.ink] ] as const).map(([key, label, value]) => (
                          <label key={key} className="block text-sm">
                            <span className="mb-2 block font-semibold text-[#182033]">{label}</span>
                            <input
                              type="color"
                              value={value}
                              onChange={(event) =>
                                patchDraft({
                                  accent: { ...draft.accent, [key]: event.target.value },
                                })
                              }
                              className="h-12 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] bg-white p-1"
                            />
                          </label>
                        ))}
                    </div>
                  </section> : null}
                </div>                </div>
              </details>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="mt-6 rounded-[16px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm leading-6 text-[#a11a1a]"
            >
              {error}
            </div>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3 border-t border-[#edf0f4] pt-5" data-testid="wizard-footer">
            <button
              type="button"
              onClick={previousStep}
              disabled={stepIndex === 0 || isSaving}
              className="okado-secondary-action gap-2 px-4 text-sm disabled:opacity-45"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </button>
            <div className="flex min-w-0 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveCampaign("save")}
                disabled={isSaving}
                className={`${draft.isActive ? "okado-filled-action" : "okado-secondary-action"} px-4 text-sm disabled:opacity-50`}
              >
                {isSaving ? "Enregistrement…" : saveActionLabel}
              </button>
              {stepIndex < WIZARD_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="okado-filled-action gap-2 px-5 text-sm"
                >
                  Continuer
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : !draft.isActive ? (
                <button
                  type="button"
                  onClick={() => void saveCampaign("publish")}
                  disabled={isSaving}
                  className="okado-primary-action gap-2 px-5 text-sm disabled:opacity-50"
                >
                  {isSaving ? "Publication…" : "Publier la campagne"}
                  <Check className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </main>

        {inlinePreview ? <WizardResponsivePreview inline>
          <WizardGamePreview draft={draft} merchant={merchant} />
        </WizardResponsivePreview> : null}
      </div>
      {suggestionsOpen ? <WizardPrizeLibrary
        key={JSON.stringify([merchant.id, merchant.industry, merchant.industrySubsector])}
        initialTab={libraryInitialTab}
        initialCompositionId={libraryCompositionId}
        compositionContext={merchant}
        suggestions={prizeSuggestions}
        addedIds={new Set(prizeSuggestions.filter((suggestion) => isSuggestionInPrizes(suggestion, draft.prizes)).map((suggestion) => suggestion.id))}
        remainingProbability={100 - totalProbability}
        activityLabel={[merchant.industry?.trim(), isBeautyIndustry(merchant.industry) ? merchant.industrySubsector?.trim() : undefined].filter(Boolean).join(" · ")}
        isLoading={prizeCatalog.isLoading}
        error={prizeCatalog.error}
        onRetry={prizeCatalog.retry}
        onAdd={addSuggestedPrize}
        onClose={() => setSuggestionsOpen(false)}
        configuredPrizeCount={draft.prizes.length}
        previousPrizesEndpoint={adminSaveEndpoint
          ? adminAccountMerchantId ? `/api/admin/merchants/${encodeURIComponent(adminAccountMerchantId)}/locations/${encodeURIComponent(merchant.id)}/prize-library` : undefined
          : "/api/merchant/prize-library"}
        excludeCampaignId={initialCampaign?.campaign.id ?? savedCampaignId ?? undefined}
        isPreviousAdded={(prize) => isReusablePrizeAdded(prize, draft.prizes, reusedPrizeCopies.current)}
        onReuse={reusePrize}
        onApplyComposition={applyPrizeComposition}
        winningEveryTime={draft.rewardRules.isWinningEveryTime}
      /> : null}
      <PrizeEditorPanel
        editor={prizeEditor}
        campaignIsBeingEdited={isEditing}
        remainingProbability={100 - (totalProbability - (prizeEditor?.mode === "edit" ? Number(prizeEditor.value.probability) || 0 : 0))}
        onChange={changePrizeEditor}
        onClose={requestClosePrizeEditor}
        onDiscard={abandonPrizeEditor}
        onSave={savePrizeEditor}
      />
      <ValidationDialog
        open={Boolean(pendingDeletePrize)}
        title="Supprimer ce lot ?"
        description="Ce lot sera retiré de la composition en cours. Les probabilités des autres lots ne seront pas modifiées."
        ctaLabel="Supprimer le lot"
        onClose={() => setPendingDeletePrize(null)}
        onAction={() => {
          if (pendingDeletePrize) removePrize(pendingDeletePrize.id, pendingDeletePrize.index);
          setPendingDeletePrize(null);
        }}
        cancelLabel="Annuler"
        onCancel={() => setPendingDeletePrize(null)}
        tone="error"
      />
      <WizardBackgroundLibraryDialog
        open={backgroundLibraryOpen}
        items={backgroundLibrary}
        isLoading={backgroundLibraryLoading}
        error={backgroundLibraryError}
        selectedImageUrl={draft.presentation.background.imageUrl}
        onSelect={(imageUrl) =>
          patchDraft({
            presentation: {
              ...draft.presentation,
              background: {
                ...draft.presentation.background,
                mode: "image",
                imageUrl,
              },
            },
          })
        }
        onClose={() => setBackgroundLibraryOpen(false)}
      />
      <ValidationDialog
        open={previewSaveDialogOpen}
        title="Enregistrer avant de prévisualiser ?"
        description="Vos modifications ne sont pas encore enregistrées. Enregistrez-les pour afficher la version la plus récente. Sans enregistrement, la prévisualisation affichera uniquement la dernière version sauvegardée."
        ctaLabel={isSavingBeforePreview ? "Enregistrement…" : "Enregistrer et prévisualiser"}
        secondaryCtaLabel="Prévisualiser sans enregistrer"
        cancelLabel="Annuler"
        error={previewSaveError}
        actionDisabled={isSavingBeforePreview}
        secondaryActionDisabled={isSavingBeforePreview}
        onAction={() => void saveAndPreview()}
        onSecondaryAction={previewWithoutSaving}
        onClose={() => {
          if (!isSavingBeforePreview) {
            setPreviewSaveDialogOpen(false);
            setPreviewSaveError(null);
          }
        }}
        onCancel={() => {
          if (!isSavingBeforePreview) {
            setPreviewSaveDialogOpen(false);
            setPreviewSaveError(null);
          }
        }}
      />
      <ValidationDialog
        open={Boolean(saveError)}
        title="Enregistrement impossible"
        description={saveError ?? "La campagne n’a pas pu être enregistrée."}
        tone="error"
        ctaLabel="Fermer"
        onClose={() => setSaveError(null)}
      />
      <ValidationDialog
        open={pendingNavigation !== null}
        title="Quitter le wizard ?"
        description="Vous avez des modifications non enregistrées. Voulez-vous les sauvegarder avant de quitter ?"
        ctaLabel={isSavingBeforeNavigation ? "Enregistrement…" : "Enregistrer et quitter"}
        secondaryCtaLabel="Quitter sans enregistrer"
        cancelLabel="Annuler"
        actionDisabled={isSavingBeforeNavigation}
        secondaryActionDisabled={isSavingBeforeNavigation}
        onAction={() => void saveAndLeave()}
        onSecondaryAction={leaveWithoutSaving}
        onClose={() => {
          if (!isSavingBeforeNavigation) setPendingNavigation(null);
        }}
        onCancel={() => {
          if (!isSavingBeforeNavigation) setPendingNavigation(null);
        }}
      />
      {diffusionQrOpen && draft.id ? <CampaignQrDownloadDialog campaignId={draft.id} isActive={draft.isActive} onClose={() => setDiffusionQrOpen(false)} /> : null}
      {draft.id ? (
        <CampaignPreviewQrDialog
          open={qrPreviewOpen}
          campaignId={previewCampaignId ?? draft.id}
          qrEndpoint={adminSaveEndpoint ? `/api/admin/campaigns/${encodeURIComponent(previewCampaignId ?? draft.id)}/preview?format=qr` : undefined}
          onClose={() => setQrPreviewOpen(false)}
        />
      ) : null}
      {draft.id ? (
        <CampaignPreviewDialog
          open={previewOpen}
          campaignId={draft.id}
          previewPath={adminSaveEndpoint ? `/api/admin/campaigns/${encodeURIComponent(draft.id)}/preview?embed=1` : undefined}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
      {savedPreviewCampaignId ? (
        <CampaignPreviewDialog
          open
          campaignId={savedPreviewCampaignId}
          previewPath={adminSaveEndpoint ? `/api/admin/campaigns/${encodeURIComponent(savedPreviewCampaignId)}/preview?embed=1` : undefined}
          onClose={() => {
            setSavedPreviewCampaignId(null);
            restoreSavedDialogFocus();
          }}
        />
      ) : null}
      {savedCampaignId ? (
        <CampaignSavedDialog
          open
          campaignId={savedCampaignId}
          isActive={draft.isActive}
          adminTargetName={adminSaveEndpoint ? merchant.companyName : undefined}
          adminIsActive={adminSaveEndpoint ? draft.isActive : undefined}
          onClose={() => {
            setSavedCampaignId(null);
            restoreSavedDialogFocus();
          }}
          onPreview={() => {
            setSavedPreviewCampaignId(savedCampaignId);
            setSavedCampaignId(null);
          }}
        />
      ) : null}
    </div>
  );
}
