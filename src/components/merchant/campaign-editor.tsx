"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ScratchGame } from "@/components/public/scratch-game";
import { WheelOfFortune } from "@/components/public/wheel-of-fortune";
import {
  actionKindLabel,
  buttonSizeLabel,
  gameTypeLabel,
  goalDescription,
  goalLabel,
  textAlignLabel,
  textFontLabel,
} from "@/lib/format";
import {
  ActionKind,
  CampaignAction,
  CampaignPerformance,
  CampaignSetupInput,
  GameType,
  GoalType,
  Merchant,
  TextAlign,
  TextFont,
} from "@/lib/types";

type CampaignEditorProps = {
  merchant: Merchant;
  initialCampaign?: CampaignPerformance | null;
  campaignLibrary?: CampaignPerformance[];
};

type EditorState = CampaignSetupInput;

type PreviewSegment = {
  id: string;
  label: string;
  tone: "win" | "lose";
};

const actionKindOptions: ActionKind[] = [
  "google",
  "instagram",
  "facebook",
  "tiktok",
  "tripadvisor",
  "crm",
  "custom",
];

const textAlignOptions: TextAlign[] = ["left", "center", "right"];
const textFontOptions: TextFont[] = ["display", "sans", "serif"];

const goalMetricMap: Record<GoalType, string> = {
  lead_capture: "Nouveaux contacts opt-in",
  review_prompt: "Clics vers avis",
  social_follow: "Clics sociaux",
};

const gameModes: Array<{
  value: GameType;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    value: "wheel",
    eyebrow: "Animation visible",
    title: "Roue de la fortune",
    description: "Un moment fort en caisse, sur borne ou sur affichage mobile plein écran.",
  },
  {
    value: "scratch",
    eyebrow: "Révélation tactile",
    title: "Ticket à gratter",
    description: "Le parcours le plus rapide pour une activation mobile-first et un effet instantané.",
  },
];

const buttonSizeMap = {
  sm: "px-4 py-3 text-sm",
  md: "px-5 py-4 text-sm",
  lg: "px-6 py-5 text-base",
};

function createPrizeId() {
  return `local-prize-${crypto.randomUUID().slice(0, 8)}`;
}

