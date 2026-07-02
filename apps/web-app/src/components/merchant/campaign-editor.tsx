"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import { BrandMark } from "@/components/brand-mark";
import { Switch } from "@/components/ui/switch";
import {
  actionKindCta,
  actionKindLabel,
  buttonSizeLabel,
  gameTypeLabel,
  textAlignLabel,
  textFontLabel,
} from "@/lib/format";
import {
  createCampaignEmailDefaults,
  normalizeCampaignEmailSettings,
} from "@/lib/email-settings";
import { createPosterSettingsDefaults, normalizePosterSettings } from "@/lib/poster-utils";
import {
  ActionKind,
  BackgroundLibraryAsset,
  CampaignAction,
  CampaignLibraryItem,
  CampaignPerformance,
  CampaignSetupInput,
  GameType,
  GoalType,
  Merchant,
  TextAlign,
  TextFont,
} from "@/lib/types";

const WheelOfFortune = dynamic(
  () => import("@/components/public/wheel-of-fortune").then((mod) => mod.WheelOfFortune),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-[32px] bg-white/70 text-sm text-[#7b8496]">
        Chargement de la prévisualisation...
      </div>
    ),
  },
);

const ScratchGame = dynamic(
  () => import("@/components/public/scratch-game").then((mod) => mod.ScratchGame),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-[32px] bg-white/70 text-sm text-[#7b8496]">
        Chargement de la prévisualisation...
      </div>
    ),
  },
);

type CampaignEditorProps = {
  merchant: Merchant;
  initialCampaign?: CampaignPerformance | null;
  campaignLibrary?: CampaignLibraryItem[];
};

type EditorState = CampaignSetupInput;

type PreviewSegment = {
  id: string;
  label: string;
  tone: "win" | "lose";
};

type CampaignEditorPreviewModel = {
  formId: string;
  backgroundStyle: {
    backgroundColor: string;
    backgroundImage: string;
    backgroundPosition: string;
    backgroundSize: string;
  };
  logoMode: EditorState["logoMode"];
  logoAlignmentClass: string;
  logoBottomSpacingPx: number;
  logoWidthPx: number;
  logoUrl: string;
  logoText: string;
  headingAlignmentClass: string;
  headingFontClass: string;
  headingTextColor: string;
  headingFontSizePx: number;
  subtitle: string;
  blockSpacingPx: number;
  gameType: GameType;
  accent: EditorState["accent"];
  wheelStyle: EditorState["presentation"]["wheel"];
  buttonStyle: {
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    textSizePx: number;
    isBold: boolean;
  };
  previewSegments: PreviewSegment[];
  winningSegmentId: string;
  previewPrize: string;
  ctaLabel: string;
  previewCtaClass: string;
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
    description:
      "Un moment fort en caisse, sur borne ou sur affichage mobile plein écran pour générer du trafic en restaurant.",
  },
  {
    value: "scratch",
    eyebrow: "Révélation immédiate",
    title: "Ticket à gratter",
    description: "Un format ludique et tactile pour révéler un gain instantané sur mobile, borne ou tablette.",
  },
];

const buttonSizeMap = {
  sm: "px-4 py-3 text-sm",
  md: "px-5 py-4 text-base",
  lg: "px-6 py-5 text-lg",
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

function defaultActionUrl(merchant: Merchant, kind: ActionKind) {
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
    case "crm":
      return merchant.websiteUrl ?? "https://";
    case "custom":
      return merchant.customLinkUrl ?? "https://";
    default:
      return "https://";
  }
}

function createDefaultAction(merchant: Merchant): CampaignAction {
  return {
    id: createActionId(),
    kind: "google",
    label: actionKindCta("google"),
    url: defaultActionUrl(merchant, "google"),
  };
}

function createDefaultState(merchant: Merchant): EditorState {
  return {
    merchantId: merchant.id,
    title: "Animation restaurant",
    subtitle: "Jouez et gagnez.",
    goalType: "review_prompt",
    gameType: "wheel",
    ctaLabel: "Je participe",
    successMetric: goalMetricMap.review_prompt,
    targetUrl: merchant.googleReviewUrl,
    isActive: true,
    logoMode: "text",
    logoText: merchant.companyName,
    logoUrl: undefined,
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
        color: "#ffffff",
        imageUrl: "",
      },
      heading: {
        textColor: "#1f2937",
        fontSizePx: 40,
        fontFamily: "display",
        align: "center",
      },
      button: {
        backgroundColor: "#c59920",
        textColor: "#ffffff",
        borderColor: "#f4c14a",
        size: "md",
        textSizePx: 24,
        isBold: true,
      },
      layout: {
        blockSpacingPx: 28,
      },
      wheel: {
        rimColor: "#f4c14a",
        winColor: "#f4c14a",
        alternateWinColor: "#eef2ff",
        loseColor: "#1b2842",
        alternateLoseColor: "#8795db",
      },
      poster: {
        logoMode: "text",
        logoText: merchant.companyName,
        logoUrl: undefined,
        logoSizePercent: 100,
        logoBottomMarginPx: 28,
        backgroundMode: "color",
        backgroundColor: "#ffffff",
        backgroundImageUrl: "",
        headline: "Scannez, jouez, récupérez votre cadeau",
        headlineTextColor: "#ffffff",
        headlineFontSizePx: 42,
        headlineFontFamily: "display",
        wheel: {
          rimColor: "#f4c14a",
          winColor: "#f4c14a",
          alternateWinColor: "#eef2ff",
          loseColor: "#1b2842",
          alternateLoseColor: "#8795db",
        },
        footerBackgroundColor: "#8d9ae8",
      },
      email: createCampaignEmailDefaults(merchant),
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
        usageConditions: "",
      },
      {
        id: "default-prize-2",
        label: "Cadeau surprise",
        totalQuantity: null,
        probability: 25,
        estimatedUnitCost: 4,
        usageConditions: "",
      },
    ],
  };
}

