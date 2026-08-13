Exit code: 0
Wall time: 0.3 seconds
Total output lines: 1917
Output:
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
        label: "Une rÃ©duction de 10 %",
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
                    CoÃ»t estimÃ© : {suggestion.estimatedUnitCost.toFixed(2)} â‚¬
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
              Aucune suggestion disponible pour cette activitÃ©.
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
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [saveDialogTitle, setSaveDialogTitle] = useState("Campagne enregistrÃ©e");
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
            emailCaptur…9870 tokens truncated…        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8993a6]">
                        {wizardActionVisitLabel(index)}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveAction(index, -1)}
                          disabled={index === 0}
                          aria-label="Monter lâ€™action"
                          className="rounded-[9px] p-1.5 text-[#69758a] hover:bg-[#f2f4f7] disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAction(index, 1)}
                          disabled={index === draft.actions.length - 1}
                          aria-label="Descendre lâ€™action"
                          className="rounded-[9px] p-1.5 text-[#69758a] hover:bg-[#f2f4f7] disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAction(index)}
                          aria-label="Supprimer lâ€™action"
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
                          <span>Action proposÃ©e</span>
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
                            Ouvrir un lien personnalisÃ©
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
                        { id: "scratch-vault", label: "Coffre nÃ©on", text: "Coffre illustrÃ© avant grattage" },
                        { id: "scratch-confetti", label: "Carte confettis", text: "Solaire et festif ; la couleur principale sÃ©lectionnÃ©e nâ€™est pas utilisÃ©e" },
                        { id: "scratch-coral", label: "Corail joyeux", text: "Clair et chaleureux" },
                        { id: "scratch-lilac", label: "Cadeau lilas", text: "Cadeau clair et contrastÃ© ; la couleur principale sÃ©lectionnÃ©e nâ€™est pas utilisÃ©e" },
                        { id: "scratch-sunburst", label: "Rayons soleil", text: "Ã‰clatant et visible" },
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
                      text: "Ã‰vÃ©nementiel et contrastÃ©",
                    },
                    {
                      id: "cosmic-orbit",
                      label: "Orbit nÃ©on",
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
              <details className="group rounded-[18px] border border-[#e2e8f0] bg-[#fbfcfe]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-sm font-semibold text-[#182033] [&::-webkit-details-marker]:hidden">
                  <span>
                    ParamÃ¨tres avancÃ©s <span className="font-normal text-[#8993a6]">(mode expert)</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#8993a6] transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-5 border-t border-[#e2e8f0] px-4 pb-4 pt-4">
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
                 {draft.presentation.layout.templateId === "restaurant-pop" ? (
                   <label className="block">
                     <span className="text-sm font-semibold text-[#182033]">Couleur secondaire</span>
                     <span className="hidden">
                       UtilisÃ©e pour les accents graphiques du template Visuel pop.
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
                <label className="block">
                  <span className="text-sm font-semibold text-[#182033]">
                    Couleur principale du ticket
                  </span>
                  <span className="mt-1 block text-xs text-[#8993a6]">
                    {draft.presentation.layout.templateId === "scratch-confetti" ||
                    draft.presentation.layout.templateId === "scratch-lilac"
                      ? "Ce template utilise sa propre palette ; la couleur sÃ©lectionnÃ©e ici nâ€™est pas utilisÃ©e."
                      : "Elle colore la zone Ã  gratter et les Ã©lÃ©ments graphiques du template."}
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
              <div className="rounded-[18px] border border-[#e2e8f0] bg-white p-4 sm:col-span-2">
                <p className="text-sm font-semibold text-[#182033]">Typographie</p>
                <p className="mt-1 text-xs leading-5 text-[#8993a6]">
                  Choisissez la police et la taille de la promesse affichÃ©e sur le jeu.
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
                        <option key={font} value={font}>
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
                </div>
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
                onClick={() => void saveCampaign(false)}
                disabled={isSaving}
                className="okado-secondary-action px-4 text-sm disabled:opacity-50"
              >
                {isSaving ? "Enregistrementâ€¦" : "Enregistrer le brouillon"}
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
                  {isSaving ? "Publicationâ€¦" : "Publier la campagne"}
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

