Exit code: 0
Wall time: 0.3 seconds
Total output lines: 4274
Output:
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  BadgePercent,
  Coffee,
  Download,
  Gift,
  Plus,
  CirclePlus,
  Soup,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  QrCode,
  SquareArrowOutUpRight,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BrandMark } from "@/components/brand-mark";
import { CampaignEmailPreview } from "@/components/merchant/campaign-email-preview";
import { CampaignPreviewQrDialog } from "@/components/merchant/campaign-preview-qr";
import { CampaignLivePreview as SharedCampaignLivePreview } from "@/components/merchant/campaign-live-preview";
import { SocialChannelIcon } from "@/components/merchant/social-channel-icon";
import { Switch } from "@/components/ui/switch";
import { ValidationDialog } from "@/components/ui/validation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  actionKindCta,
  actionKindLabel,
  buttonSizeLabel,
  textFontLabel,
} from "@/lib/format";
import {
  createCampaignEmailDefaults,
  normalizeCampaignEmailSettings,
} from "@/lib/email-settings";
import { createPosterSettingsDefaults, normalizePosterSettings } from "@/lib/poster-utils";
import {
  createDefaultPosterSettings,
  createDefaultWheelSettings,
  DEFAULT_SCRATCH_PRIMARY_COLOR,
  DEFAULT_SCRATCH_SUBTITLE,
  DEFAULT_WHEEL_PRIMARY_COLOR,
  DEFAULT_WHEEL_SUBTITLE,
  campaignLogoTextSizePx,
  clampCampaignLogoSizePercent,
  deriveLighterHex,
  limitCampaignSubtitleLines,
  normalizeScratchAccent,
  resolveScratchAccent,
} from "@/lib/campaign-defaults";
import { fluidType } from "@/lib/responsive";
import { getPrizeValidationMessages } from "@/lib/prize-validation";
import { buildWheelVisualSegments, WheelVisualSegment } from "@/lib/wheel-segments";
import { isRestaurantIndustry } from "@/lib/merchant-options";
import {
  ActionKind,
  BackgroundLibraryAsset,
  CampaignAction,
  CampaignPerformance,
  CampaignSetupInput,
  GamePageTemplateId,
  GameType,
  Merchant,
  PrizeSuggestion,
  TextFont,
} from "@/lib/types";

const WheelOfFortune = dynamic(
  () => import("@/components/public/wheel-of-fortune").then((mod) => mod.WheelOfFortune),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-[32px] bg-white/70 text-sm text-[#7b8496]">
        Chargement de la prÃ©visualisation...
      </div>
    ),
  },
);

const ImmersiveWheel = dynamic(
  () => import("@/components/public/immersive-wheel").then((mod) => mod.ImmersiveWheel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-[32px] bg-white/70 text-sm text-[#7b8496]">
        Chargement de la prÃ©visualisation...
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
        Chargement de la prÃ©visualisation...
      </div>
    ),
  },
);

const ImmersiveScratchTicket = dynamic(
  () =>
    import("@/components/public/immersive-scratch-ticket").then(
      (mod) => mod.ImmersiveScratchTicket,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] w-full items-center justify-center rounded-[28px] bg-white/70 text-sm text-[#7b8496]">
        Chargement du ticket...
      </div>
    ),
  },
);

type CampaignEditorProps = {
  merchant: Merchant;
  initialCampaign?: CampaignPerformance | null;
  deferInlineAssets?: boolean;
};

type EditorPrize = CampaignSetupInput["prizes"][number] & {
  /** Current stock, maintained separately from the campaign's initial quantity. */
  remainingQuantity?: number | null;
};

type EditorState = Omit<
  CampaignSetupInput,
  "goalType" | "successMetric" | "targetUrl" | "prizes"
> & {
  prizes: EditorPrize[];
};

type PreviewSegment = WheelVisualSegment;

