"use client";

import Link from "next/link";
import { BadgePercent, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CirclePlus, Coffee, Gift, Plus, ShieldCheck, Sparkles, Soup, Trash2, UtensilsCrossed } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { buildCampaignLivePreviewModel, CampaignLivePreview } from "@/components/merchant/campaign-editor";
import { actionKindCta } from "@/lib/format";
import { createCampaignEmailDefaults } from "@/lib/email-settings";
import { createPosterSettingsDefaults } from "@/lib/poster-utils";
import { ActionKind, CampaignAction, CampaignSetupInput, GamePageTemplateId, Merchant, PrizeSuggestion } from "@/lib/types";

type WizardStepId = "identity" | "game" | "prizes" | "action" | "appearance" | "review";

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
  { id: "identity", number: "01", title: "La promesse", description: "Une animation claire en quelques mots." },
  { id: "game", number: "02", title: "Le jeu", description: "Choisissez l’expérience la plus naturelle." },
  { id: "prizes", number: "03", title: "Les lots", description: "Cadrez les probabilités et les stocks." },
  { id: "action", number: "04", title: "L’action", description: "Choisissez les actions proposées après le jeu. Elles peuvent varier à chaque participation." },
  { id: "appearance", number: "05", title: "L’apparence", description: "Donnez à la campagne votre signature." },
  { id: "review", number: "06", title: "Vérifier", description: "Relisez, testez, puis publiez sereinement." },
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