function createActionId() {
  return `local-action-${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function createDefaultAction(merchant: Merchant): CampaignAction {
  return {
    id: createActionId(),
    kind: "google",
    label: "Partager mon expérience sur Google",
    url: merchant.googleReviewUrl ?? "https://google.com",
  };
}

function createDefaultState(merchant: Merchant): EditorState {
  return {
    merchantId: merchant.id,
    title: "Animation boutique · trafic magasin",
    subtitle: "Participez à notre jeu 100% gagnant !",
    goalType: "review_prompt",
    gameType: "scratch",
    ctaLabel: "Je participe",
    successMetric: goalMetricMap.review_prompt,
    targetUrl: merchant.googleReviewUrl,
    isActive: true,
    logoUrl: merchant.logoUrl,
    accent: {
      ink: "#111827",
      paper: "#eef2ff",
      signal: "#f4c14a",
    },
    presentation: {
      logo: {
        sizePercent: 100,
        marginBottomPx: 18,
        align: "center",
      },
      background: {
        mode: "color",
        color: "#111827",
        imageUrl: "",
      },
      heading: {
        textColor: "#ffffff",
        fontSizePx: 40,
        fontFamily: "display",
        align: "center",
      },
      button: {
        backgroundColor: "#8d9ae8",
        textColor: "#ffffff",
        borderColor: "#f4c14a",
        size: "md",
      },
      wheel: {
        rimColor: "#f4c14a",
        winColor: "#f4c14a",
        alternateWinColor: "#eef2ff",
        loseColor: "#1b2842",
        alternateLoseColor: "#8795db",
      },
    },
    actions: [createDefaultAction(merchant)],
    rewardRules: {
      rewardExpiryMinutes: 20,
      purchaseRequired: false,
      availableAfterHours: 0,
      availabilityDurationDays: 0,
      isWinningEveryTime: false,
    },
    prizes: [
      {
        id: "default-prize-1",
        label: "Bon d'achat 15 €",
        totalQuantity: 20,
        probability: 25,
        estimatedUnitCost: 15,
      },
      {
        id: "default-prize-2",
        label: "Cadeau surprise",
        totalQuantity: null,
        probability: 25,
        estimatedUnitCost: 4,
      },
    ],
  };
}

function toEditorState(merchant: Merchant, campaign?: CampaignPerformance | null): EditorState {
  if (!campaign) {
    return createDefaultState(merchant);
  }

  return {
    id: campaign.campaign.id,
    merchantId: merchant.id,
    title: campaign.campaign.title,
    subtitle: campaign.campaign.subtitle,
    goalType: campaign.campaign.goalType,
    gameType: campaign.campaign.gameType,
    ctaLabel: campaign.campaign.ctaLabel,
    successMetric: campaign.campaign.successMetric,
    targetUrl: campaign.campaign.targetUrl,
    isActive: campaign.campaign.isActive,
    logoUrl: campaign.campaign.logoUrl ?? merchant.logoUrl,
    accent: campaign.campaign.accent,
    presentation: campaign.campaign.presentation,
    actions: campaign.campaign.actions,
    rewardRules: campaign.campaign.rewardRules,
    prizes: campaign.prizes.map((prize) => ({
      id: prize.id,
      label: prize.label,
      totalQuantity: prize.totalQuantity,
      probability: prize.probability,
      estimatedUnitCost: prize.estimatedUnitCost,
    })),
  };
}

function buildPreviewSegments(prizes: EditorState["prizes"]): PreviewSegment[] {
  const labels = prizes
    .slice(0, 4)
    .map((prize) => prize.label.trim())
    .filter(Boolean)
    .map((label, index) => ({
      id: `preview-win-${index}`,
      label: label.toUpperCase().slice(0, 18),
      tone: "win" as const,
    }));

  const losers = Array.from({ length: Math.max(4, labels.length) }, (_, index) => ({
    id: `preview-lose-${index}`,
    label: index % 2 === 0 ? "PERDU" : "BONUS",
    tone: "lose" as const,
  }));

  return losers.flatMap((loser, index) => (labels[index] ? [loser, labels[index]] : [loser]));
}

function uploadAsDataUrl(
  event: ChangeEvent<HTMLInputElement>,
  onLoaded: (value: string) => void,
) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    if (typeof reader.result === "string") {
      onLoaded(reader.result);
    }
  };

  reader.readAsDataURL(file);
}

export function CampaignEditor({
  merchant,
  initialCampaign,
  campaignLibrary = [],
}: CampaignEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<EditorState>(toEditorState(merchant, initialCampaign));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [importSource, setImportSource] = useState("");

  const previewSegments = useMemo(() => buildPreviewSegments(form.prizes), [form.prizes]);
  const previewPrize = form.prizes[0]?.label || "Cadeau surprise";
  const previewCtaClass = buttonSizeMap[form.presentation.button.size];
  const campaignOptions = campaignLibrary.filter(
    (item) => item.campaign.id !== initialCampaign?.campaign.id,
  );

  const logoAlignmentClass =
    form.presentation.logo.align === "left"
      ? "justify-start"
      : form.presentation.logo.align === "right"
        ? "justify-end"
        : "justify-center";
  const headingAlignmentClass =
    form.presentation.heading.align === "left"
      ? "text-left"
      : form.presentation.heading.align === "right"
        ? "text-right"
        : "text-center";
  const headingFontClass =
    form.presentation.heading.fontFamily === "serif"
      ? "font-serif"
      : form.presentation.heading.fontFamily === "sans"
        ? "font-sans"
        : "font-display";

  function setField<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updatePrize(
    prizeId: string | undefined,
    patch: Partial<EditorState["prizes"][number]>,
  ) {
    setForm((current) => ({
      ...current,
      prizes: current.prizes.map((prize) =>
        prize.id === prizeId ? { ...prize, ...patch } : prize,
      ),
    }));
  }

  function addPrize() {
    setForm((current) => ({
      ...current,
      prizes: [
        ...current.prizes,
        {
          id: createPrizeId(),
          label: "Nouveau lot",
          totalQuantity: null,
          probability: 10,
          estimatedUnitCost: merchant.defaultPrizeCost ?? 5,
        },
      ],
    }));
  }

  function removePrize(prizeId: string | undefined) {
    setForm((current) => ({
      ...current,
      prizes:
        current.prizes.length <= 1
          ? current.prizes
          : current.prizes.filter((prize) => prize.id !== prizeId),
    }));
  }

  function addAction() {
    setForm((current) => ({
      ...current,
      actions: [
        ...current.actions,
        {
          id: createActionId(),
          kind: "custom",
          label: "Nouvelle action",
          url: "https://",
        },
      ],
    }));
  }

  function updateAction(actionId: string, patch: Partial<CampaignAction>) {
    setForm((current) => ({
      ...current,
      actions: current.actions.map((action) =>
        action.id === actionId ? { ...action, ...patch } : action,
      ),
    }));
  }

  function removeAction(actionId: string) {
    setForm((current) => ({
      ...current,
      actions: current.actions.filter((action) => action.id !== actionId),
    }));
  }

  function moveAction(actionId: string, direction: "up" | "down") {
    setForm((current) => {
      const index = current.actions.findIndex((action) => action.id === actionId);
      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.actions.length) {
        return current;
      }

      const nextActions = [...current.actions];
      const [action] = nextActions.splice(index, 1);
      nextActions.splice(targetIndex, 0, action);

      return {
        ...current,
        actions: nextActions,
      };
    });
  }

  function importFromCampaign(campaignId: string) {
    const source = campaignLibrary.find((item) => item.campaign.id === campaignId);

    if (!source) {
      return;
    }

    const imported = toEditorState(merchant, source);

    setForm((current) => ({
      ...current,
      gameType: imported.gameType,
      subtitle: imported.subtitle,
      ctaLabel: imported.ctaLabel,
      targetUrl: imported.targetUrl,
      logoUrl: imported.logoUrl,
      accent: imported.accent,
      presentation: imported.presentation,
      actions: imported.actions.map((action) => ({ ...action, id: createActionId() })),
      rewardRules: imported.rewardRules,
      prizes: imported.prizes.map((prize) => ({ ...prize, id: createPrizeId() })),
    }));
  }

  async function saveCampaign() {
    setIsSaving(true);
    setMessage(null);

    try {
      if (!form.prizes.length) {
        throw new Error("Ajoutez au moins un lot.");
      }

      if (
        form.rewardRules.isWinningEveryTime &&
        !form.prizes.some((prize) => prize.totalQuantity === null)
      ) {
        throw new Error(
          "Pour un jeu 100% gagnant, au moins un lot doit avoir un stock illimité.",
        );
      }

      const response = await fetch("/api/campaigns/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          targetUrl: normalizeUrl(form.targetUrl ?? ""),
          actions: form.actions
            .filter((action) => action.label.trim() && action.url.trim())
            .map((action) => ({
              ...action,
              url: normalizeUrl(action.url),
            })),
        }),
      });

      if (!response.ok) {
        throw new Error("La campagne n'a pas pu être enregistrée.");
      }

      setMessage("Campagne enregistrée.");
      router.push("/campaigns");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "La campagne n'a pas pu être enregistrée.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-[#dbe4f0] bg-white shadow-[0_22px_50px_rgba(122,136,166,0.14)]">
        <div className="grid gap-6 px-6 py-6 xl:grid-cols-[1.2fr_0.8fr] xl:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
              Paramétrage campagne
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-none text-[#0f1728]">
              {initialCampaign ? "Ajuster votre campagne" : "Créer une nouvelle campagne"}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c6577]">
              Structurez votre mécanique, personnalisez le rendu public et préparez un parcours
              marchand cohérent sur toutes les pages.
            </p>
          </div>

          <div className="flex flex-wrap items-start justify-start gap-3 xl:justify-end">
            <Link
              href="/campaigns"
              className="rounded-[20px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033]"
            >
              Retour aux campagnes
            </Link>
            <button
              type="button"
              onClick={saveCampaign}
              disabled={isSaving}
              className="rounded-[20px] bg-[#2f6df6] px-5 py-3 text-sm font-semibold !text-white shadow-[0_16px_32px_rgba(47,109,246,0.22)] disabled:opacity-60"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer la campagne"}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.96fr]">
        <div className="space-y-6">
          <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Identité de campagne
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                  Message, objectif et pilotage
                </h2>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full bg-[#f4f7fb] px-3 py-2 text-sm font-medium text-[#3e4758]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setField("isActive", event.target.checked)}
                />
                Campagne active
              </label>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Nom de campagne</span>
                <input
                  value={form.title}
                  onChange={(event) => setField("title", event.target.value)}
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Objectif principal</span>
                <select
                  value={form.goalType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      goalType: event.target.value as GoalType,
                      successMetric: goalMetricMap[event.target.value as GoalType],
                    }))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                >
                  <option value="lead_capture">Collecte CRM</option>
                  <option value="review_prompt">Avis Google</option>
                  <option value="social_follow">Social / trafic</option>
                </select>
              </label>

              <div className="rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 text-sm text-[#5e6778]">
                <span className="block text-[#616b7c]">KPI principal</span>
                <span className="mt-2 block font-semibold text-[#111827]">{form.successMetric}</span>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[#f7f9fc] px-4 py-4 text-sm text-[#4f596c]">
              <span className="font-semibold text-[#152033]">{goalLabel(form.goalType)}</span> :{" "}
              {goalDescription(form.goalType)}
            </div>
          </section>

          <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Import rapide
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                  Repartir d&apos;une campagne existante
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
              <select
                value={importSource}
                onChange={(event) => setImportSource(event.target.value)}
                className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              >
                <option value="">Sélectionner une campagne</option>
                {campaignOptions.map((item) => (
                  <option key={item.campaign.id} value={item.campaign.id}>
                    {item.campaign.title} · {gameTypeLabel(item.campaign.gameType)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => importFromCampaign(importSource)}
                disabled={!importSource}
                className="rounded-[20px] border border-[#111827] bg-[#111827] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Importer
              </button>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Actions marketing
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                  Ordre et liens d&apos;activation
                </h2>
              </div>
              <button
                type="button"
                onClick={addAction}
                className="rounded-[20px] bg-[#111827] px-4 py-3 text-sm font-semibold text-white"
              >
                Ajouter une action
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {form.actions.map((action, index) => (
                <div
                  key={action.id}
                  className="rounded-[24px] border border-[#dbe4f0] bg-[#f8fafc] p-4"
                >
                  <div className="grid gap-4 md:grid-cols-[0.8fr_1fr_auto]">
                    <label className="text-sm">
                      <span className="mb-2 block text-[#616b7c]">Canal</span>
                      <select
                        value={action.kind}
                        onChange={(event) =>
                          updateAction(action.id, { kind: event.target.value as ActionKind })
                        }
                        className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                      >
                        {actionKindOptions.map((kind) => (
                          <option key={kind} value={kind}>
                            {actionKindLabel(kind)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm">
                      <span className="mb-2 block text-[#616b7c]">Libellé</span>
                      <input
                        value={action.label}
                        onChange={(event) => updateAction(action.id, { label: event.target.value })}
                        className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                      />
                    </label>

                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => moveAction(action.id, "up")}
                        disabled={index === 0}
                        className="rounded-[18px] border border-[#d7e0ed] bg-white px-3 py-3 text-sm font-semibold text-[#182033] disabled:opacity-40"
                      >
                        Monter
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAction(action.id, "down")}
                        disabled={index === form.actions.length - 1}
                        className="rounded-[18px] border border-[#d7e0ed] bg-white px-3 py-3 text-sm font-semibold text-[#182033] disabled:opacity-40"
                      >
                        Descendre
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                    <label className="text-sm">
                      <span className="mb-2 block text-[#616b7c]">Lien</span>
                      <input
                        value={action.url}
                        onChange={(event) => updateAction(action.id, { url: event.target.value })}
                        className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                        placeholder="https://..."
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeAction(action.id)}
                      className="self-end rounded-[18px] border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-semibold text-white"
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Contenu public</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Message public et bouton
            </h2>

            <div className="mt-6 grid gap-4">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Message public</span>
                <textarea
                  value={form.subtitle}
                  onChange={(event) => setField("subtitle", event.target.value)}
                  rows={3}
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Libellé du bouton</span>
                <input
                  value={form.ctaLabel}
                  onChange={(event) => setField("ctaLabel", event.target.value)}
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Mécanique de jeu</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Choisissez l&apos;expérience client
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {gameModes.map((mode) => {
                const active = form.gameType === mode.value;

                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setField("gameType", mode.value)}
                    className={`rounded-[28px] border p-5 text-left transition ${
                      active
                        ? "border-[#2f6df6] bg-[#eff4ff] shadow-[0_16px_30px_rgba(47,109,246,0.16)]"
                        : "border-[#d7e0ed] bg-[#f9fbfd]"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-[#7b8496]">
                      {mode.eyebrow}
                    </p>
                    <div className="mt-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-[#111827]">{mode.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#576173]">
                          {mode.description}
                        </p>
                      </div>
                      <span
                        className={`mt-1 h-5 w-5 rounded-full border-4 ${
                          active ? "border-[#2f6df6] bg-white" : "border-[#d5dcea] bg-transparent"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Logo</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Personnalisation du logo
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block text-[#616b7c]">Importer un logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadAsDataUrl(event, (value) => setField("logoUrl", value))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Taille du logo (%)</span>
                <input
                  type="number"
                  min={40}
                  max={180}
                  value={form.presentation.logo.sizePercent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        logo: {
                          ...current.presentation.logo,
                          sizePercent: Number(event.target.value || 100),
                        },
                      },
                    }))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Marge basse du logo (px)</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.presentation.logo.marginBottomPx}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        logo: {
                          ...current.presentation.logo,
                          marginBottomPx: Number(event.target.value || 0),
                        },
                      },
                    }))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <div className="text-sm md:col-span-2">
                <span className="mb-3 block text-[#616b7c]">Alignement du logo</span>
                <div className="grid gap-3 md:grid-cols-3">
                  {textAlignOptions.map((align) => {
                    const active = form.presentation.logo.align === align;

                    return (
                      <button
                        key={align}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            presentation: {
                              ...current.presentation,
                              logo: {
                                ...current.presentation.logo,
                                align,
                              },
                            },
                          }))
                        }
                        className={`rounded-[20px] border px-4 py-3 text-sm font-semibold ${
                          active
                            ? "border-[#2f6df6] bg-[#eff4ff] text-[#214ccf]"
                            : "border-[#d7e0ed] bg-[#f7f9fc] text-[#182033]"
                        }`}
                      >
                        {textAlignLabel(align)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Fond</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Couleur ou image de fond
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="text-sm md:col-span-2">
                <span className="mb-3 block text-[#616b7c]">Type de fond</span>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { value: "color", label: "Couleur de fond" },
                    { value: "image", label: "Image de fond" },
                  ].map((mode) => {
                    const active = form.presentation.background.mode === mode.value;

                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            presentation: {
                              ...current.presentation,
                              background: {
                                ...current.presentation.background,
                                mode: mode.value as "color" | "image",
                              },
                            },
                          }))
                        }
                        className={`rounded-[20px] border px-4 py-3 text-sm font-semibold ${
                          active
                            ? "border-[#2f6df6] bg-[#eff4ff] text-[#214ccf]"
                            : "border-[#d7e0ed] bg-[#f7f9fc] text-[#182033]"
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur de fond</span>
                <input
                  type="color"
                  value={form.presentation.background.color}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        background: {
                          ...current.presentation.background,
                          color: event.target.value,
                        },
                      },
                    }))
                  }
                  className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Importer une image de fond</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadAsDataUrl(event, (value) =>
                      setForm((current) => ({
                        ...current,
                        presentation: {
                          ...current.presentation,
                          background: {
                            ...current.presentation.background,
                            imageUrl: value,
                            mode: "image",
                          },
                        },
                      })),
                    )
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Phrase d&apos;entête</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Style du message public
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur du texte</span>
                <input
                  type="color"
                  value={form.presentation.heading.textColor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        heading: {
                          ...current.presentation.heading,
                          textColor: event.target.value,
                        },
                      },
                    }))
                  }
                  className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Taille du texte (px)</span>
                <input
                  type="number"
                  min={18}
                  max={72}
                  value={form.presentation.heading.fontSizePx}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        heading: {
                          ...current.presentation.heading,
                          fontSizePx: Number(event.target.value || 40),
                        },
                      },
                    }))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <div className="text-sm">
                <span className="mb-3 block text-[#616b7c]">Police du texte</span>
                <div className="grid gap-3">
                  {textFontOptions.map((font) => {
                    const active = form.presentation.heading.fontFamily === font;

                    return (
                      <button
                        key={font}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            presentation: {
                              ...current.presentation,
                              heading: {
                                ...current.presentation.heading,
                                fontFamily: font,
                              },
                            },
                          }))
                        }
                        className={`rounded-[20px] border px-4 py-3 text-left text-sm font-semibold ${
                          active
                            ? "border-[#2f6df6] bg-[#eff4ff] text-[#214ccf]"
                            : "border-[#d7e0ed] bg-[#f7f9fc] text-[#182033]"
                        }`}
                      >
                        {textFontLabel(font)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-sm">
                <span className="mb-3 block text-[#616b7c]">Alignement du texte</span>
                <div className="grid gap-3">
                  {textAlignOptions.map((align) => {
                    const active = form.presentation.heading.align === align;

                    return (
                      <button
                        key={align}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            presentation: {
                              ...current.presentation,
                              heading: {
                                ...current.presentation.heading,
                                align,
                              },
                            },
                          }))
                        }
                        className={`rounded-[20px] border px-4 py-3 text-left text-sm font-semibold ${
                          active
                            ? "border-[#2f6df6] bg-[#eff4ff] text-[#214ccf]"
                            : "border-[#d7e0ed] bg-[#f7f9fc] text-[#182033]"
                        }`}
                      >
                        {textAlignLabel(align)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Bouton public</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Personnalisation du bouton
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur du fond</span>
                <input
                  type="color"
                  value={form.presentation.button.backgroundColor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        button: {
                          ...current.presentation.button,
                          backgroundColor: event.target.value,
                        },
                      },
                    }))
                  }
                  className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur du texte</span>
                <input
                  type="color"
                  value={form.presentation.button.textColor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        button: {
                          ...current.presentation.button,
                          textColor: event.target.value,
                        },
                      },
                    }))
                  }
                  className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur de bordure</span>
                <input
                  type="color"
                  value={form.presentation.button.borderColor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        button: {
                          ...current.presentation.button,
                          borderColor: event.target.value,
                        },
                      },
                    }))
                  }
                  className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>

              <div className="text-sm">
                <span className="mb-3 block text-[#616b7c]">Taille</span>
                <div className="grid gap-3">
                  {(["sm", "md", "lg"] as const).map((size) => {
                    const active = form.presentation.button.size === size;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            presentation: {
                              ...current.presentation,
                              button: {
                                ...current.presentation.button,
                                size,
                              },
                            },
                          }))
                        }
                        className={`rounded-[20px] border px-4 py-3 text-left text-sm font-semibold ${
                          active
                            ? "border-[#2f6df6] bg-[#eff4ff] text-[#214ccf]"
                            : "border-[#d7e0ed] bg-[#f7f9fc] text-[#182033]"
                        }`}
                      >
                        {buttonSizeLabel(size)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {form.gameType === "wheel" ? (
            <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Roue de la fortune</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                Couleurs de la roue
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[
                  ["rimColor", "Couleur du contour"],
                  ["winColor", "Couleur gain 1"],
                  ["alternateWinColor", "Couleur gain 2"],
                  ["loseColor", "Couleur perdu 1"],
                  ["alternateLoseColor", "Couleur perdu 2"],
                ].map(([key, label]) => (
                  <label key={key} className="text-sm">
                    <span className="mb-2 block text-[#616b7c]">{label}</span>
                    <input
                      type="color"
                      value={form.presentation.wheel[key as keyof typeof form.presentation.wheel]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          presentation: {
                            ...current.presentation,
                            wheel: {
                              ...current.presentation.wheel,
                              [key]: event.target.value,
                            },
                          },
                        }))
                      }
                      className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                    />
                  </label>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Ticket à gratter</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                Personnalisation du ticket
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-[#616b7c]">Couleur du fond du ticket</span>
                  <input
                    type="color"
                    value={form.accent.paper}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        accent: {
                          ...current.accent,
                          paper: event.target.value,
                        },
                      }))
                    }
                    className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-2 block text-[#616b7c]">Couleur de révélation</span>
                  <input
                    type="color"
                    value={form.accent.signal}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        accent: {
                          ...current.accent,
                          signal: event.target.value,
                        },
                      }))
                    }
                    className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                  />
                </label>

                <label className="text-sm md:col-span-2">
                  <span className="mb-2 block text-[#616b7c]">Couleur du texte du ticket</span>
                  <input
                    type="color"
                    value={form.accent.ink}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        accent: {
                          ...current.accent,
                          ink: event.target.value,
                        },
                      }))
                    }
                    className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                  />
                </label>
              </div>
            </section>
          )}

          <section className="rounded-[30px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Dotation</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                  Lots, validité et conditions
                </h2>
              </div>
              <button
                type="button"
                onClick={addPrize}
                className="rounded-[20px] bg-[#111827] px-4 py-3 text-sm font-semibold text-white"
              >
                Ajouter un lot
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Validité du lot (minutes)</span>
                <input
                  type="number"
                  min={1}
                  value={form.rewardRules.rewardExpiryMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rewardRules: {
                        ...current.rewardRules,
                        rewardExpiryMinutes: Number(event.target.value || 20),
                      },
                    }))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Cadeau disponible dans (heures)</span>
                <input
                  type="number"
                  min={0}
                  value={form.rewardRules.availableAfterHours}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rewardRules: {
                        ...current.rewardRules,
                        availableAfterHours: Number(event.target.value || 0),
                      },
                    }))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Durée de retrait (jours)</span>
                <input
                  type="number"
                  min={0}
                  value={form.rewardRules.availabilityDurationDays}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rewardRules: {
                        ...current.rewardRules,
                        availabilityDurationDays: Number(event.target.value || 0),
                      },
                    }))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <div className="space-y-3 rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] p-4 text-sm text-[#182033]">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.rewardRules.purchaseRequired}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rewardRules: {
                          ...current.rewardRules,
                          purchaseRequired: event.target.checked,
                        },
                      }))
                    }
                  />
                  Cadeau sous condition d&apos;achat
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.rewardRules.isWinningEveryTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rewardRules: {
                          ...current.rewardRules,
                          isWinningEveryTime: event.target.checked,
                        },
                      }))
                    }
                  />
                  Jeu 100% gagnant
                </label>
              </div>
            </div>

            <div className="mt-6 hidden grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.5fr] gap-3 rounded-[22px] bg-[#f7f9fc] px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-[#7b8496] md:grid">
              <span>Dotation</span>
              <span>Stock</span>
              <span>Probabilité</span>
              <span>Coût unitaire</span>
              <span />
            </div>

            <div className="mt-4 space-y-4">
              {form.prizes.map((prize) => (
                <div
                  key={prize.id}
                  className="grid gap-4 rounded-[24px] border border-[#dbe4f0] bg-[#f8fafc] p-4 md:grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.5fr] md:items-end"
                >
                  <label className="text-sm">
                    <span className="mb-2 block text-[#616b7c] md:hidden">Dotation</span>
                    <input
                      value={prize.label}
                      onChange={(event) => updatePrize(prize.id, { label: event.target.value })}
                      className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-2 block text-[#616b7c] md:hidden">Stock</span>
                    <input
                      type="number"
                      min={0}
                      value={prize.totalQuantity ?? ""}
                      onChange={(event) =>
                        updatePrize(prize.id, {
                          totalQuantity:
                            event.target.value === "" ? null : Number(event.target.value),
                        })
                      }
                      placeholder="Illimité"
                      className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none placeholder:text-[#a1a9b8]"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-2 block text-[#616b7c] md:hidden">Probabilité</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={prize.probability}
                      onChange={(event) =>
                        updatePrize(prize.id, { probability: Number(event.target.value || 0) })
                      }
                      className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-2 block text-[#616b7c] md:hidden">Coût unitaire</span>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={prize.estimatedUnitCost}
                      onChange={(event) =>
                        updatePrize(prize.id, {
                          estimatedUnitCost: Number(event.target.value || 0),
                        })
                      }
                      className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => removePrize(prize.id)}
                    className="rounded-[18px] border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-semibold text-white"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          </section>

          {message ? (
            <section className="rounded-[24px] border border-[#dbe4f0] bg-white px-5 py-4 text-sm text-[#182033] shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
              {message}
            </section>
          ) : null}
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="pointer-events-none rounded-[30px] border border-[#dbe4f0] bg-white p-5 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Prévisualisation mobile
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">Rendu public</h2>
              </div>
              {form.id ? (
                <Link
                  href={`/campaign/${form.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="pointer-events-auto rounded-[18px] border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-semibold !text-white"
                >
                  Ouvrir
                </Link>
              ) : null}
            </div>

            <div className="mt-6">
              <div
                className="mx-auto min-h-[860px] w-full max-w-[520px] overflow-hidden rounded-[38px] border border-[#ced7e6] px-4 pb-6 pt-5 shadow-[0_30px_70px_rgba(18,24,39,0.18)]"
                style={{
                  background:
                    form.presentation.background.mode === "image" &&
                    form.presentation.background.imageUrl
                      ? `linear-gradient(rgba(15,23,40,0.32), rgba(15,23,40,0.52)), url(${form.presentation.background.imageUrl}) center/cover`
                      : form.presentation.background.color,
                }}
              >
                <div className={`flex ${logoAlignmentClass}`}>
                  <div
                    style={{
                      width: `${Math.max(40, form.presentation.logo.sizePercent)}%`,
                      marginBottom: `${form.presentation.logo.marginBottomPx}px`,
                    }}
                  >
                    <BrandMark
                      logoText={merchant.logoText}
                      logoUrl={form.logoUrl}
                      size="lg"
                      className="h-auto w-full rounded-[24px]"
                    />
                  </div>
                </div>

                <div className={headingAlignmentClass}>
                  <h3
                    className={`${headingFontClass} font-semibold leading-[0.95]`}
                    style={{
                      color: form.presentation.heading.textColor,
                      fontSize: `${form.presentation.heading.fontSizePx}px`,
                    }}
                  >
                    {form.subtitle}
                  </h3>
                </div>

                <div className="mt-6">
                  {form.gameType === "wheel" ? (
                    <WheelOfFortune
                      accent={form.accent}
                      wheelStyle={form.presentation.wheel}
                      segments={previewSegments}
                      winningSegmentId={
                        previewSegments.find((segment) => segment.tone === "win")?.id ??
                        previewSegments[0]?.id ??
                        "win"
                      }
                    />
                  ) : (
                    <ScratchGame
                      accent={form.accent}
                      resultLabel={previewPrize}
                      enabled={false}
                      onReveal={() => undefined}
                    />
                  )}
                </div>

                <button
                  type="button"
                  className={`mt-6 w-full rounded-[24px] border font-semibold ${previewCtaClass}`}
                  style={{
                    backgroundColor: form.presentation.button.backgroundColor,
                    color: form.presentation.button.textColor,
                    borderColor: form.presentation.button.borderColor,
                  }}
                >
                  {form.ctaLabel}
                </button>

                {!!form.actions.length ? (
                  <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4 text-white">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                      Parcours d&apos;actions
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      {form.actions.map((action, index) => (
                        <div key={action.id} className="flex items-center justify-between gap-3">
                          <span>
                            {index + 1}. {action.label}
                          </span>
                          <span className="text-white/60">{actionKindLabel(action.kind)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