export type CampaignEditorPreviewModel = {
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
  logoTextSizePx: number;
  logoUrl: string;
  logoText: string;
  headingAlignmentClass: string;
  headingFontClass: string;
  headingTextColor: string;
  headingFontSizePx: number;
  headingFontWeight: number;
  subtitle: string;
  blockSpacingPx: number;
  gamePageTemplateId: GamePageTemplateId;
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

const textFontOptions: TextFont[] = [
  "anton",
  "display",
  "serif",
  "cormorant",
  "fredoka",
  "inter",
  "bebas",
];
const headingFontWeightOptions = [400, 500, 600, 700, 800, 900];
const wheelPageTemplateOptions: Array<{
  value: GamePageTemplateId;
  title: string;
  description: string;
}> = [
  {
    value: "classic",
    title: "Classique",
    description: "Un rendu sobre, centrÃ© sur votre logo, votre message et la roue.",
  },
  {
    value: "restaurant-pop",
    title: "Visuel pop",
    description: "Un univers plus Ã©vÃ©nementiel avec formes, contraste et roue faÃ§on jeu concours.",
  },
  {
    value: "cosmic-orbit",
    title: "Orbit nÃ©on",
    description: "Un univers nocturne et lumineux, inspirÃ© des bornes de jeu contemporaines.",
  },
  {
    value: "sunburst-festival",
    title: "Soleil pop",
    description: "Un graphisme solaire, joyeux et trÃ¨s lisible sur mobile comme sur tablette.",
  },
];

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
      "Un moment fort en caisse, sur borne ou sur affichage mobile plein Ã©cran pour gÃ©nÃ©rer du trafic en point de vente.",
  },
  {
    value: "scratch",
    eyebrow: "RÃ©vÃ©lation immÃ©diate",
    title: "Ticket Ã  gratter",
    description: "Un format ludique et tactile pour rÃ©vÃ©ler un gain instantanÃ© sur mobile, borne ou tablette.",
  },
];

const buttonSizeMap = {
  sm: "px-4 py-3 text-sm",
  md: "px-5 py-4 text-base",
  lg: "px-6 py-5 text-lg",
};
const scratchPageTemplateOptions: Array<{
  value: GamePageTemplateId;
  title: string;
  description: string;
}> = [
  {
    value: "scratch-vault",
    title: "Coffre nÃ©on",
    description: "Un univers nocturne et lumineux, avec une illustration de coffre-fort avant le grattage.",
  },
  {
    value: "scratch-coral",
    title: "Corail joyeux",
    description: "Une carte claire avec un espace de rÃ©vÃ©lation orange, inspirÃ©e des tickets cadeaux.",
  },
  {
    value: "scratch-lilac",
    title: "Cadeau lilas",
    description: "Un univers lilas doux, avec une illustration cadeau claire et contrastÃ©e. La couleur principale sÃ©lectionnÃ©e nâ€™est pas utilisÃ©e.",
  },
  {
    value: "scratch-sunburst",
    title: "Rayons soleil",
    description: "Un ticket jaune Ã©clatant avec des rayons graphiques et une rÃ©vÃ©lation trÃ¨s visible.",
  },
  {
    value: "scratch-confetti",
    title: "Carte confettis",
    description: "Une carte solaire et festive, pensÃ©e pour une interaction tactile trÃ¨s immÃ©diate. La couleur principale sÃ©lectionnÃ©e nâ€™est pas utilisÃ©e.",
  },
];

const wheelDefaultSubtitle = DEFAULT_WHEEL_SUBTITLE;
const scratchDefaultSubtitle = DEFAULT_SCRATCH_SUBTITLE;

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

function withHexAlpha(color: string | undefined, alpha: string) {
  const normalized = color?.trim();

  if (!normalized) {
    return `#5b27d9${alpha}`;
  }

  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return `${normalized}${alpha}`;
  }

  return normalized;
}

function getRestaurantPopTextLines(text: string) {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Keep French punctuation with the preceding word so it cannot become a lone line.
  const lines = rawLines.reduce<string[]>((normalizedLines, line) => {
    if (/^[!?.,;:]+$/.test(line) && normalizedLines.length > 0) {
      const previousLineIndex = normalizedLines.length - 1;
      normalizedLines[previousLineIndex] = `${normalizedLines[previousLineIndex]}\u00a0${line}`;
      return normalizedLines;
    }

    normalizedLines.push(line);
    return normalizedLines;
  }, []);

  if (lines.length !== 1) {
    return lines;
  }

  const words = lines[0].split(/\s+/).filter(Boolean);

  if (words.length < 3) {
    return lines;
  }

  const joinIndex = words.findIndex((word) => /^(pour|et|puis|avec)$/i.test(word));

  if (joinIndex > 0 && joinIndex < words.length - 1) {
    const secondLine = words.slice(joinIndex).join(" ").replace(/\s+([!?.,;:])/g, "\u00a0$1");
    return [words.slice(0, joinIndex).join(" "), secondLine];
  }

  const lastWord = words.at(-1)?.replace(/\s+([!?.,;:])/g, "\u00a0$1") ?? "";
  return [words.slice(0, -1).join(" "), lastWord];
}

