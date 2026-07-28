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
  Gift,
  Plus,
  ShieldCheck,
  Sparkles,
  Soup,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { SocialChannelIcon } from "@/components/merchant/social-channel-icon";
import {
  buildCampaignLivePreviewModel,
  CampaignLivePreview,
} from "@/components/merchant/campaign-editor";
import { actionKindCta } from "@/lib/format";
import { createCampaignEmailDefaults } from "@/lib/email-settings";
import {
  createDefaultPosterSettings,
  createDefaultWheelSettings,
  DEFAULT_SCRATCH_SUBTITLE,
  DEFAULT_WHEEL_SUBTITLE,
  deriveLighterHex,
  normalizeScratchAccent,
} from "@/lib/campaign-defaults";
import {
  ActionKind,
  CampaignAction,
  CampaignSetupInput,
  GamePageTemplateId,
  Merchant,
  PrizeSuggestion,
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
    description: "Choisissez lâ€™expÃ©rience la plus naturelle.",
  },
  {
    id: "appearance",
    number: "03",
    title: "Lâ€™apparence",
    description: "Donnez Ã  la campagne votre signature.",
  },
  {
    id: "prizes",
    number: "04",
    title: "Les lots",
    description: "Cadrez les probabilitÃ©s et les stocks.",
  },
  {
    id: "action",
    number: "05",
    title: "Lâ€™action",
    description:
      "Choisissez lâ€™action proposÃ©e avant le jeu. Elle change Ã  chaque visite pour guider le joueur.",
  },
];

const GOOGLE_REVIEW_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "search.google.com",
  "maps.google.com",
  "g.page",
  "maps.app.goo.gl",
]);

