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
  onSeleãİ7òÚ$z{-®éÜj×6WDf÷&Ò‚†7W'&VçB’Óâ‡°Ğ¢ââæ7W'&VçBÀĞ¢&Wv&E'VÆW3¢°Ğ¢ââæ7W'&VçBç&Wv&E'VÆW2ÀĞ¢f–Æ&ÆTgFW$†÷W'3¢WfVçBçF&vWBæ6†V6¶VBò#B¢ÀĞ¢ÒÀĞ¢Ò’Ğ¢ĞĞ¢6Æ74æÖSÒ&×BÓ‚ÓBrÓB6‡&–æ²Ó7W'6÷"×ö–çFW"&÷VæFVB&÷&FW"Õ²66&CVSÒFW‡BÕ²3&cfFceÒfö7W3§&–ærÕ²3&cfFceÒó# Ğ¢óàĞ¢Ç7ãàĞ¢Ç7â6Æ74æÖSÒ&&Æö6²föçB×6VÖ–&öÆBFW‡BÕ²3ƒ#35Ò#àĞ¢Æ÷BF—7öæ–&ÆRÆ÷'2Bf÷3·VæR&ö6†–æRf—6—FPĞ¢Â÷7ãàĞ¢Ç7â6Æ74æÖSÒ&×BÓ&Æö6²FW‡B×‡2ÆVF–ærÓRFW‡BÕ²3v#ƒC“eÒ#àĞ¢ÆRÆ÷B6W&F—7öæ–&ÆR#B‚,:‡2Æ'F–6—F–öâÂ:'F—"GRÆVæFVÖ–âàĞ¢Â÷7ãàĞ¢Â÷7ãàĞ¢ÂöÆ&VÃàĞ Ğ¢ÆÆ&VÂ6Æ74æÖSÒ'FW‡B×6Ò#àĞ¢Ç7â6Æ74æÖSÒ&Ö"Ó"&Æö6²FW‡BÕ²3cf#v5Ò#äGW,:–RFR&WG&—B†¦÷W'2“Â÷7ãàĞ¢Æ–çW@Ğ¢G—SÒ&çVÖ&W" Ğ¢Ö–ã×³ĞĞ¢fÇVS×¶f÷&Òç&Wv&E'VÆW2æf–Æ&–Æ—G”GW&F–öäF—7ĞĞ¢öä6†ævS×²†WfVçB’ÓàĞ¢6WDf÷&Ò‚†7W'&VçB’Óâ‡°Ğ¢ââæ7W'&VçBÀĞ¢&Wv&E'VÆW3¢°Ğ¢ââæ7W'&VçBç&Wv&E'VÆW2ÀĞ¢f–Æ&–Æ—G”GW&F–öäF—3¢çVÖ&W"†WfVçBçF&vWBçfÇVRÇÂ’ÀĞ¢ÒÀĞ¢Ò’Ğ¢ĞĞ¢6Æ74æÖSÒ'rÖgVÆÂ&÷VæFVBÕ³#…Ò&÷&FW"&÷&FW"Õ²6CvSVEÒ&r×v†—FR‚ÓB’Ó2÷WFÆ–æRÖæöæR Ğ¢óàĞ¢ÂöÆ&VÃàĞ Ğ¢¶—4W‡W'DÖöFRò€Ğ¢ÆÆ&VÂ6Æ74æÖSÒ'FW‡B×6Ò#àĞ¢Ç7â6Æ74æÖSÒ&Ö"Ó"&Æö6²FW‡BÕ²3cf#v5Ò#àĞ¢L:–Æ’VçG&RFWW‚'F–6—F–öç2†¦÷W'2Ğ¢Â÷7ãàĞ¢Æ–çW@Ğ¢G—SÒ&çVÖ&W" Ğ¢Ö–ã×³ĞĞ¢Öƒ×³3cWĞĞ¢fÇVS×¶f÷&Òç&Wv&E'VÆW2ç'F–6—F–öä–çFW'fÄF—7ĞĞ¢öä6†ævS×²†WfVçB’ÓàĞ¢6WDf÷&Ò‚†7W'&VçB’Óâ‡°Ğ¢ââæ7W'&VçBÀĞ¢&Wv&E'VÆW3¢°Ğ¢ââæ7W'&VçBç&Wv&E'VÆW2ÀĞ¢'F–6—F–öä–çFW'fÄF—3¢ÖF‚æÖ‚ƒÂçVÖ&W"†WfVçBçF&vWBçfÇVRÇÂ’’ÀĞ¢ÒÀĞ¢Ò’Ğ¢ĞĞ¢6Æ74æÖSÒ'rÖgVÆÂ&÷VæFVBÕ³#…Ò&÷&FW"&÷&FW"Õ²6CvSVEÒ&r×v†—FR‚ÓB’Ó2÷WFÆ–æRÖæöæR Ğ¢óàĞ¢ÂöÆ&VÃàĞ¢’¢çVÆÇĞĞ Ğ¢ÆF—b6Æ74æÖSÒ'76R×’Ó2&÷VæFVBÕ³#…Ò&÷&FW"&÷&FW"Õ²6CvSVEÒ&r×v†—FRÓBFW‡B×6ÒFW‡BÕ²3ƒ#35Ò#àĞ¢ÆÆ&VÂ6Æ74æÖSÒ&fÆW‚—FV×2Ö6VçFW"vÓ2#àĞ¢Æ–çW@Ğ¢G—SÒ&6†V6¶&÷‚ Ğ¢6†V6¶VC×¶f÷&Òç&Wv&E'VÆW2æ—5v–ææ–ætWfW'•F–ÖWĞĞ¢öä6†ævS×²†WfVçB’ÓàĞ¢6WDf÷&Ò‚†7W'&VçB’Óâ‡°Ğ¢ââæ7W'&VçBÀĞ¢&Wv&E'VÆW3¢°Ğ¢ââæ7W'&VçBç&Wv&E'VÆW2ÀĞ¢—5v–ææ–ætWfW'•F–ÖS¢WfVçBçF&vWBæ6†V6¶VBÀĞ¢ÒÀĞ¢Ò’Ğ¢ĞĞ¢óàĞ¢¦WRRvvæç@Ğ¢ÂöÆ&VÃàĞ¢ÂöF—càĞ¢ÂöF—càĞ Ğ¢ÆF—b6Æ74æÖS×¶×BÓb†–FFVâvÓ2&÷VæFVBÕ³#'…Ò&rÕ²6cvc–f5Ò‚ÓB’Ó2FW‡BÕ³…ÒWW&66RG&6¶–ærÕ³ã#FVÕÒFW‡BÕ²3v#ƒC“eÒ†Ã¦w&–BG°Ğ¢–æ—F–Ä6×–vàĞ¢ò&w&–BÖ6öÇ2Õ¶Ö–æÖ‚ƒƒ‚Ãã3Vg"•öÖ–æÖ‚ƒ‚Âãvg"•öÖ–æÖ‚ƒ‚ÂãsVg"•öÖ–æÖ‚ƒ3‚Âã–g"•öÖ–æÖ‚ƒ#‚ÂãƒVg"•öÖ–æÖ‚ƒ#‚ÃãVg"•óSg…Ò Ğ¢¢&w&–BÖ6öÇ2Õ¶Ö–æÖ‚ƒƒ‚ÃãVg"•öÖ–æÖ‚ƒ‚Âãvg"•öÖ–æÖ‚ƒ3‚Âã–g"•öÖ–æÖ‚ƒ#‚ÂãƒVg"•öÖ–æÖ‚ƒ#‚ÃãVg"•óSg…Ò Ğ¢ÖÓàĞ¢Ç7ãäF÷FF–öãÂ÷7ãàĞ¢Ç7ãå7Fö6²–æ—F–ÃÂ÷7ãàĞ¢¶–æ—F–Ä6×–vâòÇ7ãå7Fö6²F—7öæ–&ÆSÂ÷7ãâ¢çVÆÇĞĞ¢Ç7ãå&ö&&–Æ—L:’FRv–â‚R“Â÷7ãàĞ¢Ç7ãä6ü;·BVæ—F—&SÂ÷7ãàĞ¢Ç7âóàĞ¢ÂöF—càĞ Ğ¢ÆF—b6Æ74æÖSÒ&×BÓB76R×’ÓB#àĞ¢¶f÷&Òç&—¦W2æÆVæwF‚ÓÓÒò€Ğ¢ÆF—b6Æ74æÖSÒ'&÷VæFVBÕ³#G…Ò&÷&FW"&÷&FW"ÖF6†VB&÷&FW"Õ²66fC–VÒ&r×v†—FR‚ÓR’ÓbFW‡B×6ÒÆVF–ærÓbFW‡BÕ²3V3cSsuÒ#àĞ¢V7VâÆ÷Bâf÷3¶W7BVæ6÷&R6öæf–wW"fV7WFS²â¦÷WFW¢RÖö–ç2VâÆ÷B÷W"÷Wfö— Ğ¢Vç&Vv—7G&W"Âf÷3¶æ–ÖF–öâàĞ¢ÂöF—càĞ¢’¢çVÆÇĞĞ¢¶f÷&Òç&—¦W2æÖ‚‡&—¦R’Óâ€Ğ¢Ä6×–vå&—¦U&÷pĞ¢¶W“×·&—¦Ræ–GĞĞ¢&—¦S×·&—¦WĞĞ¢—4W†—7F–æt6×–vã×´&ööÆVâ†–æ—F–Ä6×–vâ—ĞĞ¢öåWFFS×·WFFU&—¦WĞĞ¢öå&VÖ÷fS×·&VÖ÷fU&—¦WĞĞ¢öä÷Vä6öæF—F–öç3×²‡&—¦T–B’Óâ6WDVF—F–æu&—¦T6öæF—F–öç4–B‡&—¦T–BóòçVÆÂ—ĞĞ¢óàĞ¢’—ĞĞ¢ÂöF—càĞ Ğ¢ÆF—b6Æ74æÖSÒ&×BÓ2†–FFVâw&–BÖ6öÇ2Õ¶Ö–æÖ‚ƒƒ‚ÃãVg"•öÖ–æÖ‚ƒ‚Âãvg"•öÖ–æÖ‚ƒ3‚Âã–g"•öÖ–æÖ‚ƒ#‚ÂãƒVg"•öÖ–æÖ‚ƒ#‚ÃãVg"•óSg…ÒvÓ2†Ã¦w&–B#àĞ¢Ç7âóàĞ¢Ç7âóàĞ¢ÆF—`Ğ¢6Æ74æÖS×¶&÷VæFVBÕ³g…Ò&÷&FW"‚Ó2’Ó"FW‡BÖ6VçFW"FW‡B×6ÒföçB×6VÖ–&öÆBG°Ğ¢F÷FÅ&—¦U&ö&&–Æ—G’â Ğ¢ò&&÷&FW"Õ²6fV66Ò&rÕ²6ffcc%ÒFW‡BÕ²6&S#65Ò Ğ¢¢F÷FÅ&—¦U&ö&&–Æ—G’ÓÓÒ Ğ¢ò&&÷&FW"Õ²6&&cvCÒ&rÕ²6cfFcEÒFW‡BÕ²3Sƒ6EÒ Ğ¢¢&&÷&FW"Õ²6F&SFcÒ&rÕ²6cvc–f5ÒFW‡BÕ²3cCsC†%Ò Ğ¢ÖĞĞ¢àĞ¢F÷FÂ¢·F÷FÅ&—¦U&ö&&–Æ—G—ÒPĞ¢ÂöF—càĞ¢Ç7âóàĞ¢Ç7âóàĞ¢Ç7âóàĞ¢ÂöF—càĞ Ğ¢ÆF—`Ğ¢6Æ74æÖS×¶×BÓB&÷VæFVBÕ³g…Ò&÷&FW"‚ÓB’Ó2FW‡B×6ÒföçB×6VÖ–&öÆB†Ã¦†–FFVâG°Ğ¢F÷FÅ&—¦U&ö&&–Æ—G’â Ğ¢ò&&÷&FW"Õ²6fV66Ò&rÕ²6ffcc%ÒFW‡BÕ²6&S#65Ò Ğ¢¢F÷FÅ&—¦U&ö&&–Æ—G’ÓÓÒ Ğ¢ò&&÷&FW"Õ²6&&cvCÒ&rÕ²6cfFcEÒFW‡BÕ²3Sƒ6EÒ Ğ¢¢&&÷&FW"Õ²6F&SFcÒ&rÕ²6cvc–f5ÒFW‡BÕ²3cCsC†%Ò Ğ¢ÖĞĞ¢àĞ¢F÷FÂFW2&ö&&–Æ—L:—2FRv–â¢·F÷FÅ&—¦U&ö&&–Æ—G—ÒPĞ¢ÂöF—càĞ Ğ¢·&—¦UfÆ–FF–öäÖW76vW2æÆVæwF‚âò€Ğ¢ÆF—`Ğ¢&öÆSÒ&ÆW'B Ğ¢&–ÖÆ—fSÒ'öÆ—FR Ğ¢6Æ74æÖSÒ&×BÓB&÷VæFVBÕ³‡…Ò&÷&FW"&÷&FW"Õ²6c63†3…Ò&rÕ²6ffcvcuÒ‚ÓB’ÓBFW‡B×6ÒFW‡BÕ²3–c#3•Ò Ğ¢àĞ¢Ç6Æ74æÖSÒ&föçB×6VÖ–&öÆBFW‡BÕ²3ƒc33UÒ#àĞ¢l:—&–f–W¢ÆF÷FF–öâfçBÂf÷3¶Vç&Vv—7G&VÖVç@Ğ¢Â÷àĞ¢ÇVÂ6Æ74æÖSÒ&×BÓ"76R×’ÓãRÆVF–ærÓb#àĞ¢·&—¦UfÆ–FF–öäÖW76vW2æÖ‚‡fÆ–FF–öäÖW76vR’Óâ€Ğ¢ÆÆ’¶W“×·fÆ–FF–öäÖW76vWÒ6Æ74æÖSÒ&fÆW‚vÓ"#àĞ¢Ç7â&–Ö†–FFVãÒ'G'VR#î(
#Â÷7ãàĞ¢Ç7ãç·fÆ–FF–öäÖW76vWÓÂ÷7ãàĞ¢ÂöÆ“àĞ¢’—ĞĞ¢Â÷VÃàĞ¢ÂöF—càĞ¢’¢çVÆÇĞĞ¢Â÷6V7F–öãàĞ Ğ¢¶f÷&Òæ–BòÄ6×–väVÖ–Å&Wf–WrÖW&6†çC×¶ÖW&6†çGÒf÷&Ó×¶f÷&×Òóâ¢çVÆÇĞĞ Ğ¢¶ÖW76vRò€Ğ¢Ç6V7F–öàĞ¢6Æ74æÖS×¶&÷VæFVBÕ³#G…Ò&÷&FW"‚ÓR’ÓBFW‡B×6Ò6†F÷rÕ³ó‡…óCG…÷&v&ƒ#"Ã3bÃcbÃã•ÒG°Ğ¢ÖW76vUFöæRÓÓÒ&W'&÷" Ğ¢ò&&÷&FW"Õ²6fV66Ò&rÕ²6ffcc%ÒFW‡BÕ²3–c#3•Ò Ğ¢¢&&÷&FW"Õ²6F&SFcÒ&r×v†—FRFW‡BÕ²3ƒ#35Ò Ğ¢ÖĞĞ¢àĞ¢ÆF—b6Æ74æÖSÒ&föçB×6VÖ–&öÆB#àĞ¢¶ÖW76vUFöæRÓÓÒ&W'&÷""ò$Vç&Vv—7G&VÖVçB–×÷76–&ÆR"¢$–æf÷&ÖF–öâ'ĞĞ¢ÂöF—càĞ¢Ç6Æ74æÖSÒ&×BÓÆVF–ærÓb#ç¶ÖW76vWÓÂ÷àĞ¢Â÷6V7F–öãàĞ¢’¢çVÆÇĞĞ¢ÂöF—càĞ Ğ¢ÆF—`Ğ¢6Æ74æÖSÒ'76R×’Ób†Ã§7F–6·’†Ã§6VÆb×7F'B Ğ¢7G–ÆS×·²F÷¢6†÷u7F–6·”7F–öç2ò#sg‚"¢##G‚"×ĞĞ¢àĞ¢Ç6V7F–öâ6Æ74æÖSÒ'ö–çFW"ÖWfVçG2ÖæöæRö¶FòÖ6&BÓR#àĞ¢ÆF—b6Æ74æÖSÒ&fÆW‚—FV×2Ö6VçFW"§W7F–g’Ö&WGvVVâvÓ2#àĞ¢ÆF—càĞ¢Ç6Æ74æÖSÒ'FW‡B×‡2WW&66RG&6¶–ærÕ³ã#†VÕÒFW‡BÕ²3v#ƒC“eÒ#àĞ¢,:—f—7VÆ—6F–öâÖö&–ÆPĞ¢Â÷àĞ¢Æƒ"6Æ74æÖSÒ&ö¶Fò×6V7F–öâ×F—FÆR×BÓ"#å&VæGRV&Æ–3Âöƒ#àĞ¢ÂöF—càĞ¢¶f÷&Òæ–Bò€Ğ¢ÆF—b6Æ74æÖSÒ&ö¶FòÖ7F–öâ×&÷rö–çFW"ÖWfVçG2ÖWFòfÆW‚fÆW‚×w&§W7F–g’ÖVæBvÓ"#àĞ¢ÄG&÷F÷väÖVçSàĞ¢ÄG&÷F÷väÖVçUG&–vvW"46†–ÆCàĞ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢6Æ74æÖSÒ&ö¶Fò×6V6öæF'’Ö7F–öâvÓ"‚ÓB Ğ¢&–ÖÆ&VÃÒ$÷F–öç2GR"6öFR Ğ¢àĞ¢Å$6öFR6Æ74æÖSÒ&‚ÓBrÓB"&–Ö†–FFVãÒ'G'VR"óàĞ¢Ç7ãå"6öFSÂ÷7ãàĞ¢Ä6†Wg&öäF÷vâ6Æ74æÖSÒ&‚ÓBrÓB"&–Ö†–FFVãÒ'G'VR"óàĞ¢Âö'WGFöãàĞ¢ÂôG&÷F÷väÖVçUG&–vvW#àĞ¢ÄG&÷F÷väÖVçT6öçFVç@Ğ¢Æ–vãÒ&VæB Ğ¢6Æ74æÖSÒ'rÕ³#S…Ò&÷VæFVBÕ·f"‚ÒÖö¶Fò×&F—W2Ö6öçG&öÂ•Ò&÷&FW"Ö&÷&FW"ÓãR6†F÷rÕ·f"‚Ò×6†F÷r×&öGV7BÖ6&B•Ò Ğ¢àĞ¢ÄG&÷F÷väÖVçT—FVÒ46†–ÆB6Æ74æÖSÒ&7W'6÷"×ö–çFW"vÓ"&÷VæFVBÕ³…Ò‚Ó2’Ó"ãR#àĞ¢ÆĞ¢‡&Vc×¶ö’ö6×–vç2òG¶f÷&Òæ–GÒ÷&ĞĞ¢F÷væÆö@Ğ¢F—FÆSÒ%L:–Ì:–6†&vW"ÆR"6öFRFR&öGV7F–öâ Ğ¢àĞ¢ÄF÷væÆöB6Æ74æÖSÒ&‚ÓBrÓB"&–Ö†–FFVãÒ'G'VR"óàĞ¢Ç7ãåL:–Ì:–6†&vW"ÆR"6öFSÂ÷7ãàĞ¢ÂöàĞ¢ÂôG&÷F÷väÖVçT—FVÓàĞ¢ÄG&÷F÷väÖVçT—FVĞĞ¢6Æ74æÖSÒ&7W'6÷"×ö–çFW"vÓ"&÷VæFVBÕ³…Ò‚Ó2’Ó"ãR Ğ¢öå6VÆV7C×²‚’Óâ6WE%&Wf–Wt÷Vâ‡G'VR—ĞĞ¢àĞ¢ÄW–R6Æ74æÖSÒ&‚ÓBrÓB"&–Ö†–FFVãÒ'G'VR"óàĞ¢Ç7ãå,:—f—7VÆ—6F–öãÂ÷7ãàĞ¢ÂôG&÷F÷väÖVçT—FVÓàĞ¢ÂôG&÷F÷väÖVçT6öçFVçCàĞ¢ÂôG&÷F÷väÖVçSàĞ¢ÄÆ–æ°Ğ¢‡&Vc×¶ö6×–vç2òG¶f÷&Òæ–GÒ÷÷7FW&ĞĞ¢&VfWF6ƒ×¶fÇ6WĞĞ¢6Æ74æÖSÒ&ö¶Fò×6V6öæF'’Ö7F–öâ‚ÓB Ğ¢àĞ¢ff–6†PĞ¢ÂôÆ–æ³àĞ¢ÄÆ–æ°Ğ¢‡&Vc×¶ö6×–vâòG¶f÷&Òæ–GÓ÷&Wf–WsÓĞĞ¢&VfWF6ƒ×¶fÇ6WĞĞ¢F&vWCÒ%ö&Ææ² Ğ¢&VÃÒ&æ÷&VfW'&W" Ğ¢6Æ74æÖSÒ&ö¶Fò×&–Ö'’Ö7F–öâ‚ÓB Ğ¢àĞ¢,:—f—7VÆ—6W Ğ¢ÂôÆ–æ³àĞ¢ÂöF—càĞ¢’¢çVÆÇĞĞ¢ÂöF—càĞ Ğ¢Å6†&VD6×–väÆ—fU&Wf–WrÖW&6†çC×¶ÖW&6†çGÒ&Wf–Ws×¶FVfW'&VE&Wf–WwÒ6ö×7BóàĞ Ğ¢Â÷6V7F–öãàĞ¢ÂöF—càĞ¢ÂöF—càĞ¢ÆF—b6Æ74æÖSÒ'ö–çFW"ÖWfVçG2ÖæöæRf—†VB–ç6WB×‚Ó&÷GFöÒÓ¢Ó3‚ÓB"ÓB†Ã¦†–FFVâ#àĞ¢ÆF—b6Æ74æÖSÒ'ö–çFW"ÖWfVçG2ÖWFò×‚ÖWFòÖ‚×rÕ³s#…Ò&÷VæFVBÕ³‡…Ò&÷&FW"&÷&FW"Ö&÷&FW"&r×v†—FRó“bÓ26†F÷r×&öGV7BÖ6&B&6¶G&÷Ö&ÇW"#àĞ¢ÆF—b6Æ74æÖSÒ&w&–BvÓ26Ó¦w&–BÖ6öÇ2Ó"#àĞ¢·6fVD6×–vä–Bò€Ğ¢ÃàĞ¢ÄÆ–æ°Ğ¢‡&Vc×¶ö6×–vâòG·6fVD6×–vä–GÓ÷&Wf–WsÓĞĞ¢&VfWF6ƒ×¶fÇ6WĞĞ¢F&vWCÒ%ö&Ææ² Ğ¢6Æ74æÖSÒ&ö¶Fò×&–Ö'’Ö7F–öâ‚ÓB Ğ¢àĞ¢,:—f—7VÆ—6W Ğ¢ÂôÆ–æ³àĞ¢ÄÆ–æ°Ğ¢‡&Vc×¶ö6×–vç2òG·6fVD6×–vä–GÒ÷÷7FW&ĞĞ¢&VfWF6ƒ×¶fÇ6WĞĞ¢6Æ74æÖSÒ&ö¶Fò×6V6öæF'’Ö7F–öâ‚ÓB Ğ¢àĞ¢ff–6†PĞ¢ÂôÆ–æ³àĞ¢ÂóàĞ¢’¢çVÆÇĞĞ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢öä6Æ–6³×·6fT6×–vçĞĞ¢F—6&ÆVC×¶—56f–æwĞĞ¢6Æ74æÖS×¶ö¶FòÖf–ÆÆVBÖ7F–öâ‚ÓBF—6&ÆVC¦7W'6÷"Öæ÷BÖÆÆ÷vVBF—6&ÆVC¦÷6—G’ÓsG°Ğ¢6fVD6×–vä–Bò'6Ó¦6öÂ×7âÓ""¢'rÖgVÆÂ Ğ¢ÖĞĞ¢àĞ¢¶—56f–ærò$Vç&Vv—7G&VÖVçBâââ"¢$Vç&Vv—7G&W"'ĞĞ¢Âö'WGFöãàĞ¢ÂöF—càĞ¢ÂöF—càĞ¢ÂöF—càĞ¢¶f÷&Òæ–Bò€Ğ¢Ä6×–vå&Wf–Wu$F–ÆöpĞ¢÷Vã×·%&Wf–Wt÷VçĞĞ¢6×–vä–C×¶f÷&Òæ–GĞĞ¢öä6Æ÷6S×²‚’Óâ6WE%&Wf–Wt÷Vâ†fÇ6R—ĞĞ¢óàĞ¢’¢çVÆÇĞĞ¢Å&—¦T6öæF—F–öç4F–ÆöpĞ¢÷Vã×´&ööÆVâ†VF—F–æu&—¦R—ĞĞ¢&—¦TÆ&VÃ×¶VF—F–æu&—¦SòæÆ&VÂóò"'ĞĞ¢W&6†6U&WV—&VC×´&ööÆVâ†VF—F–æu&—¦SòçW&6†6U&WV—&VB—ĞĞ¢fÇVS×¶VF—F–æu&—¦SòçW6vT6öæF—F–öç2óò"'ĞĞ¢öåW&6†6U&WV—&VD6†ævS×²†æW‡EfÇVR’Óâ°Ğ¢–b†VF—F–æu&—¦Sòæ–B’°Ğ¢WFFU&—¦R†VF—F–æu&—¦Ræ–BÂ²W&6†6U&WV—&VC¢æW‡EfÇVRÒ“°Ğ¢ĞĞ¢×ĞĞ¢öä6†ævS×²†æW‡EfÇVR’Óâ°Ğ¢–b†VF—F–æu&—¦Sòæ–B’°Ğ¢WFFU&—¦R†VF—F–æu&—¦Ræ–BÂ²W6vT6öæF—F–öç3¢æW‡EfÇVRÒ“°Ğ¢ĞĞ¢×ĞĞ¢öä6Æ÷6S×²‚’Óâ6WDVF—F–æu&—¦T6öæF—F–öç4–B†çVÆÂ—ĞĞ¢óàĞ¢Å&—¦U7VvvW7F–öäF–ÆöpĞ¢÷Vã×·&—¦U7VvvW7F–öç4÷VçĞĞ¢7VvvW7F–öç3×·&—¦U7VvvW7F–öç7ĞĞ¢–æGW7G'“×¶ÖW&6†çBæ–æGW7G'—ĞĞ¢&VÖ–æ–æu&ö&&–Æ—G“×·&VÖ–æ–æu&—¦U&ö&&–Æ—G—ĞĞ¢öäFC×¶FE7VvvW7FVE&—¦WĞĞ¢öä6Æ÷6S×²‚’Óâ6WE&—¦U7VvvW7F–öç4÷Vâ†fÇ6R—ĞĞ¢óàĞ¢Ä&6¶w&÷VæDÆ–'&'”F–ÆöpĞ¢÷Vã×¶&6¶w&÷VæDÆ–'&'”F–Æöt÷VçĞĞ¢öä6Æ÷6S×²‚’Óâ6WD&6¶w&÷VæDÆ–'&'”F–Æöt÷Vâ†fÇ6R—ĞĞ¢—FV×3×¶&6¶w&÷VæDÆ–'&'—ĞĞ¢—4ÆöF–æs×¶—4Æ–'&'”ÆöF–æwĞĞ¢W'&÷#×¶Æ–'&'”ÖW76vWĞĞ¢6VÆV7FVD–ÖvUW&Ã×¶f÷&Òç&W6VçFF–öâæ&6¶w&÷VæBæ–ÖvUW&Âóò"'ĞĞ¢öå6VÆV7C×·6VÆV7D&6¶w&÷VæD–ÖvWĞĞ¢óàĞ¢ÅfÆ–FF–öäF–ÆöpĞ¢÷Vã×·6fTF–Æöt÷VçĞĞ¢F—FÆS×·6fTF–ÆöuF—FÆWĞĞ¢FW67&—F–öã×·6fTF–ÆötFW67&—F–öçĞĞ¢FöæS×·6fTF–ÆöuFöæWĞĞ¢7FÆ&VÃÒ$6öçF–çVW" Ğ¢öä6Æ÷6S×²‚’Óâ°Ğ¢6WE6fTF–Æöt÷Vâ†fÇ6R“°Ğ Ğ¢–b‡6fTF–ÆöuFöæRÓÒ&W'&÷""bb–æ—F–Ä6×–vâbb6fVD6×–vä–B’°Ğ¢&÷WFW"ç&WÆ6R†ö6×–vç2òG·6fVD6×–vä–GÒöVF—F“°Ğ¢ĞĞ¢×ĞĞ¢óàĞ¢ÂöF—càĞ¢“°Ğ§ĞĞ 