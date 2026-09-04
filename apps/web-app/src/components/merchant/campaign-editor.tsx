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
  useState,
} from "react";

import { BrandMark } from "@/components/brand-mark";
import { CocoricoPromoText } from "@/components/public/cocorico-promo-text";
import { CampaignEmailPreview } from "@/components/merchant/campaign-email-preview";
import { CampaignPreviewQrDialog } from "@/components/merchant/campaign-preview-qr";
import { CampaignLivePreview as SharedCampaignLivePreview } from "@/components/merchant/campaign-live-preview";
import { SocialChannelIcon } from "@/components/merchant/social-channel-icon";
import { Switch } from "@/components/ui/switch";
import { DialogShell } from "@/components/ui/dialog";
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
  textFontClass,
  textFontFamily,
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
  DEFAULT_COCORICO_PRIMARY_COLOR,
  DEFAULT_CLASSIC_POP_PRIMARY_COLOR,
  resolveCocoricoPrimaryColor,
  resolveCocoricoBackgroundColor,
  DEFAULT_WHEEL_SUBTITLE,
  MAX_CAMPAIGN_SUBTITLE_LENGTH,
  campaignLogoTextSizePx,
  clampCampaignLogoSizePercent,
  deriveLighterHex,
  limitCampaignSubtitleLines,
  normalizeScratchAccent,
  resolveScratchAccent,
  resolvePromoStrokeColor,
  isClassicPopWheelTemplate,
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
        Chargement de la prévisualisation...
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
        Chargement de la prévisualisation...
      </div>
    ),
  },
);

const CocoricoWheel = dynamic(
  () => import("@/components/public/cocorico-wheel").then((mod) => mod.CocoricoWheel),
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
    fontFamily: string;
  };
  logoMode: EditorState["logoMode"];
  logoAlignmentClass: string;
  logoBottomSpacingPx: number;
  logoWidthPx: number;
  logoTextSizePx: number;
  logoUrl: string;
  logoText: string;
  logoTextColor: string;
  headingAlignmentClass: string;
  headingFontClass: string;
  headingFontFamily: TextFont;
  headingTextColor: string;
  headingFontSizePx: number;
  headingFontWeight: number;
  subtitle: string;
  blockSpacingPx: number;
  gamePageTemplateId: GamePageTemplateId;
  gameType: GameType;
  accent: EditorState["accent"];
  wheelStyle: EditorState["presentation"]["wheel"];
  cocoricoPrimaryColor: string;
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
  "roboto",
  "geogrotesque",
  "comfortaa",
  "days-one",
  "delius-unicase",
  "lato",
  "lobster",
  "pacifico",
  "syncopate",
  "fredoka",
];
const cocoricoTextFontOptions: TextFont[] = ["roboto", "days-one", "lato", "fredoka"];
const wheelPageTemplateOptions: Array<{
  value: GamePageTemplateId;
  title: string;
  description: string;
}> = [
  {
    value: "classic",
    title: "Classique",
    description: "Un rendu sobre, centré sur votre logo, votre message et la roue.",
  },
  {
    value: "restaurant-pop",
    title: "Visuel pop",
    description: "Un univers plus événementiel avec formes, contraste et roue façon jeu concours.",
  },
  {
    value: "cocorico-wheel",
    title: "Cocorico",
    description: "Une roue promotionnelle bleue et blanche avec pictogrammes cadeaux et message très visible.",
  },
  {
    value: "cosmic-orbit",
    title: "Orbit néon",
    description: "Un univers nocturne et lumineux, inspiré des bornes de jeu contemporaines.",
  },
  {
    value: "sunburst-festival",
    title: "Soleil pop",
    description: "Un graphisme solaire, joyeux et très lisible sur mobile comme sur tablette.",
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
      "Un moment fort en caisse, sur borne ou sur affichage mobile plein écran pour générer du trafic en point de vente.",
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
const scratchPageTemplateOptions: Array<{
  value: GamePageTemplateId;
  title: string;
  description: string;
}> = [
  {
    value: "scratch-vault",
    title: "Coffre néon",
    description: "Un univers nocturne et lumineux, avec une illustration de coffre-fort avant le grattage.",
  },
  {
    value: "scratch-coral",
    title: "Corail joyeux",
    description: "Une carte claire avec un espace de révélation orange, inspirée des tickets cadeaux.",
  },
  {
    value: "scratch-lilac",
    title: "Cadeau lilas",
    description: "Un univers lilas doux, avec une illustration cadeau claire et contrastée. La couleur principale sélectionnée n’est pas utilisée.",
  },
  {
    value: "scratch-sunburst",
    title: "Rayons soleil",
    description: "Un ticket jaune éclatant avec des rayons graphiques et une révélation très visible.",
  },
  {
    value: "scratch-confetti",
    title: "Carte confettis",
    description: "Une carte solaire et festive, pensée pour une interaction tactile très immédiate. La couleur principale sélectionnée n’est pas utilisée.",
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

function readableCampaignSaveError(message: string | undefined) {
  if (!message) {
    return "Impossible d'enregistrer l'animation. Vérifiez les champs obligatoires puis réessayez.";
  }

  if (message.toLowerCase().includes("origine de requ")) {
    return "Votre session de sécurité n'est plus valide ou la page a été ouverte depuis une adresse non autorisée. Rechargez la page depuis votre espace Okado puis réessayez.";
  }

  if (message.toLowerCase().includes("bloqu")) {
    return "Votre session de sécurité n'est plus valide ou la page a été ouverte depuis une adresse non autorisée. Rechargez la page depuis votre espace Okado puis réessayez.";
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
        fontFamily: "fredoka",
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
      wheel: createDefaultWheelSettings(DEFAULT_CLASSIC_POP_PRIMARY_COLOR),
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
    <DialogShell open={open} onClose={onClose} labelledBy="background-library-title" className="max-w-5xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
      <p className="okado-label">Biblioth&egrave;que d&apos;images</p>
            <h2 id="background-library-title" className="mt-2 text-2xl font-semibold text-carbon">
              Sélectionnez une image de fond
            </h2>
            <p className="mt-2 text-sm leading-6 text-ash">
              Choisissez un visuel existant de la plateforme pour l&apos;utiliser sur la page de jeu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="okado-secondary-action okado-compact-action px-4 text-sm"
          >
            Fermer
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-[var(--okado-radius-control)] border border-coral-alert/30 bg-coral-alert/10 px-4 py-3 text-sm text-coral-alert">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid max-h-[68vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="rounded-[var(--okado-radius-control)] border border-border bg-soft-white px-4 py-6 text-sm text-ash sm:col-span-2 lg:col-span-3">
              Chargement de la bibliothèque…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[var(--okado-radius-control)] border border-border bg-soft-white px-4 py-6 text-sm text-ash sm:col-span-2 lg:col-span-3">
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
                  className={`overflow-hidden rounded-[var(--okado-radius-control)] border text-left transition ${
                    active
                       ? "border-aubergine bg-purple-haze ring-2 ring-lavender-mist/70"
                      : "border-border bg-soft-white hover:border-aubergine hover:bg-white"
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
    </DialogShell>
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
    <DialogShell open={open} onClose={onClose} labelledBy="prize-conditions-title" className="max-w-[560px] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="okado-label">Conditions</p>
            <h2 id="prize-conditions-title" className="mt-2 text-2xl font-semibold text-carbon">
              Conditions d&apos;utilisation
            </h2>
            <p className="mt-2 text-sm leading-6 text-ash">
              Renseignez les précisions d&apos;usage de ce lot. Elles seront visibles lors du gain et reprises dans l&apos;e-mail envoyé au client.
              <span className="font-semibold text-carbon">{prizeLabel || "sans nom"}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="okado-secondary-action okado-compact-action px-4 text-sm"
          >
            Fermer
          </button>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[16px] border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412]">
          <input
            type="checkbox"
            checked={purchaseRequired}
            onChange={(event) => onPurchaseRequiredChange(event.target.checked)}
            className="mt-1 h-4 w-4 cursor-pointer accent-aubergine"
          />
          <span>
            <span className="block font-semibold">Achat requis pour le retrait</span>
              <span className="mt-1 block text-xs leading-5 text-[#c2410c]">
              Cette condition s&apos;applique uniquement à ce lot.
            </span>
          </span>
        </label>

        <label className="mt-6 block text-sm">
          <span className="mb-2 block text-charcoal">Texte affiché au client</span>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={7}
            placeholder="Ex. valable hors menu midi, une seule utilisation par table, hors jours fériés..."
            className="w-full rounded-[var(--okado-radius-control)] border border-border bg-white px-4 py-4 outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/15"
          />
        </label>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="okado-filled-action px-5 text-sm"
          >
            Enregistrer
          </button>
        </div>
    </DialogShell>
  );
}

function createDefaultActions(merchant: Merchant): CampaignAction[] {
  const actions = [createDefaultAction(merchant)];

  if (merchant.instagramUrl?.trim()) {
    actions.push({
      id: createActionId(),
      kind: "instagram",
      label: actionKindCta("instagram"),
      url: merchant.instagramUrl,
    });
  }

  if (merchant.facebookUrl?.trim()) {
    actions.push({
      id: createActionId(),
      kind: "facebook",
      label: actionKindCta("facebook"),
      url: merchant.facebookUrl,
    });
  }

  return actions;
}

function PrizeSuggestionDialog({
  open,
  suggestions,
  industry,
  remainingProbability,
  onAdd,
  onClose,
}: {
  open: boolean;
  suggestions: PrizeSuggestion[];
  industry?: string;
  remainingProbability: number;
  onAdd: (suggestion: PrizeSuggestion) => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <DialogShell open={open} onClose={onClose} labelledBy="prize-suggestions-title" className="max-w-5xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="okado-label">Suggestions de lots</p>
            <h2 id="prize-suggestions-title" className="mt-2 text-2xl font-semibold text-carbon">
              Dotations suggérées pour {industry || "votre secteur"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ash">
              Ajoutez un lot prêt à paramétrer, puis ajustez son stock, ses conditions et sa probabilité.
              Il reste {remainingProbability} % de probabilité disponible.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="okado-secondary-action okado-compact-action px-4 text-sm"
          >
            Fermer
          </button>
        </div>

        <div className="mt-6 grid max-h-[66vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((suggestion) => {
            const iconStyle = getPrizeSuggestionIcon(suggestion.icon);
            const Icon = iconStyle.Icon;
            const canAdd = suggestion.probability <= remainingProbability;

            return (
              <article
                key={suggestion.id}
                className="flex min-h-[238px] flex-col rounded-[var(--okado-radius-control)] border border-border bg-white p-5"
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-[4px] ${iconStyle.className}`}>
                  <Icon className="h-8 w-8" aria-hidden="true" />
                </div>
                <div className="mt-5 flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-carbon">{suggestion.label}</h3>
                  <span className="okado-status-badge okado-status-muted">
                    {suggestion.probability} %
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ash">{suggestion.description}</p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <span className="text-xs font-medium text-mid-gray">
                    Coût estimé : {suggestion.estimatedUnitCost.toLocaleString("fr-FR")} €
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdd(suggestion)}
                    disabled={!canAdd}
                    title={
                      canAdd
                        ? "Ajouter ce lot"
                        : "Ajustez les probabilités avant d'ajouter ce lot"
                    }
                    className="okado-filled-action okado-compact-action gap-2 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Ajouter
                  </button>
                </div>
              </article>
            );
          })}
        </div>
    </DialogShell>
  );
}