function buildRestaurantPopHeadingLines(text: string) {
  return getRestaurantPopTextLines(text)
    .map((line, lineIndex) => {
      const parts = line.split(/(\s+)/).map((part) => ({
        text: part,
        secondary: lineIndex === 1,
      }));

      return parts;
    });
}

function readableCampaignSaveError(message: string | undefined) {
  if (!message) {
    return "Impossible d'enregistrer l'animation. VÃ©rifiez les champs obligatoires puis rÃ©essayez.";
  }

  if (message.toLowerCase().includes("origine de requ")) {
    return "Votre session de sÃ©curitÃ© n'est plus valide ou la page a Ã©tÃ© ouverte depuis une adresse non autorisÃ©e. Rechargez la page depuis votre espace Okado puis rÃ©essayez.";
  }

  if (message.toLowerCase().includes("bloqu")) {
    return "Votre session de sÃ©curitÃ© n'est plus valide ou la page a Ã©tÃ© ouverte depuis une adresse non autorisÃ©e. Rechargez la page depuis votre espace Okado puis rÃ©essayez.";
  }

  if (message.toLowerCase().includes("dotation") || message.toLowerCase().includes("lot")) {
    return message.startsWith("Impossible")
      ? message
      : `Impossible d'enregistrer : ${message}`;
  }

  return message;
}

