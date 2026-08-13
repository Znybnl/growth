"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgePercent,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CirclePlus,
  Coffee,
  Download,
  Eye,
  Gift,
  Plus,
  QrCode,
  Sparkles,
  Soup,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { SocialChannelIcon } from "@/components/merchant/social-channel-icon";
import { CampaignPreviewQrDialog } from "@/components/merchant/campaign-preview-qr";
import { ValidationDialog } from "@/components/ui/validation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildCampaignLivePreviewModel,
  CampaignLivePreview,
} from "@/components/merchant/campaign-live-preview";
import { actionKindCta, textFontLabel } from "@/lib/format";
import { getPrizeValidationMessages } from "@/lib/prize-validation";
import { createCampaignEmailDefaults } from "@/lib/email-settings";
import {
  createDefaultPosterSettings,
  createDefaultWheelSettings,
  DEFAULT_SCRATCH_PRIMARY_COLOR,
  DEFAULT_SCRATCH_SUBTITLE,
  DEFAULT_WHEEL_SUBTITLE,
  DEFAULT_WHEEL_PRIMARY_COLOR,
  deriveLighterHex,
  limitCampaignSubtitleLines,
  normalizeScratchAccent,
} from "@/lib/campaign-defaults";
import {
  ActionKind,
  CampaignAction,
  CampaignSetupInput,
  GamePageTemplateId,
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

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "identity",
    number: "01",
    title: "La promesse",
    description: "Une animation claire en quelques mots.",
  },
  {
    id: "game",
    number: "02",
    title: "Le jeu",
    description: "Choisissez l’expérience la plus naturelle.",
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
    description: "Cadrez les probabilités et les stocks.",
  },
  {
    id: "action",
    number: "05",
    title: "L’action",
    description:
      "Choisissez l’action proposée avant le jeu. Elle change à chaque visite pour guider le joueur.",
  },
];

const WIZARD_TEXT_FONTS: TextFont[] = [
  "anton",
  "display",
  "serif",
  "cormorant",
  "fredoka",
  "inter",
  "bebas",
];

function wizardActionVisitLabel(index: number) {
  return index === 0 ? "1\u00e8re visite" : `${index + 1}\u00e8me visite`;
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

const REVIEW_ACTION_PRIORITY: Array<{
  kind: Exclude<ActionKind, "google" | "crm">;
  getUrl: (merchant: Merchant) => string | undefined;
}> = [
  { kind: "instagram", getUrl: (merchant) => merchant.instagramUrl },
  { kind: "facebook", getUrl: (merchant) => merchant.facebookUrl },
  { kind: "tiktok", getUrl: (merchant) => merchant.tiktokUrl },
  { kind: "tripadvisor", getUrl: (merchant) => merchant.tripadvisorUrl },
  { kind: "custom", getUrl: (merchant) => merchant.customLinkUrl },
];

function createWizardAction(id: string, kind: ActionKind, url: string) {
  return {
    id,
    kind,
    label: actionKindCta(kind),
    url,
  } satisfies CampaignAction;
}

function wizardActionUrl(merchant: Merchant, kind: ActionKind) {
  switch (kind) {
    case "google":
      return normalizeUrl(merchant.googleReviewUrl ?? "") || "https://google.com";
    case "instagram":
      return normalizeUrl(merchant.instagramUrl ?? "") || "https://instagram.com";
    case "facebook":
      return normalizeUrl(merchant.facebookUrl ?? "") || "https://facebook.com";
    case "tiktok":
      return normalizeUrl(merchant.tiktokUrl ?? "") || "https://tiktok.com";
    case "tripadvisor":
      return normalizeUrl(merchant.tripadvisorUrl ?? "") || "https://tripadvisor.com";
    case "custom":
      return normalizeUrl(merchant.customLinkUrl ?? "") || "https://";
    case "crm":
      return normalizeUrl(merchant.websiteUrl ?? "") || "https://";
    default:
      return "https://";
  }
}

function createWizardActions(
  merchant: Merchant,
  goalType: WizardDraft["goalType"],
): CampaignAction[] {
  if (goalType === "review_prompt") {
    const additionalActions = REVIEW_ACTION_PRIORITY.map(
      ({ kind, getUrl }) => ({
        kind,
        url: normalizeUrl(getUrl(merchant) ?? ""),
      }),
    )
      .filter(({ url }) => Boolean(url))
      .slice(0, 2)
      .map(({ kind, url }, index) =>
        createWizardAction(`wizard-additional-action-${index + 2}`, kind, url),
      );

    return [
      createWizardAction(
        "wizard-google-action",
        "google",
        wizardActionUrl(merchant, "google"),
      ),
      ...additionalActions,
    ];
  }

  if (goalType === "social_follow") {
    return [
      createWizardAction(
        "wizard-instagram-action",
        "instagram",
        wizardActionUrl(merchant, "instagram"),
      ),
      createWizardAction(
        "wizard-google-action",
        "google",
        wizardActionUrl(merchant, "google"),
      ),
      createWizardAction(
        "wizard-facebook-action",
        "facebook",
        wizardActionUrl(merchant, "facebook"),
      ),
    ];
  }

  if (goalType === "lead_capture") {
    const instagramUrl = merchant.instagramUrl?.trim();
    return [
      ...(instagramUrl
        ? [
            createWizardAction(
              "wizard-instagram-action",
              "instagram",
              instagramUrl,
            ),
          ]
        : []),
      createWizardAction(
        "wizard-google-action",
        "google",
        wizardActionUrl(merchant, "google"),
      ),
    ];
  }

  return [];
}

function createWizardDraft(merchant: Merchant): WizardDraft {
  const wheel = createDefaultWheelSettings();

  return {
    merchantId: merchant.id,
    title: "",
    subtitle: DEFAULT_WHEEL_SUBTITLE,
    goalType: "review_prompt",
    emailCaptureEnabled: false,
    ctaLabel: "Je participe",
    successMetric: "Avis Google",
    targetUrl: wizardActionUrl(merchant, "google"),
    isActive: false,
    logoMode: "text",
    logoText: merchant.companyName || merchant.logoText,
    accent: { ink: "#111827", paper: "#eef2ff", signal: DEFAULT_SCRATCH_PRIMARY_COLOR },
    gameType: "wheel",
    presentation: {
      logo: { sizePercent: 100, marginBottomPx: 40, align: "center" },
      background: { mode: "color", color: "#ffffff", imageUrl: "" },
      heading: {
        textColor: "#1f2937",
        fontSizePx: 40,
        fontFamily: "display",
        fontWeight: 600,
        align: "center",
      },
      button: {
        backgroundColor: "#c59920",
        textColor: "#ffffff",
        borderColor: "#f4c14a",
        size: "sm",
        textSizePx: 24,
        isBold: true,
      },
      layout: {
        blockSpacingPx: 40,
        templateId: "classic" as GamePageTemplateId,
      },
      wheel,
      poster: createDefaultPosterSettings(merchant),
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
    prizes: [
      {
        id: "wizard-prize-1",
        label: "Une réduction de 10 %",
        totalQuantity: null,
        probability: 50,
        estimatedUnitCost: merchant.defaultPrizeCost ?? 5,
        purchaseRequired: false,
        usageConditions: "",
      },
    ],
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
    if (draft.rewardRules.isWinningEveryTime && total < 99.9999)
      return "Un jeu 100 % gagnant doit totaliser exactement 100 % de probabilités.";
  }

  if (step === "action" && actionEnabled) {
    if (!draft.actions.length)
      return "Ajoutez au moins