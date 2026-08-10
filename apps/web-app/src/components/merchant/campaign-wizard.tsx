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
import { ValidationDialog } from "@/components/ui/validation-dialog";
import {
  buildCampaignLivePreviewModel,
  CampaignLivePreview,
} from "@/components/merchant/campaign-live-preview";
import { actionKindCta } from "@/lib/format";
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

export function CampaignWizard({ merchant }: { merchant: Merchant }) {
  const [draft, setDraft] = useState<WizardDraft>(() =>
    createWizardDraft(merchant),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const actionEnabled = true;
  const [prizeSuggestions, setPrizeSuggestions] = useState<PrizeSuggestion[]>(
    [],
  );
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogTitle, setSaveDialogTitle] = useState("Campagne enregistrée");
  const [saveDialogDescription, setSaveDialogDescription] = useState("");

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
      return patch.goalType
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
      if (nextIndex < 0 || nextIndex >= current.actions.l…7328 tokens truncated…der-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]"
                      />
                    </label>
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
                        Action {index + 1}
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
                        { id: "scratch-confetti", label: "Carte confettis", text: "Solaire et festif ; la couleur principale sélectionnée n’est pas utilisée" },
                        { id: "scratch-coral", label: "Corail joyeux", text: "Clair et chaleureux" },
                        { id: "scratch-lilac", label: "Cadeau lilas", text: "Cadeau clair et contrasté ; la couleur principale sélectionnée n’est pas utilisée" },
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
                ).slice().sort((left, right) => (left.id === "scratch-coral" ? -1 : right.id === "scratch-coral" ? 1 : 0)).map((template) => (
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
              <div className="grid gap-4 sm:grid-cols-2">
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
                  </>
                ) : null}
              </div>
              {draft.gameType === "scratch" ? (
                <label className="block">
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
                onClick={() => void saveCampaign(false)}
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
                  onClick={() => void saveCampaign(true)}
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

        <aside className="min-w-0">
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
    </div>
  );
}