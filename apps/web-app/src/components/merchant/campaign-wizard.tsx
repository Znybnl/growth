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
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { BrandMark } from "@/components/brand-mark";
import { SocialChannelIcon } from "@/components/merchant/social-channel-icon";
import {
  buildCampaignLivePreviewModel,
  CampaignLivePreview,
} from "@/components/merchant/campaign-editor";
import { actionKindCta } from "@/lib/format";
import { createCampaignEmailDefaults } from "@/lib/email-settings";
import { createPosterSettingsDefaults } from "@/lib/poster-utils";
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
    description: "Choisissez l‚Äôexp√©rience la plus naturelle.",
  },
  {
    id: "prizes",
    number: "03",
    title: "Les lots",
    description: "Cadrez les probabilit√©s et les stocks.",
  },
  {
    id: "action",
    number: "04",
    title: "L‚Äôaction",
    description:
      "Choisissez les actions propos√©es apr√®s le jeu. Elles peuvent varier √† chaque participation.",
  },
  {
    id: "appearance",
    number: "05",
    title: "L‚Äôapparence",
    description: "Donnez √† la campagne votre signature.",
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
      createWizardAction("wizard-crm-action", "crm", ""),
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
  const wheel = {
    rimColor: "#d9b34a",
    winColor: "#f4c14a",
    alternateWinColor: "#fff7dd",
    loseColor: "#1b2842",
    alternateLoseColor: "#8795db",
  };

  return {
    merchantId: merchant.id,
    title: "",
    subtitle: "Faites tourner la roue pour tenter votre chance.",
    goalType: "review_prompt",
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
      poster: createPosterSettingsDefaults({
        logoMode: "text",
        logoText: merchant.companyName || merchant.logoText,
        backgroundMode: "color",
        backgroundColor: "#fffaf1",
        headline: "Scannez, jouez, r√©cup√©rez votre cadeau",
        headlineTextColor: "#1b2842",
        wheel,
        footerBackgroundColor: "#f4c14a",
      }),
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
        label: "Cadeau surprise",
        totalQuantity: null,
        probability: 25,
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
      return "Ajoutez au moins une action √† proposer apr√®s le jeu.";
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
             ◊n{÷⁄$z{-ÆÈ‹j◊ù“Ü˜fW#ßFWáB’≤6#C#3Ö“ –¢‡–¢≈G&6É"6∆74Ê÷S“&Ç”Br”B"Û‡–¢¬ˆ'WGFˆ„‡–¢¬ˆFóc‡–¢¬ˆFóc‡–¢∆Fób6∆74Ê÷S“&◊B”Bw&ñBv”B#‡–¢∆∆&V¬6∆74Ê÷S“&&∆ˆ6≤#‡–¢«7‚6∆74Ê÷S“&f∆WÇóFV◊2÷6VÁFW"v”2FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢≈6ˆ6ñƒ6ÜÊÊVƒñ6ˆ‚6ÜÊÊV√◊∂7Fñˆ‚Ê∂ñÊG“Û‡–¢«7„‰7Fñˆ‚&˜˜<:ñS¬˜7„‡–¢¬˜7„‡–¢«6V∆V7@–¢f«VS◊∂7Fñˆ‚Ê∂ñÊG––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚∞–¢6ˆÁ7B∂ñÊB“WfVÁBÁF&vW@–¢Áf«VR2vó¶&DG&gE≤&7FñˆÁ2%’∂ÁV÷&W%’≤&∂ñÊB%”∞–¢F6Ñ7Fñˆ‚ÜñÊFWÇ¬∞–¢∂ñÊB¿–¢∆&V√¢7Fñˆ‰∂ñÊD7FÜ∂ñÊBí¿–¢W&√†–¢∂ñÊB””“&vˆˆv∆R –¢Ú÷W&6ÜÁBÊvˆˆv∆U&WfñWuW&¬«¬7Fñˆ‚ÁW&¿–¢¢7Fñˆ‚ÁW&¬¿–¢“ì∞–¢◊––¢6∆74Ê÷S“&◊B”2r÷gV∆¬&˜VÊFVB’≥GÖ“&˜&FW"&˜&FW"’≤6F&S6VE“&r’≤6f&f6fU“Ç”Bí”2FWáB◊6“FWáB’≤3É#35“ –¢‡–¢∆˜Fñˆ‚f«VS“&vˆˆv∆R#‰∆ó76W"V‚fó2vˆˆv∆S¬ˆ˜Fñˆ„‡–¢∆˜Fñˆ‚f«VS“&ñÁ7Fw&“#‡–¢7Vóg&R7W"ñÁ7Fw&––¢¬ˆ˜Fñˆ„‡–¢∆˜Fñˆ‚f«VS“&f6V&ˆˆ≤#Â7Vóg&R7W"f6V&ˆˆ≥¬ˆ˜Fñˆ„‡–¢∆˜Fñˆ‚f«VS“'Fñ∑Fˆ≤#Â7Vóg&R7W"FñµFˆ≥¬ˆ˜Fñˆ„‡–¢∆˜Fñˆ‚f«VS“'G&óGfó6˜"#‡–¢∆ó76W"V‚fó2G&óGfó6˜ –¢¬ˆ˜Fñˆ„‡–¢∆˜Fñˆ‚f«VS“&7&“#‰6ˆ∆∆V7FRV÷ñ√¬ˆ˜Fñˆ„‡–¢∆˜Fñˆ‚f«VS“&7W7Fˆ“#‡–¢˜Wg&ó"V‚∆ñV‚W'6ˆÊÊ∆ó<:ê–¢¬ˆ˜Fñˆ„‡–¢¬˜6V∆V7C‡–¢¬ˆ∆&V√‡–¢¬ˆFóc‡–¢∂7Fñˆ‚Ê∂ñÊB”“&7&“"ÚÄ–¢∆∆&V¬6∆74Ê÷S“&◊B”B&∆ˆ6≤#‡–¢«7‚6∆74Ê÷S“'FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢∆ñV‚FRFW7FñÊFñˆ‡–¢¬˜7„‡–¢∆ñÁW@–¢f«VS◊∂7Fñˆ‚ÁW&«––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢F6Ñ7Fñˆ‚ÜñÊFWÇ¬≤W&√¢WfVÁBÁF&vWBÁf«VR“ê–¢––¢∆6VÜˆ∆FW#“&áGG3¢ÚÚ‚‚‚ –¢6∆74Ê÷S“&◊B”2r÷gV∆¬&˜VÊFVB’≥GÖ“&˜&FW"&˜&FW"’≤6F&S6VE“&r’≤6f&f6fU“Ç”Bí”2FWáB◊6“FWáB’≤3É#35“ –¢Û‡–¢¬ˆ∆&V√‡–¢í¢Ä–¢«6∆74Ê÷S“&◊B”B&˜VÊFVB’≥'Ö“&r’≤6cfcÜf%“Ç”2í”"FWáB◊á2∆VFñÊr”RFWáB’≤3cìsSÜ“#‡–¢∆W26ˆ˜&FˆÊÏ:ñW26ˆÁB6ˆ∆∆V7L:ñW2FÁ2∆Rf˜&◊V∆ó&R,:á2∆R¶WR∞–¢V7V‚∆ñV‚WáFW&ÊRÓ(	ñW7B&WVó2‡–¢¬˜‡–¢ó––¢¬ˆFóc‡–¢íó––¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊∂FD7FñˆÁ––¢6∆74Ê÷S“&ñÊ∆ñÊR÷f∆WÇóFV◊2÷6VÁFW"v”"&˜VÊFVB’≥GÖ“&˜&FW"&˜&FW"÷F6ÜVB&˜&FW"’≤6#Ü3VCÖ“Ç”Bí”2FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3S#csÖ“Ü˜fW#¶&˜&FW"’≤6##Ésï“Ü˜fW#ßFWáB’≤3É#35“ –¢‡–¢≈«W26∆74Ê÷S“&Ç”Br”B"Û‡–¢¶˜WFW"VÊR7Fñˆ‡–¢¬ˆ'WGFˆ„‡–¢¬ˆFóc‡–¢¬ˆFóc‡–¢í¢ÁV∆«––†–¢∑7FWÊñB””“&V&Ê6R"ÚÄ–¢∆Fób6∆74Ê÷S“&◊B”r76R◊í”R#‡–¢∆Fób6∆74Ê÷S“&w&ñBv”B6”¶w&ñB÷6ˆ«2”"Ü√¶w&ñB÷6ˆ«2”B#‡–¢≤Ä–¢G&gBÊv÷UGóR””“'67&F6Ç –¢Ú∞–¢≤ñC¢'67&F6Ç◊fV«B"¬∆&V√¢$6ˆfg&RÏ:ñˆ‚"¬FWáC¢$6ˆfg&Rñ∆«W7G,:ífÁBw&GFvR"“¿¢≤ñC¢'67&F6Ç÷6ˆÊfWGFí"¬∆&V√¢$6'FR6ˆÊfWGFó2"¬FWáC¢%6ˆ∆ó&RWBfW7Fñb"“¿–¢≤ñC¢'67&F6Ç÷6˜&¬"¬∆&V√¢$6˜&ñ¬¶˜ñWWÇ"¬FWáC¢$6∆ó"WB6Ü∆WW&WWÇ"“¿–¢≤ñC¢'67&F6Ç÷∆ñ∆2"¬∆&V√¢$6FVR∆ñ∆2"¬FWáC¢$6FVR6∆ó"WB6ˆÁG&7L:í"“¿¢≤ñC¢'67&F6Ç◊7VÊ'W'7B"¬∆&V√¢%&ñˆÁ26ˆ∆Vñ¬"¬FWáC¢,8ñ6∆FÁBWBfó6ñ&∆R"“¿–¢“26ˆÁ7@–¢¢∞–¢∞–¢ñC¢&6∆76ñ2"¿–¢∆&V√¢$6∆76óVR"¿–¢FWáC¢%6ˆ'&RWB∆ó6ñ&∆R"¿–¢“¿–¢∞–¢ñC¢'&W7FW&ÁB◊˜"¿–¢∆&V√¢%fó7VV¬˜"¿–¢FWáC¢,8ól:ñÊV÷VÁFñV¬WB6ˆÁG&7L:í"¿–¢“¿–¢∞–¢ñC¢&6˜6÷ñ2÷˜&&óB"¿–¢∆&V√¢$˜&&óBÏ:ñˆ‚"¿–¢FWáC¢$ñ÷÷W'6ñbWBÊˆ7GW&ÊR"¿–¢“¿–¢∞–¢ñC¢'7VÊ'W'7B÷fW7Fóf¬"¿–¢∆&V√¢%6ˆ∆Vñ¬˜"¿–¢FWáC¢$fW7FñbWB«V÷ñÊWWÇ"¿–¢“¿–¢“26ˆÁ7@–¢íÁ6∆ñ6RÇíÁ6˜'BÇÜ∆VgB¬&ñváBí”‚Ü∆VgBÊñB””“'67&F6Ç÷6˜&¬"Ú”¢&ñváBÊñB””“'67&F6Ç÷6˜&¬"Ú¢ííÊ÷ÇáFV◊∆FRí”‚Ä–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢∂Wì◊∑FV◊∆FRÊñG––¢ˆ‰6∆ñ6≥◊≤Çí”‡–¢F6ÑG&gBá∞–¢&W6VÁFFñˆ„¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚¿–¢∆ñ˜WC¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚Ê∆ñ˜WB¿–¢FV◊∆FTñC¢FV◊∆FRÊñB¿–¢“¿–¢“¿–¢“ê–¢––¢6∆74Ê÷S◊∂&˜VÊFVB’≥#Ö“&˜&FW"”BFWáB÷∆VgBG∂G&gBÁ&W6VÁFFñˆ‚Ê∆ñ˜WBÁFV◊∆FTñB””“FV◊∆FRÊñBÚ&&˜&FW"’≤6##Ésï“&r’≤6ffcÜS“"¢&&˜&FW"’≤6S&SÜc“&r’≤6f&f6fU“'÷––¢‡–¢«7‚6∆74Ê÷S“&&∆ˆ6≤FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢∑FV◊∆FRÊ∆&V«––¢¬˜7„‡–¢«7‚6∆74Ê÷S“&◊B”&∆ˆ6≤FWáB◊á2FWáB’≤3Éìì6e“#‡–¢∑FV◊∆FRÁFWáG––¢¬˜7„‡–¢¬ˆ'WGFˆ„‡–¢íó––¢¬ˆFóc‡–¢∆Fób6∆74Ê÷S“&w&ñBv”B6”¶w&ñB÷6ˆ«2”"#‡–¢∆∆&V¬6∆74Ê÷S“&&∆ˆ6≤#‡–¢«7‚6∆74Ê÷S“'FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢6˜V∆WW"FRfˆÊ@–¢¬˜7„‡–¢∆ñÁW@–¢GóS“&6ˆ∆˜" –¢f«VS◊∂G&gBÁ&W6VÁFFñˆ‚Ê&6∂w&˜VÊBÊ6ˆ∆˜'––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢F6ÑG&gBá∞–¢&W6VÁFFñˆ„¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚¿–¢&6∂w&˜VÊC¢∞–¢‚‚ÊG&gBÁ&W6VÁFFñˆ‚Ê&6∂w&˜VÊB¿–¢6ˆ∆˜#¢WfVÁBÁF&vWBÁf«VR¿–¢“¿–¢“¿–¢“ê–¢––¢6∆74Ê÷S“&◊B”2Ç”"r÷gV∆¬&˜VÊFVB’≥'Ö“&˜&FW"&˜&FW"’≤6F&S6VE“&r◊vÜóFR” –¢Û‡–¢¬ˆ∆&V√‡–¢∆∆&V¬6∆74Ê÷S“&&∆ˆ6≤#‡–¢«7‚6∆74Ê÷S“'FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢6˜V∆WW"&ñÊ6ó∆RGR&˜WFˆ‡–¢¬˜7„‡–¢∆ñÁW@–¢GóS“&6ˆ∆˜" –¢f«VS◊∞–¢G&gBÊv÷UGóR””“'vÜVV¬ –¢ÚG&gBÁ&W6VÁFFñˆ‚ÁvÜVV¬Ê∆˜6T6ˆ∆˜ –¢¢G&gBÁ&W6VÁFFñˆ‚Ê'WGFˆ‚Ê&6∂w&˜VÊD6ˆ∆˜ –¢––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‚∞–¢6ˆÁ7B6ˆ∆˜"“WfVÁBÁF&vWBÁf«VS∞–¢6WDG&gBÇÜ7W'&VÁBí”‚á∞–¢‚‚Ê7W'&VÁB¿–¢&W6VÁFFñˆ„¢∞–¢‚‚Ê7W'&VÁBÁ&W6VÁFFñˆ‚¿–¢'WGFˆ„¢∞–¢‚‚Ê7W'&VÁBÁ&W6VÁFFñˆ‚Ê'WGFˆ‚¿–¢&6∂w&˜VÊD6ˆ∆˜#¢6ˆ∆˜"¿–¢&˜&FW$6ˆ∆˜#¢6ˆ∆˜"¿–¢“¿–¢vÜVV√†–¢7W'&VÁBÊv÷UGóR””“'vÜVV¬ –¢Ú∞–¢‚‚Ê7W'&VÁBÁ&W6VÁFFñˆ‚ÁvÜVV¬¿–¢∆˜6T6ˆ∆˜#¢6ˆ∆˜"¿–¢––¢¢7W'&VÁBÁ&W6VÁFFñˆ‚ÁvÜVV¬¿–¢“¿–¢“íì∞–¢◊––¢6∆74Ê÷S“&◊B”2Ç”"r÷gV∆¬&˜VÊFVB’≥'Ö“&˜&FW"&˜&FW"’≤6F&S6VE“&r◊vÜóFR” –¢Û‡–¢¬ˆ∆&V√‡–¢¬ˆFóc‡–¢∂G&gBÊv÷UGóR””“'67&F6Ç"ÚÄ–¢∆∆&V¬6∆74Ê÷S“&&∆ˆ6≤#‡–¢«7‚6∆74Ê÷S“'FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢6˜V∆WW"&ñÊ6ó∆RGRFñ6∂W@–¢¬˜7„‡–¢«7‚6∆74Ê÷S“&◊B”&∆ˆ6≤FWáB◊á2FWáB’≤3Éìì6e“#‡–¢V∆∆R6ˆ∆˜&R∆¶ˆÊR:w&GFW"WB∆W2:ñÃ:ñ÷VÁG2w&ÜóVW2GRFV◊∆FR‡–¢¬˜7„‡–¢∆ñÁW@–¢GóS“&6ˆ∆˜" –¢f«VS◊∂G&gBÊ66VÁBÁ6ñvÊ«––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢F6ÑG&gBá∞–¢66VÁC¢≤‚‚ÊG&gBÊ66VÁB¬6ñvÊ√¢WfVÁBÁF&vWBÁf«VR“¿–¢“ê–¢––¢6∆74Ê÷S“&◊B”2Ç”"r÷gV∆¬&˜VÊFVB’≥'Ö“&˜&FW"&˜&FW"’≤6F&S6VE“&r◊vÜóFR” –¢Û‡–¢¬ˆ∆&V√‡–¢í¢ÁV∆«––¢∆Fób6∆74Ê÷S“'&˜VÊFVB’≥#Ö“&˜&FW"&˜&FW"’≤6S&SÜc“&r’≤6f&f6fU“”R#‡–¢«6∆74Ê÷S“'FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‰∆ˆvÛ¬˜‡–¢«6∆74Ê÷S“&◊B”FWáB◊á2FWáB’≤3Éìì6e“#‡–¢Ê˜W2WFñ∆ó6W&ˆÁ2∆R∆ˆvÚGR6ˆ÷÷W&6R6íf˜W2V‚fW¢L:ñ¨: –¢6ˆÊfñwW,:íV‚‡–¢¬˜‡–¢∆∆&V¬6∆74Ê÷S“&◊B”B&∆ˆ6≤7W'6˜"◊ˆñÁFW"#‡–¢«7‚6∆74Ê÷S“'FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢6Ü&vW"V‚∆ˆv–¢¬˜7„‡–¢∆ñÁW@–¢GóS“&fñ∆R –¢66WC“&ñ÷vR˜Êr∆ñ÷vRˆßVr∆ñ÷vR˜vV'∆ñ÷vRˆvñb –¢ˆ‰6ÜÊvS◊∂ÜÊF∆T∆ˆvıW∆ˆG––¢6∆74Ê÷S“&◊B”2&∆ˆ6≤r÷gV∆¬7W'6˜"◊ˆñÁFW"&˜VÊFVB’≥GÖ“&˜&FW"&˜&FW"÷F6ÜVB&˜&FW"’≤6#Ü3VCÖ“&r◊vÜóFRÇ”2í”2FWáB◊6“FWáB’≤3S#csÖ“fñ∆S¶◊"”2fñ∆Sß&˜VÊFVB’≥Ö“fñ∆S¶&˜&FW"”fñ∆S¶&r’≤6VVc&fe“fñ∆SßÇ”2fñ∆Sßí”"fñ∆SßFWáB◊6“fñ∆S¶fˆÁB◊6V÷ñ&ˆ∆Bfñ∆SßFWáB’≤3É#35“ –¢Û‡–¢«7‚6∆74Ê÷S“&◊B”"&∆ˆ6≤FWáB◊á2FWáB’≤3Éìì6e“#‡–¢‰r¬•r¬tT%˜Rtîb+r"÷Ú÷Üñ◊V“‡–¢¬˜7„‡–¢¬ˆ∆&V√‡–¢∆Fób6∆74Ê÷S“&◊B”Bf∆WÇ÷ñ‚◊r”óFV◊2÷6VÁFW"v”2&˜VÊFVB’≥GÖ“&˜&FW"&˜&FW"’≤6F&S6VE“&r◊vÜóFRÇ”2í”"„R#‡–¢∂G&gBÊ∆ˆvıW&¬ÚÄ–¢√‡–¢ƒ'&ÊD÷&∞–¢∆ˆvıFWáC◊∂G&gBÊ∆ˆvıFWáB«¬÷W&6ÜÁBÊ6ˆ◊ÁîÊ÷W––¢∆ˆvıW&√◊∂G&gBÊ∆ˆvıW&«––¢6ó¶S“'6“ –¢Û‡–¢«7‚6∆74Ê÷S“&÷ñ‚◊r”G'VÊ6FRFWáB◊6“FWáB’≤3S#csÖ“#‡–¢∂G&gBÊ∆ˆvıFWáB«¬÷W&6ÜÁBÊ6ˆ◊ÁîÊ÷W––¢¬˜7„‡–¢¬Û‡–¢í¢Ä–¢«7‚6∆74Ê÷S“&÷ñ‚◊r”G'VÊ6FRfˆÁB÷Fó7∆íFWáB÷&6RfˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢∂G&gBÊ∆ˆvıFWáB«¬÷W&6ÜÁBÊ6ˆ◊ÁîÊ÷W––¢¬˜7„‡–¢ó––¢¬ˆFóc‡–¢¬ˆFóc‡–¢¬ˆFóc‡–¢í¢ÁV∆«––†–¢∂W'&˜"ÚÄ–¢∆Fó`–¢&ˆ∆S“&∆W'B –¢6∆74Ê÷S“&◊B”b&˜VÊFVB’≥gÖ“&˜&FW"&˜&FW"’≤6c&3Ü3Ö“&r’≤6ffcFcE“Ç”Bí”2FWáB◊6“∆VFñÊr”bFWáB’≤6“ –¢‡–¢∂W'&˜'––¢¬ˆFóc‡–¢í¢ÁV∆«––¢∆Fób6∆74Ê÷S“&◊B”Çf∆WÇf∆WÇ÷6ˆ¬◊&WfW'6Rv”2&˜&FW"◊B&˜&FW"’≤6VFccE“B”R6”¶f∆WÇ◊&˜r6”¶óFV◊2÷6VÁFW"6”¶ßW7Fñgí÷&WGvVV‚#‡–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊∑&Wfñ˜W57FW––¢Fó6&∆VC◊∑7FWñÊFWÇ””“«¬ó56fñÊw––¢6∆74Ê÷S“&ˆ∂FÚ◊6V6ˆÊF'í÷7Fñˆ‚v”"Ç”BFWáB◊6“Fó6&∆VC¶˜6óGí”CR –¢‡–¢ƒ6ÜWg&ˆ‰∆VgB6∆74Ê÷S“&Ç”Br”B"Û‡–¢&WF˜W –¢¬ˆ'WGFˆ„‡–¢∆Fób6∆74Ê÷S“&f∆WÇf∆WÇ÷6ˆ¬v”26”¶f∆WÇ◊&˜r#‡–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊≤Çí”‚fˆñB6fT6◊ñv‚Üf«6Ró––¢Fó6&∆VC◊∂ó56fñÊw––¢6∆74Ê÷S“&ˆ∂FÚ◊6V6ˆÊF'í÷7Fñˆ‚Ç”BFWáB◊6“Fó6&∆VC¶˜6óGí”S –¢‡–¢∂ó56fñÊrÚ$VÁ&Vvó7G&V÷VÁN(
b"¢$VÁ&Vvó7G&W"∆R'&˜Vñ∆∆ˆ‚'––¢¬ˆ'WGFˆ„‡–¢∑7FWñÊFWÇ¬tï§$Eı5DU2Ê∆VÊwFÇ“ÚÄ–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊∂ÊWáE7FW––¢6∆74Ê÷S“&ˆ∂FÚ÷fñ∆∆VB÷7Fñˆ‚v”"Ç”RFWáB◊6“ –¢‡–¢6ˆÁFñÁVW –¢ƒ6ÜWg&ˆÂ&ñváB6∆74Ê÷S“&Ç”Br”B"Û‡–¢¬ˆ'WGFˆ„‡–¢í¢Ä–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊≤Çí”‚fˆñB6fT6◊ñv‚áG'VRó––¢Fó6&∆VC◊∂ó56fñÊw––¢6∆74Ê÷S“&ˆ∂FÚ◊&ñ÷'í÷7Fñˆ‚v”"Ç”RFWáB◊6“Fó6&∆VC¶˜6óGí”S –¢‡–¢∂ó56fñÊrÚ%V&∆ñ6FñˆÓ(
b"¢%V&∆ñW"∆6◊vÊR'––¢ƒ6ÜV6≤6∆74Ê÷S“&Ç”Br”B"Û‡–¢¬ˆ'WGFˆ„‡–¢ó––¢¬ˆFóc‡–¢¬ˆFóc‡–¢¬ˆ÷ñ„‡–†–¢∆6ñFR6∆74Ê÷S“&÷ñ‚◊r”#‡–¢∆Fób6∆74Ê÷S“&◊Ç÷WFÚr÷gV∆¬÷Ç◊r’≥3cÖ“76R◊í”B#‡–¢≈vó¶&Dv÷U&WfñWrG&gC◊∂G&gG“÷W&6ÜÁC◊∂÷W&6ÜÁG“Û‡–¢¬ˆFóc‡–¢¬ˆ6ñFS‡–¢¬ˆFóc‡–¢≈&ó¶U7VvvW7FñˆÁ5ÊV¿–¢˜V„◊∑7VvvW7FñˆÁ4˜VÁ––¢7VvvW7FñˆÁ3◊∑&ó¶U7VvvW7FñˆÁ7––¢&V÷ñÊñÊu&ˆ&&ñ∆óGì◊≥“F˜F≈&ˆ&&ñ∆óGó––¢ˆ‰FC◊∂FE7VvvW7FVE&ó¶W––¢ˆ‰6∆˜6S◊≤Çí”‚6WE7VvvW7FñˆÁ4˜V‚Üf«6Ró––¢Û‡–¢¬ˆFóc‡–¢ì∞–ß––