const REVIEW_ACTION_PRIORITY: Array<{ kind: Exclude<ActionKind, "google" | "crm">; getUrl: (merchant: Merchant) => string | undefined }> = [
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

function createWizardActions(merchant: Merchant, goalType: WizardDraft["goalType"]): CampaignAction[] {
  if (goalType === "review_prompt") {
    const additionalActions = REVIEW_ACTION_PRIORITY
      .map(({ kind, getUrl }) => ({ kind, url: getUrl(merchant)?.trim() ?? "" }))
      .filter(({ url }) => Boolean(url))
      .slice(0, 2)
      .map(({ kind, url }, index) => createWizardAction(`wizard-additional-action-${index + 2}`, kind, url));

    return [
      createWizardAction("wizard-google-action", "google", wizardActionUrl(merchant, "google")),
      ...additionalActions,
    ];
  }

  if (goalType === "social_follow") {
    return [
      createWizardAction("wizard-instagram-action", "instagram", wizardActionUrl(merchant, "instagram")),
      createWizardAction("wizard-google-action", "google", wizardActionUrl(merchant, "google")),
      createWizardAction("wizard-facebook-action", "facebook", wizardActionUrl(merchant, "facebook")),
    ];
  }

  return [createWizardAction("wizard-crm-action", "crm", "")];
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
    accent: { ink: "#111827", paper: "#fffaf1", signal: "#f4c14a" },
    gameType: "wheel",
    presentation: {
      logo: { sizePercent: 100, marginBottomPx: 32, align: "center" },
      background: { mode: "color", color: "#fffaf1", imageUrl: "" },
      heading: { textColor: "#1f2937", fontSizePx: 40, fontFamily: "display", fontWeight: 600, align: "center" },
      button: { backgroundColor: "#1b2842", textColor: "#ffffff", borderColor: "#1b2842", size: "md", textSizePx: 22, isBold: true },
      layout: { blockSpacingPx: 36, templateId: "classic" as GamePageTemplateId },
      wheel,
      poster: createPosterSettingsDefaults({
        logoMode: "text",
        logoText: merchant.companyName || merchant.logoText,
        backgroundMode: "color",
        backgroundColor: "#fffaf1",
        headline: "Scannez, jouez, récupérez votre cadeau",
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

function validateStep(step: WizardStepId, draft: WizardDraft, actionEnabled: boolean): string | null {
  if (step === "identity") {
    if (draft.title.trim().length < 3) return "Donnez un nom de trois caractères minimum à votre animation.";
    if (!draft.subtitle.trim()) return "Ajoutez une phrase courte pour expliquer la promesse du jeu.";
  }

  if (step === "prizes") {
    if (!draft.prizes.length) return "Ajoutez au moins un lot avant de continuer.";
    if (draft.prizes.some((prize) => !prize.label.trim())) return "Chaque lot doit avoir un nom lisible.";
    if (draft.prizes.some((prize) => prize.totalQuantity !== null && prize.totalQuantity <= 0)) {
      return "La quantité d’un lot doit être supérieure à 0 (ou illimitée).";
    }
    const total = draft.prizes.reduce((sum, prize) => sum + Number(prize.probability || 0), 0);
    if (total > 100.0001) return "Le total des probabilités ne peut pas dépasser 100 %.";
    if (draft.rewardRules.isWinningEveryTime && total < 99.9999) return "Un jeu 100 % gagnant doit totaliser exactement 100 % de probabilités.";
  }

  if (step === "action" && actionEnabled) {
    if (!draft.actions.length) return "Ajoutez au moins une action à proposer après le jeu.";
    for (const action of draft.actions) {
      if (action.kind === "crm") continue;
      if (!action.url.trim()) return "Chaque action doit avoir un lien de destination.";
      try {
        const parsed = new URL(normalizeUrl(action.url));
        if (parsed.protocol !== "https:") return "Le lien doit utiliser HTTPS pour protéger les joueurs.";
        if (action.kind === "google" && !GOOGLE_REVIEW_HOSTS.has(parsed.hostname.toLowerCase())) {
          return "Utilisez une adresse Google officielle pour l’invitation à laisser un avis.";
        }
        if (
          action.kind === "google" &&
          [draft.subtitle, action.label, draft.ctaLabel].some((copy) => INCENTIVE_COPY_PATTERN.test(copy))
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

function collectErrors(draft: WizardDraft, actionEnabled: boolean): WizardError[] {
  return WIZARD_STEPS.map((step) => {
    const message = validateStep(step.id, draft, actionEnabled);
    return message ? { step: step.id, message } : null;
  }).filter((error): error is WizardError => Boolean(error));
}

function updatePrize(draft: WizardDraft, prizeId: string | undefined, patch: Partial<WizardDraft["prizes"][number]>) {
  return {
    ...draft,
    prizes: draft.prizes.map((prize) => (prize.id === prizeId ? { ...prize, ...patch } : prize)),
  };
}

function WizardPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[360px] rounded-[36px] border-[5px] border-[#172033] bg-[#172033] p-1.5 shadow-[0_24px_54px_rgba(18,24,39,0.2)]">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-2 z-20 h-1.5 w-14 -translate-x-1/2 rounded-full bg-[#6d7890]/70" />
      <div className="overflow-hidden rounded-[29px] bg-[#f8fafc]">{children}</div>
    </div>
  );
}

function WizardGamePreview({ draft, merchant }: { draft: WizardDraft; merchant: Merchant }) {
  const preview = buildCampaignLivePreviewModel(draft, merchant);
  return (
    <WizardPhoneFrame>
      <CampaignLivePreview merchant={merchant} preview={preview} compact flushTop />
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="wizard-prize-suggestions-title">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[26px] bg-white p-6 shadow-[0_28px_80px_rgba(17,24,39,0.25)]">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b28719]">Suggestions adaptées</p><h3 id="wizard-prize-suggestions-title" className="mt-2 text-xl font-semibold text-[#111827]">Ajoutez un lot en quelques secondes</h3><p className="mt-2 text-sm text-[#69758a]">{remainingProbability < 0 ? `Le total dépasse 100 % de ${Math.abs(Math.round(remainingProbability))} point(s).` : `Il reste ${Math.round(remainingProbability)} % disponible.`} Vous pourrez ajuster les probabilités avant de continuer.</p></div>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-semibold text-[#69758a] hover:bg-[#f2f4f7]">Fermer</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {suggestions.length ? suggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-[18px] border border-[#e2e8f0] bg-[#fbfcfe] p-4">
              <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2">{(() => { const iconStyle = getWizardPrizeSuggestionIcon(suggestion.icon); const Icon = iconStyle.Icon; return <span className={`flex h-9 w-9 items-center justify-center rounded-full ${iconStyle.className}`} aria-hidden="true"><Icon className="h-4 w-4" /></span>; })()}<div><p className="text-sm font-semibold text-[#182033]">{suggestion.label}</p><p className="text-xs text-[#8993a6]">{suggestion.description}</p></div></div><span className="text-xs font-semibold text-[#b28719]">{suggestion.probability} %</span></div>
              <div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-[#69758a]">Coût estimé : {suggestion.estimatedUnitCost.toFixed(2)} €</span><button type="button" onClick={() => onAdd(suggestion)} className="inline-flex items-center gap-1 rounded-[11px] bg-[#111827] px-3 py-2 text-xs font-semibold !text-white"><Plus className="h-3.5 w-3.5" />Ajouter</button></div>
            </div>
          )) : <p className="rounded-[16px] bg-[#f6f8fb] p-4 text-sm text-[#69758a]">Aucune suggestion disponible pour cette activité.</p>}
        </div>
      </div>
    </div>
  );
}

export function CampaignWizard({ merchant }: { merchant: Merchant }) {
  const [draft, setDraft] = useState<WizardDraft>(() => createWizardDraft(merchant));
  const [stepIndex, setStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const actionEnabled = true;
  const [prizeSuggestions, setPrizeSuggestions] = useState<PrizeSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/prize-suggestions?industry=${encodeURIComponent(merchant.industry ?? "")}`)
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
    () => draft.prizes.reduce((sum, prize) => sum + Number(prize.probability || 0), 0),
    [draft.prizes],
  );

  function patchDraft(patch: Partial<WizardDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      return patch.goalType
        ? { ...next, actions: createWizardActions(merchant, patch.goalType) }
        : next;
    });
    setError(null);
  }

  function patchAction(index: number, patch: Partial<WizardDraft["actions"][number]>) {
    setDraft((current) => ({
      ...current,
      actions: current.actions.map((action, actionIndex) => {
        if (actionIndex !== index) return action;
        const nextAction = { ...action, ...patch };
        return patch.kind ? { ...nextAction, url: wizardActionUrl(merchant, patch.kind) } : nextAction;
      }),
    }));
    setError(null);
  }

  function addAction() {
    setDraft((current) => ({
      ...current,
      actions: [...current.actions, { id: `wizard-action-${Date.now()}`, kind: "custom", label: "Découvrir", url: wizardActionUrl(merchant, "custom") }],
    }));
    setError(null);
  }

  function removeAction(index: number) {
    setDraft((current) => ({ ...current, actions: current.actions.filter((_, actionIndex) => actionIndex !== index) }));
    setError(null);
  }

  function moveAction(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.actions.length) return current;
      const actions = [...current.actions];
      [actions[index], actions[nextIndex]] = [actions[nextIndex], actions[index]];
      return { ...current, actions };
    });
    setError(null);
  }

  function addSuggestedPrize(suggestion: PrizeSuggestion) {
    setDraft((current) => ({
      ...current,
      prizes: [...current.prizes, {
        id: `wizard-prize-${Date.now()}-${suggestion.id}`,
        label: suggestion.label,
        totalQuantity: null,
        probability: suggestion.probability,
        estimatedUnitCost: suggestion.estimatedUnitCost,
        usageConditions: "",
      }],
    }));
    setError(null);
  }

  function removePrize(prizeId: string | undefined) {
    setDraft((current) => ({ ...current, prizes: current.prizes.filter((prize) => prize.id !== prizeId) }));
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

  async function saveCampaign(isActive: boolean) {
    const blockingErrors = collectErrors(draft, actionEnabled);
    const requiredForDraft = blockingErrors.filter((candidate) => candidate.step === "identity" || candidate.step === "prizes");
    const errorsToShow = isActive ? blockingErrors : requiredForDraft;
    if (errorsToShow.length) {
      const first = errorsToShow[0];
      setError(first.message);
      setStepIndex(WIZARD_STEPS.findIndex((item) => item.id === first.step));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/campaigns/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          creationMode: "wizard",
          isActive,
          actions: actionEnabled
            ? draft.actions.map((action) => ({ ...action, url: normalizeUrl(action.url) }))
            : [],
          prizes: draft.prizes.map((prize) => ({ ...prize, probability: Number(prize.probability || 0) })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { campaign?: { campaign?: { id?: string } }; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "La campagne n’a pas pu être enregistrée.");
      const campaignId = payload?.campaign?.campaign?.id;
      if (campaignId) setSavedCampaignId(campaignId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "La campagne n’a pas pu être enregistrée.");
    } finally {
      setIsSaving(false);
    }
  }

  if (savedCampaignId) {
    return (
      <div className="mx-auto max-w-3xl rounded-[34px] border border-[#dce5ef] bg-white p-8 text-center shadow-[0_24px_70px_rgba(18,24,39,0.08)] sm:p-12">
        <div className="mx-au…1133 tokens truncated…et dans vos statistiques.</span><input autoFocus value={draft.title} onChange={(event) => patchDraft({ title: event.target.value })} placeholder="Ex. La roue gourmande de juin" className="mt-3 w-full rounded-[16px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3.5 text-sm text-[#182033] outline-none transition focus:border-[#b28719] focus:ring-4 focus:ring-[#f4c14a]/15" /></label>
              <label className="block"><span className="text-sm font-semibold text-[#182033]">Promesse affichée au client</span><span className="mt-1 block text-xs text-[#8993a6]">Une phrase courte, concrète et facile à comprendre sur mobile.</span><textarea value={draft.subtitle} onChange={(event) => patchDraft({ subtitle: event.target.value })} rows={3} className="mt-3 w-full resize-none rounded-[16px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3.5 text-sm leading-6 text-[#182033] outline-none transition focus:border-[#b28719] focus:ring-4 focus:ring-[#f4c14a]/15" /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-semibold text-[#182033]">Objectif</span><select value={draft.goalType} onChange={(event) => { const goalType = event.target.value as WizardDraft["goalType"]; const actionKind = goalType === "social_follow" ? "instagram" : goalType === "lead_capture" ? "crm" : "google"; patchDraft({ goalType, successMetric: goalType === "social_follow" ? "Abonnements sociaux" : goalType === "lead_capture" ? "Leads collectés" : "Avis Google", actions: [{ ...(draft.actions[0] ?? { id: "wizard-action", url: "" }), kind: actionKind, label: actionKindCta(actionKind), url: goalType === "review_prompt" ? (merchant.googleReviewUrl || "https://google.com") : "" }] }); }} className="mt-3 w-full rounded-[16px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3.5 text-sm text-[#182033]"><option value="review_prompt">Obtenir des avis</option><option value="lead_capture">Collecter des contacts</option><option value="social_follow">Gagner des abonnés</option></select></label><label className="block"><span className="text-sm font-semibold text-[#182033]">Texte du bouton de jeu</span><input value={draft.ctaLabel} onChange={(event) => patchDraft({ ctaLabel: event.target.value })} className="mt-3 w-full rounded-[16px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3.5 text-sm text-[#182033]" /></label></div>
            </div>
          ) : null}

          {step.id === "game" ? (
            <div className="mt-7 space-y-5"><div className="grid gap-4 sm:grid-cols-2">{([{ value: "wheel", label: "Roue de la chance", text: "Un moment spectaculaire, idéal sur un comptoir." }, { value: "scratch", label: "Ticket à gratter", text: "Un geste tactile simple et immédiat sur mobile." }] as const).map((option) => <button type="button" key={option.value} onClick={() => patchDraft({ gameType: option.value, subtitle: option.value === "wheel" ? "Faites tourner la roue pour tenter votre chance." : "Grattez le ticket pour tenter votre chance." })} className={`rounded-[22px] border p-5 text-left transition ${draft.gameType === option.value ? "border-[#b28719] bg-[#fff8e1] shadow-[0_12px_28px_rgba(244,193,74,0.16)]" : "border-[#e2e8f0] bg-[#fbfcfe] hover:border-[#b8c5d8]"}`}><div className="flex items-center justify-between"><span className="text-base font-semibold text-[#182033]">{option.label}</span><span className={`h-3 w-3 rounded-full ${draft.gameType === option.value ? "bg-[#b28719] ring-4 ring-[#f4c14a]/30" : "bg-[#d7dfeb]"}`} /></div><p className="mt-3 text-sm leading-6 text-[#7a8498]">{option.text}</p></button>)}</div><div className="rounded-[22px] border border-[#e2e8f0] bg-[#fbfcfe] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#182033]">Conditions de gain et de retrait</p><p className="mt-1 text-xs leading-5 text-[#8993a6]">Les règles ci-dessous s’appliquent immédiatement au parcours client et au retrait en caisse.</p></div><ShieldCheck className="h-5 w-5 text-[#18864b]" /></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="flex items-start gap-3 rounded-[16px] border border-[#e2e8f0] bg-white p-4 text-sm text-[#182033]"><input type="checkbox" checked={draft.rewardRules.isWinningEveryTime} onChange={(event) => patchDraft({ rewardRules: { ...draft.rewardRules, isWinningEveryTime: event.target.checked } })} className="mt-0.5 h-4 w-4 accent-[#b28719]" /><span><span className="block font-semibold">Jeu 100 % gagnant</span><span className="mt-1 block text-xs leading-5 text-[#7a8498]">Chaque participation reçoit un lot. Le total des probabilités doit être égal à 100 %.</span></span></label><label className="flex items-start gap-3 rounded-[16px] border border-[#e2e8f0] bg-white p-4 text-sm text-[#182033]"><input type="checkbox" checked={draft.rewardRules.purchaseRequired} onChange={(event) => patchDraft({ rewardRules: { ...draft.rewardRules, purchaseRequired: event.target.checked } })} className="mt-0.5 h-4 w-4 accent-[#b28719]" /><span><span className="block font-semibold">Achat requis pour le retrait</span><span className="mt-1 block text-xs leading-5 text-[#7a8498]">La caisse demandera une confirmation d’achat avant de remettre le lot.</span></span></label></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className={`rounded-[14px] border px-4 py-3 ${draft.rewardRules.isWinningEveryTime ? "border-[#b7e4c7] bg-[#f0fbf3]" : "border-[#e2e8f0] bg-white"}`}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8993a6]">Gain</p><p className="mt-1 text-sm font-semibold text-[#182033]">{draft.rewardRules.isWinningEveryTime ? "Un lot à chaque participation" : "Gain selon les probabilités"}</p></div><div className={`rounded-[14px] border px-4 py-3 ${draft.rewardRules.purchaseRequired ? "border-[#f0dfaa] bg-[#fff9e8]" : "border-[#e2e8f0] bg-white"}`}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8993a6]">Retrait</p><p className="mt-1 text-sm font-semibold text-[#182033]">{draft.rewardRules.purchaseRequired ? "Achat vérifié en caisse" : "Sans condition d’achat"}</p></div></div></div></div>
          ) : null}

          {step.id === "prizes" ? (
            <div className="mt-7 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[#182033]">Votre dotation</p><p className="mt-1 text-xs text-[#8993a6]">La jauge doit rester à 100 % maximum.</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${totalProbability > 100 ? "bg-[#fff0f0] text-[#b42318]" : "bg-[#e9f8ec] text-[#18864b]"}`}>{Math.round(totalProbability)} %</span>{prizeSuggestions.length ? <button type="button" onClick={() => setSuggestionsOpen(true)} className="okado-secondary-action inline-flex items-center gap-1.5 px-3 py-2 text-xs"><Sparkles className="h-3.5 w-3.5" />Suggestions de lots</button> : null}</div></div>{totalProbability > 100.0001 ? <div role="alert" className="rounded-[14px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm leading-6 text-[#a11a1a]">Le total des probabilités dépasse 100 %. Vous pouvez encore ajouter ou modifier des lots, mais réduisez ce total avant de continuer.</div> : null}{draft.prizes.map((prize, index) => <div key={prize.id} className="rounded-[20px] border border-[#e2e8f0] bg-[#fbfcfe] p-4"><div className="flex items-start justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8993a6]">Lot {index + 1}</span><button type="button" onClick={() => removePrize(prize.id)} aria-label={`Supprimer ${prize.label || `le lot ${index + 1}`}`} className="rounded-[9px] p-1.5 text-[#8b95a8] transition hover:bg-[#fff0f0] hover:text-[#b42318]"><Trash2 className="h-4 w-4" /></button></div><div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_120px]"><label className="block"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8993a6]">Nom du lot</span><input value={prize.label} onChange={(event) => setDraft((current) => updatePrize(current, prize.id, { label: event.target.value }))} className="w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]" /></label><label className="block"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8993a6]">Probabilité</span><input type="number" min={0} max={100} value={prize.probability} onChange={(event) => setDraft((current) => updatePrize(current, prize.id, { probability: Number(event.target.value || 0) }))} className="mt-2 w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]" /></label><label className="block"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8993a6]">Stock</span><input type="number" min={0} placeholder="Illimité" value={prize.totalQuantity ?? ""} onChange={(event) => setDraft((current) => updatePrize(current, prize.id, { totalQuantity: event.target.value === "" ? null : Number(event.target.value) }))} className="mt-2 w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]" /></label></div><label className="mt-3 block"><span className="text-xs text-[#8993a6]">Conditions d’utilisation (optionnel)</span><input value={prize.usageConditions ?? ""} onChange={(event) => setDraft((current) => updatePrize(current, prize.id, { usageConditions: event.target.value }))} className="mt-2 w-full rounded-[13px] border border-[#dbe3ed] bg-white px-3 py-3 text-sm text-[#182033]" /></label></div>)}<button type="button" onClick={() => setDraft((current) => ({ ...current, prizes: [...current.prizes, { id: `wizard-prize-${Date.now()}`, label: "Nouveau lot", totalQuantity: null, probability: Math.max(0, Math.round(100 - totalProbability)), estimatedUnitCost: merchant.defaultPrizeCost ?? 5, usageConditions: "" }] }))} className="inline-flex items-center gap-2 rounded-[14px] border border-dashed border-[#b8c5d8] px-4 py-3 text-sm font-semibold text-[#526078] transition hover:border-[#b28719] hover:text-[#182033]"><Gift className="h-4 w-4" />Ajouter un lot</button></div>
          ) : null}

          {step.id === "action" ? (
            <div className="mt-7 space-y-5">
              <div className="space-y-4">
                {draft.actions.map((action, index) => (
                  <div key={action.id ?? `wizard-action-${index}`} className="rounded-[20px] border border-[#e2e8f0] bg-white p-5">
                    <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8993a6]">Action {index + 1}</p><div className="flex items-center gap-1"><button type="button" onClick={() => moveAction(index, -1)} disabled={index === 0} aria-label="Monter l’action" className="rounded-[9px] p-1.5 text-[#69758a] hover:bg-[#f2f4f7] disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button><button type="button" onClick={() => moveAction(index, 1)} disabled={index === draft.actions.length - 1} aria-label="Descendre l’action" className="rounded-[9px] p-1.5 text-[#69758a] hover:bg-[#f2f4f7] disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button><button type="button" onClick={() => removeAction(index)} aria-label="Supprimer l’action" className="rounded-[9px] p-1.5 text-[#69758a] hover:bg-[#fff0f0] hover:text-[#b42318]"><Trash2 className="h-4 w-4" /></button></div></div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-semibold text-[#182033]">Action proposée</span><select value={action.kind} onChange={(event) => { const kind = event.target.value as WizardDraft["actions"][number]["kind"]; patchAction(index, { kind, label: actionKindCta(kind), url: kind === "google" ? (merchant.googleReviewUrl || action.url) : action.url }); }} className="mt-3 w-full rounded-[14px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3 text-sm text-[#182033]"><option value="google">Laisser un avis Google</option><option value="instagram">Suivre sur Instagram</option><option value="facebook">Suivre sur Facebook</option><option value="tiktok">Suivre sur TikTok</option><option value="tripadvisor">Laisser un avis Tripadvisor</option><option value="crm">Rejoindre le programme fidélité</option><option value="custom">Ouvrir un lien personnalisé</option></select></label><label className="block"><span className="text-sm font-semibold text-[#182033]">Texte du bouton</span><input value={action.label} onChange={(event) => patchAction(index, { label: event.target.value })} className="mt-3 w-full rounded-[14px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3 text-sm text-[#182033]" /></label></div>
                    {action.kind !== "crm" ? <label className="mt-4 block"><span className="text-sm font-semibold text-[#182033]">Lien de destination</span><input value={action.url} onChange={(event) => patchAction(index, { url: event.target.value })} placeholder="https://..." className="mt-3 w-full rounded-[14px] border border-[#dbe3ed] bg-[#fbfcfe] px-4 py-3 text-sm text-[#182033]" /></label> : <p className="mt-4 rounded-[12px] bg-[#f6f8fb] px-3 py-2 text-xs leading-5 text-[#69758a]">Cette action est gérée dans votre espace fidélité ; aucun lien externe n’est requis.</p>}
                  </div>
                ))}
                <button type="button" onClick={addAction} className="inline-flex items-center gap-2 rounded-[14px] border border-dashed border-[#b8c5d8] px-4 py-3 text-sm font-semibold text-[#526078] hover:border-[#b28719] hover:text-[#182033]"><Plus className="h-4 w-4" />Ajouter une action</button>
              </div>
            </div>
          ) : null}

          {step.id === "appearance" ? (
            <div className="mt-7 space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{([{ id: "classic", label: "Classique", text: "Sobre et lisible" }, { id: "restaurant-pop", label: "Visuel pop", text: "Événementiel et contrasté" }, { id: "cosmic-orbit", label: "Orbit néon", text: "Immersif et nocturne" }, { id: "sunburst-festival", label: "Soleil pop", text: "Festif et lumineux" }] as const).map((template) => <button type="button" key={template.id} onClick={() => patchDraft({ presentation: { ...draft.presentation, layout: { ...draft.presentation.layout, templateId: template.id } } })} className={`rounded-[20px] border p-4 text-left ${draft.presentation.layout.templateId === template.id ? "border-[#b28719] bg-[#fff8e1]" : "border-[#e2e8f0] bg-[#fbfcfe]"}`}><span className="block text-sm font-semibold text-[#182033]">{template.label}</span><span className="mt-1 block text-xs text-[#8993a6]">{template.text}</span></button>)}</div><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-semibold text-[#182033]">Couleur de fond</span><input type="color" value={draft.presentation.background.color} onChange={(event) => patchDraft({ presentation: { ...draft.presentation, background: { ...draft.presentation.background, color: event.target.value } } })} className="mt-3 h-12 w-full rounded-[12px] border border-[#dbe3ed] bg-white p-1" /></label><label className="block"><span className="text-sm font-semibold text-[#182033]">Couleur principale du bouton</span><input type="color" value={draft.gameType === "wheel" ? draft.presentation.wheel.loseColor : draft.presentation.button.backgroundColor} onChange={(event) => { const color = event.target.value; setDraft((current) => ({ ...current, presentation: { ...current.presentation, button: { ...current.presentation.button, backgroundColor: color, borderColor: color }, wheel: current.gameType === "wheel" ? { ...current.presentation.wheel, loseColor: color } : current.presentation.wheel } })); }} className="mt-3 h-12 w-full rounded-[12px] border border-[#dbe3ed] bg-white p-1" /></label></div><div className="rounded-[20px] border border-[#e2e8f0] bg-[#fbfcfe] p-5"><p className="text-sm font-semibold text-[#182033]">Logo</p><p className="mt-1 text-xs text-[#8993a6]">Nous utiliserons le logo du commerce si vous en avez déjà configuré un.</p><div className="mt-4 flex min-w-0 items-center gap-3 rounded-[14px] border border-[#dbe3ed] bg-white px-3 py-2.5">{draft.logoUrl ? <><BrandMark logoText={draft.logoText || merchant.companyName} logoUrl={draft.logoUrl} size="sm" /><span className="min-w-0 truncate text-sm text-[#526078]">{draft.logoText || merchant.companyName}</span></> : <span className="min-w-0 truncate font-display text-base font-semibold text-[#182033]">{draft.logoText || merchant.companyName}</span>}</div></div></div>
          ) : null}

          {step.id === "review" ? (
            <div className="mt-7 space-y-5"><div className="rounded-[20px] border border-[#dbe4f0] bg-[#f7f9fc] p-5"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9f8ec] text-[#18864b]"><Check className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-[#182033]">E-mail de gain prêt</p><p className="mt-1 text-sm leading-6 text-[#69758a]">Le modèle recommandé sera envoyé automatiquement aux gagnants avec le lot, les conditions de retrait, le code et le QR code.</p></div></div><div className="mt-4 rounded-[14px] border border-[#e2e8f0] bg-white px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8993a6]">Objet généré</p><p className="mt-1 text-sm font-semibold text-[#182033]">{draft.presentation.email.subject.replaceAll("{{merchantName}}", merchant.companyName || "Votre commerce")}</p></div><p className="mt-4 text-xs leading-5 text-[#7a8498]">La personnalisation avancée reste accessible après la création, depuis la campagne ou les réglages de communication du compte.</p></div></div>
          ) : null}

          {error ? <div role="alert" className="mt-6 rounded-[16px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm leading-6 text-[#a11a1a]">{error}</div> : null}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#edf0f4] pt-5 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={previousStep} disabled={stepIndex === 0 || isSaving} className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#d6dfeb] bg-white px-4 py-3 text-sm font-semibold text-[#526078] disabled:cursor-not-allowed disabled:opacity-45"><ChevronLeft className="h-4 w-4" />Retour</button><div className="flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => void saveCampaign(false)} disabled={isSaving} className="rounded-[14px] border border-[#d6dfeb] bg-white px-4 py-3 text-sm font-semibold text-[#526078] disabled:opacity-50">{isSaving ? "Enregistrement…" : "Enregistrer le brouillon"}</button>{stepIndex < WIZARD_STEPS.length - 1 ? <button type="button" onClick={nextStep} className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#111827] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(17,24,39,0.14)]">Continuer<ChevronRight className="h-4 w-4" /></button> : <button type="button" onClick={() => void saveCampaign(true)} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#b28719] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(178,135,25,0.22)] disabled:opacity-50">{isSaving ? "Publication…" : "Publier la campagne"}<Check className="h-4 w-4" /></button>}</div></div>
        </main>

        <aside className="min-w-0">
          <div className="mx-auto w-full max-w-[360px] space-y-4">
            <WizardGamePreview draft={draft} merchant={merchant} />
          </div>
        </aside>
      </div>
      <PrizeSuggestionsPanel open={suggestionsOpen} suggestions={prizeSuggestions} remainingProbability={100 - totalProbability} onAdd={addSuggestedPrize} onClose={() => setSuggestionsOpen(false)} />
    </div>
  );
}