function defaultActionUrl(merchant: Merchant, kind: ActionKind) {
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
    case "crm":
      return normalizeUrl(merchant.websiteUrl ?? "") || "https://";
    case "custom":
      return normalizeUrl(merchant.customLinkUrl ?? "") || "https://";
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
    title: `Animation ${isRestaurantIndustry(merchant.industry) ? "restaurant" : "commerce"}`,
    subtitle: wheelDefaultSubtitle,
    emailCaptureEnabled: false,
    gameType: "wheel",
    ctaLabel: "Je participe",
    isActive: true,
    logoMode: "text",
    logoText: merchant.companyName || merchant.logoText,
    logoUrl: undefined,
    accent: {
      ink: "#111827",
      paper: "#eef2ff",
      signal: "#f4c14a",
    },
    presentation: {
      logo: {
        sizePercent: 100,
        marginBottomPx: 40,
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
        templateId: "classic",
      },
      wheel: createDefaultWheelSettings(),
      poster: createDefaultPosterSettings(merchant),
      email: createCampaignEmailDefaults(merchant),
    },
    actions: createDefaultActions(merchant),
    rewardRules: {
      rewardExpiryMinutes: 20,
      purchaseRequired: false,
      availableAfterHours: 24,
      availabilityDurationDays: 30,
      participationIntervalDays: 1,
      isWinningEveryTime: false,
    },
    prizes: [],
  };
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
              SÃ©lectionnez une image de fond
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
              Chargement de la bibliothÃ¨queâ€¦
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
  purchaseRequired,
  value,
  onPurchaseRequiredChange,
  onChange,
  onClose,
}: {
  open: boolean;
  prizeLabel: string;
  purchaseRequired: boolean;
  value: string;
  onPurchaseRequiredChange: (value: boolean) => void;
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
            <p cla…34387 tokens truncated…).map((size) => {
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
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
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
                  Lots, validitÃ© et conditions
                </h2>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                {prizeSuggestions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setPrizeSuggestionsOpen(true)}
                    className="inline-flex items-center gap-2 rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 text-sm font-semibold text-[#182033] transition hover:bg-[#f7f9fc]"
                  >
                    <Sparkles className="h-4 w-4 text-[#2f6df6]" aria-hidden="true" />
                    SuggÃ©rer des lots
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={addPrize}
                  className="rounded-[20px] bg-[#111827] px-4 py-3 text-sm font-semibold text-white"
                >
                  Ajouter un lot
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="flex min-h-[92px] cursor-pointer items-start gap-3 rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-4 text-sm transition hover:border-[#b8c8e4]">
                <input
                  type="checkbox"
                  checked={form.rewardRules.availableAfterHours > 0}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rewardRules: {
                        ...current.rewardRules,
                        availableAfterHours: event.target.checked ? 24 : 0,
                      },
                    }))
                  }
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-[#cbd5e1] text-[#2f6df6] focus:ring-[#2f6df6]/20"
                />
                <span>
                  <span className="block font-semibold text-[#182033]">
                    Lot disponible lors d&apos;une prochaine visite
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#7b8496]">
                    Le lot sera disponible 24 h aprÃ¨s la participation, Ã  partir du lendemain.
                  </span>
                </span>
              </label>

              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">DurÃ©e de retrait (jours)</span>
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
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                />
              </label>

              {isExpertMode ? (
                <label className="text-sm">
                  <span className="mb-2 block text-[#616b7c]">
                    DÃ©lai entre deux participations (jours)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={form.rewardRules.participationIntervalDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rewardRules: {
                          ...current.rewardRules,
                          participationIntervalDays: Math.max(1, Number(event.target.value || 1)),
                        },
                      }))
                    }
                    className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                  />
                </label>
              ) : null}

              <div className="space-y-3 rounded-[20px] border border-[#d7e0ed] bg-white p-4 text-sm text-[#182033]">
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

            <div className={`mt-6 hidden gap-3 rounded-[22px] bg-[#f7f9fc] px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-[#7b8496] xl:grid ${
              initialCampaign
                ? "grid-cols-[minmax(180px,1.35fr)_minmax(100px,.7fr)_minmax(110px,.75fr)_minmax(130px,.9fr)_minmax(120px,.85fr)_minmax(120px,1.15fr)_56px]"
                : "grid-cols-[minmax(180px,1.5fr)_minmax(100px,.7fr)_minmax(130px,.9fr)_minmax(120px,.85fr)_minmax(120px,1.15fr)_56px]"
            }`}>
              <span>Dotation</span>
              <span>Stock initial</span>
              {initialCampaign ? <span>Stock disponible</span> : null}
              <span>ProbabilitÃ© de gain (%)</span>
              <span>CoÃ»t unitaire</span>
              <span />
            </div>

            <div className="mt-4 space-y-4">
              {form.prizes.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#cfd9ea] bg-white px-5 py-6 text-sm leading-6 text-[#5c6577]">
                  Aucun lot n&apos;est encore configur&eacute;. Ajoutez au moins un lot pour pouvoir
                  enregistrer l&apos;animation.
                </div>
              ) : null}
              {form.prizes.map((prize) => (
                <CampaignPrizeRow
                  key={prize.id}
                  prize={prize}
                  isExistingCampaign={Boolean(initialCampaign)}
                  onUpdate={updatePrize}
                  onRemove={removePrize}
                          onOpenConditions={(prizeId) => setEditingPrizeConditionsId(prizeId ?? null)}
                />
              ))}
            </div>

            <div className="mt-3 hidden grid-cols-[minmax(180px,1.5fr)_minmax(100px,.7fr)_minmax(130px,.9fr)_minmax(120px,.85fr)_minmax(120px,1.15fr)_56px] gap-3 xl:grid">
              <span />
              <span />
              <div
                className={`rounded-[16px] border px-3 py-2 text-center text-sm font-semibold ${
                  totalPrizeProbability > 100
                    ? "border-[#fecaca] bg-[#fff1f2] text-[#be123c]"
                    : totalPrizeProbability === 100
                      ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]"
                      : "border-[#dbe4f0] bg-[#f7f9fc] text-[#64748b]"
                }`}
              >
                Total : {totalPrizeProbability} %
              </div>
              <span />
              <span />
              <span />
            </div>

            <div
              className={`mt-4 rounded-[16px] border px-4 py-3 text-sm font-semibold xl:hidden ${
                totalPrizeProbability > 100
                  ? "border-[#fecaca] bg-[#fff1f2] text-[#be123c]"
                  : totalPrizeProbability === 100
                    ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]"
                    : "border-[#dbe4f0] bg-[#f7f9fc] text-[#64748b]"
              }`}
            >
              Total des probabilitÃ©s de gain : {totalPrizeProbability} %
            </div>

            {prizeValidationMessages.length > 0 ? (
              <div
                role="alert"
                aria-live="polite"
                className="mt-4 rounded-[18px] border border-[#f3c8c8] bg-[#fff7f7] px-4 py-4 text-sm text-[#9f1239]"
              >
                <p className="font-semibold text-[#861c35]">
                  VÃ©rifiez la dotation avant l&apos;enregistrement
                </p>
                <ul className="mt-2 space-y-1.5 leading-6">
                  {prizeValidationMessages.map((validationMessage) => (
                    <li key={validationMessage} className="flex gap-2">
                      <span aria-hidden="true">â€¢</span>
                      <span>{validationMessage}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {form.id ? <CampaignEmailPreview merchant={merchant} form={form} /> : null}

          {message ? (
            <section
              className={`rounded-[24px] border px-5 py-4 text-sm shadow-[0_18px_44px_rgba(122,136,166,0.1)] ${
                messageTone === "error"
                  ? "border-[#fecaca] bg-[#fff1f2] text-[#9f1239]"
                  : "border-[#dbe4f0] bg-white text-[#182033]"
              }`}
            >
              <div className="font-semibold">
                {messageTone === "error" ? "Enregistrement impossible" : "Information"}
              </div>
              <p className="mt-1 leading-6">{message}</p>
            </section>
          ) : null}
        </div>

        <div
          className="space-y-6 xl:sticky xl:self-start"
          style={{ top: showStickyActions ? "76px" : "24px" }}
        >
          <section className="pointer-events-none okado-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  PrÃ©visualisation mobile
                </p>
                <h2 className="okado-section-title mt-2">Rendu public</h2>
              </div>
              {form.id ? (
                <div className="okado-action-row pointer-events-auto flex flex-wrap justify-end gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="okado-secondary-action gap-2 px-4"
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
                        <a
                          href={`/api/campaigns/${form.id}/qr`}
                          download
                          title="TÃ©lÃ©charger le QR code de production"
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                          <span>TÃ©lÃ©charger le QR code</span>
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2 rounded-[10px] px-3 py-2.5"
                        onSelect={() => setQrPreviewOpen(true)}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        <span>PrÃ©visualisation</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link
                    href={`/campaigns/${form.id}/poster`}
                    prefetch={false}
                    className="okado-secondary-action px-4"
                  >
                    Affiche
                  </Link>
                  <Link
                    href={`/campaign/${form.id}?preview=1`}
                    prefetch={false}
                    target="_blank"
                    rel="noreferrer"
                    className="okado-primary-action px-4"
                  >
                    PrÃ©visualiser
                  </Link>
                </div>
              ) : null}
            </div>

            <SharedCampaignLivePreview merchant={merchant} preview={deferredPreview} compact />

          </section>
        </div>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4 xl:hidden">
        <div className="pointer-events-auto mx-auto max-w-[720px] rounded-[8px] border border-border bg-white/96 p-3 shadow-product-card backdrop-blur">
          <div className="grid gap-3 sm:grid-cols-2">
            {savedCampaignId ? (
              <>
                <Link
                  href={`/campaign/${savedCampaignId}?preview=1`}
                  prefetch={false}
                  target="_blank"
                  className="okado-primary-action px-4"
                >
                  PrÃ©visualiser
                </Link>
                <Link
                  href={`/campaigns/${savedCampaignId}/poster`}
                  prefetch={false}
                  className="okado-secondary-action px-4"
                >
                  Affiche
                </Link>
              </>
            ) : null}
            <button
              type="button"
              onClick={saveCampaign}
              disabled={isSaving}
              className={`okado-filled-action px-4 disabled:cursor-not-allowed disabled:opacity-70 ${
                savedCampaignId ? "sm:col-span-2" : "w-full"
              }`}
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
      {form.id ? (
        <CampaignPreviewQrDialog
          open={qrPreviewOpen}
          campaignId={form.id}
          onClose={() => setQrPreviewOpen(false)}
        />
      ) : null}
      <PrizeConditionsDialog
        open={Boolean(editingPrize)}
        prizeLabel={editingPrize?.label ?? ""}
        purchaseRequired={Boolean(editingPrize?.purchaseRequired)}
        value={editingPrize?.usageConditions ?? ""}
        onPurchaseRequiredChange={(nextValue) => {
          if (editingPrize?.id) {
            updatePrize(editingPrize.id, { purchaseRequired: nextValue });
          }
        }}
        onChange={(nextValue) => {
          if (editingPrize?.id) {
            updatePrize(editingPrize.id, { usageConditions: nextValue });
          }
        }}
        onClose={() => setEditingPrizeConditionsId(null)}
      />
      <PrizeSuggestionDialog
        open={prizeSuggestionsOpen}
        suggestions={prizeSuggestions}
        industry={merchant.industry}
        remainingProbability={remainingPrizeProbability}
        onAdd={addSuggestedPrize}
        onClose={() => setPrizeSuggestionsOpen(false)}
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
      <ValidationDialog
        open={saveDialogOpen}
        title={saveDialogTitle}
        description={saveDialogDescription}
        tone={saveDialogTone}
        ctaLabel="Continuer"
        onClose={() => {
          setSaveDialogOpen(false);

          if (saveDialogTone !== "error" && !initialCampaign && savedCampaignId) {
            router.replace(`/campaigns/${savedCampaignId}/edit`);
          }
        }}
      />
    </div>
  );
}

