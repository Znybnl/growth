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
    description: "Choisissez l‚Äôexp√©rience la plus naturelle.",
  },
  {
    id: "appearance",
    number: "03",
    title: "L‚Äôapparence",
    description: "Donnez √† la campagne votre signature.",
  },
  {
    id: "prizes",
    number: "04",
    title: "Les lots",
    description: "Cadrez les probabilit√©s et les stocks.",
  },
  {
    id: "action",
    number: "05",
    title: "L‚Äôaction",
    description:
      "Choisissez l‚Äôaction propos√©e avant le jeu. Elle change √† chaque visite pour guider le joueur.",
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
  /(?:avis|note|5\s*√©toiles|bonne note).{0,80}(?:gagn(?:e|er|√©)|cadeau|lot|r√©compens)|(?:gagn(?:e|er|√©)|cadeau|lot|r√©compens).{0,80}(?:avis|note|5\s*√©toiles|bonne note)/iu;

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
        label: "Une r√©duction de 10 %",
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
      return "Donnez un nom de trois caract√®res minimum √† votre animation.";
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
      return "La quantit√© d‚Äôun lot doit √™tre sup√©rieure √† 0 (ou illimit√©e).";
    }
    const total = draft.prizes.reduce(
      (sum, prize) => sum + Number(prize.probability || 0),
      0,
    );
    if (total > 100.0001)
      return "Le total des probabilit√©s ne peut pas d√©passer 100 %.";
    if (draft.rewardRules.isWinningEveryTime && total < 99.9999)
      return "Un jeu 100 % gagnant doit totaliser exactement 100 % de probabilit√©s.";
  }

  if (step === "action" && actionEnabled) {
    if (!draft.actions.length)
      return "Ajoutez au moins une action √† proposer avant le jeu.";
    for (const action of draft.actions) {
      if (action.kind === "crm") continue;
      if (!action.url.trim())
        return "Chaque action doit avoir un lien de destination.";
      try {
        const parsed = new URL(normalizeUrl(action.url));
        if (parsed.protocol !== "https:")
          return "Le lien doit utiliser HTTPS pour prot√©ger les joueurs.";
        if (
          action.kind === "google" &&
          !GOOGLE_REVIEW_HOSTS.has(parsed.hostname.toLowerCase())
        ) {
          return "Utilisez une adresse Google officielle pour l‚Äôinvitation √† laisser un avis.";
        }
        if (
          action.kind === "google" &&
          [draft.subtitle, action.label, draft.ctaLabel].some((copy) =>
            INCENTIVE_COPY_PATTERN.test(copy),
          )
        ) {
          return "L‚Äôinvitation ne peut pas promettre un lot en √©change d‚Äôun avis.";
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
    <div className="relative mx-auto w-full max-w-[360px] rounded-[36px] border-[5px] border-[#172033] bg-[#172033] p-1.5 shadow-[0_24px_54px_rgba(18,24,39,0.2)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-2 z-20 h-1.5 w-14 -translate-x-1/2 rounded-full bg-[#6d7890]/70"
      />
      <div className="overflow-hidden rounded-[29px] bg-[#f8fafc]">
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
              Suggestions adapt√©es
            </p>
            <h3
              id="wizard-prize-suggestions-title"
              className="mt-2 text-xl font-semibold text-[#111827]"
            >
              Ajoutez un lot en quelques secondes
            </h3>
            <p className="mt-2 text-sm text-[#69758a]">
              {remainingProbability < 0
                ? `Le total d√©passe 100 % de ${Math.abs(Math.round(remainingProbability))} point(s).`
                : `Il reste ${Math.round(remainingProbability)} % disponible.`}{" "}
              Vous pourrez ajuster les probabilit√©s avant de continuer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold text-[#69758a] hover:bg-[#f2f◊≠˙÷⁄$z{-ÆÈ‹j◊ù¶˜WFW"VÊR7Fñˆ‡–¢¬ˆ'WGFˆ„‡–¢¬ˆFóc‡–¢¬ˆFóc‡–¢í¢ÁV∆«––†–¢∑7FWÊñB””“&V&Ê6R"ÚÄ–¢∆Fób6∆74Ê÷S“&◊B”r76R◊í”R#‡–¢∆Fób6∆74Ê÷S“&w&ñBv”B6”¶w&ñB÷6ˆ«2”"Ü√¶w&ñB÷6ˆ«2”B#‡–¢≤Ä–¢G&gBÊv÷UGóR””“'67&F6Ç –¢Ú∞–¢≤ñC¢'67&F6Ç◊fV«B"¬∆&V√¢$6ˆfg&RÏ:ñˆ‚"¬FWáC¢$6ˆfg&Rñ∆«W7G,:ífÁBw&GFvR"“¿–¢≤ñC¢'67&F6Ç÷6ˆÊfWGFí"¬∆&V√¢$6'FR6ˆÊfWGFó2"¬FWáC¢%6ˆ∆ó&RWBfW7Fñb≤∆6˜V∆WW"&ñÊ6ó∆R<:ñ∆V7FñˆÊÏ:ñRÓ(	ñW7B2WFñ∆ó<:ñR"“¿–¢≤ñC¢'67&F6Ç÷6˜&¬"¬∆&V√¢$6˜&ñ¬¶˜ñWWÇ"¬FWáC¢$6∆ó"WB6Ü∆WW&WWÇ"“¿–¢≤ñC¢'67&F6Ç÷∆ñ∆2"¬∆&V√¢$6FVR∆ñ∆2"¬FWáC¢$6FVR6∆ó"WB6ˆÁG&7L:í≤∆6˜V∆WW"&ñÊ6ó∆R<:ñ∆V7FñˆÊÏ:ñRÓ(	ñW7B2WFñ∆ó<:ñR"“¿–¢≤ñC¢'67&F6Ç◊7VÊ'W'7B"¬∆&V√¢%&ñˆÁ26ˆ∆Vñ¬"¬FWáC¢,8ñ6∆FÁBWBfó6ñ&∆R"“¿–¢“26ˆÁ7@–¢¢∞–¢∞–¢ñC¢&6∆76ñ2"¿–¢∆&V√¢$6∆76óVR"¿–¢FWáC¢%6ˆ'&RWB∆ó6ñ&∆R"¿–¢“¿–¢∞–¢ñC¢'&W7FW&ÁB◊˜"¿–¢∆&V√¢%fó7VV¬˜"¿–¢FWáC¢,8ól:ñÊV÷VÁFñV¬WB6ˆÁG&7L:í"¿–¢“¿–¢∞–¢ñC¢&6˜6÷ñ2÷˜&&óB"¿–¢∆&V√¢$˜&&óBÏ:ñˆ‚"¿–¢FWáC¢$ñ÷÷W'6ñbWBÊˆ7GW&ÊR"¿–¢“¿–¢∞–¢ñC¢'7VÊ'W'7B÷fW7Fóf¬"¿–¢∆&V√¢%6ˆ∆Vñ¬˜"¿–¢FWáC¢$fW7FñbWB«V÷ñÊWWÇ"¿–¢“¿–¢“26ˆÁ7@–¢ê–¢Êfñ«FW"ÇáFV◊∆FRí”‚FV◊∆FRÊñB”“&6˜6÷ñ2÷˜&&óB"bbFV◊∆FRÊñB”“'7VÊ'W'7B÷fW7Fóf¬"ê–¢Á6∆ñ6RÇê–¢Á6˜'BÇÜ∆VgB¬&ñváBí”‚Ü∆VgBÊñB””“'67&F6Ç÷6˜&¬"Ú”¢&ñváBÊñB””“'67&F6Ç÷6˜&¬"Ú¢íê–¢Ê÷ÇáFV◊∆FRí”‚Ä–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢∂Wì◊∑FV◊∆FRÊñG––¢ˆ‰6∆ñ6≥◊≤Çí”‡–¢F6ÑG&gBá∞–¢&W6VÁFFñˆ„¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚¿–¢∆ñ˜WC¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚Ê∆ñ˜WB¿–¢FV◊∆FTñC¢FV◊∆FRÊñB¿–¢“¿–¢“¿–¢66VÁC†–¢G&gBÊv÷UGóR””“'67&F6Ç –¢ÚÊ˜&÷∆ó¶U67&F6Ñ66VÁBÜG&gBÊ66VÁB¬FV◊∆FRÊñBê–¢¢G&gBÊ66VÁB¿–¢“ê–¢––¢6∆74Ê÷S◊∂&˜VÊFVB’≥#Ö“&˜&FW"”BFWáB÷∆VgBG∂G&gBÁ&W6VÁFFñˆ‚Ê∆ñ˜WBÁFV◊∆FTñB””“FV◊∆FRÊñBÚ&&˜&FW"’≤6##Ésï“&r’≤6ffcÜS“"¢&&˜&FW"’≤6S&SÜc“&r’≤6f&f6fU“'÷––¢‡–¢«7‚6∆74Ê÷S“&&∆ˆ6≤FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢∑FV◊∆FRÊ∆&V«––¢¬˜7„‡–¢«7‚6∆74Ê÷S“&◊B”&∆ˆ6≤FWáB◊á2FWáB’≤3Éìì6e“#‡–¢∑FV◊∆FRÁFWáG––¢¬˜7„‡–¢¬ˆ'WGFˆ„‡–¢íó––¢¬ˆFóc‡–¢∆FWFñ«26∆74Ê÷S“&w&˜W&˜VÊFVB’≥áÖ“&˜&FW"&˜&FW"’≤6S&SÜc“&r’≤6f&f6fU“#‡¢«7V÷÷'í6∆74Ê÷S“&f∆WÇ7W'6˜"◊ˆñÁFW"∆ó7B÷ÊˆÊRóFV◊2÷6VÁFW"ßW7Fñgí÷&WGvVV‚v”BÇ”Bí”BFWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“≤c£¢◊vV&∂óB÷FWFñ«2÷÷&∂W%”¶ÜñFFV‚#‡¢«7„‡¢&‹:áG&W2fÊ<:ó2«7‚6∆74Ê÷S“&fˆÁB÷Ê˜&÷¬FWáB’≤3Éìì6e“#‚Ü÷ˆFRWáW'Bì¬˜7„‡¢¬˜7„‡¢ƒ6ÜWg&ˆ‰F˜v‚6∆74Ê÷S“&Ç”Br”B6á&ñÊ≤”FWáB’≤3Éìì6e“G&Á6óFñˆ‚◊G&Á6f˜&“w&˜W÷˜V„ß&˜FFR”É"Û‡¢¬˜7V÷÷'ì‡¢∆Fób6∆74Ê÷S“'76R◊í”R&˜&FW"◊B&˜&FW"’≤6S&SÜc“Ç”B"”BB”B#‡¢∆Fób6∆74Ê÷S“&w&ñBv”B6”¶w&ñB÷6ˆ«2”"#‡¢∂G&gBÊv÷UGóR””“'vÜVV¬"ÚÄ¢√‡–¢∂G&gBÁ&W6VÁFFñˆ‚Ê∆ñ˜WBÁFV◊∆FTñB””“&6∆76ñ2"ÚÄ–¢∆∆&V¬6∆74Ê÷S“&&∆ˆ6≤#‡–¢«7‚6∆74Ê÷S“'FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢6˜V∆WW"FRfˆÊ@–¢¬˜7„‡–¢∆ñÁW@–¢GóS“&6ˆ∆˜" –¢f«VS◊∂G&gBÁ&W6VÁFFñˆ‚Ê&6∂w&˜VÊBÊ6ˆ∆˜'––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢F6ÑG&gBá∞–¢&W6VÁFFñˆ„¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚¿–¢&6∂w&˜VÊC¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚Ê&6∂w&˜VÊB¿–¢6ˆ∆˜#¢WfVÁBÁF&vWBÁf«VR¿–¢“¿–¢“¿–¢“ê–¢––¢6∆74Ê÷S“&◊B”2Ç”"r÷gV∆¬&˜VÊFVB’≥'Ö“&˜&FW"&˜&FW"’≤6F&S6VE“&r◊vÜóFR” –¢Û‡–¢¬ˆ∆&V√‡–¢í¢ÁV∆«––¢∆∆&V¬6∆74Ê÷S“&&∆ˆ6≤#‡–¢«7‚6∆74Ê÷S“'FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢6˜V∆WW"&ñÊ6ó∆RFR∆&˜VP–¢¬˜7„‡–¢∆ñÁW@–¢GóS“&6ˆ∆˜" –¢f«VS◊∞–¢G&gBÊv÷UGóR””“'vÜVV¬ –¢ÚG&gBÁ&W6VÁFFñˆ‚ÁvÜVV¬Ê∆˜6T6ˆ∆˜ –¢¢G&gBÁ&W6VÁFFñˆ‚Ê'WGFˆ‚Ê&6∂w&˜VÊD6ˆ∆˜ –¢––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚∞–¢6ˆÁ7B6ˆ∆˜"“WfVÁBÁF&vWBÁf«VS∞–¢6WDG&gBÇÜ7W'&VÁBí”‚á∞–¢‚‚Ê7W'&VÁB¿–¢&W6VÁFFñˆ„¢∞–¢‚‚Ê7W'&VÁBÁ&W6VÁFFñˆ‚¿–¢'WGFˆ„¢∞–¢‚‚Ê7W'&VÁBÁ&W6VÁFFñˆ‚Ê'WGFˆ‚¿–¢&6∂w&˜VÊD6ˆ∆˜#¢6ˆ∆˜"¿–¢&˜&FW$6ˆ∆˜#¢6ˆ∆˜"¿–¢“¿–¢vÜVV√†–¢7W'&VÁBÊv÷UGóR””“'vÜVV¬ –¢Ú∞–¢‚‚Ê7W'&VÁBÁ&W6VÁFFñˆ‚ÁvÜVV¬¿–¢∆˜6T6ˆ∆˜#¢6ˆ∆˜"¿–¢«FW&ÊFT∆˜6T6ˆ∆˜#¢FW&ófT∆ñváFW$ÜWÇÜ6ˆ∆˜"í¿–¢&ñ‘6ˆ∆˜#¢FW&ófT∆ñváFW$ÜWÇÜ6ˆ∆˜"í¿–¢––¢¢7W'&VÁBÁ&W6VÁFFñˆ‚ÁvÜVV¬¿–¢“¿–¢“íì∞–¢◊––¢6∆74Ê÷S“&◊B”2Ç”"r÷gV∆¬&˜VÊFVB’≥'Ö“&˜&FW"&˜&FW"’≤6F&S6VE“&r◊vÜóFR” –¢Û‡–¢¬ˆ∆&V√‡–¢∂G&gBÁ&W6VÁFFñˆ‚Ê∆ñ˜WBÁFV◊∆FTñB””“'&W7FW&ÁB◊˜"ÚÄ–¢∆∆&V¬6∆74Ê÷S“&&∆ˆ6≤#‡–¢«7‚6∆74Ê÷S“'FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‰6˜V∆WW"6V6ˆÊFó&S¬˜7„‡–¢«7‚6∆74Ê÷S“&ÜñFFV‚#‡¢WFñ∆ó<:ñR˜W"∆W266VÁG2w&ÜóVW2GRFV◊∆FRfó7VV¬˜‡–¢¬˜7„‡–¢∆ñÁW@–¢GóS“&6ˆ∆˜" –¢f«VS◊∂G&gBÁ&W6VÁFFñˆ‚ÁvÜVV¬Ávñ‰6ˆ∆˜'––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢F6ÑG&gBá∞–¢&W6VÁFFñˆ„¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚¿–¢vÜVV√¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚ÁvÜVV¬¿–¢vñ‰6ˆ∆˜#¢WfVÁBÁF&vWBÁf«VR¿–¢“¿–¢“¿–¢“ê–¢––¢6∆74Ê÷S“&◊B”2Ç”"r÷gV∆¬&˜VÊFVB’≥'Ö“&˜&FW"&˜&FW"’≤6F&S6VE“&r◊vÜóFR” –¢Û‡–¢¬ˆ∆&V√‡–¢í¢ÁV∆«––¢¬Û‡–¢í¢ÁV∆«––¢¬ˆFóc‡–¢∂G&gBÊv÷UGóR””“'67&F6Ç"ÚÄ–¢∆∆&V¬6∆74Ê÷S“&&∆ˆ6≤#‡–¢«7‚6∆74Ê÷S“'FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢6˜V∆WW"&ñÊ6ó∆RGRFñ6∂W@–¢¬˜7„‡–¢«7‚6∆74Ê÷S“&◊B”&∆ˆ6≤FWáB◊á2FWáB’≤3Éìì6e“#‡–¢∂G&gBÁ&W6VÁFFñˆ‚Ê∆ñ˜WBÁFV◊∆FTñB””“'67&F6Ç÷6ˆÊfWGFí"«¿–¢G&gBÁ&W6VÁFFñˆ‚Ê∆ñ˜WBÁFV◊∆FTñB””“'67&F6Ç÷∆ñ∆2 –¢Ú$6RFV◊∆FRWFñ∆ó6R6&˜&R∆WGFR≤∆6˜V∆WW"<:ñ∆V7FñˆÊÏ:ñRñ6íÓ(	ñW7B2WFñ∆ó<:ñR‚ –¢¢$V∆∆R6ˆ∆˜&R∆¶ˆÊR:w&GFW"WB∆W2:ñÃ:ñ÷VÁG2w&ÜóVW2GRFV◊∆FR‚'––¢¬˜7„‡–¢∆ñÁW@–¢GóS“&6ˆ∆˜" –¢f«VS◊∂G&gBÊ66VÁBÁ6ñvÊ«––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢F6ÑG&gBá∞–¢66VÁC¢≤‚‚ÊG&gBÊ66VÁB¬6ñvÊ√¢WfVÁBÁF&vWBÁf«VR“¿–¢“ê–¢––¢6∆74Ê÷S“&◊B”2Ç”"r÷gV∆¬&˜VÊFVB’≥'Ö“&˜&FW"&˜&FW"’≤6F&S6VE“&r◊vÜóFR” –¢Û‡–¢¬ˆ∆&V√‡–¢í¢ÁV∆«––¢∆Fób6∆74Ê÷S“'&˜VÊFVB’≥áÖ“&˜&FW"&˜&FW"’≤6S&SÜc“&r◊vÜóFR”B6”¶6ˆ¬◊7‚”"#‡¢«6∆74Ê÷S“'FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#ÂGóˆw&ÜñS¬˜‡–¢«6∆74Ê÷S“&◊B”FWáB◊á2∆VFñÊr”RFWáB’≤3Éìì6e“#‡–¢6Üˆó6ó76W¢∆ˆ∆ñ6RWB∆Fñ∆∆RFR∆&ˆ÷W76Rffñ6å:ñR7W"∆R¶WR‡–¢¬˜‡–¢∆Fób6∆74Ê÷S“&◊B”Bw&ñBv”B6”¶w&ñB÷6ˆ«2’≥g%Û„Fg%“6”¶óFV◊2÷VÊB#‡–¢∆∆&V¬6∆74Ê÷S“&&∆ˆ6≤FWáB◊6“#‡–¢«7‚6∆74Ê÷S“&÷"”"&∆ˆ6≤fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#Âˆ∆ñ6S¬˜7„‡–¢«6V∆V7@–¢f«VS◊∂G&gBÁ&W6VÁFFñˆ‚ÊÜVFñÊrÊfˆÁDf÷ñ«ó––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢F6ÑG&gBá∞–¢&W6VÁFFñˆ„¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚¿–¢ÜVFñÊs¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚ÊÜVFñÊr¿–¢fˆÁDf÷ñ«ì¢WfVÁBÁF&vWBÁf«VR2FWáDfˆÁB¿–¢“¿–¢“¿–¢“ê–¢––¢6∆74Ê÷S“'r÷gV∆¬&˜VÊFVB’≥'Ö“&˜&FW"&˜&FW"’≤6F&S6VE“&r◊vÜóFRÇ”2í”2FWáB◊6“FWáB’≤3É#35“ –¢‡–¢µtï§$EıDUÖEÙdÙÂE2Ê÷ÇÜfˆÁBí”‚Ä–¢∆˜Fñˆ‚∂Wì◊∂fˆÁG“f«VS◊∂fˆÁG”‡–¢∑FWáDfˆÁD∆&V¬ÜfˆÁBó––¢¬ˆ˜Fñˆ„‡–¢íó––¢¬˜6V∆V7C‡–¢¬ˆ∆&V√‡–¢∆∆&V¬6∆74Ê÷S“&&∆ˆ6≤FWáB◊6“#‡–¢«7‚6∆74Ê÷S“&÷"”"f∆WÇóFV◊2÷6VÁFW"ßW7Fñgí÷&WGvVV‚v”2fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢«7„ÂFñ∆∆S¬˜7„‡–¢∆˜WGWB6∆74Ê÷S“'FWáB’≤6##Ésï“#Á∂G&gBÁ&W6VÁFFñˆ‚ÊÜVFñÊrÊfˆÁE6ó¶Uá“É¬ˆ˜WGWC‡–¢¬˜7„‡–¢∆ñÁW@–¢GóS“'&ÊvR –¢÷ñ„◊≥á––¢÷É◊≥s'––¢7FW◊≥––¢f«VS◊∂G&gBÁ&W6VÁFFñˆ‚ÊÜVFñÊrÊfˆÁE6ó¶Uá––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢F6ÑG&gBá∞–¢&W6VÁFFñˆ„¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚¿–¢ÜVFñÊs¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚ÊÜVFñÊr¿–¢fˆÁE6ó¶UÉ¢ÁV÷&W"ÜWfVÁBÁF&vWBÁf«VRí¿–¢“¿–¢“¿–¢“ê–¢––¢6∆74Ê÷S“'r÷gV∆¬7W'6˜"◊ˆñÁFW"66VÁB’≤6##Ésï“ –¢&ñ÷∆&V√“%Fñ∆∆RFR∆ˆ∆ñ6R –¢Û‡–¢¬ˆ∆&V√‡–¢¬ˆFóc‡–¢¬ˆFóc‡¢¬ˆFóc‡¢¬ˆFWFñ«3‡¢¬ˆFóc‡¢í¢ÁV∆«––†–¢∂W'&˜"ÚÄ–¢∆Fó`–¢&ˆ∆S“&∆W'B –¢6∆74Ê÷S“&◊B”b&˜VÊFVB’≥gÖ“&˜&FW"&˜&FW"’≤6c&3Ü3Ö“&r’≤6ffcFcE“Ç”Bí”2FWáB◊6“∆VFñÊr”bFWáB’≤6“ –¢‡–¢∂W'&˜'––¢¬ˆFóc‡–¢í¢ÁV∆«––¢∆Fób6∆74Ê÷S“&◊B”Çf∆WÇf∆WÇ÷6ˆ¬◊&WfW'6Rv”2&˜&FW"◊B&˜&FW"’≤6VFccE“B”R6”¶f∆WÇ◊&˜r6”¶óFV◊2÷6VÁFW"6”¶ßW7Fñgí÷&WGvVV‚#‡–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊∑&Wfñ˜W57FW––¢Fó6&∆VC◊∑7FWñÊFWÇ””“«¬ó56fñÊw––¢6∆74Ê÷S“&ˆ∂FÚ◊6V6ˆÊF'í÷7Fñˆ‚v”"Ç”BFWáB◊6“Fó6&∆VC¶˜6óGí”CR –¢‡–¢ƒ6ÜWg&ˆ‰∆VgB6∆74Ê÷S“&Ç”Br”B"Û‡–¢&WF˜W –¢¬ˆ'WGFˆ„‡–¢∆Fób6∆74Ê÷S“&f∆WÇf∆WÇ÷6ˆ¬v”26”¶f∆WÇ◊&˜r#‡–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊≤Çí”‚fˆñB6fT6◊ñv‚Üf«6Ró––¢Fó6&∆VC◊∂ó56fñÊw––¢6∆74Ê÷S“&ˆ∂FÚ◊6V6ˆÊF'í÷7Fñˆ‚Ç”BFWáB◊6“Fó6&∆VC¶˜6óGí”S –¢‡–¢∂ó56fñÊrÚ$VÁ&Vvó7G&V÷VÁN(
b"¢$VÁ&Vvó7G&W"∆R'&˜Vñ∆∆ˆ‚'––¢¬ˆ'WGFˆ„‡–¢∑7FWñÊFWÇ¬tï§$Eı5DU2Ê∆VÊwFÇ“ÚÄ–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊∂ÊWáE7FW––¢6∆74Ê÷S“&ˆ∂FÚ÷fñ∆∆VB÷7Fñˆ‚v”"Ç”RFWáB◊6“ –¢‡–¢6ˆÁFñÁVW –¢ƒ6ÜWg&ˆÂ&ñváB6∆74Ê÷S“&Ç”Br”B"Û‡–¢¬ˆ'WGFˆ„‡–¢í¢Ä–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊≤Çí”‚fˆñB6fT6◊ñv‚áG'VRó––¢Fó6&∆VC◊∂ó56fñÊw––¢6∆74Ê÷S“&ˆ∂FÚ◊&ñ÷'í÷7Fñˆ‚v”"Ç”RFWáB◊6“Fó6&∆VC¶˜6óGí”S –¢‡–¢∂ó56fñÊrÚ%V&∆ñ6FñˆÓ(
b"¢%V&∆ñW"∆6◊vÊR'––¢ƒ6ÜV6≤6∆74Ê÷S“&Ç”Br”B"Û‡–¢¬ˆ'WGFˆ„‡–¢ó––¢¬ˆFóc‡–¢¬ˆFóc‡–¢¬ˆ÷ñ„‡–†–¢∆6ñFR6∆74Ê÷S“&÷ñ‚◊r”#‡–¢∆Fób6∆74Ê÷S“&◊Ç÷WFÚr÷gV∆¬÷Ç◊r’≥3cÖ“76R◊í”B#‡–¢≈vó¶&Dv÷U&WfñWrG&gC◊∂G&gG“÷W&6ÜÁC◊∂÷W&6ÜÁG“Û‡–¢¬ˆFóc‡–¢¬ˆ6ñFS‡–¢¬ˆFóc‡–¢≈&ó¶U7VvvW7FñˆÁ5ÊV¿–¢˜V„◊∑7VvvW7FñˆÁ4˜VÁ––¢7VvvW7FñˆÁ3◊∑&ó¶U7VvvW7FñˆÁ7––¢&V÷ñÊñÊu&ˆ&&ñ∆óGì◊≥“F˜F≈&ˆ&&ñ∆óGó––¢ˆ‰FC◊∂FE7VvvW7FVE&ó¶W––¢ˆ‰6∆˜6S◊≤Çí”‚6WE7VvvW7FñˆÁ4˜V‚Üf«6Ró––¢Û‡–¢¬ˆFóc‡–¢ì∞–ß––