function SaveFeedbackDialog({
  open,
  title,
  description,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f1220]/52 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6">
      <div className="w-full max-w-[420px] rounded-[34px] bg-white p-6 text-[#111827] shadow-[0_34px_90px_rgba(18,24,39,0.24)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-3xl text-[#2f6df6]">
          ✓
        </div>
        <h2 className="mt-5 text-center text-2xl font-semibold text-[#0f1728]">{title}</h2>
        <p className="mt-3 text-center text-sm leading-7 text-[#5c6577]">{description}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-[20px] border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-semibold text-white"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}

function BackgroundLibraryDialog({
  open,
  onClose,
  items,
  isLoading,
  error,
  selectedImageUrl,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  items: BackgroundLibraryAsset[];
  isLoading: boolean;
  error: string | null;
  selectedImageUrl: string;
  onSelect: (imageUrl: string) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f1220]/52 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6">
      <div className="w-full max-w-5xl rounded-[34px] bg-white p-6 text-[#111827] shadow-[0_34px_90px_rgba(18,24,39,0.24)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
      <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Biblioth&egrave;que d&apos;images</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0f1728]">
              Sélectionnez une image de fond
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#5c6577]">
              Choisissez un visuel existant de la plateforme pour l&apos;utiliser sur la page de jeu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[18px] border border-[#d7e0ed] px-4 py-2 text-sm font-semibold text-[#182033]"
          >
            Fermer
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-[18px] border border-[#f3d4d4] bg-[#fff4f4] px-4 py-3 text-sm text-[#9d3131]">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid max-h-[68vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="rounded-[20px] border border-[#dbe4f0] bg-[#f7f9fc] px-4 py-6 text-sm text-[#64748b] sm:col-span-2 lg:col-span-3">
              Chargement de la bibliothèque…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[20px] border border-[#dbe4f0] bg-[#f7f9fc] px-4 py-6 text-sm text-[#64748b] sm:col-span-2 lg:col-span-3">
              Aucune image disponible pour le moment.
            </div>
          ) : (
            items.map((asset) => {
              const active = selectedImageUrl === asset.imageUrl;

              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelect(asset.imageUrl);
                    onClose();
                  }}
                  className={`overflow-hidden rounded-[22px] border text-left transition ${
                    active
                       ? "border-[#2f6df6] bg-[#eef4ff] shadow-[0_14px_28px_rgba(47,109,246,0.16)]"
                      : "border-[#dbe4f0] bg-[#f8fafc] hover:border-[#9bb8ff] hover:bg-white"
                  }`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={asset.thumbnailUrl}
                      alt={asset.label}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#091120]/82 via-[#091120]/20 to-transparent p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{asset.label}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/72">
                            {asset.category}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                          {asset.source === "built-in" ? "Base" : "Upload"}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function PrizeConditionsDialog({
  open,
  prizeLabel,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  prizeLabel: string;
  value: string;
  onChange: (nextValue: string) => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f1220]/52 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6">
      <div className="w-full max-w-[560px] rounded-[34px] bg-white p-6 text-[#111827] shadow-[0_34px_90px_rgba(18,24,39,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Conditions</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0f1728]">
              Conditions d&apos;utilisation
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#5c6577]">
              Renseignez les précisions d&apos;usage de ce lot. Elles seront visibles lors du gain et reprises dans l&apos;e-mail envoyé au client.
              <span className="font-semibold text-[#111827]">{prizeLabel || "sans nom"}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[18px] border border-[#d7e0ed] px-4 py-2 text-sm font-semibold text-[#182033]"
          >
            Fermer
          </button>
        </div>

        <label className="mt-6 block text-sm">
          <span className="mb-2 block text-[#616b7c]">Texte affiché au client</span>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={7}
            placeholder="Ex. valable hors menu midi, une seule utilisation par table, hors jours fériés..."
            className="w-full rounded-[22px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none"
          />
        </label>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[20px] border border-[#111827] bg-[#111827] px-5 py-3 text-sm font-semibold text-white"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

const CampaignLivePreview = memo(function CampaignLivePreview({
  merchant,
  preview,
}: {
  merchant: Merchant;
  preview: CampaignEditorPreviewModel;
}) {
  return (
    <div className="mt-6">
      <div
        className="mx-auto min-h-[700px] w-full max-w-[450px] overflow-hidden rounded-[38px] border border-[#ced7e6] px-4 pb-6 pt-5 shadow-[0_30px_70px_rgba(18,24,39,0.18)]"
        style={preview.backgroundStyle}
      >
        {preview.logoMode === "image" && preview.logoUrl ? (
          <div className={`flex ${preview.logoAlignmentClass}`}>
            <div
              style={{
                marginBottom: `${preview.logoBottomSpacingPx}px`,
              }}
            >
              <BrandMark
                logoText={merchant.logoText}
                logoUrl={preview.logoUrl}
                size="lg"
                variant="transparent"
                imageWidthPx={preview.logoWidthPx}
              />
            </div>
          </div>
        ) : null}

        {preview.logoMode === "text" ? (
          <div className={`flex ${preview.logoAlignmentClass}`}>
            <div
              style={{
                marginBottom: `${preview.logoBottomSpacingPx}px`,
              }}
            >
              <BrandMark
                logoText={preview.logoText}
                size="lg"
                variant="transparent"
                imageWidthPx={preview.logoWidthPx}
                textColor={preview.headingTextColor}
              />
            </div>
          </div>
        ) : null}

        <div className={preview.headingAlignmentClass}>
          <h3
            className={`${preview.headingFontClass} font-semibold leading-[0.95]`}
            style={{
              color: preview.headingTextColor,
              fontSize: `${preview.headingFontSizePx}px`,
            }}
          >
            {preview.subtitle}
          </h3>
        </div>

        <div
          style={{
            marginTop: `${preview.blockSpacingPx}px`,
            height: preview.gameType === "wheel" ? "560px" : undefined,
          }}
        >
          {preview.gameType === "wheel" ? (
            <WheelOfFortune
              accent={preview.accent}
              wheelStyle={preview.wheelStyle}
              buttonStyle={{
                backgroundColor: preview.buttonStyle.backgroundColor,
                textColor: preview.buttonStyle.textColor,
                borderColor: preview.buttonStyle.borderColor,
              }}
              segments={preview.previewSegments}
              buttonEnabled
              winningSegmentId={preview.winningSegmentId}
              framing="editor"
            />
          ) : (
            <ScratchGame
              accent={preview.accent}
              resultLabel={preview.previewPrize}
              enabled={false}
              onReveal={() => undefined}
            />
          )}
        </div>

        {preview.gameType !== "wheel" ? (
          <button
            type="button"
            className={`w-full rounded-[24px] border font-semibold ${preview.previewCtaClass}`}
            style={{
              marginTop: `${preview.blockSpacingPx}px`,
              backgroundColor: preview.buttonStyle.backgroundColor,
              color: preview.buttonStyle.textColor,
              borderColor: preview.buttonStyle.borderColor,
              fontSize: `${preview.buttonStyle.textSizePx}px`,
              fontWeight: preview.buttonStyle.isBold ? 700 : 400,
            }}
          >
            {preview.ctaLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
});

const CampaignActionCard = memo(function CampaignActionCard({
  action,
  index,
  totalActions,
  onUpdate,
  onRemove,
  onMove,
}: {
  action: CampaignAction;
  index: number;
  totalActions: number;
  onUpdate: (actionId: string, patch: Partial<CampaignAction>) => void;
  onRemove: (actionId: string) => void;
  onMove: (actionId: string, direction: "up" | "down") => void;
}) {
  return (
    <div className="rounded-[24px] border border-[#dbe4f0] bg-[#f8fafc] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[#d7e0ed] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#64748b]">
            Action {index + 1}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMove(action.id, "up")}
            disabled={index === 0}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#d7e0ed] bg-white text-[#182033] disabled:opacity-40"
            aria-label={`Monter l'action ${index + 1}`}
            title="Monter"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M5 12.5L10 7.5L15 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onMove(action.id, "down")}
            disabled={index === totalActions - 1}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#d7e0ed] bg-white text-[#182033] disabled:opacity-40"
            aria-label={`Descendre l'action ${index + 1}`}
            title="Descendre"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`grid gap-4 ${
                  action.kind === "crm" ? "md:grid-cols-[0.72fr_auto]" : "md:grid-cols-[0.72fr_1.45fr_auto]"
        }`}
      >
        <label className="text-sm">
          <span className="mb-2 block text-[#616b7c]">Canal</span>
          <select
            value={action.kind}
            onChange={(event) => onUpdate(action.id, { kind: event.target.value as ActionKind })}
            className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
          >
            {actionKindOptions.map((kind) => (
              <option key={kind} value={kind}>
                {actionKindLabel(kind)}
              </option>
            ))}
          </select>
        </label>

        {action.kind !== "crm" ? (
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Lien</span>
            <input
              value={action.url}
              onChange={(event) => onUpdate(action.id, { url: event.target.value })}
              className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
              placeholder="https://..."
            />
          </label>
        ) : null}

        <div className="flex items-end gap-2">
          {action.kind !== "crm" ? (
            <a
              href={normalizeUrl(action.url)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Ouvrir le lien de l'action ${index + 1}`}
              title="Ouvrir le lien"
              className="inline-flex h-[48px] w-[48px] shrink-0 cursor-pointer items-center justify-center rounded-[18px] border border-[#d7e0ed] bg-white text-[#182033]"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d="M7 13L13 7M8.5 7H13V11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 12.5V14C12 14.6 11.6 15 11 15H6C5.4 15 5 14.6 5 14V9C5 8.4 5.4 8 6 8H7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => onRemove(action.id)}
            aria-label={`Supprimer l'action ${index + 1}`}
            title="Supprimer"
            className="inline-flex h-[48px] w-[48px] cursor-pointer items-center justify-center rounded-[18px] border border-[#111827] bg-[#111827] text-white"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M6.5 6.5L13.5 13.5M13.5 6.5L6.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});
const CampaignPrizeRow = memo(function CampaignPrizeRow({
  prize,
  onUpdate,
  onRemove,
  onOpenConditions,
}: {
  prize: EditorState["prizes"][number];
  onUpdate: (
    prizeId: string | undefined,
    patch: Partial<EditorState["prizes"][number]>,
  ) => void;
  onRemove: (prizeId: string | undefined) => void;
  onOpenConditions: (prizeId: string | undefined) => void;
}) {
  return (
    <div className="grid gap-3 rounded-[24px] border border-[#dbe4f0] bg-white p-4 md:grid-cols-[1.35fr_0.6fr_0.6fr_0.6fr_auto] md:items-center">
      <label className="text-sm">
        <span className="mb-2 block text-[#616b7c] md:hidden">Dotation</span>
        <input
          value={prize.label}
          onChange={(event) => onUpdate(prize.id, { label: event.target.value })}
          className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
        />
      </label>

      <label className="text-sm">
        <span className="mb-2 block text-[#616b7c] md:hidden">Stock</span>
        <input
          type="number"
          min={0}
    value={prize.totalQuantity ?? ""}
          placeholder="Illimité"
          onChange={(event) =>
            onUpdate(prize.id, {
              totalQuantity: event.target.value === "" ? null : Number(event.target.value),
            })
          }
          className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
        />
      </label>

      <label className="text-sm">
        <span className="mb-2 block text-[#616b7c] md:hidden">Probabilité</span>
        <input
          type="number"
          min={0}
          max={100}
          value={prize.probability}
          onChange={(event) => onUpdate(prize.id, { probability: Number(event.target.value || 0) })}
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
            onUpdate(prize.id, { estimatedUnitCost: Number(event.target.value || 0) })
          }
          className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
        />
      </label>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenConditions(prize.id)}
          className="rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 text-sm font-semibold text-[#182033]"
        >
          Conditions
        </button>
        <button
          type="button"
          onClick={() => onRemove(prize.id)}
          className="rounded-[18px] border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-semibold text-white"
        >
          Retirer
        </button>
      </div>
    </div>
  );
});
function toEditorState(merchant: Merchant, campaign: CampaignPerformance | null): EditorState {
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
    logoMode: campaign.campaign.logoMode ?? (campaign.campaign.logoUrl ? "image" : "text"),
    logoText: campaign.campaign.logoText ?? merchant.companyName,
    logoUrl: campaign.campaign.logoUrl,
    accent: campaign.campaign.accent,
    presentation: {
      ...campaign.campaign.presentation,
      button: {
        ...campaign.campaign.presentation.button,
        isBold: campaign.campaign.presentation.button.isBold ?? true,
      },
      poster: normalizePosterSettings(
        campaign.campaign.presentation.poster,
    createPosterSettingsDefaults({
      logoMode: campaign.campaign.logoMode ?? "text",
      logoText: campaign.campaign.logoText ?? merchant.companyName,
      logoUrl: undefined,
      logoSizePercent: campaign.campaign.presentation.logo.sizePercent,
      logoBottomMarginPx: campaign.campaign.presentation.logo.marginBottomPx,
      backgroundMode: campaign.campaign.presentation.background.mode,
      backgroundColor: campaign.campaign.presentation.background.color,
      backgroundImageUrl: "",
      headline: campaign.campaign.subtitle,
      headlineTextColor: campaign.campaign.presentation.heading.textColor,
          headlineFontSizePx: campaign.campaign.presentation.heading.fontSizePx,
          headlineFontFamily: campaign.campaign.presentation.heading.fontFamily,
          wheel: campaign.campaign.presentation.wheel,
          footerBackgroundColor: campaign.campaign.accent.signal,
        }),
      ),
      email: normalizeCampaignEmailSettings(
        campaign.campaign.presentation.email,
        createCampaignEmailDefaults(merchant),
      ),
    },
    actions: campaign.campaign.actions,
    rewardRules: campaign.campaign.rewardRules,
    prizes: campaign.prizes.map((prize) => ({
      id: prize.id,
      label: prize.label,
      totalQuantity: prize.totalQuantity,
      probability: prize.probability,
      estimatedUnitCost: prize.estimatedUnitCost,
          usageConditions: prize.usageConditions ?? "",
    })),
  };
}

function buildPreviewSegments(prizes: EditorState["prizes"]): PreviewSegment[] {
  const winners = prizes
    .map((prize, index) => ({
      id: prize.id || `preview-win-${index}`,
      label: prize.label.trim().toUpperCase(),
      tone: "win" as const,
    }))
    .filter((prize) => prize.label);

  const minimumSegmentCount = 10;
  const loserCount = Math.max(
    minimumSegmentCount - winners.length,
    winners.length,
    minimumSegmentCount,
  );
  const losers = Array.from({ length: loserCount }, (_, index) => ({
    id: `preview-lose-${index}`,
    label: index % 2 === 0 ? "PERDU" : "DOMMAGE",
    tone: "lose" as const,
  }));
  const segments: PreviewSegment[] = [];
  const maxLength = Math.max(winners.length, losers.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (losers[index]) {
      segments.push(losers[index]);
    }

    if (winners[index]) {
      segments.push(winners[index]);
    }
  }

  return segments.length ? segments : losers;
}

function syncActionLabel(kind: ActionKind, currentLabel: string) {
  if (kind === "custom" && currentLabel.trim()) {
    return currentLabel;
  }

  return actionKindCta(kind);
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

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function deriveLighterHex(hex: string, ratio = 0.58) {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    return "#c7d2fe";
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return "#c7d2fe";
  }

  const nextRed = clampChannel(red + (255 - red) * ratio);
  const nextGreen = clampChannel(green + (255 - green) * ratio);
  const nextBlue = clampChannel(blue + (255 - blue) * ratio);

  return `#${nextRed.toString(16).padStart(2, "0")}${nextGreen
    .toString(16)
    .padStart(2, "0")}${nextBlue.toString(16).padStart(2, "0")}`;
}

export function CampaignEditor({
  merchant,
  initialCampaign = null,
  campaignLibrary = [],
}: CampaignEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<EditorState>(toEditorState(merchant, initialCampaign));
  const [backgroundLibrary, setBackgroundLibrary] = useState<BackgroundLibraryAsset[]>([]);
  const [campaignLibraryItems, setCampaignLibraryItems] = useState<CampaignLibraryItem[]>(
    campaignLibrary,
  );
  const [isCampaignLibraryLoading, setIsCampaignLibraryLoading] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(
    initialCampaign?.campaign.id ?? null,
  );
  const [backgroundLibraryDialogOpen, setBackgroundLibraryDialogOpen] = useState(false);
  const [importSource, setImportSource] = useState("");
  const [isImportingCampaign, setIsImportingCampaign] = useState(false);
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [editingPrizeConditionsId, setEditingPrizeConditionsId] = useState<string | null>(null);

  const previewSegments = useMemo(() => buildPreviewSegments(form.prizes), [form.prizes]);
  const previewPrize = form.prizes[0].label || "Cadeau surprise";
  const previewCtaClass = buttonSizeMap[form.presentation.button.size];
  const logoWidthPx = Math.round(
    Math.max(72, Math.min(260, form.presentation.logo.sizePercent * 1.6)),
  );
  const campaignOptions = campaignLibraryItems.filter(
    (item) => item.id !== initialCampaign?.campaign.id,
  );
  const editingPrize = form.prizes.find((prize) => prize.id === editingPrizeConditionsId) ?? null;

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
  const previewModel = useMemo<CampaignEditorPreviewModel>(() => {
    const winningSegmentId =
      previewSegments.find((segment) => segment.tone === "win")?.id ?? previewSegments[0]?.id ?? "win";

    return {
      formId: form.id ?? "new-campaign",
      backgroundStyle: {
        backgroundColor: form.presentation.background.color,
        backgroundImage:
          form.presentation.background.mode === "image" && form.presentation.background.imageUrl
            ? `linear-gradient(rgba(15,23,40,0.32), rgba(15,23,40,0.52)), url("${form.presentation.background.imageUrl}")`
            : "",
        backgroundPosition: "center",
        backgroundSize: "cover",
      },
      logoMode: form.logoMode,
      logoAlignmentClass,
      logoBottomSpacingPx:
        form.presentation.logo.marginBottomPx + form.presentation.layout.blockSpacingPx,
      logoWidthPx,
      logoUrl: form.logoUrl ?? "",
      logoText: form.logoText?.trim() || merchant.companyName,
      headingAlignmentClass,
      headingFontClass,
      headingTextColor: form.presentation.heading.textColor,
      headingFontSizePx: form.presentation.heading.fontSizePx,
      subtitle: form.subtitle,
      blockSpacingPx: form.presentation.layout.blockSpacingPx,
      gameType: form.gameType,
      accent: form.accent,
      wheelStyle: form.presentation.wheel,
      buttonStyle: {
        backgroundColor: form.presentation.button.backgroundColor,
        textColor: form.presentation.button.textColor,
        borderColor: form.presentation.button.borderColor,
        textSizePx: form.presentation.button.textSizePx,
        isBold: form.presentation.button.isBold ?? true,
      },
      previewSegments,
      winningSegmentId,
      previewPrize,
      ctaLabel: form.ctaLabel,
      previewCtaClass,
    };
  }, [
    form.accent,
    form.ctaLabel,
    form.gameType,
    form.id,
    form.logoMode,
    form.logoText,
    form.logoUrl,
    form.presentation.background.color,
    form.presentation.background.imageUrl,
    form.presentation.background.mode,
    form.presentation.button.backgroundColor,
    form.presentation.button.borderColor,
    form.presentation.button.isBold,
    form.presentation.button.textColor,
    form.presentation.button.textSizePx,
    form.presentation.heading.fontSizePx,
    form.presentation.heading.textColor,
    form.presentation.layout.blockSpacingPx,
    form.presentation.logo.marginBottomPx,
    form.presentation.wheel,
    form.subtitle,
    headingAlignmentClass,
    headingFontClass,
    logoAlignmentClass,
    logoWidthPx,
    merchant.companyName,
    previewCtaClass,
    previewPrize,
    previewSegments,
  ]);
  const deferredPreview = useDeferredValue(previewModel);

  useEffect(() => {
    let cancelled = false;

    if (
      !isExpertMode ||
      (!backgroundLibraryDialogOpen && form.presentation.background.mode !== "image") ||
      backgroundLibrary.length > 0
    ) {
      return;
    }

    async function loadBackgroundLibrary() {
      try {
        setIsLibraryLoading(true);
        const response = await fetch("/api/background-library", { cache: "no-store" });
        const payload = (await response.json()) as {
          error: string;
          items: BackgroundLibraryAsset[];
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Chargement de la bibliothèque impossible.");
        }

        if (!cancelled) {
          setBackgroundLibrary(payload.items ?? []);
          setLibraryMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLibraryMessage(
            error instanceof Error
              ? error.message
              : "Chargement de la bibliothèque impossible.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLibraryLoading(false);
        }
      }
    }

    loadBackgroundLibrary();

    return () => {
      cancelled = true;
    };
  }, [
    backgroundLibrary.length,
    backgroundLibraryDialogOpen,
    form.presentation.background.mode,
    isExpertMode,
  ]);

  useEffect(() => {
    let cancelled = false;

    if (!isExpertMode || campaignLibraryItems.length > 0 || isCampaignLibraryLoading) {
      return;
    }

    async function loadCampaignLibrary() {
      try {
        setIsCampaignLibraryLoading(true);
        const response = await fetch("/api/campaigns", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { error: string; campaigns: CampaignLibraryItem[] }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Chargement des campagnes impossible.");
        }

        if (!cancelled) {
          setCampaignLibraryItems(payload?.campaigns ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Chargement des campagnes impossible.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsCampaignLibraryLoading(false);
        }
      }
    }

    loadCampaignLibrary();

    return () => {
      cancelled = true;
    };
  }, [campaignLibraryItems.length, isCampaignLibraryLoading, isExpertMode]);

  function setField<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updatePrimaryWheelColor(nextColor: string) {
    setForm((current) => ({
      ...current,
      presentation: {
        ...current.presentation,
        wheel: {
          ...current.presentation.wheel,
          loseColor: nextColor,
          alternateLoseColor: deriveLighterHex(nextColor),
        },
      },
    }));
  }

  function selectBackgroundImage(imageUrl: string) {
    setForm((current) => ({
      ...current,
      presentation: {
        ...current.presentation,
        background: {
          ...current.presentation.background,
          mode: "image",
          imageUrl,
        },
      },
    }));
  }

  const updatePrize = useCallback((
    prizeId: string | undefined,
    patch: Partial<EditorState["prizes"][number]>,
  ) => {
    setForm((current) => ({
      ...current,
      prizes: current.prizes.map((prize) =>
        prize.id === prizeId ? { ...prize, ...patch } : prize,
      ),
    }));
  }, []);

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
          usageConditions: "",
        },
      ],
    }));
  }

  const removePrize = useCallback((prizeId: string | undefined) => {
    setForm((current) => ({
      ...current,
      prizes:
        current.prizes.length <= 1
          ? current.prizes
          : current.prizes.filter((prize) => prize.id !== prizeId),
    }));
  }, []);

  function addAction() {
    setForm((current) => ({
      ...current,
      actions: [
        ...current.actions,
        {
          id: createActionId(),
          kind: "instagram",
          label: actionKindCta("instagram"),
          url: defaultActionUrl(merchant, "instagram"),
        },
      ],
    }));
  }

  const updateAction = useCallback((actionId: string, patch: Partial<CampaignAction>) => {
    setForm((current) => ({
      ...current,
      actions: current.actions.map((action) => {
        if (action.id !== actionId) {
          return action;
        }

        const nextAction = { ...action, ...patch };

        if (patch.kind) {
          nextAction.label = syncActionLabel(patch.kind, patch.label ?? action.label);
          nextAction.url = patch.url ?? defaultActionUrl(merchant, patch.kind);
        }

        return nextAction;
      }),
    }));
  }, [merchant]);

  const removeAction = useCallback((actionId: string) => {
    setForm((current) => ({
      ...current,
      actions: current.actions.filter((action) => action.id !== actionId),
    }));
  }, []);

  const moveAction = useCallback((actionId: string, direction: "up" | "down") => {
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
  }, []);

  async function importFromCampaign(campaignId: string) {
    if (!campaignId) {
      return;
    }

    try {
      setIsImportingCampaign(true);
      setMessage(null);

      const response = await fetch(`/api/campaigns/${campaignId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | { error: string; campaign: CampaignPerformance | null }
        | null;

      if (!response.ok || !payload?.campaign) {
        throw new Error(payload?.error || "Impossible d'importer cette campagne.");
      }

      const imported = toEditorState(merchant, payload.campaign);

      setForm((current) => ({
        ...current,
        gameType: imported.gameType,
        subtitle: imported.subtitle,
        ctaLabel: imported.ctaLabel,
        targetUrl: imported.targetUrl,
        logoMode: imported.logoMode,
        logoText: imported.logoText,
        logoUrl: imported.logoUrl,
        accent: imported.accent,
        presentation: imported.presentation,
        actions: imported.actions.map((action) => ({
          ...action,
          id: createActionId(),
          label: syncActionLabel(action.kind, action.label),
        })),
        rewardRules: imported.rewardRules,
        prizes: imported.prizes.map((prize) => ({ ...prize, id: createPrizeId() })),
      }));
    } catch (error) {
          setMessage(error instanceof Error ? error.message : "Impossible d'importer cette campagne.");
    } finally {
      setIsImportingCampaign(false);
    }
  }

  async function saveCampaign() {
    setIsSaving(true);
    setMessage(null);
    setSaveDialogOpen(false);
    if (form.id !== "__legacy_save__") {
      return handleSaveCampaign();
    }

    try {
      if (!form.prizes.length) {
        throw new Error("Ajoutez au moins un lot.");
      }

      if (
        form.rewardRules.isWinningEveryTime &&
        !form.prizes.some((prize) => prize.totalQuantity === null)
      ) {
        throw new Error(
          "Pour un jeu 100% gagnant, au moins un lot doit avoir un stock illimité pour l'attribution.",
        );
      }

      const response = await fetch("/api/campaigns/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          targetUrl: normalizeUrl(form.targetUrl ?? ""),
          actions: form.actions
            .filter((action) => action.url.trim())
            .map((action) => ({
              ...action,
              label: syncActionLabel(action.kind, action.label),
              url: normalizeUrl(action.url),
            })),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error: string;
            campaign: CampaignPerformance | null;
          }
        | null;
      void payload;

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

  async function handleSaveCampaign() {
    setIsSaving(true);
    setMessage(null);
    setSaveDialogOpen(false);

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
            .filter((action) => action.url.trim())
            .map((action) => ({
              ...action,
              label: syncActionLabel(action.kind, action.label),
              url: normalizeUrl(action.url),
            })),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error: string;
            campaign: CampaignPerformance | null;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "La campagne n'a pas pu être enregistrée.");
      }

      const nextCampaignId = payload?.campaign?.campaign.id ?? form.id ?? null;

      if (nextCampaignId) {
        setSavedCampaignId(nextCampaignId);
        setForm((current) => ({
          ...current,
          id: nextCampaignId,
        }));
      }

      setSaveDialogOpen(true);
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
    <div className="space-y-6 pb-24 xl:pb-0">
      <section className="grid gap-6 px-1 py-2 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
              Param&eacute;trage de l&apos;animation
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-none text-[#0f1728]">
              {initialCampaign ? "Ajuster votre campagne" : "Créer votre campagne"}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c6577]">
              Structurez la mécanique de votre jeu concours tout en personnalisant le rendu
              graphique.
            </p>
          </div>

          <div className="flex flex-wrap items-start justify-start gap-3 xl:justify-end">
            <Link
              href="/campaigns"
              prefetch={false}
              className="rounded-[8px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033] transition hover:bg-linen-canvas"
            >
              Retour aux campagnes
            </Link>
            <button
              type="button"
              onClick={saveCampaign}
              disabled={isSaving}
              className="rounded-[8px] bg-[#2f6df6] px-5 py-3 text-sm font-semibold !text-white shadow-[0_16px_32px_rgba(47,109,246,0.22)] disabled:opacity-60"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
      </section>

      {false ? (
      <section className="okado-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Interface</p>
            <h2 className="mt-2 text-xl font-semibold text-[#111827]">Mode d&apos;&eacute;dition</h2>
            <p className="mt-2 text-sm leading-6 text-[#5c6577]">
              Le mode par défaut masque les réglages avancés pour se concentrer sur
              l&apos;essentiel. Le mode expert dévoile des options supplémentaires de
              personnalisation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsExpertMode(false)}
              className={`rounded-[18px] px-4 py-3 text-sm font-semibold ${
                !isExpertMode
                   ? "border border-[#2f6df6] bg-[#eff4ff] text-[#214ccf]"
                  : "border border-[#d7e0ed] bg-[#f7f9fc] text-[#182033]"
              }`}
            >
              Par défaut
            </button>
            <button
              type="button"
              onClick={() => setIsExpertMode(true)}
              className={`rounded-[18px] px-4 py-3 text-sm font-semibold ${
                isExpertMode
                   ? "border border-[#2f6df6] bg-[#eff4ff] text-[#214ccf]"
                  : "border border-[#d7e0ed] bg-[#f7f9fc] text-[#182033]"
              }`}
            >
              Expert
            </button>
          </div>
        </div>
      </section>

      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.96fr]">
        <div className="space-y-6">
          <section className="okado-card p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Identit de campagne
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                  Nommez votre animation
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

            <div className="mt-6 grid gap-4 md:grid-cols-1">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Nom de campagne</span>
                <input
                  value={form.title}
                  onChange={(event) => setField("title", event.target.value)}
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>
            </div>
          </section>

          <section className="okado-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Actions marketing
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#111827]">
                  Ordre des actions pour chaque participation
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5c6577]">
                  Définissez un objectif pour chaque participation. Si le client ne peut jouer qu&apos;une fois, limitez-vous à une seule action.
                </p>
              </div>
              <button
                type="button"
                onClick={addAction}
                className="rounded-[20px] border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-semibold text-white"
              >
                Ajouter une action
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {form.actions.map((action, index) => (
                <CampaignActionCard
                  key={action.id}
                  action={action}
                  index={index}
                  totalActions={form.actions.length}
                  onUpdate={updateAction}
                  onRemove={removeAction}
                  onMove={moveAction}
                />
              ))}
            </div>
          </section>

          <section className="okado-card p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Mécanique de jeu</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Choisissez l&apos;expérience client
            </h2>

            <div className="mt-4 flex justify-start md:justify-end">
              <label className="flex items-center gap-3 rounded-[8px] border border-border bg-linen-canvas px-3 py-2 text-sm font-semibold text-[#182033]">
                <span>Mode expert</span>
                <Switch
                  checked={isExpertMode}
                  onCheckedChange={setIsExpertMode}
                  aria-label="Activer le mode expert"
                />
              </label>
            </div>

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
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[#7b8496]">
                          {mode.eyebrow}
                        </p>
                        <h3 className="mt-3 text-xl font-semibold text-[#111827]">{mode.title}</h3>
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

                    <div
                      className={`mt-5 overflow-hidden rounded-[26px] border ${
                        active ? "border-[#b7cbff]" : "border-[#dde5f1]"
                      }`}
                    >
                      {mode.value === "wheel" ? (
                        <div className="flex h-[180px] items-center justify-center bg-[radial-gradient(circle_at_top,#2047b833,transparent_58%),linear-gradient(180deg,#0f1728,#1d2941)]">
                          <div className="relative h-32 w-32 rounded-full border-[10px] border-[#f4c14a] bg-[conic-gradient(#f4c14a_0_20%,#1b2842_20_40%,#eef2ff_40_60%,#8795db_60_80%,#f4c14a_80_100%)] shadow-[0_24px_36px_rgba(15,23,40,0.35)]">
                            <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-[180px] items-center justify-center bg-[linear-gradient(180deg,#111827,#1b2842)] p-6">
                          <div className="w-full max-w-[220px] rounded-[28px] border border-white/10 bg-[#eef2ff] p-4 shadow-[0_24px_36px_rgba(15,23,40,0.35)]">
                            <div className="h-20 rounded-[18px] bg-[linear-gradient(135deg,#c9ced8,#eef2ff,#b8bfcb)]" />
                            <div className="mt-4 h-4 w-24 rounded-full bg-[#1b2842]/15" />
                            <div className="mt-2 h-4 w-32 rounded-full bg-[#1b2842]/10" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {isExpertMode ? (
          <section className="okado-card p-6">
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
                disabled={isCampaignLibraryLoading}
                className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              >
                <option value="">Selectionner une campagne</option>
                {campaignOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} - {gameTypeLabel(item.gameType)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => importFromCampaign(importSource)}
                disabled={!importSource || isImportingCampaign || isCampaignLibraryLoading}
                className="rounded-[20px] border border-[#111827] bg-[#111827] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isCampaignLibraryLoading
                   ? "Chargement..."
                  : isImportingCampaign
                     ? "Import..."
                    : "Importer"}
              </button>
            </div>
          </section>
          ) : null}

          <section className="okado-card p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Logo</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Personnalisation du logo
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="text-sm md:col-span-2">
                <span className="mb-3 block text-[#616b7c]">Type de logo</span>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { value: "text", label: "Texte" },
                    { value: "image", label: "Image" },
                    { value: "none", label: "Aucun" },
                  ].map((mode) => {
                    const active = form.logoMode === mode.value;

                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            logoMode: mode.value as EditorState["logoMode"],
                            logoText:
                              mode.value === "text"
                                ? current.logoText?.trim() || merchant.companyName
                                : current.logoText,
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

              {form.logoMode === "text" ? (
                <label className="text-sm md:col-span-2">
                  <span className="mb-2 block text-[#616b7c]">Texte affiché à la place du logo</span>
                  <input
                    value={form.logoText ?? merchant.companyName}
                    onChange={(event) => setField("logoText", event.target.value)}
                    className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                  />
                </label>
              ) : null}

              {form.logoMode === "image" ? (
              <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[24px] border border-dashed border-[#cfd9ea] bg-[#f7f9fc] p-4 text-sm transition hover:border-[#2f6df6] hover:bg-[#eef4ff] md:col-span-2">
                <div>
                  <span className="mb-2 block text-[#616b7c]">Importer un logo</span>
                  <p className="max-w-md text-sm leading-6 text-[#516073]">
                    Déposez un fichier PNG, JPG ou SVG pour remplacer le logo affiché sur la
                    page de jeu.
                  </p>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
                  <div
                    className="flex min-h-[132px] items-center justify-center overflow-hidden rounded-[20px] border border-white/20 p-4"
                    style={{
                      backgroundColor: form.presentation.background.color,
                      backgroundImage:
                        form.presentation.background.mode === "image" &&
                        form.presentation.background.imageUrl
                          ? `linear-gradient(rgba(5,10,21,0.26), rgba(5,10,21,0.42)), url("${form.presentation.background.imageUrl}")`
                          : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {form.logoUrl ? (
                      <Image
                        src={form.logoUrl}
                        alt="Aperçu du logo"
                        width={240}
                        height={140}
                        className="max-h-[110px] max-w-[180px] object-contain"
                      />
                    ) : (
                      <span className="text-sm font-medium text-white/72">Aucun logo affiché</span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <span className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#214ccf] shadow-sm">
                      {form.logoUrl ? "Logo chargé" : "Déposer un logo"}
                    </span>
                    <span className="block rounded-[16px] bg-[#2f6df6] px-4 py-2 text-center text-xs font-semibold text-white shadow-[0_10px_18px_rgba(47,109,246,0.2)]">
                      Choisir un fichier
                    </span>
                    <p className="text-xs leading-5 text-[#64748b]">
                      L&apos;aperçu reprend le fond actuellement sélectionné pour la page de jeu.
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadAsDataUrl(event, (value) =>
                      setForm((current) => ({ ...current, logoUrl: value, logoMode: "image" })),
                    )
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              ) : null}

              {form.logoMode !== "none" ? (
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
              ) : null}

              {form.logoMode !== "none" && isExpertMode ? (
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
              ) : null}

              {form.logoMode !== "none" && isExpertMode ? (
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
              ) : null}
            </div>
          </section>

          <section className="okado-card p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Phrase d&apos;entête</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Style du texte principal
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block text-[#616b7c]">Phrase affichée sur la page de jeu</span>
                <textarea
                  value={form.subtitle}
                  onChange={(event) => setField("subtitle", event.target.value)}
                  rows={3}
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              {isExpertMode ? (
                <>
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
                </>
              ) : null}
            </div>
          </section>

          {isExpertMode ? (
            <section className="okado-card p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Fond</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                Couleur ou image de fond
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5c6577]">
                Gardez une couleur unie ou piochez un visuel dans votre bibliothèque pour habiller
                la page de jeu sans casser le parcours de configuration.
              </p>

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

                {form.presentation.background.mode === "color" ? (
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
                ) : null}

                {form.presentation.background.mode === "image" ? (
                  <div className="rounded-[24px] border border-[#e1e8f2] bg-[#f8fafc] p-4 md:col-span-2">
                    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                      <div className="rounded-[24px] border border-[#e1e8f2] bg-white p-5">
                        <span className="block text-sm font-semibold text-[#182033]">
                          Image de fond
                        </span>
                        <p className="mt-2 text-sm leading-6 text-[#64748b]">
                          Chargez votre propre image ou sélectionnez un visuel existant dans la bibliothèque publique.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <label className="cursor-pointer rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 text-sm font-semibold text-[#182033]">
                            Importer une image
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
                                        mode: "image",
                                        imageUrl: value,
                                      },
                                    },
                                  }))
                                )
                              }
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setBackgroundLibraryDialogOpen(true)}
                            className="rounded-[18px] border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-semibold text-white"
                          >
                            Ouvrir la biblioth&egrave;que
                          </button>
                          <span className="inline-flex rounded-full bg-[#eef4ff] px-3 py-2 text-xs font-semibold text-[#214ccf] shadow-sm">
                        {form.presentation.background.imageUrl ? "Image sélectionnée" : "Aucune image"}
                          </span>
                        </div>
                        {libraryMessage ? (
                          <div className="mt-4 rounded-[18px] border border-[#f3d4d4] bg-[#fff4f4] px-4 py-3 text-sm text-[#9d3131]">
                            {libraryMessage}
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-[24px] border border-[#e1e8f2] bg-white p-4">
                        <span className="mb-3 block text-sm text-[#616b7c]">Aperçu du fond</span>
                        <div
                          className="min-h-[220px] rounded-[20px] border border-white bg-cover bg-center shadow-inner"
                          style={{
                            backgroundColor: form.presentation.background.color,
                            backgroundImage: form.presentation.background.imageUrl
                              ? `url("${form.presentation.background.imageUrl}")`
                              : undefined,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
          {false ? (
          <section className="okado-card p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Affiche A4</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                  Personnalisation de l&apos;affiche
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    presentation: {
                      ...current.presentation,
                      poster: {
                        ...current.presentation.poster,
                        logoUrl: current.logoUrl,
                        logoSizePercent: current.presentation.logo.sizePercent,
                        backgroundImageUrl: current.presentation.background.imageUrl || "",
                        headline: current.subtitle,
                        headlineTextColor: current.presentation.heading.textColor,
                        headlineFontSizePx: current.presentation.heading.fontSizePx,
                        headlineFontFamily: current.presentation.heading.fontFamily,
                        wheel: current.presentation.wheel,
                        footerBackgroundColor: current.accent.signal,
                      },
                    },
                  }))
                }
                className="rounded-[18px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033]"
              >
                Reprendre les réglages publics
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[24px] border border-dashed border-[#cfd9ea] bg-[#f7f9fc] p-4 text-sm transition hover:border-[#2f6df6] hover:bg-[#eef4ff]">
                <div>
                  <span className="mb-2 block text-[#616b7c]">Logo de l&apos;affiche</span>
                  <p className="max-w-md text-sm leading-6 text-[#516073]">
                    Par défaut, le logo de la campagne publique est utilisé.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#214ccf] shadow-sm">
                    {form.presentation.poster.logoUrl ? "Logo chargé" : "Déposer un logo"}
                  </span>
                  <span className="rounded-[16px] bg-[#2f6df6] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_18px_rgba(47,109,246,0.2)]">
                    Choisir un fichier
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadAsDataUrl(event, (value) =>
                      setForm((current) => ({
                        ...current,
                        presentation: {
                          ...current.presentation,
                          poster: {
                            ...current.presentation.poster,
                            logoUrl: value,
                          },
                        },
                      })),
                    )
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Taille du logo affiche (%)</span>
                <input
                  type="number"
                  min={40}
                  max={180}
                  value={form.presentation.poster.logoSizePercent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        poster: {
                          ...current.presentation.poster,
                          logoSizePercent: Number(event.target.value || 100),
                        },
                      },
                    }))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[24px] border border-dashed border-[#cfd9ea] bg-[#f7f9fc] p-4 text-sm transition hover:border-[#2f6df6] hover:bg-[#eef4ff] md:col-span-2">
                <div>
                  <span className="mb-2 block text-[#616b7c]">Image de fond de l&apos;affiche</span>
                  <p className="max-w-md text-sm leading-6 text-[#516073]">
                    Une image par d&eacute;faut est appliqu&eacute;e tant qu&apos;aucun visuel personnalis&eacute; n&apos;est s&eacute;lectionn&eacute;.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#214ccf] shadow-sm">
                    {form.presentation.poster.backgroundImageUrl ? "Image chargée" : "Image par défaut"}
                  </span>
                  <span className="rounded-[16px] bg-[#2f6df6] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_18px_rgba(47,109,246,0.2)]">
                    Choisir un fichier
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadAsDataUrl(event, (value) =>
                      setForm((current) => ({
                        ...current,
                        presentation: {
                          ...current.presentation,
                          poster: {
                            ...current.presentation.poster,
                            backgroundImageUrl: value,
                          },
                        },
                      })),
                    )
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>

              {form.presentation.poster.backgroundImageUrl ? (
                <div className="rounded-[24px] border border-[#e1e8f2] bg-[#f8fafc] p-4 md:col-span-2">
                  <span className="mb-3 block text-sm text-[#616b7c]">Aperçu du fond d&apos;affiche</span>
                  <div
                    className="min-h-[240px] rounded-[20px] border border-white bg-cover bg-center shadow-inner"
                    style={{
                      backgroundImage: `url("${form.presentation.poster.backgroundImageUrl}")`,
                    }}
                  />
                </div>
              ) : null}

              <label className="text-sm md:col-span-2">
                <span className="mb-2 block text-[#616b7c]">Texte sous le logo</span>
                <textarea
                  rows={3}
                  value={form.presentation.poster.headline}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        poster: {
                          ...current.presentation.poster,
                          headline: event.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur du texte</span>
                <input
                  type="color"
                  value={form.presentation.poster.headlineTextColor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        poster: {
                          ...current.presentation.poster,
                          headlineTextColor: event.target.value,
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
                  min={24}
                  max={84}
                  value={form.presentation.poster.headlineFontSizePx}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        poster: {
                          ...current.presentation.poster,
                          headlineFontSizePx: Number(event.target.value || 42),
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
                    const active = form.presentation.poster.headlineFontFamily === font;

                    return (
                      <button
                        key={font}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            presentation: {
                              ...current.presentation,
                              poster: {
                                ...current.presentation.poster,
                                headlineFontFamily: font,
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

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Couleur du bandeau inférieur</span>
                <input
                  type="color"
                  value={form.presentation.poster.footerBackgroundColor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        poster: {
                          ...current.presentation.poster,
                          footerBackgroundColor: event.target.value,
                        },
                      },
                    }))
                  }
                  className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>

              <div className="md:col-span-2">
                <span className="mb-3 block text-sm text-[#616b7c]">Couleurs de la roue sur l&apos;affiche</span>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["rimColor", "Contour"],
                    ["winColor", "Gain 1"],
                    ["alternateWinColor", "Gain 2"],
                    ["loseColor", "Perdu 1"],
                    ["alternateLoseColor", "Perdu 2"],
                  ].map(([key, label]) => (
                    <label key={key} className="text-sm">
                      <span className="mb-2 block text-[#616b7c]">{label}</span>
                      <input
                        type="color"
                        value={
                          form.presentation.poster.wheel[
                            key as keyof typeof form.presentation.poster.wheel
                          ]
                        }
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            presentation: {
                              ...current.presentation,
                              poster: {
                                ...current.presentation.poster,
                                wheel: {
                                  ...current.presentation.poster.wheel,
                                  [key]: event.target.value,
                                },
                              },
                            },
                          }))
                        }
                        className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
          ) : null}

          {isExpertMode ? (
          <section className="okado-card p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Espacement</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Ecartement des blocs
            </h2>

            <div className="mt-6">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Espacement entre les blocs (px)</span>
                <input
                  type="number"
                  min={0}
                  max={72}
                  value={form.presentation.layout.blockSpacingPx}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        layout: {
                          ...current.presentation.layout,
                          blockSpacingPx: Number(event.target.value || 0),
                        },
                      },
                    }))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>
            </div>
          </section>
          ) : null}
          {false ? (

          <section className="okado-card p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Phrase d&apos;entête</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Style du texte principal
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block text-[#616b7c]">Phrase affichée sur la page de jeu</span>
                <textarea
                  value={form.subtitle}
                  onChange={(event) => setField("subtitle", event.target.value)}
                  rows={3}
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

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
          ) : null}

          {form.gameType === "wheel" ? (
            <section className="okado-card p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Roue de la fortune</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                Couleurs de la roue
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-[#616b7c]">Couleur principale</span>
                  <input
                    type="color"
                    value={form.presentation.wheel.loseColor}
                    onChange={(event) => updatePrimaryWheelColor(event.target.value)}
                    className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                  />
                </label>

                {(isExpertMode ? [
                  ["rimColor", "Couleur du contour"],
                  ["winColor", "Couleur du gain"],
                  ["alternateLoseColor", "Couleur perdu clair"],
                ] : []).map(([key, label]) => (
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
            <section className="okado-card p-6">
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

          {form.gameType !== "wheel" ? (
            <section className="okado-card p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Bouton public</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                Personnalisation du bouton
              </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block text-[#616b7c]">Libellé du bouton</span>
                <input
                  value={form.ctaLabel}
                  onChange={(event) => setField("ctaLabel", event.target.value)}
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

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

              <label className="text-sm md:col-span-2">
                <span className="mb-2 block text-[#616b7c]">Taille du texte (px)</span>
                <input
                  type="number"
                  min={12}
                  max={32}
                  value={form.presentation.button.textSizePx}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        button: {
                          ...current.presentation.button,
                          textSizePx: Number(event.target.value || 24),
                        },
                      },
                    }))
                  }
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>

              <label className="flex items-center gap-3 rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 text-sm text-[#182033] md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.presentation.button.isBold}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        button: {
                          ...current.presentation.button,
                          isBold: event.target.checked,
                        },
                      },
                    }))
                  }
                />
                <span className="font-semibold">Texte du bouton en gras</span>
              </label>
            </div>
            </section>
          ) : null}

          <section className="okado-card p-6">
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
                <CampaignPrizeRow
                  key={prize.id}
                  prize={prize}
                  onUpdate={updatePrize}
                  onRemove={removePrize}
                          onOpenConditions={(prizeId) => setEditingPrizeConditionsId(prizeId ?? null)}
                />
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
          <section className="pointer-events-none okado-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Prévisualisation mobile
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">Rendu public</h2>
              </div>
              {form.id ? (
                <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
                  <a
                    href={`/api/campaigns/${form.id}/qr`}
                    className="inline-flex h-10 items-center rounded-[8px] border border-[#d7e0ed] bg-white px-4 text-sm font-semibold text-[#182033] transition hover:bg-linen-canvas"
                  >
                    QR
                  </a>
                  <Link
                    href={`/campaigns/${form.id}/poster`}
                    prefetch={false}
                    className="inline-flex h-10 items-center rounded-[8px] border border-[#d7e0ed] bg-white px-4 text-sm font-semibold text-[#182033] transition hover:bg-linen-canvas"
                  >
                    Voir l&apos;affiche
                  </Link>
                  <Link
                    href={`/campaign/${form.id}`}
                    prefetch={false}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center rounded-[8px] border border-[#111827] bg-[#111827] px-4 text-sm font-semibold !text-white"
                  >
                    Voir la campagne
                  </Link>
                </div>
              ) : null}
            </div>

            <CampaignLivePreview merchant={merchant} preview={deferredPreview} />
          </section>
        </div>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4 xl:hidden">
        <div className="pointer-events-auto mx-auto max-w-[720px] rounded-[28px] border border-[#dbe4f0] bg-white/96 p-3 shadow-[0_18px_44px_rgba(122,136,166,0.16)] backdrop-blur">
          <div className="grid gap-3 sm:grid-cols-2">
            {savedCampaignId ? (
              <>
                <Link
                  href={`/campaign/${savedCampaignId}`}
                  prefetch={false}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-[20px] border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-semibold !text-white"
                >
                  Voir la campagne
                </Link>
                <Link
                  href={`/campaigns/${savedCampaignId}/poster`}
                  prefetch={false}
                  className="inline-flex items-center justify-center rounded-[20px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033]"
                >
                  Voir l&apos;affiche
                </Link>
              </>
            ) : null}
            <button
              type="button"
              onClick={saveCampaign}
              disabled={isSaving}
              className={`rounded-[20px] border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 ${
                savedCampaignId ? "sm:col-span-2" : "w-full"
              }`}
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
      <PrizeConditionsDialog
        open={Boolean(editingPrize)}
        prizeLabel={editingPrize?.label ?? ""}
        value={editingPrize?.usageConditions ?? ""}
        onChange={(nextValue) => {
          if (editingPrize?.id) {
            updatePrize(editingPrize.id, { usageConditions: nextValue });
          }
        }}
        onClose={() => setEditingPrizeConditionsId(null)}
      />
      <BackgroundLibraryDialog
        open={backgroundLibraryDialogOpen}
        onClose={() => setBackgroundLibraryDialogOpen(false)}
        items={backgroundLibrary}
        isLoading={isLibraryLoading}
        error={libraryMessage}
        selectedImageUrl={form.presentation.background.imageUrl ?? ""}
        onSelect={selectBackgroundImage}
      />
      <SaveFeedbackDialog
        open={saveDialogOpen}
        title="Campagne enregistrée"
        description="Vos modifications ont bien été prises en compte."
        onClose={() => {
          setSaveDialogOpen(false);

          if (!initialCampaign && savedCampaignId) {
            router.replace(`/campaigns/${savedCampaignId}/edit`);
          }
        }}
      />
    </div>
  );
}
