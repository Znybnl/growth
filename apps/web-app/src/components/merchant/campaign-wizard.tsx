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
  ImageIcon,
  Pencil,
  Plus,
  QrCode,
  Sparkles,
  Soup,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { SocialChannelIcon } from "@/components/merchant/social-channel-icon";
import { CampaignPreviewQrDialog } from "@/components/merchant/campaign-preview-qr";
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
import { actionKindCta, textFontClass, textFontLabel } from "@/lib/format";
import { getPrizeValidationMessages } from "@/lib/prize-validation";
import { createCampaignEmailDefaults } from "@/lib/email-settings";
import { normalizeCampaignEmailSettings } from "@/lib/email-settings";
import { createPosterSettingsDefaults, normalizePosterSettings } from "@/lib/poster-utils";
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
  CampaignPerformance,
  CampaignSetupInput,
  BackgroundLibraryAsset,
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
    id: "game",
    number: "01",
    title: "Le jeu",
    description: "Le type de jeu.",
  },
  {
    id: "identity",
    number: "02",
    title: "La promesse",
    description: "Le texte principal et votre objectif.",
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
    description: "L’action de vos clients",
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
];

const MAX_WIZARD_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_WIZARD_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function uploadWizardImage(
  event: ChangeEvent<HTMLInputElement>,
  onLoaded: (value: string) => void,
  onError: (message: string) => void,
) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.type && !ACCEPTED_WIZARD_IMAGE_TYPES.has(file.type)) {
    event.target.value = "";
    onError("Format non pris en charge. Utilisez un PNG, JPEG, WebP ou GIF.");
    return;
  }
  if (file.size > MAX_WIZARD_IMAGE_BYTES) {
    event.target.value = "";
    onError("Image trop volumineuse. Importez une image de 2 Mo maximum.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") onLoaded(reader.result);
  };
  reader.onerror = () => onError("Impossible de lire cette image.");
  reader.readAsDataURL(file);
}

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
    const optionalActions: Array<{
      kind: Exclude<ActionKind, "google" | "crm">;
      url?: string;
    }> = [
      { kind: "instagram", url: merchant.instagramUrl },
      { kind: "facebook", url: merchant.facebookUrl },
      { kind: "tripadvisor", url: merchant.tripadvisorUrl },
      { kind: "custom", url: merchant.customLinkUrl },
    ];

    return [
      createWizardAction(
        "wizard-google-action",
        "google",
        wizardActionUrl(merchant, "google"),
      ),
      ...optionalActions
        .map(({ kind, url }) => ({ kind, url: normalizeUrl(url ?? "") }))
        .filter(({ url }) => Boolean(url))
        .map(({ kind, url }) => createWizardAction(`wizard-${kind}-action`, kind, url)),
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
        fontFamily: "roboto",
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
      return "Ajoutez au moins une action à proposer avant le jeu.";
    for (const action of draft.actions) {
      if (action.kind === "crm") continue;
      if (!action.url.trim())
        return "Chaque action doit avoir un lien de destination.";
      try {
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
        return "Saisissez une adresse web valide.";
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

function WizardPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div data-testid="wizard-phone-preview" className="relative mx-auto box-border h-[550px] w-[300px] rounded-[36px] border-[5px] border-[#172033] bg-[#172033] p-1.5 shadow-[0_24px_54px_rgba(18,24,39,0.2)]">
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
      <CampaignLivePreview
        merchant={merchant}
        preview={preview}
        compact
        flushTop
      />
    </WizardPhoneFrame>
  );
}

function draftFromCampaign(merchant: Merchant, performance: CampaignPerformance): WizardDraft {
  const campaign = performance.campaign;
  const posterDefaults = createPosterSettingsDefaults({
    logoMode: campaign.logoMode ?? "text",
    logoText: campaign.logoText ?? merchant.companyName,
    logoUrl: campaign.logoUrl,
    logoSizePercent: campaign.presentation.logo.sizePercent,
    logoBottomMarginPx: campaign.presentation.logo.marginBottomPx,
    backgroundMode: campaign.presentation.background.mode,
    backgroundColor: campaign.presentation.background.color,
    backgroundImageUrl: campaign.presentation.background.imageUrl ?? "",
    headline: campaign.subtitle,
    headlineTextColor: campaign.presentation.heading.textColor,
    headlineFontSizePx: campaign.presentation.heading.fontSizePx,
    headlineFontFamily: campaign.presentation.heading.fontFamily,
    wheel: campaign.presentation.wheel,
    footerBackgroundColor: campaign.accent.signal,
  });

  return {
    id: campaign.id,
    merchantId: merchant.id,
    creationMode: "wizard",
    title: campaign.title,
    subtitle: limitCampaignSubtitleLines(campaign.subtitle),
    goalType: campaign.goalType,
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
      logo: { ...campaign.presentation.logo, align: "center" },
      heading: { ...campaign.presentation.heading, align: "center" },
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
      purchaseRequired: Boolean(prize.purchaseRequired),
      usageConditions: prize.usageConditions ?? "",
    })),
  };
}

function getWizardPrizeSuggestionIcon(icon: string) {
  const icons = {
    coffee: { Icon: Coffee, className: "bg-[#fff3df] text-[#b9680b]" },
    dessert: { Icon: Sparkles, className: "bg-[#f4eaff] text-[#7a3fd1]" },
    drink: { Icon: Soup, className: "bg-[#e6f6ff] text-[#1576b6]" },
    discount: { Icon: BadgePercent, className: "bg-[#e9f7ec] text-[#258348]" },
    supplement: { Icon: CirclePlus, className: "bg-[#e9f7ec] text-[#258348]" },
    menu: { Icon: UtensilsCrossed, className: "bg-[#eef1ff] text-[#4058c8]" },
    gift: { Icon: Gift, className: "bg-[#eef1ff] text-[#4058c8]" },
  } as const;
  return icons[icon as keyof typeof icons] ?? icons.gift;
}

