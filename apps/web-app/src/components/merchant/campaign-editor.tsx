"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  BadgePercent,
  Coffee,
  Gift,
  Plus,
  CirclePlus,
  Soup,
  Sparkles,
  ChevronDown,
  ChevronUp,
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
import { CampaignEmailPreview } from "@/components/merchant/campaign-email-preview";
import { CampaignLivePreview as SharedCampaignLivePreview } from "@/components/merchant/campaign-live-preview";
import { SocialChannelIcon } from "@/components/merchant/social-channel-icon";
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
} from "@/lib/campaign-defaults";
import { fluidType } from "@/lib/responsive";
import { buildWheelVisualSegments, WheelVisualSegment } from "@/lib/wheel-segments";
import { isRestaurantIndustry } from "@/lib/merchant-options";
import {
  ActionKind,
  BackgroundLibraryAsset,
  CampaignAction,
  CampaignLibraryItem,
  CampaignPerformance,
  CampaignSetupInput,
  GamePageTemplateId,
  GameType,
  Merchant,
  PrizeSuggestion,
  TextAlign,
  TextFont,
} from "@/lib/types";

const WheelOfFortune = dynamic(
  () => import("@/components/public/wheel-of-fortune").then((mod) => mod.WheelOfFortune),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-[32px] bg-white/70 text-sm text-[#7b8496]">
        Chargement de la pr√©visualisation...
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
        Chargement de la pr√©visualisation...
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
        Chargement de la pr√©visualisation...
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
  campaignLibrary?: CampaignLibraryItem[];
  deferInlineAssets?: boolean;
};

type EditorState = Omit<
  CampaignSetupInput,
  "goalType" | "successMetric" | "targetUrl"
>;

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

const textAlignOptions: TextAlign[] = ["left", "center", "right"];
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
    description: "Un rendu sobre, centr√© sur votre logo, votre message et la roue.",
  },
  {
    value: "restaurant-pop",
    title: "Visuel pop",
    description: "Un univers plus √©v√©nementiel avec formes, contraste et roue fa√ßon jeu concours.",
  },
  {
    value: "cosmic-orbit",
    title: "Orbit n√©on",
    description: "Un univers nocturne et lumineux, inspir√© des bornes de jeu contemporaines.",
  },
  {
    value: "sunburst-festival",
    title: "Soleil pop",
    description: "Un graphisme solaire, joyeux et tr√®s lisible sur mobile comme sur tablette.",
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
      "Un moment fort en caisse, sur borne ou sur affichage mobile plein √©cran pour g√©n√©rer du trafic en point de vente.",
  },
  {
    value: "scratch",
    eyebrow: "R√©v√©lation imm√©diate",
    title: "Ticket √† gratter",
    description: "Un format ludique et tactile pour r√©v√©ler un gain instantan√© sur mobile, borne ou tablette.",
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
    title: "Coffre n√©on",
    description: "Un univers nocturne et lumineux, avec une illustration de coffre-fort avant le grattage.",
  },
  {
    value: "scratch-coral",
    title: "Corail joyeux",
    description: "Une carte claire avec un espace de r√©v√©lation orange, inspir√©e des tickets cadeaux.",
  },
  {
    value: "scratch-lilac",
    title: "Cadeau lilas",
    description: "Un univers lilas doux, avec une illustration cadeau claire et contrast√©e.",
  },
  {
    value: "scratch-sunburst",
    title: "Rayons soleil",
    description: "Un ticket jaune √©clatant avec des rayons graphiques et une r√©v√©lation tr√®s visible.",
  },
  {
    value: "scratch-confetti",
    title: "Carte confettis",
    description: "Une carte solaire et festive, pens√©e pour une interaction tactile tr√®s imm√©diate.",
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
    return "Impossible d'enregistrer l'animation. V√©rifiez les champs obligatoires puis r√©essayez.";
  }

  if (message.toLowerCase().includes("origine de requ")) {
    return "Votre session de s√©curit√© n'est plus valide ou la page a √©t√© ouverte depuis une adresse non autoris√©e. Rechargez la page depuis votre espace Okado puis r√©essayez.";
  }

  if (message.toLowerCase().includes("bloqu")) {
    return "Votre session de s√©curit√© n'est plus valide ou la page a √©t√© ouverte depuis une adresse non autoris√©e. Rechargez la page depuis votre espace Okado puis r√©essayez.";
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

function SaveFeedbackDialog({
  open,
  title,
  description,
  tone = "info",
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  tone?: "info" | "error";
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f1220]/52 px-4 pb-4 pt-10 backdrop-blur-[6px] sm:items-center sm:p-6">
      <div className="w-full max-w-[420px] rounded-[34px] bg-white p-6 text-[#111827] shadow-[0_34px_90px_rgba(18,24,39,0.24)]">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
            tone === "error" ? "bg-[#fff1f2] text-[#be123c]" : "bg-[#eef4ff] text-[#2f6df6]"
          }`}
        >
          {tone === "error" ? "!" : "‚úì"}
        </div>
        <h2 className="mt-5 text-center text-2xl font-semibold text-[#0f1728]">{title}</h2>
        <p className="mt-3 text-center text-sm leading-7 text-[#5c657„Õ:Ú⁄$z{-ÆÈ‹j◊ù÷É◊≥3'––¢f«VS◊∂f˜&“Á&W6VÁFFñˆ‚Ê'WGFˆ‚ÁFWáE6ó¶Uá––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢6WDf˜&“ÇÜ7W'&VÁBí”‚á∞–¢‚‚Ê7W'&VÁB¿–¢&W6VÁFFñˆ„¢∞–¢‚‚Ê7W'&VÁBÁ&W6VÁFFñˆ‚¿–¢'WGFˆ„¢∞–¢‚‚Ê7W'&VÁBÁ&W6VÁFFñˆ‚Ê'WGFˆ‚¿–¢FWáE6ó¶UÉ¢ÁV÷&W"ÜWfVÁBÁF&vWBÁf«VR«¬#Bí¿–¢“¿–¢“¿–¢“íê–¢––¢6∆74Ê÷S“'r÷gV∆¬&˜VÊFVB’≥#Ö“&˜&FW"&˜&FW"’≤6CvSVE“&r◊vÜóFRÇ”Bí”2˜WF∆ñÊR÷ÊˆÊR –¢Û‡–¢¬ˆ∆&V√‡–†–¢∆∆&V¬6∆74Ê÷S“&f∆WÇóFV◊2÷6VÁFW"v”2&˜VÊFVB’≥#Ö“&˜&FW"&˜&FW"’≤6CvSVE“&r’≤6cvcñf5“Ç”Bí”2FWáB◊6“FWáB’≤3É#35“÷C¶6ˆ¬◊7‚”"#‡–¢∆ñÁW@–¢GóS“&6ÜV6∂&˜Ç –¢6ÜV6∂VC◊∂f˜&“Á&W6VÁFFñˆ‚Ê'WGFˆ‚Êó4&ˆ∆G––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢6WDf˜&“ÇÜ7W'&VÁBí”‚á∞–¢‚‚Ê7W'&VÁB¿–¢&W6VÁFFñˆ„¢∞–¢‚‚Ê7W'&VÁBÁ&W6VÁFFñˆ‚¿–¢'WGFˆ„¢∞–¢‚‚Ê7W'&VÁBÁ&W6VÁFFñˆ‚Ê'WGFˆ‚¿–¢ó4&ˆ∆C¢WfVÁBÁF&vWBÊ6ÜV6∂VB¿–¢“¿–¢“¿–¢“íê–¢––¢Û‡–¢«7‚6∆74Ê÷S“&fˆÁB◊6V÷ñ&ˆ∆B#ÂFWáFRGR&˜WFˆ‚V‚w&3¬˜7„‡–¢¬ˆ∆&V√‡–¢¬ˆFóc‡–¢¬˜6V7Fñˆ„‡–¢í¢ÁV∆«––†–¢«6V7Fñˆ‚6∆74Ê÷S“&ˆ∂FÚ÷6&B”b#‡–¢∆Fób6∆74Ê÷S“&f∆WÇóFV◊2÷6VÁFW"ßW7Fñgí÷&WGvVV‚v”2#‡–¢∆Fóc‡–¢«6∆74Ê÷S“'FWáB◊á2WW&66RG&6∂ñÊr’≥„#ÜV’“FWáB’≤3v#ÉCìe“#‰F˜FFñˆ„¬˜‡–¢∆É"6∆74Ê÷S“&◊B”"FWáB”'Ü¬fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#u“#‡–¢∆˜G2¬f∆ñFóL:íWB6ˆÊFóFñˆÁ0–¢¬ˆÉ#‡–¢¬ˆFóc‡–¢∆Fób6∆74Ê÷S“&f∆WÇf∆WÇ◊w&óFV◊2÷6VÁFW"ßW7Fñgí÷VÊBv”2#‡–¢∑&ó¶U7VvvW7FñˆÁ2Ê∆VÊwFÇ‚ÚÄ–¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊≤Çí”‚6WE&ó¶U7VvvW7FñˆÁ4˜V‚áG'VRó––¢6∆74Ê÷S“&ñÊ∆ñÊR÷f∆WÇóFV◊2÷6VÁFW"v”"&˜VÊFVB’≥#Ö“&˜&FW"&˜&FW"’≤6CvSVE“&r◊vÜóFRÇ”Bí”2FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“G&Á6óFñˆ‚Ü˜fW#¶&r’≤6cvcñf5“ –¢‡–¢≈7&∂∆W26∆74Ê÷S“&Ç”Br”BFWáB’≤3&cfFce“"&ñ÷ÜñFFV„“'G'VR"Û‡–¢7Vv|:ó&W"FW2∆˜G0–¢¬ˆ'WGFˆ„‡–¢í¢ÁV∆«––¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊∂FE&ó¶W––¢6∆74Ê÷S“'&˜VÊFVB’≥#Ö“&r’≤3É#u“Ç”Bí”2FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BFWáB◊vÜóFR –¢‡–¢¶˜WFW"V‚∆˜@–¢¬ˆ'WGFˆ„‡–¢¬ˆFóc‡–¢¬ˆFóc‡–†–¢∆Fób6∆74Ê÷S“&◊B”bw&ñBv”B÷C¶w&ñB÷6ˆ«2”"#‡–¢∆∆&V¬6∆74Ê÷S“&f∆WÇ÷ñ‚÷Ç’≥ì'Ö“7W'6˜"◊ˆñÁFW"óFV◊2◊7F'Bv”2&˜VÊFVB’≥#Ö“&˜&FW"&˜&FW"’≤6CvSVE“&r◊vÜóFRÇ”Bí”BFWáB◊6“G&Á6óFñˆ‚Ü˜fW#¶&˜&FW"’≤6#Ü3ÜSE“#‡–¢∆ñÁW@–¢GóS“&6ÜV6∂&˜Ç –¢6ÜV6∂VC◊∂f˜&“Á&Wv&E'V∆W2Êfñ∆&∆TgFW$Ü˜W'2‚––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢6WDf˜&“ÇÜ7W'&VÁBí”‚á∞–¢‚‚Ê7W'&VÁB¿–¢&Wv&E'V∆W3¢∞–¢‚‚Ê7W'&VÁBÁ&Wv&E'V∆W2¿–¢fñ∆&∆TgFW$Ü˜W'3¢WfVÁBÁF&vWBÊ6ÜV6∂VBÚ#B¢¿–¢“¿–¢“íê–¢––¢6∆74Ê÷S“&◊B”Ç”Br”B6á&ñÊ≤”&˜VÊFVB&˜&FW"’≤66&CVS“FWáB’≤3&cfFce“fˆ7W3ß&ñÊr’≤3&cfFce“Û# –¢Û‡–¢«7„‡–¢«7‚6∆74Ê÷S“&&∆ˆ6≤fˆÁB◊6V÷ñ&ˆ∆BFWáB’≤3É#35“#‡–¢∆˜BFó7ˆÊñ&∆R∆˜'2Bf˜3∑VÊR&ˆ6ÜñÊRfó6óFP–¢¬˜7„‡–¢«7‚6∆74Ê÷S“&◊B”&∆ˆ6≤FWáB◊á2∆VFñÊr”RFWáB’≤3v#ÉCìe“#‡–¢∆R∆˜B6W&Fó7ˆÊñ&∆R#BÇ,:á2∆'Fñ6óFñˆ‚¬:'Fó"GR∆VÊFV÷ñ‚‡–¢¬˜7„‡–¢¬˜7„‡–¢¬ˆ∆&V√‡–†–¢∆∆&V¬6∆74Ê÷S“'FWáB◊6“#‡–¢«7‚6∆74Ê÷S“&÷"”"&∆ˆ6≤FWáB’≤3cf#v5“#‰GW,:ñRFR&WG&óBÜ¶˜W'2ì¬˜7„‡–¢∆ñÁW@–¢GóS“&ÁV÷&W" –¢÷ñ„◊≥––¢f«VS◊∂f˜&“Á&Wv&E'V∆W2Êfñ∆&ñ∆óGîGW&Fñˆ‰Fó7––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢6WDf˜&“ÇÜ7W'&VÁBí”‚á∞–¢‚‚Ê7W'&VÁB¿–¢&Wv&E'V∆W3¢∞–¢‚‚Ê7W'&VÁBÁ&Wv&E'V∆W2¿–¢fñ∆&ñ∆óGîGW&Fñˆ‰Fó3¢ÁV÷&W"ÜWfVÁBÁF&vWBÁf«VR«¬í¿–¢“¿–¢“íê–¢––¢6∆74Ê÷S“'r÷gV∆¬&˜VÊFVB’≥#Ö“&˜&FW"&˜&FW"’≤6CvSVE“&r◊vÜóFRÇ”Bí”2˜WF∆ñÊR÷ÊˆÊR –¢Û‡–¢¬ˆ∆&V√‡–†–¢∂ó4WáW'D÷ˆFRÚÄ–¢∆∆&V¬6∆74Ê÷S“'FWáB◊6“#‡–¢«7‚6∆74Ê÷S“&÷"”"&∆ˆ6≤FWáB’≤3cf#v5“#‡–¢L:ñ∆íVÁG&RFWWÇ'Fñ6óFñˆÁ2Ü¶˜W'2ê–¢¬˜7„‡–¢∆ñÁW@–¢GóS“&ÁV÷&W" –¢÷ñ„◊≥––¢÷É◊≥3cW––¢f«VS◊∂f˜&“Á&Wv&E'V∆W2Á'Fñ6óFñˆ‰ñÁFW'fƒFó7––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢6WDf˜&“ÇÜ7W'&VÁBí”‚á∞–¢‚‚Ê7W'&VÁB¿–¢&Wv&E'V∆W3¢∞–¢‚‚Ê7W'&VÁBÁ&Wv&E'V∆W2¿–¢'Fñ6óFñˆ‰ñÁFW'fƒFó3¢÷FÇÊ÷ÇÉ¬ÁV÷&W"ÜWfVÁBÁF&vWBÁf«VR«¬íí¿–¢“¿–¢“íê–¢––¢6∆74Ê÷S“'r÷gV∆¬&˜VÊFVB’≥#Ö“&˜&FW"&˜&FW"’≤6CvSVE“&r◊vÜóFRÇ”Bí”2˜WF∆ñÊR÷ÊˆÊR –¢Û‡–¢¬ˆ∆&V√‡–¢í¢ÁV∆«––†–¢∆Fób6∆74Ê÷S“'76R◊í”2&˜VÊFVB’≥#Ö“&˜&FW"&˜&FW"’≤6CvSVE“&r◊vÜóFR”BFWáB◊6“FWáB’≤3É#35“#‡–¢∆∆&V¬6∆74Ê÷S“&f∆WÇóFV◊2÷6VÁFW"v”2#‡–¢∆ñÁW@–¢GóS“&6ÜV6∂&˜Ç –¢6ÜV6∂VC◊∂f˜&“Á&Wv&E'V∆W2Êó5vñÊÊñÊtWfW'ïFñ÷W––¢ˆ‰6ÜÊvS◊≤ÜWfVÁBí”‡–¢6WDf˜&“ÇÜ7W'&VÁBí”‚á∞–¢‚‚Ê7W'&VÁB¿–¢&Wv&E'V∆W3¢∞–¢‚‚Ê7W'&VÁBÁ&Wv&E'V∆W2¿–¢ó5vñÊÊñÊtWfW'ïFñ÷S¢WfVÁBÁF&vWBÊ6ÜV6∂VB¿–¢“¿–¢“íê–¢––¢Û‡–¢¶WRRvvÊÁ@–¢¬ˆ∆&V√‡–¢¬ˆFóc‡–¢¬ˆFóc‡–†–¢∆Fób6∆74Ê÷S“&◊B”bÜñFFV‚w&ñB÷6ˆ«2’∂÷ñÊ÷ÇÉÉÇ√„Vg"ïˆ÷ñÊ÷ÇÉÇ¬„vg"ïˆ÷ñÊ÷ÇÉ3Ç¬„ñg"ïˆ÷ñÊ÷ÇÉ#Ç¬„ÉVg"ïˆ÷ñÊ÷ÇÉ#Ç√„Vg"ïÛSgÖ“v”2&˜VÊFVB’≥#'Ö“&r’≤6cvcñf5“Ç”Bí”2FWáB’≥Ö“WW&66RG&6∂ñÊr’≥„#FV’“FWáB’≤3v#ÉCìe“Ü√¶w&ñB#‡–¢«7„‰F˜FFñˆ„¬˜7„‡–¢«7„Â7Fˆ6≥¬˜7„‡–¢«7„Â&ˆ&&ñ∆óL:íFRvñ‚ÇRì¬˜7„‡–¢«7„‰6¸;∑BVÊóFó&S¬˜7„‡–¢«7‚Û‡–¢¬ˆFóc‡–†–¢∆Fób6∆74Ê÷S“&◊B”B76R◊í”B#‡–¢∂f˜&“Á&ó¶W2Ê∆VÊwFÇ””“ÚÄ–¢∆Fób6∆74Ê÷S“'&˜VÊFVB’≥#GÖ“&˜&FW"&˜&FW"÷F6ÜVB&˜&FW"’≤66fCñV“&r◊vÜóFRÇ”Rí”bFWáB◊6“∆VFñÊr”bFWáB’≤3V3cSsu“#‡–¢V7V‚∆˜B‚f˜3∂W7BVÊ6˜&R6ˆÊfñwW"fV7WFS≤‚¶˜WFW¢R÷ˆñÁ2V‚∆˜B˜W"˜Wfˆó –¢VÁ&Vvó7G&W"¬f˜3∂Êñ÷Fñˆ‚‡–¢¬ˆFóc‡–¢í¢ÁV∆«––¢∂f˜&“Á&ó¶W2Ê÷Çá&ó¶Rí”‚Ä–¢ƒ6◊ñvÂ&ó¶U&˜p–¢∂Wì◊∑&ó¶RÊñG––¢&ó¶S◊∑&ó¶W––¢ˆÂWFFS◊∑WFFU&ó¶W––¢ˆÂ&V÷˜fS◊∑&V÷˜fU&ó¶W––¢ˆ‰˜V‰6ˆÊFóFñˆÁ3◊≤á&ó¶TñBí”‚6WDVFóFñÊu&ó¶T6ˆÊFóFñˆÁ4ñBá&ó¶TñBÛÚÁV∆¬ó––¢Û‡–¢íó––¢¬ˆFóc‡–†–¢∆Fób6∆74Ê÷S“&◊B”2ÜñFFV‚w&ñB÷6ˆ«2’∂÷ñÊ÷ÇÉÉÇ√„Vg"ïˆ÷ñÊ÷ÇÉÇ¬„vg"ïˆ÷ñÊ÷ÇÉ3Ç¬„ñg"ïˆ÷ñÊ÷ÇÉ#Ç¬„ÉVg"ïˆ÷ñÊ÷ÇÉ#Ç√„Vg"ïÛSgÖ“v”2Ü√¶w&ñB#‡–¢«7‚Û‡–¢«7‚Û‡–¢∆Fó`–¢6∆74Ê÷S◊∂&˜VÊFVB’≥gÖ“&˜&FW"Ç”2í”"FWáB÷6VÁFW"FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BG∞–¢F˜F≈&ó¶U&ˆ&&ñ∆óGí‚ –¢Ú&&˜&FW"’≤6fV66“&r’≤6ffcc%“FWáB’≤6&S#65“ –¢¢F˜F≈&ó¶U&ˆ&&ñ∆óGí””“ –¢Ú&&˜&FW"’≤6&&cvC“&r’≤6cfFcE“FWáB’≤3SÉ6E“ –¢¢&&˜&FW"’≤6F&SFc“&r’≤6cvcñf5“FWáB’≤3cCsCÜ%“ –¢÷––¢‡–¢F˜F¬¢∑F˜F≈&ó¶U&ˆ&&ñ∆óGó“P–¢¬ˆFóc‡–¢«7‚Û‡–¢«7‚Û‡–¢«7‚Û‡–¢¬ˆFóc‡–†–¢∆Fó`–¢6∆74Ê÷S◊∂◊B”B&˜VÊFVB’≥gÖ“&˜&FW"Ç”Bí”2FWáB◊6“fˆÁB◊6V÷ñ&ˆ∆BÜ√¶ÜñFFV‚G∞–¢F˜F≈&ó¶U&ˆ&&ñ∆óGí‚ –¢Ú&&˜&FW"’≤6fV66“&r’≤6ffcc%“FWáB’≤6&S#65“ –¢¢F˜F≈&ó¶U&ˆ&&ñ∆óGí””“ –¢Ú&&˜&FW"’≤6&&cvC“&r’≤6cfFcE“FWáB’≤3SÉ6E“ –¢¢&&˜&FW"’≤6F&SFc“&r’≤6cvcñf5“FWáB’≤3cCsCÜ%“ –¢÷––¢‡–¢F˜F¬FW2&ˆ&&ñ∆óL:ó2FRvñ‚¢∑F˜F≈&ó¶U&ˆ&&ñ∆óGó“P–¢¬ˆFóc‡–¢¬˜6V7Fñˆ„‡–†–¢∂f˜&“ÊñBÚƒ6◊ñv‰V÷ñ≈&WfñWr÷W&6ÜÁC◊∂÷W&6ÜÁG“f˜&”◊∂f˜&◊“Û‚¢ÁV∆«––†–¢∂÷W76vRÚÄ–¢«6V7Fñˆ‡–¢6∆74Ê÷S◊∂&˜VÊFVB’≥#GÖ“&˜&FW"Ç”Rí”BFWáB◊6“6ÜF˜r’≥ÛáÖÛCGÖ˜&v&É#"√3b√cb√„ï“G∞–¢÷W76vUFˆÊR””“&W'&˜" –¢Ú&&˜&FW"’≤6fV66“&r’≤6ffcc%“FWáB’≤3ñc#3ï“ –¢¢&&˜&FW"’≤6F&SFc“&r◊vÜóFRFWáB’≤3É#35“ –¢÷––¢‡–¢∆Fób6∆74Ê÷S“&fˆÁB◊6V÷ñ&ˆ∆B#‡–¢∂÷W76vUFˆÊR””“&W'&˜""Ú$VÁ&Vvó7G&V÷VÁBñ◊˜76ñ&∆R"¢$ñÊf˜&÷Fñˆ‚'––¢¬ˆFóc‡–¢«6∆74Ê÷S“&◊B”∆VFñÊr”b#Á∂÷W76vW”¬˜‡–¢¬˜6V7Fñˆ„‡–¢í¢ÁV∆«––¢¬ˆFóc‡–†–¢∆Fób6∆74Ê÷S“'76R◊í”bÜ√ß7Fñ6∑íÜ√ßF˜”bÜ√ß6V∆b◊7F'B#‡–¢«6V7Fñˆ‚6∆74Ê÷S“'ˆñÁFW"÷WfVÁG2÷ÊˆÊRˆ∂FÚ÷6&B”R#‡–¢∆Fób6∆74Ê÷S“&f∆WÇóFV◊2÷6VÁFW"ßW7Fñgí÷&WGvVV‚v”2#‡–¢∆Fóc‡–¢«6∆74Ê÷S“'FWáB◊á2WW&66RG&6∂ñÊr’≥„#ÜV’“FWáB’≤3v#ÉCìe“#‡–¢,:ófó7V∆ó6Fñˆ‚÷ˆ&ñ∆P–¢¬˜‡–¢∆É"6∆74Ê÷S“&ˆ∂FÚ◊6V7Fñˆ‚◊FóF∆R◊B”"#Â&VÊGRV&∆ñ3¬ˆÉ#‡–¢¬ˆFóc‡–¢∂f˜&“ÊñBÚÄ–¢∆Fób6∆74Ê÷S“&ˆ∂FÚ÷7Fñˆ‚◊&˜rˆñÁFW"÷WfVÁG2÷WFÚf∆WÇf∆WÇ◊w&ßW7Fñgí÷VÊBv”"#‡–¢∆–¢á&Vc◊∂ˆíˆ6◊ñvÁ2ÚG∂f˜&“ÊñG“˜&––¢6∆74Ê÷S“&ˆ∂FÚ◊6V6ˆÊF'í÷7Fñˆ‚Ç”B –¢‡–¢ –¢¬ˆ‡–¢ƒ∆ñÊ∞–¢á&Vc◊∂ˆ6◊ñvÁ2ÚG∂f˜&“ÊñG“˜˜7FW&––¢&VfWF6É◊∂f«6W––¢6∆74Ê÷S“&ˆ∂FÚ◊6V6ˆÊF'í÷7Fñˆ‚Ç”B –¢‡–¢ffñ6ÜP–¢¬Ù∆ñÊ≥‡–¢ƒ∆ñÊ∞–¢á&Vc◊∂ˆ6◊ñv‚ÚG∂f˜&“ÊñG”˜&WfñWs”––¢&VfWF6É◊∂f«6W––¢F&vWC“%ˆ&∆Ê≤ –¢&V√“&Ê˜&VfW'&W" –¢6∆74Ê÷S“&ˆ∂FÚ◊&ñ÷'í÷7Fñˆ‚Ç”B –¢‡–¢,:ófó7V∆ó6W –¢¬Ù∆ñÊ≥‡–¢¬ˆFóc‡–¢í¢ÁV∆«––¢¬ˆFóc‡–†–¢≈6Ü&VD6◊ñv‰∆ófU&WfñWr÷W&6ÜÁC◊∂÷W&6ÜÁG“&WfñWs◊∂FVfW'&VE&WfñWw“Û‡–¢¬˜6V7Fñˆ„‡–¢¬ˆFóc‡–¢¬ˆFóc‡–¢∆Fób6∆74Ê÷S“'ˆñÁFW"÷WfVÁG2÷ÊˆÊRfóÜVBñÁ6WB◊Ç”&˜GFˆ“”¢”3Ç”B"”BÜ√¶ÜñFFV‚#‡–¢∆Fób6∆74Ê÷S“'ˆñÁFW"÷WfVÁG2÷WFÚ◊Ç÷WFÚ÷Ç◊r’≥s#Ö“&˜VÊFVB’≥áÖ“&˜&FW"&˜&FW"÷&˜&FW"&r◊vÜóFRÛìb”26ÜF˜r◊&ˆGV7B÷6&B&6∂G&˜÷&«W"#‡–¢∆Fób6∆74Ê÷S“&w&ñBv”26”¶w&ñB÷6ˆ«2”"#‡–¢∑6fVD6◊ñv‰ñBÚÄ–¢√‡–¢ƒ∆ñÊ∞–¢á&Vc◊∂ˆ6◊ñv‚ÚG∑6fVD6◊ñv‰ñG”˜&WfñWs”––¢&VfWF6É◊∂f«6W––¢F&vWC“%ˆ&∆Ê≤ –¢6∆74Ê÷S“&ˆ∂FÚ◊&ñ÷'í÷7Fñˆ‚Ç”B –¢‡–¢,:ófó7V∆ó6W –¢¬Ù∆ñÊ≥‡–¢ƒ∆ñÊ∞–¢á&Vc◊∂ˆ6◊ñvÁ2ÚG∑6fVD6◊ñv‰ñG“˜˜7FW&––¢&VfWF6É◊∂f«6W––¢6∆74Ê÷S“&ˆ∂FÚ◊6V6ˆÊF'í÷7Fñˆ‚Ç”B –¢‡–¢ffñ6ÜP–¢¬Ù∆ñÊ≥‡–¢¬Û‡–¢í¢ÁV∆«––¢∆'WGFˆ‡–¢GóS“&'WGFˆ‚ –¢ˆ‰6∆ñ6≥◊∑6fT6◊ñvÁ––¢Fó6&∆VC◊∂ó56fñÊw––¢6∆74Ê÷S◊∂ˆ∂FÚ÷fñ∆∆VB÷7Fñˆ‚Ç”BFó6&∆VC¶7W'6˜"÷Ê˜B÷∆∆˜vVBFó6&∆VC¶˜6óGí”sG∞–¢6fVD6◊ñv‰ñBÚ'6”¶6ˆ¬◊7‚”""¢'r÷gV∆¬ –¢÷––¢‡–¢∂ó56fñÊrÚ$VÁ&Vvó7G&V÷VÁB‚‚‚"¢$VÁ&Vvó7G&W"'––¢¬ˆ'WGFˆ„‡–¢¬ˆFóc‡–¢¬ˆFóc‡–¢¬ˆFóc‡–¢≈&ó¶T6ˆÊFóFñˆÁ4Fñ∆ˆp–¢˜V„◊¥&ˆˆ∆V‚ÜVFóFñÊu&ó¶Ró––¢&ó¶T∆&V√◊∂VFóFñÊu&ó¶SÚÊ∆&V¬ÛÚ"'––¢f«VS◊∂VFóFñÊu&ó¶SÚÁW6vT6ˆÊFóFñˆÁ2ÛÚ"'––¢ˆ‰6ÜÊvS◊≤ÜÊWáEf«VRí”‚∞–¢ñbÜVFóFñÊu&ó¶SÚÊñBí∞–¢WFFU&ó¶RÜVFóFñÊu&ó¶RÊñB¬≤W6vT6ˆÊFóFñˆÁ3¢ÊWáEf«VR“ì∞–¢––¢◊––¢ˆ‰6∆˜6S◊≤Çí”‚6WDVFóFñÊu&ó¶T6ˆÊFóFñˆÁ4ñBÜÁV∆¬ó––¢Û‡–¢≈&ó¶U7VvvW7Fñˆ‰Fñ∆ˆp–¢˜V„◊∑&ó¶U7VvvW7FñˆÁ4˜VÁ––¢7VvvW7FñˆÁ3◊∑&ó¶U7VvvW7FñˆÁ7––¢ñÊGW7G'ì◊∂÷W&6ÜÁBÊñÊGW7G'ó––¢&V÷ñÊñÊu&ˆ&&ñ∆óGì◊∑&V÷ñÊñÊu&ó¶U&ˆ&&ñ∆óGó––¢ˆ‰FC◊∂FE7VvvW7FVE&ó¶W––¢ˆ‰6∆˜6S◊≤Çí”‚6WE&ó¶U7VvvW7FñˆÁ4˜V‚Üf«6Ró––¢Û‡–¢ƒ&6∂w&˜VÊD∆ñ'&'îFñ∆ˆp–¢˜V„◊∂&6∂w&˜VÊD∆ñ'&'îFñ∆ˆt˜VÁ––¢ˆ‰6∆˜6S◊≤Çí”‚6WD&6∂w&˜VÊD∆ñ'&'îFñ∆ˆt˜V‚Üf«6Ró––¢óFV◊3◊∂&6∂w&˜VÊD∆ñ'&'ó––¢ó4∆ˆFñÊs◊∂ó4∆ñ'&'î∆ˆFñÊw––¢W'&˜#◊∂∆ñ'&'î÷W76vW––¢6V∆V7FVDñ÷vUW&√◊∂f˜&“Á&W6VÁFFñˆ‚Ê&6∂w&˜VÊBÊñ÷vUW&¬ÛÚ"'––¢ˆÂ6V∆V7C◊∑6V∆V7D&6∂w&˜VÊDñ÷vW––¢Û‡–¢≈6fTfVVF&6¥Fñ∆ˆp–¢˜V„◊∑6fTFñ∆ˆt˜VÁ––¢FóF∆S◊∑6fTFñ∆ˆuFóF∆W––¢FW67&óFñˆ„◊∑6fTFñ∆ˆtFW67&óFñˆÁ––¢FˆÊS◊∑6fTFñ∆ˆuFˆÊW––¢ˆ‰6∆˜6S◊≤Çí”‚∞–¢6WE6fTFñ∆ˆt˜V‚Üf«6Rì∞–†–¢ñbá6fTFñ∆ˆuFˆÊR”“&W'&˜""bbñÊóFñƒ6◊ñv‚bb6fVD6◊ñv‰ñBí∞–¢&˜WFW"Á&W∆6RÜˆ6◊ñvÁ2ÚG∑6fVD6◊ñv‰ñG“ˆVFóFì∞–¢––¢◊––¢Û‡–¢¬ˆFóc‡–¢ì∞–ß––†