function getPrizeSuggestionIcon(icon: string) {
  const icons = {
    coffee: { Icon: Coffee, className: "bg-purple-haze text-charcoal" },
    dessert: { Icon: Sparkles, className: "bg-purple-haze text-charcoal" },
    drink: { Icon: Soup, className: "bg-purple-haze text-charcoal" },
    discount: { Icon: BadgePercent, className: "bg-purple-haze text-charcoal" },
    supplement: { Icon: CirclePlus, className: "bg-purple-haze text-charcoal" },
    menu: { Icon: UtensilsCrossed, className: "bg-purple-haze text-charcoal" },
    gift: { Icon: Gift, className: "bg-purple-haze text-charcoal" },
  } as const;

  return icons[icon as keyof typeof icons] ?? icons.gift;
}

export const CampaignLivePreview = memo(function CampaignLivePreview({
  merchant,
  preview,
  compact = false,
  flushTop = false,
}: {
  merchant: Merchant;
  preview: CampaignEditorPreviewModel;
  compact?: boolean;
  flushTop?: boolean;
}) {
  const isRestaurantPopTemplate = preview.gamePageTemplateId === "restaurant-pop";
  const isCocoricoTemplate = preview.gamePageTemplateId === "cocorico-wheel";
  const isCosmicTemplate = preview.gamePageTemplateId === "cosmic-orbit";
  const isImmersiveTemplate =
    !isCocoricoTemplate && (isCosmicTemplate || preview.gamePageTemplateId === "sunburst-festival");
  const isImmersiveScratchTemplate =
    preview.gamePageTemplateId === "scratch-vault" ||
    preview.gamePageTemplateId === "scratch-confetti" ||
    preview.gamePageTemplateId === "scratch-coral" ||
    preview.gamePageTemplateId === "scratch-lilac" ||
    preview.gamePageTemplateId === "scratch-sunburst";
  const showStandardHeader = !isImmersiveScratchTemplate;
  const previewScale = compact ? 0.8 : 1;
  const scalePreviewValue = (value: number) => Math.round(value * previewScale);
  const previewHeadingTextColor =
    isCosmicTemplate ||
    isCocoricoTemplate ||
    (preview.gamePageTemplateId === "scratch-vault" && preview.headingTextColor.toLowerCase() === "#1f2937")
      ? "#f8fbff"
      : preview.headingTextColor;
  const previewFrameClass = compact
      ? "min-h-[480px] max-w-[360px] rounded-[30px] px-3 pb-5 pt-7"
      : "min-h-[600px] max-w-[450px] rounded-[38px] px-4 pb-6 pt-8";

  return (
    <div className={`okado-preview-surface ${flushTop ? "" : "mt-6"}`} data-template-id={preview.gamePageTemplateId}>
      <div
        className={`mx-auto w-full overflow-hidden border border-[#ced7e6] shadow-[0_30px_70px_rgba(18,24,39,0.18)] ${previewFrameClass}`}
        style={preview.backgroundStyle}
      >
        {showStandardHeader ? (
          <>
        {preview.logoMode === "image" && preview.logoUrl ? (
          <div className={`flex ${preview.logoAlignmentClass}`}>
            <div
              style={{
                marginBottom: `${scalePreviewValue(preview.logoBottomSpacingPx)}px`,
              }}
            >
              <BrandMark
                logoText={merchant.logoText}
                logoUrl={preview.logoUrl}
                size="lg"
                variant="transparent"
                imageWidthPx={scalePreviewValue(preview.logoWidthPx)}
              />
            </div>
          </div>
        ) : null}

        {preview.logoMode === "text" ? (
          <div className={`flex ${preview.logoAlignmentClass}`}>
            <div
              style={{
                marginBottom: `${scalePreviewValue(preview.logoBottomSpacingPx)}px`,
              }}
            >
              <BrandMark
                logoText={preview.logoText}
                size="lg"
                variant="transparent"
                imageWidthPx={scalePreviewValue(preview.logoWidthPx)}
                textSizePx={scalePreviewValue(preview.logoTextSizePx)}
                textColor={preview.logoTextColor}
                textClassName="text-2xl"
              />
            </div>
          </div>
        ) : null}

        {preview.gameType === "scratch" && preview.logoMode === "none" ? (
          <div className={`flex ${preview.logoAlignmentClass}`}>
            <div
              style={{
                marginBottom: `${scalePreviewValue(preview.logoBottomSpacingPx)}px`,
              }}
            >
              <BrandMark
                logoText={preview.logoText || merchant.companyName}
                size="lg"
                variant="transparent"
                imageWidthPx={scalePreviewValue(preview.logoWidthPx)}
                textSizePx={scalePreviewValue(preview.logoTextSizePx)}
                textColor={preview.logoTextColor}
                textClassName="text-2xl"
              />
            </div>
          </div>
        ) : null}

        {preview.logoMode === "none" || (preview.logoMode === "image" && !preview.logoUrl) ? (
          <div aria-hidden="true" className="h-5" />
        ) : null}

        <div className={`${preview.headingAlignmentClass} ${preview.headingFontClass}`}>
          {isCocoricoTemplate || isRestaurantPopTemplate || preview.gamePageTemplateId === "classic" ? (
            <CocoricoPromoText
              text={preview.subtitle.trim() || (preview.gameType === "scratch" ? DEFAULT_SCRATCH_SUBTITLE : "Découvrez votre animation")}
              as="h3"
              fontFamily={textFontFamily(preview.headingFontFamily)}
              fontSize={fluidType(scalePreviewValue(preview.headingFontSizePx), {
                minRatio: 0.82,
                maxRatio: 1.08,
                viewportStep: 0.3,
              })}
              fontWeight={isCocoricoTemplate ? undefined : 850}
              textColor={isCocoricoTemplate ? undefined : previewHeadingTextColor}
              secondaryTextColor={isCocoricoTemplate ? undefined : previewHeadingTextColor}
              strokeColor={isCocoricoTemplate ? undefined : resolvePromoStrokeColor(previewHeadingTextColor)}
              strokeWidth={isCocoricoTemplate ? undefined : 5}
              variant={isCocoricoTemplate ? "cocorico" : "inspired"}
              rotate={isCocoricoTemplate}
            />
          ) : (
            <h3
              className={`${preview.headingFontClass} line-clamp-3 whitespace-pre-line leading-[1]`}
              style={{
                color: previewHeadingTextColor,
                fontSize: fluidType(scalePreviewValue(preview.headingFontSizePx), {
                  minRatio: 0.82,
                  maxRatio: 1.08,
                  viewportStep: 0.3,
                }),
                fontWeight: preview.headingFontWeight,
              }}
            >
              {preview.subtitle.trim() || (preview.gameType === "scratch" ? DEFAULT_SCRATCH_SUBTITLE : "Découvrez votre animation")}
            </h3>
          )}
        </div>
          </>
        ) : null}

        <div
          className={
            preview.gameType === "wheel"
              ? compact
                ? "-mx-3"
                : "-mx-4"
              : undefined
          }
          style={{
            marginTop: `${isImmersiveScratchTemplate ? 0 : scalePreviewValue(preview.blockSpacingPx)}px`,
            height: preview.gameType === "wheel" ? compact ? "376px" : "470px" : undefined,
            marginBottom:
              preview.gameType === "wheel" ? (compact ? "-20px" : "-24px") : undefined,
          }}
        >
          {preview.gameType === "wheel" ? (
            isCocoricoTemplate ? (
              <CocoricoWheel
                primaryColor={preview.cocoricoPrimaryColor}
                segments={preview.previewSegments}
                winningSegmentId={preview.winningSegmentId}
                buttonStyle={{ textColor: preview.buttonStyle.textColor }}
                buttonEnabled
                framing="editor"
              />
            ) : isImmersiveTemplate ? (
              <ImmersiveWheel
                accent={preview.accent}
                wheelStyle={preview.wheelStyle}
                template={preview.gamePageTemplateId as "cosmic-orbit" | "sunburst-festival"}
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
              <WheelOfFortune
                accent={preview.accent}
                wheelStyle={preview.wheelStyle}
                pageTemplate={
                  preview.gamePageTemplateId === "restaurant-pop" ? "restaurant-pop" : "classic"
                }
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
            )
          ) : (
            isImmersiveScratchTemplate ? (
              <ImmersiveScratchTicket
                accent={preview.accent}
                resultLabel={preview.previewPrize}
                enabled={false}
                onReveal={() => undefined}
                logoMode={preview.logoMode}
                logoText={preview.logoText}
                logoUrl={preview.logoUrl}
                headline={preview.subtitle}
                headingTextColor={previewHeadingTextColor}
                headingFontClass={preview.headingFontClass}
                headingFontSize={fluidType(scalePreviewValue(preview.headingFontSizePx), {
                  minRatio: 0.82,
                  maxRatio: 1.08,
                  viewportStep: 0.3,
                })}
                headingFontWeight={preview.headingFontWeight}
                headingAlignmentClass={preview.headingAlignmentClass}
                logoAlignmentClass={preview.logoAlignmentClass}
                logoBottomSpacingPx={scalePreviewValue(
                  Math.max(0, preview.logoBottomSpacingPx - preview.blockSpacingPx),
                )}
                logoWidthPx={scalePreviewValue(preview.logoWidthPx)}
                logoTextSizePx={scalePreviewValue(preview.logoTextSizePx)}
                fitContainer
                template={preview.gamePageTemplateId as "scratch-vault" | "scratch-confetti" | "scratch-coral" | "scratch-lilac" | "scratch-sunburst"}
              />
            ) : (
              <ScratchGame
                accent={preview.accent}
                resultLabel={preview.previewPrize}
                enabled={false}
                onReveal={() => undefined}
              />
            )
          )}
        </div>

        {preview.gameType !== "wheel" && !isImmersiveScratchTemplate ? (
          <button
            type="button"
            className={`okado-preview-cta mx-auto block w-full max-w-[360px] rounded-[24px] border font-semibold ${preview.previewCtaClass}`}
            style={{
              marginTop: `${scalePreviewValue(preview.blockSpacingPx)}px`,
              backgroundColor: preview.buttonStyle.backgroundColor,
              color: preview.buttonStyle.textColor,
              borderColor: preview.buttonStyle.borderColor,
              fontSize: fluidType(scalePreviewValue(preview.buttonStyle.textSizePx), {
                minRatio: 0.86,
                maxRatio: 1.08,
                viewportStep: 0.24,
              }),
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
    <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-4 shadow-[0_12px_30px_rgba(122,136,166,0.08)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-[8px] border border-[#d7e0ed] bg-[#f7f9fc] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
            Action {index + 1}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMove(action.id, "up")}
            disabled={index === 0}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#d7e0ed] bg-white text-[#182033] transition hover:bg-linen-canvas disabled:opacity-40"
            aria-label={`Monter l'action ${index + 1}`}
            title="Monter"
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onMove(action.id, "down")}
            disabled={index === totalActions - 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#d7e0ed] bg-white text-[#182033] transition hover:bg-linen-canvas disabled:opacity-40"
            aria-label={`Descendre l'action ${index + 1}`}
            title="Descendre"
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className={`grid items-end gap-4 ${
          action.kind === "crm" ? "md:grid-cols-[0.74fr_auto]" : "md:grid-cols-[0.72fr_1fr_auto]"
        }`}
      >
        <label className="flex h-full flex-col text-sm">
          <span className="mb-2 flex h-6 items-center gap-3 leading-6 text-[#616b7c]"><SocialChannelIcon channel={action.kind} /><span>Canal</span></span>
          <select
            value={action.kind}
            onChange={(event) => onUpdate(action.id, { kind: event.target.value as ActionKind })}
            className="h-12 w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
          >
            {actionKindOptions.map((kind) => (
              <option key={kind} value={kind}>
                {actionKindLabel(kind)}
              </option>
            ))}
          </select>
        </label>

        {action.kind !== "crm" ? (
          <label className="flex h-full flex-col text-sm">
            <span className="mb-2 flex h-6 items-center leading-6 text-[#616b7c]">Lien</span>
            <input
              value={action.url}
              onChange={(event) => onUpdate(action.id, { url: event.target.value })}
              className="h-12 w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
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
              className="inline-flex h-[48px] w-[48px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-[#d7e0ed] bg-white text-[#182033] transition hover:bg-linen-canvas"
            >
              <SquareArrowOutUpRight className="h-5 w-5" aria-hidden="true" />
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => onRemove(action.id)}
            aria-label={`Supprimer l'action ${index + 1}`}
            title="Supprimer"
            className="inline-flex h-[48px] w-[48px] cursor-pointer items-center justify-center rounded-[8px] border border-[#111827] bg-[#111827] text-white transition hover:bg-[#273142]"
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
});
const CampaignPrizeRow = memo(function CampaignPrizeRow({
  prize,
  isExistingCampaign,
  onUpdate,
  onRemove,
  onOpenConditions,
}: {
  prize: EditorState["prizes"][number];
  isExistingCampaign: boolean;
  onUpdate: (
    prizeId: string | undefined,
    patch: Partial<EditorState["prizes"][number]>,
  ) => void;
  onRemove: (prizeId: string | undefined) => void;
  onOpenConditions: (prizeId: string | undefined) => void;
}) {
  const gridColumns = isExistingCampaign
    ? "xl:grid-cols-[minmax(180px,1.35fr)_minmax(100px,.7fr)_minmax(110px,.75fr)_minmax(130px,.9fr)_minmax(120px,.85fr)_minmax(120px,1.15fr)_56px]"
    : "xl:grid-cols-[minmax(180px,1.5fr)_minmax(100px,.7fr)_minmax(130px,.9fr)_minmax(120px,.85fr)_minmax(120px,1.15fr)_56px]";

  return (
    <div className={`grid gap-3 rounded-[24px] border border-[#dbe4f0] bg-white p-4 ${gridColumns} xl:items-center`}>
      <label className="text-sm">
        <span className="mb-2 block text-[#616b7c] xl:hidden">Dotation</span>
        <input
          value={prize.label}
          onChange={(event) => onUpdate(prize.id, { label: event.target.value })}
          className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
        />
      </label>

      <label className="text-sm">
        <span className="mb-2 block text-[#616b7c] xl:hidden">Stock initial</span>
        <input
          type="number"
          min={0}
          value={prize.totalQuantity ?? ""}
          placeholder="Illimité"
          readOnly={isExistingCampaign}
          onChange={(event) =>
            onUpdate(prize.id, {
              totalQuantity: event.target.value === "" ? null : Number(event.target.value),
            })
          }
          className={`w-full rounded-[18px] border border-[#d7e0ed] px-4 py-3 outline-none ${
            isExistingCampaign ? "cursor-default bg-linen-canvas text-ash" : "bg-white"
          }`}
        />
        {isExistingCampaign ? (
          <span className="mt-2 block text-xs text-[#8993a6]">Référence de départ</span>
        ) : null}
      </label>

      {isExistingCampaign ? (
        <label className="text-sm">
          <span className="mb-2 block text-[#616b7c] xl:hidden">Stock disponible</span>
          <input
            type="number"
            min={0}
            value={prize.remainingQuantity ?? ""}
            placeholder="Illimité"
            onChange={(event) =>
              onUpdate(prize.id, {
                remainingQuantity: event.target.value === "" ? null : Number(event.target.value),
              })
            }
            className="w-full rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
          />
        </label>
      ) : null}

      <label className="text-sm">
        <span className="mb-2 block text-[#616b7c] xl:hidden">Probabilité de gain (%)</span>
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
        <span className="mb-2 block text-[#616b7c] xl:hidden">Coût unitaire</span>
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

      <div className="flex flex-wrap items-center justify-end gap-2 xl:justify-start">
        <button
          type="button"
          onClick={() => onOpenConditions(prize.id)}
          className="min-h-[48px] rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 text-sm font-semibold text-[#182033] transition hover:bg-linen-canvas"
        >
          Conditions
        </button>
      </div>
      <button
        type="button"
        onClick={() => onRemove(prize.id)}
        aria-label={`Supprimer le lot ${prize.label || ""}`.trim()}
        title="Supprimer"
        className="inline-flex h-[48px] w-[48px] cursor-pointer items-center justify-center justify-self-end rounded-[8px] border border-[#111827] bg-[#111827] text-white transition hover:bg-[#273142] xl:justify-self-start"
      >
        <Trash2 className="h-5 w-5" aria-hidden="true" />
      </button>
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
    subtitle: limitCampaignSubtitleLines(campaign.campaign.subtitle),
    emailCaptureEnabled: campaign.campaign.emailCaptureEnabled,
    gameType: campaign.campaign.gameType,
    ctaLabel: campaign.campaign.ctaLabel,
    isActive: campaign.campaign.isActive,
    logoMode: campaign.campaign.logoMode ?? (campaign.campaign.logoUrl ? "image" : "text"),
    logoText: campaign.campaign.logoText ?? merchant.companyName,
    logoUrl: campaign.campaign.logoUrl,
    accent:
      campaign.campaign.gameType === "scratch"
        ? normalizeScratchAccent(
            campaign.campaign.accent,
            campaign.campaign.presentation.layout.templateId,
          )
        : campaign.campaign.accent,
    presentation: {
      ...campaign.campaign.presentation,
      heading: {
        ...campaign.campaign.presentation.heading,
        fontFamily: campaign.campaign.presentation.heading.fontFamily ?? "display",
        fontWeight: campaign.campaign.presentation.heading.fontWeight ?? 600,
        align: "center",
      },
      button: {
        ...campaign.campaign.presentation.button,
        isBold: campaign.campaign.presentation.button.isBold ?? true,
      },
      layout: {
        ...campaign.campaign.presentation.layout,
        blockSpacingPx: campaign.campaign.presentation.layout.blockSpacingPx ?? 40,
        templateId: campaign.campaign.presentation.layout.templateId ?? "classic",
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
          headlineTextColor: campaign.campaign.presentation.wheel.winColor,
          headlineFontSizePx: campaign.campaign.presentation.heading.fontSizePx,
          headlineFontFamily: campaign.campaign.presentation.heading.fontFamily,
          wheel: {
            ...campaign.campaign.presentation.wheel,
            winColor: campaign.campaign.presentation.wheel.loseColor,
            alternateWinColor: campaign.campaign.presentation.wheel.loseColor,
            rimColor: campaign.campaign.presentation.wheel.loseColor,
          },
          footerBackgroundColor: campaign.campaign.accent.signal,
        }),
      ),
      email: normalizeCampaignEmailSettings(
        campaign.campaign.presentation.email,
        createCampaignEmailDefaults(merchant),
      ),
    },
    // E-mail capture is now a dedicated option, not a marketing action.
    actions: campaign.campaign.actions.filter((action) => action.kind !== "crm"),
    rewardRules: campaign.campaign.rewardRules,
    prizes: campaign.prizes.map((prize) => ({
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

function buildPreviewSegments(prizes: EditorState["prizes"]): PreviewSegment[] {
  return buildWheelVisualSegments(
    prizes.map((prize, index) => ({
      id: prize.id || `preview-win-${index}`,
      label: prize.label,
      probability: prize.probability,
    })),
  );
}

export function buildCampaignLivePreviewModel(
  form: CampaignSetupInput,
  merchant: Merchant,
): CampaignEditorPreviewModel {
  const templateId = form.presentation.layout.templateId ?? "classic";
  const previewAccent =
    form.gameType === "scratch"
      ? resolveScratchAccent(form.accent, templateId)
      : form.accent;
  const previewSegments = buildPreviewSegments(form.prizes);
  const winningSegmentId =
    previewSegments.find((segment) => segment.tone === "win")?.id ?? previewSegments[0]?.id ?? "win";
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
  const headingFontClass = textFontClass(form.presentation.heading.fontFamily);
  const logoSizePercent = clampCampaignLogoSizePercent(form.presentation.logo.sizePercent);
  const logoWidthPx = Math.round(Math.max(56, Math.min(720, logoSizePercent * 3)));
  const logoTextSizePx = campaignLogoTextSizePx(logoSizePercent, form.gameType);
  const backgroundImage =
    form.presentation.background.mode === "image" && form.presentation.background.imageUrl
      ? `linear-gradient(rgba(15,23,40,0.32), rgba(15,23,40,0.52)), url("${form.presentation.background.imageUrl}")`
      : templateId === "restaurant-pop"
        ? `radial-gradient(circle at 12% 12%, rgba(255,255,255,0.42) 0 8%, transparent 30%), radial-gradient(circle at 88% 22%, rgba(255,255,255,0.3) 0 10%, transparent 34%), radial-gradient(circle at 18% 86%, rgba(255,255,255,0.2) 0 7%, transparent 27%), linear-gradient(180deg, #fff2dd 0%, #fffaf1 48%, #fff4e5 100%)`
            : templateId === "cocorico-wheel"
              ? `radial-gradient(circle at 14% 12%, ${withHexAlpha(deriveLighterHex(resolveCocoricoBackgroundColor(form.presentation.background.color), 0.32), "e6")} 0 10%, transparent 11%), radial-gradient(circle at 88% 26%, ${withHexAlpha(deriveLighterHex(resolveCocoricoBackgroundColor(form.presentation.background.color), 0.12), "b3")} 0 15%, transparent 16%), linear-gradient(160deg, ${resolveCocoricoBackgroundColor(form.presentation.background.color)} 0%, ${resolveCocoricoBackgroundColor(form.presentation.background.color)} 48%, #063d78 100%)`
              : templateId === "cosmic-orbit"
              ? `radial-gradient(circle at 50% 112%, ${withHexAlpha(form.presentation.wheel.loseColor, "52")} 0 24%, transparent 43%), radial-gradient(circle at 9% 12%, ${withHexAlpha(form.presentation.wheel.winColor, "2b")} 0 14%, transparent 25%), linear-gradient(155deg, #07142e 0%, #0b1d42 55%, #071126 100%)`
                : templateId === "scratch-vault"
                ? `radial-gradient(circle at 50% 108%, ${withHexAlpha(previewAccent.signal, "58")} 0 27%, transparent 48%), radial-gradient(circle at 15% 10%, ${withHexAlpha(form.presentation.wheel.winColor, "4d")} 0 12%, transparent 22%), linear-gradient(155deg, #071126b8 0%, #111b3b99 56%, #071126b8 100%)`
                : templateId === "scratch-confetti"
                  ? `radial-gradient(circle at 12% 9%, ${withHexAlpha(previewAccent.signal, "52")} 0 10%, transparent 11%), radial-gradient(circle at 94% 12%, ${withHexAlpha(form.presentation.wheel.winColor, "30")} 0 12%, transparent 13%), linear-gradient(180deg, #f59e0b99 0%, #f9731680 58%, #ea580c99 100%)`
              : templateId === "sunburst-festival"
            ? `radial-gradient(circle at 12% 10%, ${withHexAlpha(form.presentation.wheel.loseColor, "33")} 0 12%, transparent 13%), radial-gradient(circle at 94% 18%, ${withHexAlpha(form.presentation.wheel.winColor, "38")} 0 14%, transparent 15%), linear-gradient(180deg, #fffdf5 0%, #fff8e8 56%, #fff2ce 100%)`
              : templateId === "scratch-coral"
              ? `radial-gradient(circle at 50% 0%, ${withHexAlpha(previewAccent.signal, "24")} 0 18%, transparent 42%), linear-gradient(180deg, #fffaf580 0%, #ffffff66 72%, #fff3e880 100%)`
              : templateId === "scratch-lilac"
                ? `radial-gradient(circle at 50% 0%, ${withHexAlpha(previewAccent.signal, "2c")} 0 20%, transparent 44%), linear-gradient(180deg, #fffaff80 0%, #f7edff80 100%)`
                : templateId === "scratch-sunburst"
                  ? `repeating-conic-gradient(from -18deg at 50% -2%, ${withHexAlpha(previewAccent.signal, "52")} 0deg 12deg, transparent 12deg 24deg), linear-gradient(180deg, #fff4bf99 0%, #ffdc5880 68%, #fff0c599 100%)`
            : "";

  return {
    formId: form.id ?? "new-campaign",
    backgroundStyle: {
      backgroundColor: form.presentation.background.color,
      backgroundImage,
      backgroundPosition: "center",
      backgroundSize: "cover",
      fontFamily: textFontFamily(form.presentation.heading.fontFamily),
    },
    logoMode: form.logoMode,
    logoAlignmentClass,
    logoBottomSpacingPx: form.presentation.logo.marginBottomPx,
    logoWidthPx,
    logoTextSizePx,
      logoUrl: form.logoUrl ?? "",
      logoText: form.logoText?.trim() || merchant.companyName,
      logoTextColor: form.presentation.logo.textColor ?? form.presentation.heading.textColor,
      headingAlignmentClass,
      headingFontClass,
      headingFontFamily: form.presentation.heading.fontFamily,
      headingTextColor:
      templateId === "cosmic-orbit" || templateId === "cocorico-wheel"
        ? "#f8fbff"
        : form.gameType === "scratch" &&
            form.presentation.heading.textColor.toLowerCase() === "#1f2937"
          ? previewAccent.ink
          : form.presentation.heading.textColor,
    headingFontSizePx: form.presentation.heading.fontSizePx,
    headingFontWeight: form.presentation.heading.fontWeight ?? 600,
    subtitle: limitCampaignSubtitleLines(form.subtitle),
    blockSpacingPx: form.presentation.layout.blockSpacingPx,
    gamePageTemplateId: templateId,
    gameType: form.gameType,
    accent: previewAccent,
    wheelStyle: form.presentation.wheel,
    cocoricoPrimaryColor: resolveCocoricoPrimaryColor(form.presentation.wheel.loseColor),
    buttonStyle: {
      backgroundColor: form.gameType === "wheel" ? form.presentation.wheel.loseColor : form.presentation.button.backgroundColor,
      textColor: form.presentation.button.textColor,
      borderColor: form.gameType === "wheel" ? form.presentation.wheel.rimColor : form.presentation.button.borderColor,
      textSizePx: form.presentation.button.textSizePx,
      isBold: form.presentation.button.isBold ?? true,
    },
    previewSegments,
    winningSegmentId,
    previewPrize: form.prizes[0]?.label || "Cadeau surprise",
    ctaLabel: form.ctaLabel,
    previewCtaClass: buttonSizeMap[form.presentation.button.size],
  };
}

function syncActionLabel(kind: ActionKind, currentLabel: string) {
  if (kind === "custom" && currentLabel.trim()) {
    return currentLabel;
  }

  return actionKindCta(kind);
}

function buildClassicSetupPayload(form: EditorState) {
  return {
    ...form,
    prizes: form.prizes.map((prize) => ({
      id: prize.id,
      label: prize.label,
      totalQuantity: prize.totalQuantity,
      remainingQuantity: prize.remainingQuantity,
      probability: prize.probability,
      estimatedUnitCost: prize.estimatedUnitCost,
      purchaseRequired: Boolean(prize.purchaseRequired),
      usageConditions: prize.usageConditions,
    })),
    creationMode: "editor" as const,
    actions: form.actions
      .filter((action) => action.kind === "crm" || action.url.trim())
      .map((action) => ({
        ...action,
        label: syncActionLabel(action.kind, action.label),
        url: normalizeUrl(action.url),
      })),
  };
}

const MAX_UPLOAD_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
type ImageUploadField = "campaign-logo" | "background" | "poster-logo" | "poster-background";

function uploadAsDataUrl(
  event: ChangeEvent<HTMLInputElement>,
  onLoaded: (value: string) => void,
  onError?: (message: string) => void,
) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  if (file.type && !ACCEPTED_IMAGE_TYPES.has(file.type)) {
    event.target.value = "";
    onError?.("Format d'image non pris en charge. Utilisez un PNG, JPEG, WebP ou GIF.");
    return;
  }

  if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
    event.target.value = "";
    onError?.("Image trop volumineuse. Importez une image de 2 Mo maximum.");
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
  initialCampaign = null,
  deferInlineAssets = false,
}: CampaignEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<EditorState>(toEditorState(merchant, initialCampaign));
  const [backgroundLibrary, setBackgroundLibrary] = useState<BackgroundLibraryAsset[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogTone, setSaveDialogTone] = useState<"info" | "error">("info");
  const [saveDialogTitle, setSaveDialogTitle] = useState("Campagne enregistrée");
  const [saveDialogDescription, setSaveDialogDescription] = useState(
    "Vos modifications ont bien été prises en compte.",
  );
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(
    initialCampaign?.campaign.id ?? null,
  );
  const [backgroundLibraryDialogOpen, setBackgroundLibraryDialogOpen] = useState(false);
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [editingPrizeConditionsId, setEditingPrizeConditionsId] = useState<string | null>(null);
  const [prizeSuggestionsOpen, setPrizeSuggestionsOpen] = useState(false);
  const [prizeSuggestions, setPrizeSuggestions] = useState<PrizeSuggestion[]>([]);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [imageUploadErrors, setImageUploadErrors] = useState<
    Partial<Record<ImageUploadField, string>>
  >({});

  useEffect(() => {
    let cancelled = false;
    const industry = merchant.industry?.trim();

    if (!industry) {
      return;
    }

    fetch(`/api/prize-suggestions?industry=${encodeURIComponent(industry)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Lecture impossible.");
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

  const previewSegments = useMemo(() => buildPreviewSegments(form.prizes), [form.prizes]);
  const totalPrizeProbability = useMemo(
    () => form.prizes.reduce((total, prize) => total + (Number(prize.probability) || 0), 0),
    [form.prizes],
  );
  const prizeValidationMessages = useMemo(
    () =>
      getPrizeValidationMessages(
        form.prizes,
        form.rewardRules.isWinningEveryTime,
      ),
    [form.prizes, form.rewardRules.isWinningEveryTime],
  );
  const remainingPrizeProbability = Math.max(0, 100 - totalPrizeProbability);
  const previewPrize = form.prizes[0]?.label || "Cadeau surprise";
  const previewCtaClass = buttonSizeMap[form.presentation.button.size];
  const logoSizePercent = clampCampaignLogoSizePercent(form.presentation.logo.sizePercent);
  const logoWidthPx = Math.round(
    Math.max(56, Math.min(720, logoSizePercent * 3)),
  );
  const logoTextSizePx = campaignLogoTextSizePx(logoSizePercent, form.gameType);
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
  const headingFontClass = textFontClass(form.presentation.heading.fontFamily);
  const currentTemplateId = form.presentation.layout.templateId ?? "classic";
  const showBackgroundColor = currentTemplateId === "classic" || currentTemplateId === "cocorico-wheel";
  const previewModel = useMemo<CampaignEditorPreviewModel>(() => {
    const previewAccent =
      form.gameType === "scratch"
        ? resolveScratchAccent(form.accent, currentTemplateId)
        : form.accent;
    const winningSegmentId =
      previewSegments.find((segment) => segment.tone === "win")?.id ?? previewSegments[0]?.id ?? "win";

    return {
      formId: form.id ?? "new-campaign",
      backgroundStyle: {
        backgroundColor: form.presentation.background.color,
        backgroundImage:
          form.presentation.background.mode === "image" && form.presentation.background.imageUrl
            ? `linear-gradient(rgba(15,23,40,0.32), rgba(15,23,40,0.52)), url("${form.presentation.background.imageUrl}")`
            : (form.presentation.layout.templateId ?? "classic") === "restaurant-pop"
              ? `radial-gradient(circle at 12% 12%, rgba(255,255,255,0.42) 0 8%, transparent 30%), radial-gradient(circle at 88% 22%, rgba(255,255,255,0.3) 0 10%, transparent 34%), radial-gradient(circle at 18% 86%, rgba(255,255,255,0.2) 0 7%, transparent 27%), linear-gradient(180deg, #fff2dd 0%, #fffaf1 48%, #fff4e5 100%)`
            : (form.presentation.layout.templateId ?? "classic") === "cocorico-wheel"
              ? `radial-gradient(circle at 14% 12%, ${withHexAlpha(deriveLighterHex(resolveCocoricoBackgroundColor(form.presentation.background.color), 0.32), "e6")} 0 10%, transparent 11%), radial-gradient(circle at 88% 26%, ${withHexAlpha(deriveLighterHex(resolveCocoricoBackgroundColor(form.presentation.background.color), 0.12), "b3")} 0 15%, transparent 16%), linear-gradient(160deg, ${resolveCocoricoBackgroundColor(form.presentation.background.color)} 0%, ${resolveCocoricoBackgroundColor(form.presentation.background.color)} 48%, #063d78 100%)`
            : (form.presentation.layout.templateId ?? "classic") === "cosmic-orbit"
                  ? `radial-gradient(circle at 50% 112%, ${withHexAlpha(form.presentation.wheel.loseColor, "52")} 0 24%, transparent 43%), radial-gradient(circle at 9% 12%, ${withHexAlpha(form.presentation.wheel.winColor, "2b")} 0 14%, transparent 25%), linear-gradient(155deg, #07142e 0%, #0b1d42 55%, #071126 100%)`
                : (form.presentation.layout.templateId ?? "classic") === "scratch-vault"
                  ? `radial-gradient(circle at 50% 108%, ${withHexAlpha(previewAccent.signal, "58")} 0 27%, transparent 48%), radial-gradient(circle at 15% 10%, ${withHexAlpha(form.presentation.wheel.winColor, "4d")} 0 12%, transparent 22%), linear-gradient(155deg, #071126b8 0%, #111b3b99 56%, #071126b8 100%)`
                : (form.presentation.layout.templateId ?? "classic") === "scratch-confetti"
                  ? `radial-gradient(circle at 12% 9%, ${withHexAlpha(previewAccent.signal, "52")} 0 10%, transparent 11%), radial-gradient(circle at 94% 12%, ${withHexAlpha(form.presentation.wheel.winColor, "30")} 0 12%, transparent 13%), linear-gradient(180deg, #f59e0b99 0%, #f9731680 58%, #ea580c99 100%)`
                : (form.presentation.layout.templateId ?? "classic") === "sunburst-festival"
                  ? `radial-gradient(circle at 12% 10%, ${withHexAlpha(form.presentation.wheel.loseColor, "33")} 0 12%, transparent 13%), radial-gradient(circle at 94% 18%, ${withHexAlpha(form.presentation.wheel.winColor, "38")} 0 14%, transparent 15%), linear-gradient(180deg, #fffdf5 0%, #fff8e8 56%, #fff2ce 100%)`
                  : (form.presentation.layout.templateId ?? "classic") === "scratch-coral"
                    ? `radial-gradient(circle at 50% 0%, ${withHexAlpha(previewAccent.signal, "24")} 0 18%, transparent 42%), linear-gradient(180deg, #fffaf580 0%, #ffffff66 72%, #fff3e880 100%)`
                    : (form.presentation.layout.templateId ?? "classic") === "scratch-lilac"
                      ? `radial-gradient(circle at 50% 0%, ${withHexAlpha(previewAccent.signal, "2c")} 0 20%, transparent 44%), linear-gradient(180deg, #fffaff80 0%, #f7edff80 100%)`
                      : (form.presentation.layout.templateId ?? "classic") === "scratch-sunburst"
                        ? `repeating-conic-gradient(from -18deg at 50% -2%, ${withHexAlpha(previewAccent.signal, "52")} 0deg 12deg, transparent 12deg 24deg), linear-gradient(180deg, #fff4bf99 0%, #ffdc5880 68%, #fff0c599 100%)`
                  : "",
        backgroundPosition: "center",
        backgroundSize: "cover",
        fontFamily: textFontFamily(form.presentation.heading.fontFamily),
      },
      logoMode: form.logoMode,
      logoAlignmentClass,
      logoBottomSpacingPx: form.presentation.logo.marginBottomPx,
      logoWidthPx,
      logoTextSizePx,
      logoUrl: form.logoUrl ?? "",
      logoText: form.logoText?.trim() || merchant.companyName,
      logoTextColor: form.presentation.logo.textColor ?? form.presentation.heading.textColor,
      headingAlignmentClass,
      headingFontClass,
      headingFontFamily: form.presentation.heading.fontFamily,
      headingTextColor: form.presentation.heading.textColor,
      headingFontSizePx: form.presentation.heading.fontSizePx,
      headingFontWeight: currentTemplateId === "cocorico-wheel" ? 900 : form.presentation.heading.fontWeight ?? 600,
      subtitle: limitCampaignSubtitleLines(form.subtitle),
      blockSpacingPx: form.presentation.layout.blockSpacingPx,
      gamePageTemplateId: form.presentation.layout.templateId ?? "classic",
      gameType: form.gameType,
      accent: previewAccent,
      wheelStyle: form.presentation.wheel,
      cocoricoPrimaryColor: resolveCocoricoPrimaryColor(form.presentation.wheel.loseColor),
      buttonStyle: {
        backgroundColor:
          form.gameType === "wheel"
            ? form.presentation.wheel.loseColor
            : form.presentation.button.backgroundColor,
        textColor: form.presentation.button.textColor,
        borderColor:
          form.gameType === "wheel"
            ? form.presentation.wheel.rimColor
            : form.presentation.button.borderColor,
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
    form.presentation.heading.fontFamily,
    form.presentation.heading.fontWeight,
    form.presentation.heading.textColor,
    form.presentation.layout.blockSpacingPx,
    form.presentation.layout.templateId,
    form.presentation.logo.marginBottomPx,
    form.presentation.logo.textColor,
    form.presentation.wheel,
    form.subtitle,
    currentTemplateId,
    headingAlignmentClass,
    headingFontClass,
    logoAlignmentClass,
    logoTextSizePx,
    logoWidthPx,
    merchant.companyName,
    previewCtaClass,
    previewPrize,
    previewSegments,
  ]);
  const deferredPreview = useDeferredValue(previewModel);

  useEffect(() => {
    const campaignId = initialCampaign?.campaign.id;

    if (!deferInlineAssets || !campaignId) {
      return;
    }

    let cancelled = false;

    async function loadDeferredAssets() {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/assets`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              assets: {
                logoUrl?: string;
                backgroundImageUrl?: string;
                posterLogoUrl?: string;
                posterBackgroundImageUrl?: string;
              };
            }
          | null;

        if (!response.ok || !payload?.assets || cancelled) {
          return;
        }

        setForm((current) => ({
          ...current,
          logoUrl: payload.assets.logoUrl ?? current.logoUrl,
          presentation: {
            ...current.presentation,
            background: {
              ...current.presentation.background,
              imageUrl: payload.assets.backgroundImageUrl ?? current.presentation.background.imageUrl,
            },
            poster: {
              ...current.presentation.poster,
              logoUrl: payload.assets.posterLogoUrl ?? current.presentation.poster.logoUrl,
              backgroundImageUrl:
                payload.assets.posterBackgroundImageUrl ??
                current.presentation.poster.backgroundImageUrl,
            },
          },
        }));
      } catch {
        // The editor remains usable when an uploaded asset cannot be reloaded.
      }
    }

    void loadDeferredAssets();

    return () => {
      cancelled = true;
    };
  }, [deferInlineAssets, initialCampaign?.campaign.id]);

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

  function setField<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

function setGameType(gameType: GameType) {
    setForm((current) => {
      const activePrimaryColor =
        current.gameType === "scratch"
          ? current.accent.signal
          : current.presentation.wheel.loseColor;
      const shouldCarryPrimaryColor =
        current.gameType === "scratch"
          ? activePrimaryColor.toLowerCase() !== DEFAULT_SCRATCH_PRIMARY_COLOR
          : activePrimaryColor.toLowerCase() !== DEFAULT_WHEEL_PRIMARY_COLOR;
      const nextPrimaryColor = shouldCarryPrimaryColor
        ? activePrimaryColor
        : gameType === "scratch"
          ? DEFAULT_SCRATCH_PRIMARY_COLOR
          : DEFAULT_WHEEL_PRIMARY_COLOR;

      const currentSubtitle = current.subtitle.trim();
      const shouldSyncSubtitle =
        currentSubtitle === wheelDefaultSubtitle || currentSubtitle === scratchDefaultSubtitle;

      return {
        ...current,
        gameType,
        presentation: {
          ...current.presentation,
          heading: {
            ...current.presentation.heading,
            fontSizePx:
              gameType === "scratch" && current.presentation.heading.fontSizePx === 40
                ? 32
                : gameType === "wheel" && current.presentation.heading.fontSizePx === 32
                  ? 40
                  : current.presentation.heading.fontSizePx,
          },
          layout: {
            ...current.presentation.layout,
            templateId:
              gameType === "scratch"
                ? current.presentation.layout.templateId?.startsWith("scratch-")
                  ? current.presentation.layout.templateId
                  : "scratch-coral"
                : current.presentation.layout.templateId === "restaurant-pop" ||
                    current.presentation.layout.templateId === "cosmic-orbit" ||
                    current.presentation.layout.templateId === "sunburst-festival" ||
                    current.presentation.layout.templateId === "cocorico-wheel"
                  ? current.presentation.layout.templateId
                  : "classic",
          },
          wheel:
            gameType === "wheel"
              ? {
                  ...current.presentation.wheel,
                  loseColor: nextPrimaryColor,
                  alternateLoseColor: deriveLighterHex(nextPrimaryColor),
                  rimColor: deriveLighterHex(nextPrimaryColor),
                }
              : current.presentation.wheel,
        },
        subtitle: shouldSyncSubtitle
          ? gameType === "wheel"
            ? wheelDefaultSubtitle
            : scratchDefaultSubtitle
          : current.subtitle,
        accent:
          gameType === "scratch"
            ? {
                ...normalizeScratchAccent(current.accent, "scratch-coral"),
                signal: nextPrimaryColor,
              }
            : current.accent,
      };
    });
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
          rimColor: deriveLighterHex(nextColor),
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
          purchaseRequired: false,
          usageConditions: "",
        },
      ],
    }));
  }

  const removePrize = useCallback((prizeId: string | undefined) => {
    setForm((current) => ({
      ...current,
      prizes: current.prizes.filter((prize) => prize.id !== prizeId),
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

  async function saveCampaign() {
    setIsSaving(true);
    setMessage(null);
    setMessageTone("info");
    setSaveDialogOpen(false);
    if (form.id !== "__legacy_save__") {
      return handleSaveCampaign();
    }

    try {
      if (form.isActive && !form.prizes.length) {
        throw new Error("Ajoutez au moins un lot dans la section Dotation.");
      }

      if (form.isActive && form.prizes.some((prize) => prize.totalQuantity !== null && prize.totalQuantity <= 0)) {
        throw new Error("La quantité d’un lot doit être supérieure à 0 (ou illimitée).");
      }

      const totalProbability = form.prizes.reduce((total, prize) => total + (Number(prize.probability) || 0), 0);
      if (form.isActive && form.rewardRules.isWinningEveryTime && totalProbability < 99.9999) {
        throw new Error("Un jeu 100 % gagnant doit totaliser exactement 100 % de probabilités.");
      }

      if (
        form.isActive &&
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
        body: JSON.stringify(buildClassicSetupPayload(form)),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            campaign?: CampaignPerformance | { id?: string } | null;
          }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "La campagne n'a pas pu être enregistrée.");
      }

      setMessageTone("info");
      setMessage("Campagne enregistrée.");
      const savedId =
        payload?.campaign && "campaign" in payload.campaign
          ? payload.campaign.campaign.id
          : payload?.campaign && "id" in payload.campaign
            ? payload.campaign.id
            : undefined;
      window.dispatchEvent(new Event("campaigns-updated"));
      router.replace(`/campaigns?updated=${encodeURIComponent(savedId ?? "saved")}`);
    } catch (error) {
      const readableError = readableCampaignSaveError(
        error instanceof Error ? error.message : "La campagne n'a pas pu être enregistrée.",
      );
      setMessageTone("error");
      setMessage(null);
      setSaveDialogTone("error");
      setSaveDialogTitle("Enregistrement impossible");
      setSaveDialogDescription(readableError);
      setSaveDialogOpen(true);
    } finally {
      setIsSaving(false);
    }
  }

  function addSuggestedPrize(suggestion: PrizeSuggestion) {
    if (suggestion.probability > remainingPrizeProbability) {
      setMessage(
        "Ajustez les probabilités existantes avant d'ajouter ce lot : le total ne peut pas dépasser 100 %.",
      );
      setMessageTone("error");
      return;
    }

    setForm((current) => ({
      ...current,
      prizes: [
        ...current.prizes,
        {
          id: createPrizeId(),
          label: suggestion.label,
          totalQuantity: null,
          probability: suggestion.probability,
          estimatedUnitCost: suggestion.estimatedUnitCost,
          purchaseRequired: false,
          usageConditions: "",
        },
      ],
    }));
  }

  async function handleSaveCampaign() {
    setIsSaving(true);
    setMessage(null);
    setMessageTone("info");
    setSaveDialogOpen(false);

    try {
      if (form.isActive && !form.prizes.length) {
        throw new Error("Ajoutez au moins un lot dans la section Dotation.");
      }

      if (form.isActive && form.prizes.some((prize) => prize.totalQuantity !== null && prize.totalQuantity <= 0)) {
        throw new Error("La quantité d’un lot doit être supérieure à 0 (ou illimitée).");
      }

      const totalProbability = form.prizes.reduce((total, prize) => total + (Number(prize.probability) || 0), 0);
      if (form.isActive && form.rewardRules.isWinningEveryTime && totalProbability < 99.9999) {
        throw new Error("Un jeu 100 % gagnant doit totaliser exactement 100 % de probabilités.");
      }

      if (
        form.isActive &&
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
        body: JSON.stringify(buildClassicSetupPayload(form)),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            campaign?: CampaignPerformance | { id?: string } | null;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "La campagne n'a pas pu être enregistrée.");
      }

      const nextCampaignId =
        payload?.campaign && "campaign" in payload.campaign
          ? payload.campaign.campaign.id
          : payload?.campaign && "id" in payload.campaign
            ? payload.campaign.id
            : form.id ?? null;

      if (nextCampaignId) {
        setSavedCampaignId(nextCampaignId);
        setForm((current) => ({
          ...current,
          id: nextCampaignId,
        }));
      }

      setSaveDialogTone("info");
      setSaveDialogTitle("Campagne enregistrée");
      setSaveDialogDescription("Vos modifications ont bien été prises en compte.");
      setSaveDialogOpen(true);
      window.dispatchEvent(new Event("campaigns-updated"));
      router.refresh();
    } catch (error) {
      const readableError = readableCampaignSaveError(
        error instanceof Error ? error.message : "La campagne n'a pas pu être enregistrée.",
      );
      setMessageTone("error");
      setMessage(null);
      setSaveDialogTone("error");
      setSaveDialogTitle("Enregistrement impossible");
      setSaveDialogDescription(readableError);
      setSaveDialogOpen(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="okado-campaign-editor space-y-6">
      <section className="grid gap-6 px-1 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <p className="okado-label">
              Param&eacute;trage de l&apos;animation
            </p>
            <h1 className="okado-page-title mt-3">
              {initialCampaign ? "Ajuster votre campagne" : "Créer votre campagne"}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ash">
              Structurez la mécanique de votre jeu concours tout en personnalisant le rendu
              graphique.
            </p>
          </div>

          <div
            className="okado-action-row flex flex-wrap items-center justify-start gap-3 xl:justify-end"
          >
            <Link
              href="/campaigns"
              prefetch={false}
              className="okado-secondary-action px-4"
            >
              Retour aux campagnes
            </Link>
            <button
              type="button"
              onClick={saveCampaign}
              disabled={isSaving}
              className="okado-filled-action px-5 disabled:opacity-60"
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
                <p className="okado-label">
                  Identit de campagne
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                  Nommez votre animation
                </h2>
              </div>
              <label className="inline-flex items-center gap-3 rounded-[8px] border border-border bg-linen-canvas px-3 py-2 text-sm font-semibold text-[#182033]">
                <span>Campagne active</span>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setField("isActive", checked)}
                  aria-label="Activer la campagne"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-1">
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Nom de campagne</span>
                <input
                  value={form.title}
                  onChange={(event) => setField("title", event.target.value)}
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
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
                  Définissez l’action marketing proposée avant le jeu à chaque visite. Le joueur doit revenir ici après l’action pour participer.
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

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[18px] border border-[#d7e0ed] bg-[#f9fbfd] px-4 py-3 text-sm text-[#182033]">
              <input
                type="checkbox"
                checked={form.emailCaptureEnabled}
                onChange={(event) =>
                  setField("emailCaptureEnabled", event.target.checked)
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
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-semibold text-[#111827]">
                Choisissez l&apos;expérience client
              </h2>

              <label className="flex w-fit items-center gap-3 rounded-[8px] border border-border bg-linen-canvas px-3 py-2 text-sm font-semibold text-[#182033]">
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
                    onClick={() => setGameType(mode.value)}
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

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[#7b8496]">
                Template de page de jeu
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {(form.gameType === "wheel"
                  ? wheelPageTemplateOptions
                  : [
                      ...scratchPageTemplateOptions.filter((template) => template.value === "scratch-coral"),
                      ...scratchPageTemplateOptions.filter((template) => template.value !== "scratch-coral"),
                    ]
                ).map((template) => {
                  const active =
                    (form.presentation.layout.templateId ?? "classic") === template.value;

                  return (
                    <button
                      key={template.value}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          presentation: {
                            ...current.presentation,
                            layout: {
                              ...current.presentation.layout,
                              templateId: template.value,
                              blockSpacingPx: current.presentation.layout.blockSpacingPx,
                            },
                            heading:
                              template.value === "cocorico-wheel" || isClassicPopWheelTemplate(template.value)
                                ? { ...current.presentation.heading, fontFamily: "fredoka" }
                                : current.presentation.heading,
                            wheel:
                              template.value === "cocorico-wheel" &&
                              current.presentation.wheel.loseColor.toLowerCase() === DEFAULT_WHEEL_PRIMARY_COLOR
                                ? {
                                    ...current.presentation.wheel,
                                    loseColor: DEFAULT_COCORICO_PRIMARY_COLOR,
                                    rimColor: DEFAULT_COCORICO_PRIMARY_COLOR,
                                    alternateLoseColor: DEFAULT_COCORICO_PRIMARY_COLOR,
                                  }
                                : isClassicPopWheelTemplate(template.value) &&
                                    [DEFAULT_WHEEL_PRIMARY_COLOR, DEFAULT_COCORICO_PRIMARY_COLOR].includes(current.presentation.wheel.loseColor.toLowerCase())
                                  ? {
                                      ...current.presentation.wheel,
                                      loseColor: DEFAULT_CLASSIC_POP_PRIMARY_COLOR,
                                      rimColor: deriveLighterHex(DEFAULT_CLASSIC_POP_PRIMARY_COLOR),
                                      alternateLoseColor: deriveLighterHex(DEFAULT_CLASSIC_POP_PRIMARY_COLOR),
                                    }
                                  : current.presentation.wheel,
                          },
                          accent:
                            current.gameType === "scratch"
                              ? normalizeScratchAccent(current.accent, template.value)
                              : current.accent,
                        }))
                      }
                      className={`rounded-[22px] border p-4 text-left transition ${
                        active
                          ? "border-[#2f6df6] bg-[#eff4ff] shadow-[0_14px_26px_rgba(47,109,246,0.12)]"
                          : "border-[#d7e0ed] bg-white hover:border-[#b8c5da]"
                      }`}
                    >
                      <span className="text-sm font-semibold text-[#111827]">
                        {template.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-[#5c6577]">
                        {template.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {form.gameType === "scratch" ? (
              <label className="mt-6 block max-w-md text-sm">
                <span className="mb-1 block font-semibold text-[#111827]">
                  Couleur principale du ticket
                </span>
                <span className="mb-3 block text-xs leading-5 text-[#69758a]">
                  Elle définit la teinte de la zone à gratter et reste personnalisable.
                </span>
                <input
                  type="color"
                  value={form.accent.signal}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      accent: { ...current.accent, signal: event.target.value },
                    }))
                  }
                  className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                />
              </label>
            ) : null}
          </section>

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
                    className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                  />
                </label>
              ) : null}

              {form.logoMode === "image" ? (
              <div className="md:col-span-2">
              <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[24px] border border-dashed border-[#cfd9ea] bg-[#f7f9fc] p-4 text-sm transition hover:border-[#2f6df6] hover:bg-[#eef4ff]">
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
                      Formats PNG, JPEG, WebP ou GIF, 2 Mo maximum.
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) =>
                    uploadAsDataUrl(
                      event,
                      (value) => {
                        setImageUploadErrors((current) => ({ ...current, "campaign-logo": undefined }));
                        setForm((current) => ({ ...current, logoUrl: value, logoMode: "image" }));
                      },
                      (error) => {
                        setImageUploadErrors((current) => ({ ...current, "campaign-logo": error }));
                      },
                    )
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              {imageUploadErrors["campaign-logo"] ? (
                <p role="alert" className="mt-2 text-sm font-medium text-[#b42318]">
                  {imageUploadErrors["campaign-logo"]}
                </p>
              ) : null}
              </div>
              ) : null}

              {form.logoMode !== "none" ? (
              <label className="text-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[#616b7c]">Taille du logo</span>
                  <output className="font-semibold text-[#182033]">
                    {clampCampaignLogoSizePercent(form.presentation.logo.sizePercent)}%
                  </output>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={clampCampaignLogoSizePercent(form.presentation.logo.sizePercent)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      presentation: {
                        ...current.presentation,
                        logo: {
                          ...current.presentation.logo,
                          sizePercent: Number(event.target.value),
                        },
                      },
                    }))
                  }
                  className="w-full cursor-pointer accent-[#2f6df6]"
                  aria-label="Taille du logo"
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
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                />
              </label>
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
                  onChange={(event) => setField("subtitle", limitCampaignSubtitleLines(event.target.value))}
                  rows={3}
                  maxLength={MAX_CAMPAIGN_SUBTITLE_LENGTH}
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                />
                <span className="mt-1 block text-xs text-[#8993a6]">
                  {form.subtitle.length}/{MAX_CAMPAIGN_SUBTITLE_LENGTH} caractères · 3 lignes maximum pour conserver un rendu lisible sur mobile.
                </span>
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
                      className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                    />
                  </label>

                  <div className="text-sm">
                    <span className="mb-3 block text-[#616b7c]">Police du texte</span>
                    <div className="grid gap-3">
                      {(form.presentation.layout.templateId === "cocorico-wheel" ? cocoricoTextFontOptions : textFontOptions).map((font) => {
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
                            <span className={textFontClass(font)}>{textFontLabel(font)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </>
              ) : null}
              {!isExpertMode && currentTemplateId === "cocorico-wheel" ? (
                <label className="text-sm">
                  <span className="mb-2 flex items-center justify-between gap-3 text-[#616b7c]">
                    <span>Taille du texte (px)</span>
                    <output className="font-semibold text-aubergine">{form.presentation.heading.fontSizePx} px</output>
                  </span>
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
                    className="w-full rounded-[12px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                    aria-label="Taille du texte Cocorico (px)"
                  />
                </label>
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
                    ].filter((mode) => showBackgroundColor || mode.value === "image").map((mode) => {
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

                {showBackgroundColor && form.presentation.background.mode === "color" ? (
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
                          Formats PNG, JPEG, WebP ou GIF, 2 Mo maximum.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <div className="flex flex-col items-start">
                          <label className="cursor-pointer rounded-[18px] border border-[#d7e0ed] bg-white px-4 py-3 text-sm font-semibold text-[#182033]">
                            Importer une image
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              onChange={(event) =>
                                uploadAsDataUrl(
                                  event,
                                   (value) => {
                                     setImageUploadErrors((current) => ({ ...current, background: undefined }));
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
                                     }));
                                   },
                                   (error) => {
                                     setImageUploadErrors((current) => ({ ...current, background: error }));
                                   },
                                )
                              }
                              className="hidden"
                            />
                           </label>
                           {imageUploadErrors.background ? (
                             <p role="alert" className="mt-2 text-sm font-medium text-[#b42318]">
                               {imageUploadErrors.background}
                             </p>
                            ) : null}
                          </div>
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
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Affiche A4 / A5</p>
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
                        headlineTextColor: current.presentation.wheel.winColor,
                        headlineFontSizePx: current.presentation.heading.fontSizePx,
                        headlineFontFamily: current.presentation.heading.fontFamily,
                        wheel: {
                          ...current.presentation.wheel,
                          winColor: current.presentation.wheel.loseColor,
                          alternateWinColor: current.presentation.wheel.loseColor,
                          rimColor: current.presentation.wheel.loseColor,
                        },
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
              <div className="md:col-span-2">
              <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[24px] border border-dashed border-[#cfd9ea] bg-[#f7f9fc] p-4 text-sm transition hover:border-[#2f6df6] hover:bg-[#eef4ff]">
                <div>
                  <span className="mb-2 block text-[#616b7c]">Logo de l&apos;affiche</span>
                  <p className="max-w-md text-sm leading-6 text-[#516073]">
                    Par défaut, le logo de la campagne publique est utilisé.
                    Formats PNG, JPEG, WebP ou GIF, 2 Mo maximum.
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
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) =>
                    uploadAsDataUrl(
                      event,
                       (value) => {
                         setImageUploadErrors((current) => ({ ...current, "poster-logo": undefined }));
                         setForm((current) => ({
                           ...current,
                           presentation: {
                             ...current.presentation,
                             poster: {
                               ...current.presentation.poster,
                               logoUrl: value,
                             },
                           },
                         }));
                       },
                       (error) => {
                         setImageUploadErrors((current) => ({ ...current, "poster-logo": error }));
                       },
                    )
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              {imageUploadErrors["poster-logo"] ? (
                <p role="alert" className="mt-2 text-sm font-medium text-[#b42318]">
                  {imageUploadErrors["poster-logo"]}
                </p>
              ) : null}
              </div>

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
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                />
              </label>

              <div className="md:col-span-2">
              <label className="group relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-[24px] border border-dashed border-[#cfd9ea] bg-[#f7f9fc] p-4 text-sm transition hover:border-[#2f6df6] hover:bg-[#eef4ff]">
                <div>
                  <span className="mb-2 block text-[#616b7c]">Image de fond de l&apos;affiche</span>
                  <p className="max-w-md text-sm leading-6 text-[#516073]">
                    Une image par d&eacute;faut est appliqu&eacute;e tant qu&apos;aucun visuel personnalis&eacute; n&apos;est s&eacute;lectionn&eacute;.
                    Formats PNG, JPEG, WebP ou GIF, 2 Mo maximum.
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
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) =>
                    uploadAsDataUrl(
                      event,
                       (value) => {
                         setImageUploadErrors((current) => ({ ...current, "poster-background": undefined }));
                         setForm((current) => ({
                           ...current,
                           presentation: {
                             ...current.presentation,
                             poster: {
                               ...current.presentation.poster,
                               backgroundImageUrl: value,
                             },
                           },
                         }));
                       },
                       (error) => {
                         setImageUploadErrors((current) => ({ ...current, "poster-background": error }));
                       },
                    )
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              {imageUploadErrors["poster-background"] ? (
                <p role="alert" className="mt-2 text-sm font-medium text-[#b42318]">
                  {imageUploadErrors["poster-background"]}
                </p>
              ) : null}
              </div>

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
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
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
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                />
              </label>

              <div className="text-sm">
                <span className="mb-3 block text-[#616b7c]">Police du texte</span>
                <div className="grid gap-3">
                  {(form.presentation.layout.templateId === "cocorico-wheel" ? cocoricoTextFontOptions : textFontOptions).map((font) => {
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
                        <span className={textFontClass(font)}>{textFontLabel(font)}</span>
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
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
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
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                />
              </label>

              <div className="text-sm">
                <span className="mb-3 block text-[#616b7c]">Police du texte</span>
                <div className="grid gap-3">
                  {(form.presentation.layout.templateId === "cocorico-wheel" ? cocoricoTextFontOptions : textFontOptions).map((font) => {
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
                        <span className={textFontClass(font)}>{textFontLabel(font)}</span>
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
                    value={
                      currentTemplateId === "cocorico-wheel"
                        ? resolveCocoricoPrimaryColor(form.presentation.wheel.loseColor)
                        : form.presentation.wheel.loseColor
                    }
                    onChange={(event) => updatePrimaryWheelColor(event.target.value)}
                    className="h-14 w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-2 py-2 outline-none"
                  />
                </label>

              </div>
            </section>
          ) : false ? (
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
                  <span className="mb-3 block text-xs leading-5 text-[#8993a6]">
                    {currentTemplateId === "scratch-confetti" || currentTemplateId === "scratch-lilac"
                      ? "Ce template utilise sa propre palette ; la couleur sélectionnée ici n’est pas utilisée."
                      : "Utilisée pour le logo, le titre et les consignes. Elle est ajustée automatiquement pour rester lisible selon le template."}
                  </span>
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
          ) : null}

          <section className="okado-card p-6">
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

          <section className="okado-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Dotation</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                  Lots, validité et conditions
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
                    Suggérer des lots
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
                    Le lot sera disponible 24 h après la participation, à partir du lendemain.
                  </span>
                </span>
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
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-white px-4 py-3 outline-none"
                />
              </label>

              {isExpertMode ? (
                <label className="text-sm">
                  <span className="mb-2 block text-[#616b7c]">
                    Délai entre deux participations (jours)
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
              <span>Probabilité de gain (%)</span>
              <span>Coût unitaire</span>
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
              Total des probabilités de gain : {totalPrizeProbability} %
            </div>

            {prizeValidationMessages.length > 0 ? (
              <div
                role="alert"
                aria-live="polite"
                className="mt-4 rounded-[18px] border border-[#f3c8c8] bg-[#fff7f7] px-4 py-4 text-sm text-[#9f1239]"
              >
                <p className="font-semibold text-[#861c35]">
                  Vérifiez la dotation avant l&apos;enregistrement
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

        <div className="space-y-6">
          <section className="pointer-events-none okado-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Prévisualisation mobile
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
                          title="Télécharger le QR code de production"
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                          <span>Télécharger le QR code</span>
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2 rounded-[10px] px-3 py-2.5"
                        onSelect={() => setQrPreviewOpen(true)}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        <span>Prévisualisation</span>
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
                    Prévisualiser
                  </Link>
                </div>
              ) : null}
            </div>

            <SharedCampaignLivePreview merchant={merchant} preview={deferredPreview} compact />

          </section>
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
            router.replace(`/campaigns/${savedCampaignId}/edit/guided`);
          }
        }}
      />
    </div>
  );
}