function PrizeSuggestionsPanel({
  open,
  suggestions,
  remainingProbability,
  onAdd,
  onClose,
}: {
  open: boolean;
  suggestions: PrizeSuggestion[];
  remainingProbability: number;
  onAdd: (suggestion: PrizeSuggestion) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-prize-suggestions-title"
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[26px] bg-white p-6 shadow-[0_28px_80px_rgba(17,24,39,0.25)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b28719]">
              Suggestions adaptées
            </p>
            <h3
              id="wizard-prize-suggestions-title"
              className="mt-2 text-xl font-semibold text-[#111827]"
            >
              Ajoutez un lot en quelques secondes
            </h3>
            <p className="mt-2 text-sm text-[#69758a]">
              {remainingProbability < 0
                ? `Le total dépasse 100 % de ${Math.abs(Math.round(remainingProbability))} point(s).`
                : `Il reste ${Math.round(remainingProbability)} % disponible.`}{" "}
              Vous pourrez ajuster les probabilités avant de continuer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold text-[#69758a] hover:bg-[#f2f4f7]"
          >
            Fermer
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {suggestions.length ? (
            suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-[18px] border border-[#e2e8f0] bg-[#fbfcfe] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const iconStyle = getWizardPrizeSuggestionIcon(
                        suggestion.icon,
                      );
                      const Icon = iconStyle.Icon;
                      return (
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${iconStyle.className}`}
                          aria-hidden="true"
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                      );
                    })()}
                    <div>
                      <p className="text-sm font-semibold text-[#182033]">
                        {suggestion.label}
                      </p>
                      <p className="text-xs text-[#8993a6]">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#b28719]">
                    {suggestion.probability} %
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#69758a]">
                    Coût estimé : {suggestion.estimatedUnitCost.toFixed(2)} €
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdd(suggestion)}
                    className="inline-flex items-center gap-1 rounded-[11px] bg-[#111827] px-3 py-2 text-xs font-semibold !text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-[16px] bg-[#f6f8fb] p-4 text-sm text-[#69758a]">
              Aucune suggestion disponible pour cette activité.
            </p>
          )}
                 </div>
               </div>
             </div>
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#111827]/45 p-4 sm:items-center">
      <div className="max-h-[86vh] w-full max-w-4xl overflow-y-auto rounded-[26px] bg-white p-6 shadow-[0_28px_80px_rgba(17,24,39,0.25)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b28719]">Bibliothèque d&apos;images</p>
            <h3 className="mt-2 text-xl font-semibold text-[#182033]">Choisissez une image de fond</h3>
            <p className="mt-1 text-sm text-[#69758a]">Les visuels de la bibliothèque sont disponibles pour votre page de jeu.</p>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-[12px] border border-[#dbe3ed] px-3 py-2 text-sm font-semibold text-[#526078]">Fermer</button>
        </div>
        {error ? <p className="mt-4 rounded-[12px] bg-[#fff4f4] px-3 py-2 text-sm text-[#b42318]">{error}</p> : null}
        {isLoading ? <p className="mt-5 text-sm text-[#69758a]">Chargement de la bibliothèque…</p> : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item.imageUrl); onClose(); }}
                className={`cursor-pointer overflow-hidden rounded-[18px] border text-left ${selectedImageUrl === item.imageUrl ? "border-[#b28719] ring-2 ring-[#f4c14a]/30" : "border-[#e2e8f0]"}`}
              >
                <div className="relative aspect-[4/3]">
                  <Image src={item.thumbnailUrl} alt={item.label} fill unoptimized className="object-cover" />
                </div>
                <div className="px-3 py-2.5 text-sm font-semibold text-[#182033]">{item.label}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CampaignWizard({
  merchant,
  initialCampaign,
  deferInlineAssets = false,
}: {
  merchant: Merchant;
  initialCampaign?: CampaignPerformance | null;
  deferInlineAssets?: boolean;
}) {
  const isEditing = Boolean(initialCampaign);
  const [draft, setDraft] = useState<WizardDraft>(() =>
    initialCampaign ? draftFromCampaign(merchant, initialCampaign) : createWizardDraft(merchant),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(() =>
    initialCampaign ? WIZARD_STEPS.length - 1 : 0,
  );
  const actionEnabled = true;
  const [prizeSuggestions, setPrizeSuggestions] = useState<PrizeSuggestion[]>(
    [],
  );
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [backgroundLibrary, setBackgroundLibrary] = useState<BackgroundLibraryAsset[]>([]);
  const [backgroundLibraryOpen, setBackgroundLibraryOpen] = useState(false);
  const [backgroundLibraryError, setBackgroundLibraryError] = useState<string | null>(null);
  const [deferredAssetsLoaded, setDeferredAssetsLoaded] = useState(false);
  const backgroundLibraryLoading = backgroundLibraryOpen && backgroundLibrary.length === 0 && !backgroundLibraryError;
  const [imageUploadErrors, setImageUploadErrors] = useState<{
    logo?: string;
    background?: string;
  }>({});
  const [lastSavedDraftSnapshot, setLastSavedDraftSnapshot] = useState(() =>
    JSON.stringify(initialCampaign ? draftFromCampaign(merchant, initialCampaign) : createWizardDraft(merchant)),
  );
  const isDirty = lastSavedDraftSnapshot !== JSON.stringify(draft);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/prize-suggestions?industry=${encodeURIComponent(merchant.industry ?? "")}`,
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Suggestions indisponibles");
        return (await response.json()) as { suggestions?: PrizeSuggestion[] };
      })
      .then((payload) => {
        if (!cancelled) setPrizeSuggestions(payload.suggestions ?? []);
      })
      .catch(() => {
        if (!cancelled) setPrizeSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [merchant.industry]);

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

    fetch(`/api/campaigns/${draft.id}/assets`, { cache: "no-store" })
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
  }, [deferInlineAssets, draft, deferredAssetsLoaded]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const step = WIZARD_STEPS[stepIndex];
  const totalProbability = useMemo(
    () =>
      draft.prizes.reduce(
        (sum, prize) => sum + Number(prize.probability || 0),
        0,
      ),
    [draft.prizes],
  );
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

  function patchAction(
    index: number,
    patch: Partial<WizardDraft["actions"][number]>,
  ) {
    setDraft((current) => ({
      ...current,
      actions: current.actions.map((action, actionIndex) => {
        if (actionIndex !== index) return action;
        const nextAction = { ...action, ...patch };
        return patch.kind
          ? { ...nextAction, url: wizardActionUrl(merchant, patch.kind) }
          : nextAction;
      }),
    }));
    setError(null);
  }

  function addAction() {
    setDraft((current) => ({
      ...current,
      actions: [
        ...current.actions,
        {
          id: `wizard-action-${Date.now()}`,
          kind: "custom",
          label: "Découvrir",
          url: wizardActionUrl(merchant, "custom"),
        },
      ],
    }));
    setError(null);
  }

  function removeAction(index: number) {
    setDraft((current) => ({
      ...current,
      actions: current.actions.filter(
        (_, actionIndex) => actionIndex !== index,
      ),
    }));
    setError(null);
  }

  function moveAction(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.actions.length) return current;
      const actions = [...current.actions];
      [actions[index], actions[nextIndex]] = [
        actions[nextIndex],
        actions[index],
      ];
      return { ...current, actions };
    });
    setError(null);
  }

  function addSuggestedPrize(suggestion: PrizeSuggestion) {
    setDraft((current) => ({
      ...current,
      prizes: [
        ...current.prizes,
        {
          id: `wizard-prize-${Date.now()}-${suggestion.id}`,
          label: suggestion.label,
          totalQuantity: null,
          probability: suggestion.probability,
          estimatedUnitCost: suggestion.estimatedUnitCost,
          usageConditions: "",
        },
      ],
    }));
    setError(null);
  }

  function removePrize(prizeId: string | undefined) {
    setDraft((current) => ({
      ...current,
      prizes: current.prizes.filter((prize) => prize.id !== prizeId),
    }));
    setError(null);
  }

  function nextStep() {
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

  async function saveCampaign(mode: "save" | "publish") {
    const isPublishing = mode === "publish";
    const errorsToShow = isPublishing ? collectErrors(draft, actionEnabled) : [];
    if (errorsToShow.length) {
      const first = errorsToShow[0];
      setError(first.message);
      setStepIndex(WIZARD_STEPS.findIndex((item) => item.id === first.step));
      return;
    }

    const targetIsActive = isPublishing ? true : isEditing ? draft.isActive : false;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/campaigns/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        campaign?: { campaign?: { id?: string }; id?: string };
        error?: string;
      } | null;
      if (!response.ok)
        throw new Error(
          payload?.error || "La campagne n’a pas pu être enregistrée.",
        );
      const campaignId = payload?.campaign?.campaign?.id ?? payload?.campaign?.id;
      if (campaignId) {
        setLastSavedDraftSnapshot(JSON.stringify({ ...draft, isActive: targetIsActive }));
        window.dispatchEvent(new Event("campaigns-updated"));
        setSavedCampaignId(campaignId);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "La campagne n’a pas pu être enregistrée.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const logoSettings = (
    <section className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
      <p className="text-sm font-semibold text-[#182033]">Logo</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {([{ value: "text", label: "Texte" }, { value: "image", label: "Image" }, { value: "none", label: "Aucun" }] as const).map((mode) => (
          <button key={mode.value} type="button" onClick={() => patchDraft({ logoMode: mode.value, logoText: mode.value === "text" ? draft.logoText?.trim() || merchant.companyName : draft.logoText })} className={`cursor-pointer rounded-[12px] border px-3 py-2.5 text-sm font-semibold ${draft.logoMode === mode.value ? "border-[#b28719] bg-[#fff8e1] text-[#8c6710]" : "border-[#dbe3ed] bg-white text-[#526078]"}`}>{mode.label}</button>
        ))}
      </div>
      {draft.logoMode === "text" ? <label className="mt-3 block text-sm"><span className="mb-2 block font-semibold text-[#182033]">Texte du logo</span><input value={draft.logoText ?? merchant.companyName} onChange={(event) => patchDraft({ logoText: event.target.value })} className="w-full rounded-[12px] border border-[#dbe3ed] bg-white px-3 py-3" /></label> : null}
      {draft.logoMode === "image" ? <label className="mt-3 flex cursor-pointer items-center justify-between rounded-[12px] border border-dashed border-[#b8c5d8] px-3 py-3 text-sm font-semibold"><span>Importer un logo</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => uploadWizardImage(event, (value) => { setImageUploadErrors((current) => ({ ...current, logo: undefined })); patchDraft({ logoUrl: value, logoMode: "image" }); }, (message) => setImageUploadErrors((current) => ({ ...current, logo: message })))} /></label> : null}
      {imageUploadErrors.logo ? <p role="alert" className="mt-2 text-xs text-[#b42318]">{imageUploadErrors.logo}</p> : null}
      {draft.logoMode !== "none" ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-sm"><span className="mb-2 block font-semibold">Taille du logo <output className="float-right text-[#b28719]">{draft.presentation.logo.sizePercent}%</output></span><input type="range" min={0} max={200} value={draft.presentation.logo.sizePercent} onChange={(event) => patchDraft({ presentation: { ...draft.presentation, logo: { ...draft.presentation.logo, sizePercent: Number(event.target.value) } } })} className="w-full cursor-pointer accent-[#b28719]" /></label><label className="block text-sm"><span className="mb-2 block font-semibold">Espacement sous le logo (px)</span><input type="number" min={0} max={120} value={draft.presentation.logo.marginBottomPx} onChange={(event) => patchDraft({ presentation: { ...draft.presentation, logo: { ...draft.presentation.logo, marginBottomPx: Number(event.target.value || 0) } } })} className="w-full rounded-[12px] border border-[#dbe3ed] px-3 py-3" /></label></div> : null}
    </section>
  );

  if (savedCampaignId) {
    return (
      <div className="mx-auto max-w-4xl">
        <section className="okado-card overflow-hidden p-6 sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e9f8ec] text-[#18864b]">
              <Check className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8498]">
              Jeu prêt
            </p>
            <h1 className="okado-page-title mt-3">Votre jeu est enregistré.</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#626d82]">
              Vérifiez une dernière fois le parcours, puis choisissez le support le plus adapté pour le diffuser à vos clients.
            </p>
          </div>

          <div className="mt-8 grid gap-6 border-t border-[#e5eaf2] pt-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center lg:gap-10">
            <div className="min-w-0">
              <p className="okado-label">Prochaine étape</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#0f1728]">
                Testez le parcours de votre jeu
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#626d82]">
                La prévisualisation simule une participation complète, sans modifier vos stocks ni vos indicateurs.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Link
                  href={`/campaign/${savedCampaignId}?preview=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="okado-filled-action !h-11 gap-2 px-4 text-sm"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  Prévisualiser
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="okado-secondary-action !h-11 w-full gap-2 px-4 text-sm"
                      aria-label="Options du QR code"
                    >
                      <QrCode className="h-4 w-4" aria-hidden="true" />
                      <span>QR code</span>
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    className="w-[250px] rounded-[var(--okado-radius-control)] border-border p-1.5 shadow-[var(--shadow-product-card)]"
                  >
                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-[10px] px-3 py-2.5">
                      <a href={`/api/campaigns/${savedCampaignId}/qr`} download title="Télécharger le QR code de production">
                        <Download className="h-4 w-4" aria-hidden="true" />
                        <span>Télécharger le QR code</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-2 rounded-[10px] px-3 py-2.5" onSelect={() => setQrPreviewOpen(true)}>
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      <span>QR de prévisualisation</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Link
                  href={`/campaigns/${savedCampaignId}/poster`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="okado-secondary-action !h-11 gap-2 px-4 text-sm"
                >
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  Affiche
                </Link>
              </div>

              <Link
                href={`/campaigns/${savedCampaignId}/edit/guided`}
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#53627a] underline-offset-4 transition hover:text-[#0f1f3d] hover:underline"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Modifier le jeu
              </Link>
            </div>

            <div className="mx-auto hidden w-fit rounded-[16px] border border-[#dbe4f0] bg-[#fbfcff] p-4 shadow-[var(--shadow-product-card)] lg:block">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#8993a6]">
                QR de diffusion
              </p>
              <Image
                src={`/api/campaigns/${savedCampaignId}/qr?inline=1`}
                alt="QR code de diffusion du jeu"
                width={176}
                height={176}
                unoptimized
                className="h-44 w-44"
              />
            </div>
          </div>
        </section>
        <CampaignPreviewQrDialog
          open={qrPreviewOpen}
          campaignId={savedCampaignId}
          onClose={() => setQrPreviewOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="okado-wizard space-y-6 pb-10">
      <section data-mode={isEditing ? "edit" : "create"} className="flex flex-col gap-5 px-1 py-2 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="okado-label">Assistant de création</p>
          <h1 className="okado-page-title mt-3">Créer une campagne</h1>
        </div>
        {draft.id ? (
          <div className="flex flex-wrap items-center gap-2">
            {isEditing ? <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-xs font-semibold text-[#214ccf]">Mode modification</span> : null}
            <Link
              href={`/campaign/${draft.id}?preview=1`}
              target="_blank"
              rel="noreferrer"
              prefetch={false}
              className="okado-secondary-action gap-2 px-4 text-sm"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Prévisualiser
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="okado-secondary-action gap-2 px-4 text-sm"
                  aria-label="Options du QR code"
                >
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  <span>QR code</span>
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[250px] rounded-[var(--okado-radius-control)] border-border p-1.5 shadow-[var(--shadow-product-card)]"
              >
                <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-[10px] px-3 py-2.5">
                  <a href={`/api/campaigns/${draft.id}/qr`} download title="Télécharger le QR code de production">
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span>Télécharger le QR code</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 rounded-[10px] px-3 py-2.5"
                  onSelect={() => setQrPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span>QR code de prévisualisation</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href={`/campaigns/${draft.id}/poster`}
              target="_blank"
              rel="noreferrer"
              prefetch={false}
              className="okado-secondary-action px-4 text-sm"
            >
              Affiche
            </Link>
            <Link href={`/campaigns/${draft.id}/email`} prefetch={false} className="okado-secondary-action px-4 text-sm">
              Modifier l&apos;e-mail de gain
            </Link>
          </div>
        ) : null}
      </section>

      <div className="sticky top-0 z-30 hidden border-b border-[#e2e8f0] bg-[#f8fafc]/95 py-3 backdrop-blur xl:block">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!draft.id ? "bg-[#fff8e1] text-[#8c6710]" : draft.isActive ? "bg-[#e9f8ec] text-[#18864b]" : "bg-[#eef4ff] text-[#214ccf]"}`}>
            {!draft.id ? "En création" : draft.isActive ? "En ligne" : "Brouillon"}
          </span>
          <div className="flex items-center gap-2">
            <Link href="/campaigns" prefetch={false} className="okado-secondary-action px-4 text-sm">Retour aux jeux</Link>
            <button type="button" onClick={() => void saveCampaign("save")} disabled={isSaving} className="okado-secondary-action px-4 text-sm disabled:opacity-50">
              {isEditing ? "Enregistrer" : "Enregistrer le brouillon"}
            </button>
            <button type="button" onClick={() => void saveCampaign("publish")} disabled={isSaving} className="okado-filled-action px-4 text-sm disabled:opacity-50">
              {isSaving ? "Enregistrement…" : "Publier"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:items-start xl:grid-cols-[240px_minmax(0,1fr)_360px]">
        <aside className="okado-card p-4">
          <p className="px-3 text-[10px] uppercase tracking-[0.22em] text-[#8993a6]">
            Progression
          </p>
          <nav className="mt-4 space-y-1" aria-label="Étapes de création">
            {WIZARD_STEPS.map((item, index) => {
              const active = index === stepIndex;
              const canAccessStep = isEditing || index <= furthestStepIndex;
              const complete = !isEditing && index < stepIndex;
              const visited = canAccessStep;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => canAccessStep && setStepIndex(index)}
                  disabled={!canAccessStep}
                  className={`flex w-full items-start gap-3 rounded-[16px] px-3 py-3 text-left transition ${active ? "bg-[#111827] text-white" : visited ? "text-[#18864b] hover:bg-[#f5f8fb]" : "text-[#a0a9b9]"}`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${active ? "bg-[#f4c14a] text-[#111827]" : complete ? "bg-[#e9f8ec] text-[#18864b]" : visited ? "bg-[#fff8e1] text-[#b28719]" : "bg-[#f2f4f7]"}`}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : item.number}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 opacity-75">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="okado-card min-w-0 p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-[#edf0f4] pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b28719]">
                Étape {step.number}
              </p>
              <h2 className="okado-section-title mt-2">{step.title}</h2>
              {step.description ? (
                <p className="mt-2 hidden text-sm text-[#7a8498]">{step.description}</p>
              ) : null}
            </div>
            <div className="hidden rounded-full bg-[#fff7dd] p-3 text-[#b28719] sm:block">
              <Sparkles className="h-5 w-5" />
            </div>
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
                  className="mt-3 w-full rounded-[16px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3.5 text-sm text-[#182033] outline-none transition focus:border-[#b28719] focus:ring-4 focus:ring-[#f4c14a]/15"
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
                    patchDraft({ subtitle: limitCampaignSubtitleLines(event.target.value) })
                  }
                  rows={3}
                  maxLength={120}
                  className="mt-3 w-full resize-none rounded-[16px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3.5 text-sm leading-6 text-[#182033] outline-none transition focus:border-[#b28719] focus:ring-4 focus:ring-[#f4c14a]/15"
                />
              </label>
              <div className="grid gap-4">
                {!isEditing ? (
                  <label className="block">
                    <span className="text-sm font-semibold text-[#182033]">
                      Objectif
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[#8993a6]">
                      Il initialise les actions proposées. Vous pourrez les modifier à l’étape Action.
                    </span>
                    <select
                      value={draft.goalType ?? "review_prompt"}
                      onChange={(event) => {
                        const goalType = event.target.value as WizardDraft["goalType"];
                        patchDraft({
                          goalType,
                          successMetric:
                            goalType === "social_follow"
                              ? "Abonnements sociaux"
                              : goalType === "lead_capture"
                                ? "Leads collectés"
                                : "Avis Google",
                        });
                      }}
                      className="mt-3 w-full cursor-pointer rounded-[16px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3.5 text-sm text-[#182033] outline-none transition focus:border-[#b28719] focus:ring-4 focus:ring-[#f4c14a]/15"
                    >
                      <option value="review_prompt">Obtenir des avis</option>
                      <option value="lead_capture">Collecter des contacts</option>
                      <option value="social_follow">Gagner des abonnés</option>
                    </select>
                  </label>
                ) : null}
                <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3 text-sm text-[#182033]">
                    <input
                      type="checkbox"
                      checked={draft.emailCaptureEnabled}
                      onChange={(event) =>
                        patchDraft({ emailCaptureEnabled: event.target.checked })
                      }
                      className="mt-1 h-4 w-4 accent-[#111827]"
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
               <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    {
                      value: "wheel",
                      label: "Roue de la chance",
                      text: "Un moment spectaculaire, idéal sur un comptoir.",
                    },
                    {
                      value: "scratch",
                      label: "Ticket à gratter",
                      text: "Un geste tactile simple et immédiat sur mobile.",
                    },
                  ] as const
                ).map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() =>
                      patchDraft({
                        gameType: option.value,
                        presentation: {
                          ...draft.presentation,
                          heading: {
                            ...draft.presentation.heading,
                            fontSizePx:
                              option.value === "scratch" && draft.presentation.heading.fontSizePx === 40
                                ? 32
                                : option.value === "wheel" && draft.presentation.heading.fontSizePx === 32
                                  ? 40
                                  : draft.presentation.heading.fontSizePx,
                          },
                          layout: {
                            ...draft.presentation.layout,
                            templateId:
                              option.value === "scratch"
                                ? "scratch-coral"
                                : draft.presentation.layout.templateId === "scratch-coral" ||
                                    draft.presentation.layout.templateId === "scratch-lilac" ||
                                    draft.presentation.layout.templateId === "scratch-sunburst" ||
                                    draft.presentation.layout.templateId === "scratch-vault" ||
                                    draft.presentation.layout.templateId === "scratch-confetti"
                                  ? "classic"
                                  : draft.presentation.layout.templateId,
                          },
                          wheel:
                            option.value === "wheel"
                              ? {
                                  ...draft.presentation.wheel,
                                  loseColor:
                                    draft.gameType === "scratch" &&
                                    draft.accent.signal.toLowerCase() !== DEFAULT_SCRATCH_PRIMARY_COLOR
                                      ? draft.accent.signal
                                      : DEFAULT_WHEEL_PRIMARY_COLOR,
                                  alternateLoseColor: deriveLighterHex(
                                    draft.gameType === "scratch" &&
                                      draft.accent.signal.toLowerCase() !== DEFAULT_SCRATCH_PRIMARY_COLOR
                                      ? draft.accent.signal
                                      : DEFAULT_WHEEL_PRIMARY_COLOR,
                                  ),
                                  rimColor: deriveLighterHex(
                                    draft.gameType === "scratch" &&
                                      draft.accent.signal.toLowerCase() !== DEFAULT_SCRATCH_PRIMARY_COLOR
                                      ? draft.accent.signal
                                      : DEFAULT_WHEEL_PRIMARY_COLOR,
                                  ),
                                }
                              : draft.presentation.wheel,
                        },
                        subtitle:
                          option.value === "wheel"
                            ? DEFAULT_WHEEL_SUBTITLE
                            : DEFAULT_SCRATCH_SUBTITLE,
                        accent:
                          option.value === "scratch"
                            ? {
                                ...normalizeScratchAccent(draft.accent, "scratch-coral"),
                                signal:
                                  draft.gameType === "wheel" &&
                                  draft.presentation.wheel.loseColor.toLowerCase() !== DEFAULT_WHEEL_PRIMARY_COLOR
                                    ? draft.presentation.wheel.loseColor
                                    : DEFAULT_SCRATCH_PRIMARY_COLOR,
                              }
                            : draft.accent,
                      })
                    }
                    className={`rounded-[22px] border p-5 text-left transition ${draft.gameType === option.value ? "border-[#b28719] bg-[#fff8e1] shadow-[0_12px_28px_rgba(244,193,74,0.16)]" : "border-[#e2e8f0] bg-[#fbfcfe] hover:border-[#b8c5d8]"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-[#182033]">
                        {option.label}
                      </span>
                      <span
                        className={`h-3 w-3 rounded-full ${draft.gameType === option.value ? "bg-[#b28719] ring-4 ring-[#f4c14a]/30" : "bg-[#d7dfeb]"}`}
                      />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#7a8498]">
                      {option.text}
                    </p>
                  </button>
                ))}
              </div>
              <div className="hidden rounded-[22px] border border-[#e2e8f0] bg-[#fbfcfe] p-5">
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
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[#b28719]"
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
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[#b28719]"
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
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[#b28719]"
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
            <div className="mt-7 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#182033]">
                    Votre dotation
                  </p>
                  <p className="mt-1 text-xs text-[#8993a6]">
                    La jauge doit rester à 100 % maximum.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${totalProbability > 100 ? "bg-[#fff0f0] text-[#b42318]" : "bg-[#e9f8ec] text-[#18864b]"}`}
                  >
                    {Math.round(totalProbability)} %
                  </span>
                  {prizeSuggestions.length ? (
                    <button
                      type="button"
                      onClick={() => setSuggestionsOpen(true)}
                      className="okado-secondary-action inline-flex items-center gap-1.5 px-3 py-2 text-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Suggestions de lots
                    </button>
                  ) : null}
                </div>
              </div>
              {totalProbability > 100.0001 ? (
                <div
                  role="alert"
                  className="rounded-[14px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm leading-6 text-[#a11a1a]"
                >
                  Le total des probabilités dépasse 100 %. Vous pouvez encore
                  ajouter ou modifier des lots, mais réduisez ce total avant de
                  continuer.
                </div>
              ) : null}
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
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-[#b28719]"
                />
                <span>
                  <span className="block font-semibold">Lot disponible lors d&apos;une prochaine visite</span>
                  <span className="mt-1 block text-xs leading-5 text-[#7a8498]">
                    Le lot sera disponible à partir du lendemain de la participation.
                  </span>
                </span>
              </label>
              <details className="group rounded-[16px] border border-[#e2e8f0] bg-[#fbfcfe]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#182033] [&::-webkit-details-marker]:hidden">
                  <span>Paramètres avancés des lots</span>
                  <ChevronDown className="h-4 w-4 text-[#8993a6] transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-4 border-t border-[#e2e8f0] px-4 pb-4 pt-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-2 block font-semibold text-[#182033]">Durée de retrait (jours)</span>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={draft.rewardRules.availabilityDurationDays}
                      onChange={(event) =>
                        patchDraft({
                          rewardRules: {
                            ...draft.rewardRules,
                            availabilityDurationDays: Math.max(0, Number(event.target.value || 0)),
                          },
                        })
                      }
                      className="w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-2 block font-semibold text-[#182033]">Délai entre deux participations (jours)</span>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={draft.rewardRules.participationIntervalDays}
                      onChange={(event) =>
                        patchDraft({
                          rewardRules: {
                            ...draft.rewardRules,
                            participationIntervalDays: Math.max(1, Number(event.target.value || 1)),
                          },
                        })
                      }
                      className="w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm"
                    />
                  </label>
                </div>
              </details>
              {draft.prizes.map((prize, index) => (
                <div
                  key={prize.id}
                  className="rounded-[20px] border border-[#e2e8f0] bg-[#fbfcfe] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8993a6]">
                      Lot {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePrize(prize.id)}
                      aria-label={`Supprimer ${prize.label || `le lot ${index + 1}`}`}
                      className="rounded-[9px] p-1.5 text-[#8b95a8] transition hover:bg-[#fff0f0] hover:text-[#b42318]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 space-y-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8993a6]">
                        Nom du lot
                      </span>
                      <input
                        value={prize.label}
                        onChange={(event) =>
                          setDraft((current) =>
                            updatePrize(current, prize.id, {
                              label: event.target.value,
                            }),
                          )
                        }
                        className="mt-2 w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8993a6]">
                        Probabilité
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={prize.probability}
                        onChange={(event) =>
                          setDraft((current) =>
                            updatePrize(current, prize.id, {
                              probability: Number(event.target.value || 0),
                            }),
                          )
                        }
                        className="mt-2 w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]"
                      />
                    </label>
                    {!isEditing ? (
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8993a6]">
                        Stock
                      </span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Illimité"
                        value={prize.totalQuantity ?? ""}
                        onChange={(event) =>
                          setDraft((current) =>
                            updatePrize(current, prize.id, {
                              totalQuantity:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            }),
                          )
                        }
                        className="mt-2 w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]"
                      />
                    </label>
                    ) : null}
                    {isEditing ? (
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8993a6]">
                          Stock disponible
                        </span>
                        <input
                          type="number"
                          min={0}
                          placeholder="Illimité"
                          value={prize.remainingQuantity ?? ""}
                          onChange={(event) =>
                            setDraft((current) =>
                              updatePrize(current, prize.id, {
                                remainingQuantity:
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                              }),
                            )
                          }
                          className="mt-2 w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]"
                        />
                      </label>
                    ) : null}
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8993a6]">
                      Coût unitaire
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={prize.estimatedUnitCost}
                      onChange={(event) =>
                        setDraft((current) =>
                          updatePrize(current, prize.id, {
                            estimatedUnitCost: Number(event.target.value || 0),
                          }),
                        )
                      }
                      className="mt-2 w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]"
                    />
                  </label>
                    </div>
                  </div>
                  <label className="mt-3 block">
                    <span className="text-xs text-[#8993a6]">
                      Conditions d’utilisation (optionnel)
                    </span>
                    <input
                      value={prize.usageConditions ?? ""}
                      onChange={(event) =>
                        setDraft((current) =>
                          updatePrize(current, prize.id, {
                            usageConditions: event.target.value,
                          }),
                        )
                      }
                      className="mt-2 w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]"
                    />
                  </label>
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-[14px] border border-[#f0dfaa] bg-[#fff9e8] px-3 py-3 text-sm text-[#5f4b12]">
                    <input
                      type="checkbox"
                      checked={Boolean(prize.purchaseRequired)}
                      onChange={(event) =>
                        setDraft((current) =>
                          updatePrize(current, prize.id, {
                            purchaseRequired: event.target.checked,
                          }),
                        )
                      }
                      className="mt-1 h-4 w-4 cursor-pointer accent-[#b28719]"
                    />
                    <span>
                      <span className="block font-semibold">Achat requis pour le retrait</span>
                      <span className="mt-1 block text-xs leading-5 text-[#806b30]">
                        Ce lot nécessite un achat client. Précisez les modalités.
                      </span>
                    </span>
                  </label>
                </div>
              ))}
              {prizeValidationMessages.length > 0 ? (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-[18px] border border-[#f3c8c8] bg-[#fff7f7] px-4 py-4 text-sm text-[#9f1239]"
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
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    prizes: [
                      ...current.prizes,
                      {
                        id: `wizard-prize-${Date.now()}`,
                        label: "Nouveau lot",
                        totalQuantity: null,
                        probability: Math.max(
                          0,
                          Math.round(100 - totalProbability),
                        ),
                        estimatedUnitCost: merchant.defaultPrizeCost ?? 5,
                        purchaseRequired: false,
                        usageConditions: "",
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-2 rounded-[14px] border border-dashed border-[#b8c5d8] px-4 py-3 text-sm font-semibold text-[#526078] transition hover:border-[#b28719] hover:text-[#182033]"
              >
                <Gift className="h-4 w-4" />
                Ajouter un lot
              </button>
            </div>
          ) : null}

          {step.id === "action" ? (
            <div className="mt-7 space-y-5">
              <div className="space-y-4">
                {draft.actions.map((action, index) => (
                  <div
                    key={action.id ?? `wizard-action-${index}`}
                    className="rounded-[20px] border border-[#e2e8f0] bg-white p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8993a6]">
                        {wizardActionVisitLabel(index)}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveAction(index, -1)}
                          disabled={index === 0}
                          aria-label="Monter l’action"
                          className="rounded-[9px] p-1.5 text-[#69758a] hover:bg-[#f2f4f7] disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAction(index, 1)}
                          disabled={index === draft.actions.length - 1}
                          aria-label="Descendre l’action"
                          className="rounded-[9px] p-1.5 text-[#69758a] hover:bg-[#f2f4f7] disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAction(index)}
                          aria-label="Supprimer l’action"
                          className="rounded-[9px] p-1.5 text-[#69758a] hover:bg-[#fff0f0] hover:text-[#b42318]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4">
                      <label className="block">
                        <span className="flex items-center gap-3 text-sm font-semibold text-[#182033]">
                          <SocialChannelIcon channel={action.kind} />
                          <span>Action proposée</span>
                        </span>
                        <select
                          value={action.kind}
                          onChange={(event) => {
                            const kind = event.target
                              .value as WizardDraft["actions"][number]["kind"];
                            patchAction(index, {
                              kind,
                              label: actionKindCta(kind),
                              url:
                                kind === "google"
                                  ? merchant.googleReviewUrl || action.url
                                  : action.url,
                            });
                          }}
                          className="mt-3 w-full rounded-[14px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3 text-sm text-[#182033]"
                        >
                          <option value="google">Laisser un avis Google</option>
                          <option value="instagram">
                            Suivre sur Instagram
                          </option>
                          <option value="facebook">Suivre sur Facebook</option>
                          <option value="tiktok">Suivre sur TikTok</option>
                          <option value="tripadvisor">
                            Laisser un avis Tripadvisor
                          </option>
                          <option value="custom">
                            Ouvrir un lien personnalisé
                          </option>
                        </select>
                      </label>
                    </div>
                    {action.kind !== "crm" ? (
                      <label className="mt-4 block">
                        <span className="text-sm font-semibold text-[#182033]">
                          Lien de destination
                        </span>
                        <input
                          value={action.url}
                          onChange={(event) =>
                            patchAction(index, { url: event.target.value })
                          }
                          placeholder="https://..."
                          className="mt-3 w-full rounded-[14px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3 text-sm text-[#182033]"
                        />
                      </label>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAction}
                  className="inline-flex items-center gap-2 rounded-[14px] border border-dashed border-[#b8c5d8] px-4 py-3 text-sm font-semibold text-[#526078] hover:border-[#b28719] hover:text-[#182033]"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une action
                </button>
              </div>
            </div>
          ) : null}

          {step.id === "appearance" ? (
            <div className="mt-7 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(
                  draft.gameType === "scratch"
                    ? [
                        { id: "scratch-vault", label: "Coffre néon", text: "Coffre illustré avant grattage" },
                        { id: "scratch-confetti", label: "Carte confettis", text: "Solaire et festif" },
                        { id: "scratch-coral", label: "Corail joyeux", text: "Clair et chaleureux" },
                        { id: "scratch-lilac", label: "Cadeau lilas", text: "Cadeau clair et contrasté" },
                        { id: "scratch-sunburst", label: "Rayons soleil", text: "Éclatant et visible" },
                      ] as const
                    : [
                    {
                      id: "classic",
                      label: "Classique",
                      text: "Sobre et lisible",
                    },
                    {
                      id: "restaurant-pop",
                      label: "Visuel pop",
                      text: "Événementiel et contrasté",
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
                  .slice()
                  .sort((left, right) => (left.id === "scratch-coral" ? -1 : right.id === "scratch-coral" ? 1 : 0))
                  .map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() =>
                      patchDraft({
                        presentation: {
                          ...draft.presentation,
                          layout: {
                            ...draft.presentation.layout,
                            templateId: template.id,
                          },
                        },
                        accent:
                          draft.gameType === "scratch"
                            ? normalizeScratchAccent(draft.accent, template.id)
                            : draft.accent,
                      })
                    }
                    className={`rounded-[20px] border p-4 text-left ${draft.presentation.layout.templateId === template.id ? "border-[#b28719] bg-[#fff8e1]" : "border-[#e2e8f0] bg-[#fbfcfe]"}`}
                  >
                    <span className="block text-sm font-semibold text-[#182033]">
                      {template.label}
                    </span>
                    <span className="mt-1 block text-xs text-[#8993a6]">
                      {template.text}
                    </span>
                  </button>
                ))}
               </div>

               <div className="space-y-4 rounded-[18px] border border-[#e2e8f0] bg-white p-4">
                 <label className="block">
                   <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#182033]">
                     {draft.gameType === "wheel" ? "Couleur principale de la roue" : "Couleur principale du ticket"}
                     {draft.gameType === "scratch" &&
                     (draft.presentation.layout.templateId === "scratch-confetti" ||
                       draft.presentation.layout.templateId === "scratch-lilac") ? (
                       <span className="rounded-full bg-[#f1ebff] px-2 py-0.5 text-[11px] font-semibold text-[#6944a1]">Palette fixe</span>
                     ) : null}
                   </span>
                   <input
                     type="color"
                     value={draft.gameType === "wheel" ? draft.presentation.wheel.loseColor : draft.accent.signal}
                     onChange={(event) => {
                       const color = event.target.value;
                       setDraft((current) => ({
                         ...current,
                         accent: current.gameType === "scratch" ? { ...current.accent, signal: color } : current.accent,
                         presentation: {
                           ...current.presentation,
                           button: current.gameType === "wheel"
                             ? { ...current.presentation.button, backgroundColor: color, borderColor: color }
                             : current.presentation.button,
                           wheel: current.gameType === "wheel"
                             ? {
                                 ...current.presentation.wheel,
                                 loseColor: color,
                                 alternateLoseColor: deriveLighterHex(color),
                                 rimColor: deriveLighterHex(color),
                               }
                             : current.presentation.wheel,
                         },
                       }));
                     }}
                     disabled={draft.gameType === "scratch" &&
                       (draft.presentation.layout.templateId === "scratch-confetti" ||
                         draft.presentation.layout.templateId === "scratch-lilac")}
                     className="mt-3 h-12 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] bg-white p-1 disabled:cursor-not-allowed disabled:opacity-55"
                   />
                 </label>

                 {draft.gameType === "wheel" && draft.presentation.layout.templateId === "restaurant-pop" ? (
                   <label className="block">
                     <span className="text-sm font-semibold text-[#182033]">Couleur secondaire</span>
                     <input
                       type="color"
                       value={draft.presentation.wheel.winColor}
                       onChange={(event) =>
                         patchDraft({
                           presentation: {
                             ...draft.presentation,
                             wheel: { ...draft.presentation.wheel, winColor: event.target.value },
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
                     {WIZARD_TEXT_FONTS.map((font) => (
                       <option key={font} value={font} className={textFontClass(font)}>{textFontLabel(font)}</option>
                     ))}
                   </select>
                 </label>

                 <label className="block">
                   <span className="flex items-center justify-between gap-3 text-sm font-semibold text-[#182033]">
                     <span>Taille du texte</span>
                     <output className="text-[#b28719]">{draft.presentation.heading.fontSizePx} px</output>
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
                     className="mt-3 w-full cursor-pointer accent-[#b28719]"
                     aria-label="Taille de la police"
                   />
                 </label>
               </div>

               {logoSettings}

               <details className="group rounded-[18px] border border-[#e2e8f0] bg-[#fbfcfe]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-sm font-semibold text-[#182033] [&::-webkit-details-marker]:hidden">
                  <span>
                    Paramètres avancés <span className="font-normal text-[#8993a6]">(mode expert)</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#8993a6] transition-transform group-open:rotate-180" />
                </summary>
                 <div className="space-y-5 border-t border-[#e2e8f0] px-4 pb-4 pt-4">
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
                                  alternateLoseColor: deriveLighterHex(color),
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
                       Utilisée pour les accents graphiques du template Visuel pop.
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
                    {draft.presentation.layout.templateId === "scratch-confetti" ||
                    draft.presentation.layout.templateId === "scratch-lilac"
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
               <div className="hidden rounded-[18px] border border-[#e2e8f0] bg-white p-4 sm:col-span-2">
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
                      {WIZARD_TEXT_FONTS.map((font) => (
                        <option key={font} value={font} className={textFontClass(font)}>
                          {textFontLabel(font)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-2 flex items-center justify-between gap-3 font-semibold text-[#182033]">
                      <span>Taille</span>
                      <output className="text-[#b28719]">{draft.presentation.heading.fontSizePx} px</output>
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
                      className="w-full cursor-pointer accent-[#b28719]"
                      aria-label="Taille de la police"
                    />
                  </label>
                </div>
              </div>
                <div className="space-y-5">
                  <section className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                    <p className="text-sm font-semibold text-[#182033]">Fond</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">{([{ value: "color", label: "Couleur" }, { value: "image", label: "Image" }] as const).map((mode) => <button key={mode.value} type="button" onClick={() => patchDraft({ presentation: { ...draft.presentation, background: { ...draft.presentation.background, mode: mode.value } } })} className={`cursor-pointer rounded-[12px] border px-3 py-2.5 text-sm font-semibold ${draft.presentation.background.mode === mode.value ? "border-[#b28719] bg-[#fff8e1] text-[#8c6710]" : "border-[#dbe3ed] bg-white text-[#526078]"}`}>{mode.label}</button>)}</div>
                    {draft.presentation.background.mode === "color" ? <label className="mt-3 block text-sm"><span className="mb-2 block font-semibold">Couleur de fond</span><input type="color" value={draft.presentation.background.color} onChange={(event) => patchDraft({ presentation: { ...draft.presentation, background: { ...draft.presentation.background, color: event.target.value } } })} className="h-12 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] p-1" /></label> : <label className="mt-3 flex cursor-pointer items-center justify-between rounded-[12px] border border-dashed border-[#b8c5d8] px-3 py-3 text-sm font-semibold"><span>Importer une image de fond</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => uploadWizardImage(event, (value) => { setImageUploadErrors((current) => ({ ...current, background: undefined })); patchDraft({ presentation: { ...draft.presentation, background: { ...draft.presentation.background, mode: "image", imageUrl: value } } }); }, (message) => setImageUploadErrors((current) => ({ ...current, background: message })))} /></label>}
                    {imageUploadErrors.background ? <p role="alert" className="mt-2 text-xs text-[#b42318]">{imageUploadErrors.background}</p> : null}
                    {draft.presentation.background.mode === "image" ? <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={() => setBackgroundLibraryOpen(true)} className="cursor-pointer rounded-[12px] border border-[#111827] bg-[#111827] px-3 py-2.5 text-sm font-semibold text-white">Choisir dans la bibliothèque</button>{draft.presentation.background.imageUrl ? <span className="rounded-full bg-[#e9f8ec] px-3 py-1.5 text-xs font-semibold text-[#18864b]">Image sélectionnée</span> : null}</div> : null}
                  </section>
                  <section className="rounded-[16px] border border-[#e2e8f0] bg-white p-4"><p className="text-sm font-semibold text-[#182033]">Réglages du texte</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-sm"><span className="mb-2 block font-semibold">Couleur du texte</span><input type="color" value={draft.presentation.heading.textColor} onChange={(event) => patchDraft({ presentation: { ...draft.presentation, heading: { ...draft.presentation.heading, textColor: event.target.value } } })} className="h-12 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] p-1" /></label><label className="block text-sm"><span className="mb-2 block font-semibold">Épaisseur</span><select value={draft.presentation.heading.fontWeight ?? 600} onChange={(event) => patchDraft({ presentation: { ...draft.presentation, heading: { ...draft.presentation.heading, fontWeight: Number(event.target.value) } } })} className="w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] px-3 py-3"><option value={400}>Normale</option><option value={500}>Moyenne</option><option value={600}>Semi-gras</option><option value={700}>Gras</option></select></label></div></section>
                  {draft.gameType === "wheel" ? (
                  <section className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                    <p className="text-sm font-semibold text-[#182033]">Espacement des blocs</p>
                    <p className="mt-1 text-xs leading-5 text-[#8993a6]">Ajustez l’espace vertical entre le logo, le texte et le jeu.</p>
                    <label className="mt-3 block text-sm">
                      <span className="mb-2 flex items-center justify-between gap-3 font-semibold text-[#182033]">
                        <span>Espacement</span>
                        <output className="text-[#b28719]">{draft.presentation.layout.blockSpacingPx} px</output>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={120}
                        step={1}
                        value={draft.presentation.layout.blockSpacingPx}
                        onChange={(event) =>
                          patchDraft({
                            presentation: {
                              ...draft.presentation,
                              layout: {
                                ...draft.presentation.layout,
                                blockSpacingPx: Number(event.target.value),
                              },
                            },
                          })
                        }
                        className="w-full cursor-pointer accent-[#b28719]"
                        aria-label="Espacement entre les blocs"
                      />
                    </label>
                  </section>
                  ) : null}
                  <section className="rounded-[16px] border border-[#e2e8f0] bg-white p-4">
                    <p className="text-sm font-semibold text-[#182033]">
                      {draft.gameType === "wheel" ? "Couleurs détaillées de la roue" : "Couleurs du ticket"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#8993a6]">
                      Ces réglages complètent la couleur principale sélectionnée précédemment.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {draft.gameType === "wheel" ? (
                        ([
                          ["rimColor", "Contour"],
                          ["winColor", "Gain 1"],
                          ["alternateWinColor", "Gain 2"],
                          ["loseColor", "Perdu 1"],
                          ["alternateLoseColor", "Perdu 2"],
                        ] as const).map(([key, label]) => (
                          <label key={key} className="block text-sm">
                            <span className="mb-2 block font-semibold text-[#182033]">{label}</span>
                            <input
                              type="color"
                              value={draft.presentation.wheel[key]}
                              onChange={(event) =>
                                patchDraft({
                                  presentation: {
                                    ...draft.presentation,
                                    wheel: { ...draft.presentation.wheel, [key]: event.target.value },
                                  },
                                })
                              }
                              className="h-12 w-full cursor-pointer rounded-[12px] border border-[#dbe3ed] bg-white p-1"
                            />
                          </label>
                        ))
                      ) : (
                        ([
                          ["ink", "Texte du ticket", draft.accent.ink],
                        ] as const).map(([key, label, value]) => (
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
                        ))
                      )}
                    </div>
                  </section>
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
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#edf0f4] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={previousStep}
              disabled={stepIndex === 0 || isSaving}
              className="okado-secondary-action gap-2 px-4 text-sm disabled:opacity-45"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void saveCampaign("save")}
                disabled={isSaving}
                className="okado-secondary-action px-4 text-sm disabled:opacity-50"
              >
                {isSaving ? "Enregistrement…" : "Enregistrer le brouillon"}
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
              ) : (
                <button
                  type="button"
                  onClick={() => void saveCampaign("publish")}
                  disabled={isSaving}
                  className="okado-primary-action gap-2 px-5 text-sm disabled:opacity-50"
                >
                  {isSaving ? "Publication…" : "Publier la campagne"}
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </main>

        <aside className="min-w-0 self-start xl:sticky xl:top-24">
          <div className="mx-auto w-full max-w-[360px] space-y-4">
            <WizardGamePreview draft={draft} merchant={merchant} />
          </div>
        </aside>
      </div>
      <PrizeSuggestionsPanel
        open={suggestionsOpen}
        suggestions={prizeSuggestions}
        remainingProbability={100 - totalProbability}
        onAdd={addSuggestedPrize}
        onClose={() => setSuggestionsOpen(false)}
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
      {draft.id ? (
        <CampaignPreviewQrDialog
          open={qrPreviewOpen}
          campaignId={draft.id}
          onClose={() => setQrPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}