const INCENTIVE_COPY_PATTERN =
  /(?:avis|note|5\s*Ã©toiles|bonne note).{0,80}(?:gagn(?:e|er|Ã©)|cadeau|lot|rÃ©compens)|(?:gagn(?:e|er|Ã©)|cadeau|lot|rÃ©compens).{0,80}(?:avis|note|5\s*Ã©toiles|bonne note)/iu;

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
      return merchant.googleReviewUrl ?? "https://google.com";
    case "instagram":
      return merchant.instagramUrl ?? "https://instagram.com";
    case "facebook":
      return merchant.facebookUrl ?? "https://facebook.com";
    case "tiktok":
      return merchant.tiktokUrl ?? "https://tiktok.com";
    case "tripadvisor":
      return merchant.tripadvisorUrl ?? "https://tripadvisor.com";
    case "custom":
      return merchant.customLinkUrl ?? "https://";
    case "crm":
      return merchant.websiteUrl ?? "https://";
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
      ({ kind, getUrl }) => ({ kind, url: getUrl(merchant)?.trim() ?? "" }),
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
    targetUrl: merchant.googleReviewUrl,
    isActive: false,
    logoMode: "text",
    logoText: merchant.companyName || merchant.logoText,
    accent: { ink: "#111827", paper: "#eef2ff", signal: "#f4c14a" },
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
        label: "Une rÃ©duction de 10 %",
        totalQuantity: null,
        probability: 50,
        estimatedUnitCost: merchant.defaultPrizeCost ?? 5,
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
      return "Donnez un nom de trois caractÃ¨res minimum Ã  votre animation.";
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
      return "La quantitÃ© dâ€™un lot doit Ãªtre supÃ©rieure Ã  0 (ou illimitÃ©e).";
    }
    const total = draft.prizes.reduce(
      (sum, prize) => sum + Number(prize.probability || 0),
      0,
    );
    if (total > 100.0001)
      return "Le total des probabilitÃ©s ne peut pas dÃ©passer 100 %.";
    if (draft.rewardRules.isWinningEveryTime && total < 99.9999)
      return "Un jeu 100 % gagnant doit totaliser exactement 100 % de probabilitÃ©s.";
  }

  if (step === "action" && actionEnabled) {
    if (!draft.actions.length)
      return "Ajoutez au moins une action Ã  proposer avant le jeu.";
    for (const action of draft.actions) {
      if (action.kind === "crm") continue;
      if (!action.url.trim())
        return "Chaque action doit avoir un lien de destination.";
      try {
        const parsed = new URL(normalizeUrl(action.url));
        if (parsed.protocol !== "https:")
          return "Le lien doit utiliser HTTPS pour protÃ©ger les joueurs.";
        if (
          action.kind === "google" &&
          !GOOGLE_REVIEW_HOSTS.has(parsed.hostname.toLowerCase())
        ) {
          return "Utilisez une adresse Google officielle pour lâ€™invitation Ã  laisser un avis.";
        }
        if (
          action.kind === "google" &&
          [draft.subtitle, action.label, draft.ctaLabel].some((copy) =>
            INCENTIVE_COPY_PATTERN.test(copy),
          )
        ) {
          return "Lâ€™invitation ne peut pas promettre un lot en Ã©change dâ€™un avis.";
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
              Suggestions adaptÃ©es
            </p>
            <h3
              id="wizard-prize-suggestions-title"
              className="mt-2 text-xl font-semibold text-[#111827]"
            >
              Ajoutez un lot en quelques secondes
            </h3>
            <p className="mt-2 text-sm text-[#69758a]">
              {remainingProbability < 0
                ? `Le total dÃ©passe 100 % de ${Math.abs(Math.round(remainingProbability))} point(s).`
                : `Il reste ${Math.round(remainingProbability)} % disponible.`}{" "}
              Vous pourrez ajuster les probabilitÃ©s avant de continuer.
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
                      ×_væÚ$z{-®éÜj×SÒ&‚ÓBrÓB"óàĞ¢¦÷WFW"VâÆ÷@Ğ¢Âö'WGFöãàĞ¢ÂöF—càĞ¢’¢çVÆÇĞĞ Ğ¢·7FWæ–BÓÓÒ&7F–öâ"ò€Ğ¢ÆF—b6Æ74æÖSÒ&×BÓr76R×’ÓR#àĞ¢ÆF—b6Æ74æÖSÒ'76R×’ÓB#àĞ¢¶G&gBæ7F–öç2æÖ‚†7F–öâÂ–æFW‚’Óâ€Ğ¢ÆF—`Ğ¢¶W“×¶7F–öâæ–Bóòv—¦&BÖ7F–öâÒG¶–æFW‡ÖĞĞ¢6Æ74æÖSÒ'&÷VæFVBÕ³#…Ò&÷&FW"&÷&FW"Õ²6S&S†cÒ&r×v†—FRÓR Ğ¢àĞ¢ÆF—b6Æ74æÖSÒ&fÆW‚—FV×2Ö6VçFW"§W7F–g’Ö&WGvVVâvÓ2#àĞ¢Ç6Æ74æÖSÒ'FW‡B×‡2föçB×6VÖ–&öÆBWW&66RG&6¶–ærÕ³ãfVÕÒFW‡BÕ²3ƒ““6eÒ#àĞ¢7F–öâ¶–æFW‚²ĞĞ¢Â÷àĞ¢ÆF—b6Æ74æÖSÒ&fÆW‚—FV×2Ö6VçFW"vÓ#àĞ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢öä6Æ–6³×²‚’ÓâÖ÷fT7F–öâ†–æFW‚ÂÓ—ĞĞ¢F—6&ÆVC×¶–æFW‚ÓÓÒĞĞ¢&–ÖÆ&VÃÒ$ÖöçFW"Î(	–7F–öâ Ğ¢6Æ74æÖSÒ'&÷VæFVBÕ³—…ÒÓãRFW‡BÕ²3c“sS†Ò†÷fW#¦&rÕ²6c&cFcuÒF—6&ÆVC¦÷6—G’Ó3 Ğ¢àĞ¢Ä6†Wg&öåW6Æ74æÖSÒ&‚ÓBrÓB"óàĞ¢Âö'WGFöãàĞ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢öä6Æ–6³×²‚’ÓâÖ÷fT7F–öâ†–æFW‚Â—ĞĞ¢F—6&ÆVC×¶–æFW‚ÓÓÒG&gBæ7F–öç2æÆVæwF‚ÒĞĞ¢&–ÖÆ&VÃÒ$FW66VæG&RÎ(	–7F–öâ Ğ¢6Æ74æÖSÒ'&÷VæFVBÕ³—…ÒÓãRFW‡BÕ²3c“sS†Ò†÷fW#¦&rÕ²6c&cFcuÒF—6&ÆVC¦÷6—G’Ó3 Ğ¢àĞ¢Ä6†Wg&öäF÷vâ6Æ74æÖSÒ&‚ÓBrÓB"óàĞ¢Âö'WGFöãàĞ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢öä6Æ–6³×²‚’Óâ&VÖ÷fT7F–öâ†–æFW‚—ĞĞ¢&–ÖÆ&VÃÒ%7W&–ÖW"Î(	–7F–öâ Ğ¢6Æ74æÖSÒ'&÷VæFVBÕ³—…ÒÓãRFW‡BÕ²3c“sS†Ò†÷fW#¦&rÕ²6ffccÒ†÷fW#§FW‡BÕ²6#C#3…Ò Ğ¢àĞ¢ÅG&6ƒ"6Æ74æÖSÒ&‚ÓBrÓB"óàĞ¢Âö'WGFöãàĞ¢ÂöF—càĞ¢ÂöF—càĞ¢ÆF—b6Æ74æÖSÒ&×BÓBw&–BvÓB#àĞ¢ÆÆ&VÂ6Æ74æÖSÒ&&Æö6²#àĞ¢Ç7â6Æ74æÖSÒ&fÆW‚—FV×2Ö6VçFW"vÓ2FW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÕ²3ƒ#35Ò#àĞ¢Å6ö6–Ä6†ææVÄ–6öâ6†ææVÃ×¶7F–öâæ¶–æGÒóàĞ¢Ç7ãä7F–öâ&÷÷<:–SÂ÷7ãàĞ¢Â÷7ãàĞ¢Ç6VÆV7@Ğ¢fÇVS×¶7F–öâæ¶–æGĞĞ¢öä6†ævS×²†WfVçB’Óâ°Ğ¢6öç7B¶–æBÒWfVçBçF&vW@Ğ¢çfÇVR2v—¦&DG&gE²&7F–öç2%Õ¶çVÖ&W%Õ²&¶–æB%Ó°Ğ¢F6„7F–öâ†–æFW‚Â°Ğ¢¶–æBÀĞ¢Æ&VÃ¢7F–öä¶–æD7F†¶–æB’ÀĞ¢W&Ã Ğ¢¶–æBÓÓÒ&vöövÆR Ğ¢òÖW&6†çBævöövÆU&Wf–WuW&ÂÇÂ7F–öâçW&ÀĞ¢¢7F–öâçW&ÂÀĞ¢Ò“°Ğ¢×ĞĞ¢6Æ74æÖSÒ&×BÓ2rÖgVÆÂ&÷VæFVBÕ³G…Ò&÷&FW"&÷&FW"Õ²6F&S6VEÒ&rÕ²6f&f6fUÒ‚ÓB’Ó2FW‡B×6ÒFW‡BÕ²3ƒ#35Ò Ğ¢àĞ¢Æ÷F–öâfÇVSÒ&vöövÆR#äÆ—76W"Vâf—2vöövÆSÂö÷F–öãàĞ¢Æ÷F–öâfÇVSÒ&–ç7Fw&Ò#àĞ¢7V—g&R7W"–ç7Fw&ĞĞ¢Âö÷F–öãàĞ¢Æ÷F–öâfÇVSÒ&f6V&öö²#å7V—g&R7W"f6V&öö³Âö÷F–öãàĞ¢Æ÷F–öâfÇVSÒ'F–·Fö²#å7V—g&R7W"F–µFö³Âö÷F–öãàĞ¢Æ÷F–öâfÇVSÒ'G&—Gf—6÷"#àĞ¢Æ—76W"Vâf—2G&—Gf—6÷ Ğ¢Âö÷F–öãàĞ¢Æ÷F–öâfÇVSÒ&7W7FöÒ#à¢÷Wg&—"VâÆ–VâW'6öææÆ—<:¢Âö÷F–öãà¢Â÷6VÆV7CàĞ¢ÂöÆ&VÃàĞ¢ÂöF—càĞ¢¶7F–öâæ¶–æBÓÒ&7&Ò"ò€Ğ¢ÆÆ&VÂ6Æ74æÖSÒ&×BÓB&Æö6²#àĞ¢Ç7â6Æ74æÖSÒ'FW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÕ²3ƒ#35Ò#àĞ¢Æ–VâFRFW7F–æF–öàĞ¢Â÷7ãàĞ¢Æ–çW@Ğ¢fÇVS×¶7F–öâçW&ÇĞĞ¢öä6†ævS×²†WfVçB’ÓàĞ¢F6„7F–öâ†–æFW‚Â²W&Ã¢WfVçBçF&vWBçfÇVRÒĞ¢ĞĞ¢Æ6V†öÆFW#Ò&‡GG3¢òòâââ Ğ¢6Æ74æÖSÒ&×BÓ2rÖgVÆÂ&÷VæFVBÕ³G…Ò&÷&FW"&÷&FW"Õ²6F&S6VEÒ&rÕ²6f&f6fUÒ‚ÓB’Ó2FW‡B×6ÒFW‡BÕ²3ƒ#35Ò Ğ¢óàĞ¢ÂöÆ&VÃàĞ¢’¢çVÆÇĞ¢ÂöF—càĞ¢’—ĞĞ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢öä6Æ–6³×¶FD7F–öçĞĞ¢6Æ74æÖSÒ&–æÆ–æRÖfÆW‚—FV×2Ö6VçFW"vÓ"&÷VæFVBÕ³G…Ò&÷&FW"&÷&FW"ÖF6†VB&÷&FW"Õ²6#†3VC…Ò‚ÓB’Ó2FW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÕ²3S#cs…Ò†÷fW#¦&÷&FW"Õ²6##ƒs•Ò†÷fW#§FW‡BÕ²3ƒ#35Ò Ğ¢àĞ¢ÅÇW26Æ74æÖSÒ&‚ÓBrÓB"óàĞ¢¦÷WFW"VæR7F–öàĞ¢Âö'WGFöãàĞ¢ÂöF—càĞ¢ÂöF—càĞ¢’¢çVÆÇĞĞ Ğ¢·7FWæ–BÓÓÒ&V&æ6R"ò€Ğ¢ÆF—b6Æ74æÖSÒ&×BÓr76R×’ÓR#àĞ¢ÆF—b6Æ74æÖSÒ&w&–BvÓB6Ó¦w&–BÖ6öÇ2Ó"†Ã¦w&–BÖ6öÇ2ÓB#àĞ¢²€Ğ¢G&gBævÖUG—RÓÓÒ'67&F6‚ Ğ¢ò°Ğ¢²–C¢'67&F6‚×fVÇB"ÂÆ&VÃ¢$6öfg&Rì:–öâ"ÂFW‡C¢$6öfg&R–ÆÇW7G,:’fçBw&GFvR"ÒÀ¢²–C¢'67&F6‚Ö6öæfWGF’"ÂÆ&VÃ¢$6'FR6öæfWGF—2"ÂFW‡C¢%6öÆ—&RWBfW7F–b"ÒÀĞ¢²–C¢'67&F6‚Ö6÷&Â"ÂÆ&VÃ¢$6÷&–Â¦÷–WW‚"ÂFW‡C¢$6Æ—"WB6†ÆWW&WW‚"ÒÀĞ¢²–C¢'67&F6‚ÖÆ–Æ2"ÂÆ&VÃ¢$6FVRÆ–Æ2"ÂFW‡C¢$6FVR6Æ—"WB6öçG&7L:’"ÒÀ¢²–C¢'67&F6‚×7Væ'W'7B"ÂÆ&VÃ¢%&–öç26öÆV–Â"ÂFW‡C¢,8–6ÆFçBWBf—6–&ÆR"ÒÀĞ¢Ò26öç7@Ğ¢¢°Ğ¢°Ğ¢–C¢&6Æ76–2"ÀĞ¢Æ&VÃ¢$6Æ76—VR"ÀĞ¢FW‡C¢%6ö'&RWBÆ—6–&ÆR"ÀĞ¢ÒÀĞ¢°Ğ¢–C¢'&W7FW&çB×÷"ÀĞ¢Æ&VÃ¢%f—7VVÂ÷"ÀĞ¢FW‡C¢,8—l:–æVÖVçF–VÂWB6öçG&7L:’"ÀĞ¢ÒÀĞ¢°Ğ¢–C¢&6÷6Ö–2Ö÷&&—B"ÀĞ¢Æ&VÃ¢$÷&&—Bì:–öâ"ÀĞ¢FW‡C¢$–ÖÖW'6–bWBæö7GW&æR"ÀĞ¢ÒÀĞ¢°Ğ¢–C¢'7Væ'W'7BÖfW7F—fÂ"ÀĞ¢Æ&VÃ¢%6öÆV–Â÷"ÀĞ¢FW‡C¢$fW7F–bWBÇVÖ–æWW‚"ÀĞ¢ÒÀĞ¢Ò26öç7@Ğ¢’ç6Æ–6R‚’ç6÷'B‚†ÆVgBÂ&–v‡B’Óâ†ÆVgBæ–BÓÓÒ'67&F6‚Ö6÷&Â"òÓ¢&–v‡Bæ–BÓÓÒ'67&F6‚Ö6÷&Â"ò¢’’æÖ‚‡FV×ÆFR’Óâ€Ğ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢¶W“×·FV×ÆFRæ–GĞĞ¢öä6Æ–6³×²‚’ÓàĞ¢F6„G&gB‡°Ğ¢&W6VçFF–öã¢°¢ââæG&gBç&W6VçFF–öâÀ¢Æ–÷WC¢°¢ââæG&gBç&W6VçFF–öâæÆ–÷WBÀ¢FV×ÆFT–C¢FV×ÆFRæ–BÀ¢ÒÀ¢ÒÀ¢66VçC ¢G&gBævÖUG—RÓÓÒ'67&F6‚ ¢òæ÷&ÖÆ—¦U67&F6„66VçB†G&gBæ66VçBÂFV×ÆFRæ–B¢¢G&gBæ66VçBÀ¢Ò¢ĞĞ¢6Æ74æÖS×¶&÷VæFVBÕ³#…Ò&÷&FW"ÓBFW‡BÖÆVgBG¶G&gBç&W6VçFF–öâæÆ–÷WBçFV×ÆFT–BÓÓÒFV×ÆFRæ–Bò&&÷&FW"Õ²6##ƒs•Ò&rÕ²6ffc†SÒ"¢&&÷&FW"Õ²6S&S†cÒ&rÕ²6f&f6fUÒ'ÖĞĞ¢àĞ¢Ç7â6Æ74æÖSÒ&&Æö6²FW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÕ²3ƒ#35Ò#àĞ¢·FV×ÆFRæÆ&VÇĞĞ¢Â÷7ãàĞ¢Ç7â6Æ74æÖSÒ&×BÓ&Æö6²FW‡B×‡2FW‡BÕ²3ƒ““6eÒ#àĞ¢·FV×ÆFRçFW‡GĞĞ¢Â÷7ãàĞ¢Âö'WGFöãàĞ¢’—ĞĞ¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&w&–BvÓB6Ó¦w&–BÖ6öÇ2Ó"#à¢¶G&gBævÖUG—RÓÓÒ'v†VVÂ"ò€¢Ãà¢ÆÆ&VÂ6Æ74æÖSÒ&&Æö6²#à¢Ç7â6Æ74æÖSÒ'FW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÕ²3ƒ#35Ò#àĞ¢6÷VÆWW"FRföæ@Ğ¢Â÷7ãàĞ¢Æ–çW@Ğ¢G—SÒ&6öÆ÷" Ğ¢fÇVS×¶G&gBç&W6VçFF–öâæ&6¶w&÷VæBæ6öÆ÷'ĞĞ¢öä6†ævS×²†WfVçB’ÓàĞ¢F6„G&gB‡°Ğ¢&W6VçFF–öã¢°Ğ¢ââæG&gBç&W6VçFF–öâÀĞ¢&6¶w&÷VæC¢°Ğ¢ââæG&gBç&W6VçFF–öâæ&6¶w&÷VæBÀĞ¢6öÆ÷#¢WfVçBçF&vWBçfÇVRÀĞ¢ÒÀĞ¢ÒÀĞ¢ÒĞ¢ĞĞ¢6Æ74æÖSÒ&×BÓ2‚Ó"rÖgVÆÂ&÷VæFVBÕ³'…Ò&÷&FW"&÷&FW"Õ²6F&S6VEÒ&r×v†—FRÓ Ğ¢óàĞ¢ÂöÆ&VÃà¢ÆÆ&VÂ6Æ74æÖSÒ&&Æö6²#à¢Ç7â6Æ74æÖSÒ'FW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÕ²3ƒ#35Ò#àĞ¢6÷VÆWW"&–æ6—ÆRGR&÷WFöàĞ¢Â÷7ãàĞ¢Æ–çW@Ğ¢G—SÒ&6öÆ÷" Ğ¢fÇVS×°Ğ¢G&gBævÖUG—RÓÓÒ'v†VVÂ Ğ¢òG&gBç&W6VçFF–öâçv†VVÂæÆ÷6T6öÆ÷ Ğ¢¢G&gBç&W6VçFF–öâæ'WGFöâæ&6¶w&÷VæD6öÆ÷ Ğ¢ĞĞ¢öä6†ævS×²†WfVçB’Óâ°Ğ¢6öç7B6öÆ÷"ÒWfVçBçF&vWBçfÇVS°Ğ¢6WDG&gB‚†7W'&VçB’Óâ‡°Ğ¢ââæ7W'&VçBÀĞ¢&W6VçFF–öã¢°Ğ¢ââæ7W'&VçBç&W6VçFF–öâÀĞ¢'WGFöã¢°Ğ¢ââæ7W'&VçBç&W6VçFF–öâæ'WGFöâÀĞ¢&6¶w&÷VæD6öÆ÷#¢6öÆ÷"ÀĞ¢&÷&FW$6öÆ÷#¢6öÆ÷"ÀĞ¢ÒÀĞ¢v†VVÃ ¢7W'&VçBævÖUG—RÓÓÒ'v†VVÂ ¢ò°¢ââæ7W'&VçBç&W6VçFF–öâçv†VVÂÀ¢Æ÷6T6öÆ÷#¢6öÆ÷"À¢ÇFW&æFTÆ÷6T6öÆ÷#¢FW&—fTÆ–v‡FW$†W‚†6öÆ÷"’À¢&–Ô6öÆ÷#¢FW&—fTÆ–v‡FW$†W‚†6öÆ÷"’À¢Ğ¢¢7W'&VçBç&W6VçFF–öâçv†VVÂÀĞ¢ÒÀĞ¢Ò’“°Ğ¢×ĞĞ¢6Æ74æÖSÒ&×BÓ2‚Ó"rÖgVÆÂ&÷VæFVBÕ³'…Ò&÷&FW"&÷&FW"Õ²6F&S6VEÒ&r×v†—FRÓ Ğ¢óàĞ¢ÂöÆ&VÃà¢Âóà¢’¢çVÆÇĞ¢ÂöF—cà¢¶G&gBævÖUG—RÓÓÒ'67&F6‚"ò€Ğ¢ÆÆ&VÂ6Æ74æÖSÒ&&Æö6²#àĞ¢Ç7â6Æ74æÖSÒ'FW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÕ²3ƒ#35Ò#àĞ¢6÷VÆWW"&–æ6—ÆRGRF–6¶W@Ğ¢Â÷7ãàĞ¢Ç7â6Æ74æÖSÒ&×BÓ&Æö6²FW‡B×‡2FW‡BÕ²3ƒ““6eÒ#àĞ¢VÆÆR6öÆ÷&RÆ¦öæR:w&GFW"WBÆW2:–Ì:–ÖVçG2w&†—VW2GRFV×ÆFRàĞ¢Â÷7ãàĞ¢Æ–çW@Ğ¢G—SÒ&6öÆ÷" Ğ¢fÇVS×¶G&gBæ66VçBç6–væÇĞĞ¢öä6†ævS×²†WfVçB’ÓàĞ¢F6„G&gB‡°Ğ¢66VçC¢²ââæG&gBæ66VçBÂ6–væÃ¢WfVçBçF&vWBçfÇVRÒÀĞ¢ÒĞ¢ĞĞ¢6Æ74æÖSÒ&×BÓ2‚Ó"rÖgVÆÂ&÷VæFVBÕ³'…Ò&÷&FW"&÷&FW"Õ²6F&S6VEÒ&r×v†—FRÓ Ğ¢óàĞ¢ÂöÆ&VÃàĞ¢’¢çVÆÇĞĞ¢ÂöF—càĞ¢’¢çVÆÇĞĞ Ğ¢¶W'&÷"ò€Ğ¢ÆF—`Ğ¢&öÆSÒ&ÆW'B Ğ¢6Æ74æÖSÒ&×BÓb&÷VæFVBÕ³g…Ò&÷&FW"&÷&FW"Õ²6c&3†3…Ò&rÕ²6ffcFcEÒ‚ÓB’Ó2FW‡B×6ÒÆVF–ærÓbFW‡BÕ²6Ò Ğ¢àĞ¢¶W'&÷'ĞĞ¢ÂöF—càĞ¢’¢çVÆÇĞĞ¢ÆF—b6Æ74æÖSÒ&×BÓ‚fÆW‚fÆW‚Ö6öÂ×&WfW'6RvÓ2&÷&FW"×B&÷&FW"Õ²6VFccEÒBÓR6Ó¦fÆW‚×&÷r6Ó¦—FV×2Ö6VçFW"6Ó¦§W7F–g’Ö&WGvVVâ#àĞ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢öä6Æ–6³×·&Wf–÷W57FWĞĞ¢F—6&ÆVC×·7FW–æFW‚ÓÓÒÇÂ—56f–æwĞĞ¢6Æ74æÖSÒ&ö¶Fò×6V6öæF'’Ö7F–öâvÓ"‚ÓBFW‡B×6ÒF—6&ÆVC¦÷6—G’ÓCR Ğ¢àĞ¢Ä6†Wg&öäÆVgB6Æ74æÖSÒ&‚ÓBrÓB"óàĞ¢&WF÷W Ğ¢Âö'WGFöãàĞ¢ÆF—b6Æ74æÖSÒ&fÆW‚fÆW‚Ö6öÂvÓ26Ó¦fÆW‚×&÷r#àĞ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢öä6Æ–6³×²‚’Óâfö–B6fT6×–vâ†fÇ6R—ĞĞ¢F—6&ÆVC×¶—56f–æwĞĞ¢6Æ74æÖSÒ&ö¶Fò×6V6öæF'’Ö7F–öâ‚ÓBFW‡B×6ÒF—6&ÆVC¦÷6—G’ÓS Ğ¢àĞ¢¶—56f–ærò$Vç&Vv—7G&VÖVçN(
b"¢$Vç&Vv—7G&W"ÆR'&÷V–ÆÆöâ'ĞĞ¢Âö'WGFöãàĞ¢·7FW–æFW‚Ât•¤$Eõ5DU2æÆVæwF‚Òò€Ğ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢öä6Æ–6³×¶æW‡E7FWĞĞ¢6Æ74æÖSÒ&ö¶FòÖf–ÆÆVBÖ7F–öâvÓ"‚ÓRFW‡B×6Ò Ğ¢àĞ¢6öçF–çVW Ğ¢Ä6†Wg&öå&–v‡B6Æ74æÖSÒ&‚ÓBrÓB"óàĞ¢Âö'WGFöãàĞ¢’¢€Ğ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢öä6Æ–6³×²‚’Óâfö–B6fT6×–vâ‡G'VR—ĞĞ¢F—6&ÆVC×¶—56f–æwĞĞ¢6Æ74æÖSÒ&ö¶Fò×&–Ö'’Ö7F–öâvÓ"‚ÓRFW‡B×6ÒF—6&ÆVC¦÷6—G’ÓS Ğ¢àĞ¢¶—56f–ærò%V&Æ–6F–öî(
b"¢%V&Æ–W"Æ6×væR'ĞĞ¢Ä6†V6²6Æ74æÖSÒ&‚ÓBrÓB"óàĞ¢Âö'WGFöãàĞ¢—ĞĞ¢ÂöF—càĞ¢ÂöF—càĞ¢ÂöÖ–ãàĞ Ğ¢Æ6–FR6Æ74æÖSÒ&Ö–â×rÓ#àĞ¢ÆF—b6Æ74æÖSÒ&×‚ÖWFòrÖgVÆÂÖ‚×rÕ³3c…Ò76R×’ÓB#àĞ¢Åv—¦&DvÖU&Wf–WrG&gC×¶G&gGÒÖW&6†çC×¶ÖW&6†çGÒóàĞ¢ÂöF—càĞ¢Âö6–FSàĞ¢ÂöF—càĞ¢Å&—¦U7VvvW7F–öç5æVÀĞ¢÷Vã×·7VvvW7F–öç4÷VçĞĞ¢7VvvW7F–öç3×·&—¦U7VvvW7F–öç7ĞĞ¢&VÖ–æ–æu&ö&&–Æ—G“×³ÒF÷FÅ&ö&&–Æ—G—ĞĞ¢öäFC×¶FE7VvvW7FVE&—¦WĞĞ¢öä6Æ÷6S×²‚’Óâ6WE7VvvW7F–öç4÷Vâ†fÇ6R—ĞĞ¢óàĞ¢ÂöF—càĞ¢“°Ğ§ĞĞ 