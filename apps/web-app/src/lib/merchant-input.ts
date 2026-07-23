import {
  ActionKind,
  BackgroundMode,
  ButtonSize,
  CampaignSetupInput,
  GamePageTemplateId,
  GameType,
  GoalType,
  LogoMode,
  MerchantAccountSettingsInput,
  MerchantOnboardingInput,
  PosterTemplateId,
  TextAlign,
  TextFont,
} from "@/lib/types";

const GOAL_TYPES = new Set<GoalType>(["lead_capture", "review_prompt", "social_follow"]);
const GAME_TYPES = new Set<GameType>(["wheel", "scratch"]);
const ACTION_KINDS = new Set<ActionKind>([
  "google",
  "instagram",
  "facebook",
  "tiktok",
  "tripadvisor",
  "crm",
  "custom",
]);
const LOGO_MODES = new Set<LogoMode>(["none", "image", "text"]);
const TEXT_ALIGNS = new Set<TextAlign>(["left", "center", "right"]);
const TEXT_FONTS = new Set<TextFont>([
  "anton",
  "display",
  "serif",
  "cormorant",
  "fredoka",
  "inter",
  "bebas",
  // Compatibilité avec les campagnes historiques.
  "sans",
]);
const BUTTON_SIZES = new Set<ButtonSize>(["sm", "md", "lg"]);
const BACKGROUND_MODES = new Set<BackgroundMode>(["color", "image"]);
const GAME_PAGE_TEMPLATE_IDS = new Set<GamePageTemplateId>([
  "classic",
  "restaurant-pop",
  "cosmic-orbit",
  "sunburst-festival",
  "scratch-vault",
  "scratch-confetti",
]);
const POSTER_TEMPLATE_IDS = new Set<PosterTemplateId>([
  "classic-wheel",
  "soft-gradient-wheel",
  "terracotta-wheel",
]);
const MERCHANT_TIME_ZONES = new Set([
  "Europe/Paris",
  "America/Toronto",
  "America/Winnipeg",
  "America/Edmonton",
  "America/Vancouver",
]);
const ALLOWED_BACKGROUND_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;

function ensureObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Payload invalide.");
  }

  return value as Record<string, unknown>;
}

function normalizeString(value: unknown, maxLength: number, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeMultiline(value: unknown, maxLength: number, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function normalizeEmail(value: unknown, required = false) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!email) {
    if (required) {
      throw new Error("Adresse e-mail invalide.");
    }

    return "";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Adresse e-mail invalide.");
  }

  return email.slice(0, 160);
}

function normalizeUrl(value: unknown) {
  const input = typeof value === "string" ? value.trim() : "";

  if (!input) {
    return "";
  }

  try {
    const url = new URL(input);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("URL invalide.");
    }

    return url.toString().slice(0, 500);
  } catch {
    throw new Error("URL invalide.");
  }
}

function normalizeImageSource(value: unknown) {
  const input = typeof value === "string" ? value.trim() : "";

  if (!input) {
    return "";
  }

  const inlineImage = /^data:image\/(png|jpe?g|webp|gif);base64,([a-z0-9+/=\s]+)$/i.exec(input);
  if (inlineImage) {
    const encoded = inlineImage[2].replace(/\s/g, "");
    const paddingLength = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
    const estimatedBytes = Math.floor((encoded.length * 3) / 4) - paddingLength;

    if (estimatedBytes > MAX_INLINE_IMAGE_BYTES) {
      throw new Error("Image trop volumineuse. Importez une image de 2 Mo maximum.");
    }

    return `data:image/${inlineImage[1].toLowerCase()};base64,${encoded}`;
  }

  if (input.toLowerCase().startsWith("data:")) {
    throw new Error("Image invalide. Utilisez une image PNG, JPEG, WebP ou GIF.");
  }

  return normalizeUrl(input);
}

function normalizeStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeNumber(
  value: unknown,
  options: {
    min: number;
    max: number;
    fallback: number;
    integer?: boolean;
  },
) {
  const raw = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(raw)) {
    return options.fallback;
  }

  const normalized = options.integer ? Math.round(raw) : raw;
  return Math.min(options.max, Math.max(options.min, normalized));
}

function normalizeNullableInteger(value: unknown, min: number, max: number) {
  if (value == null || value === "") {
    return null;
  }

  const numeric = normalizeNumber(value, {
    min,
    max,
    fallback: min,
    integer: true,
  });

  return numeric;
}

function normalizeEnum<T extends string>(value: unknown, allowed: Set<T>, fallback: T) {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : fallback;
}

function normalizeColor(value: unknown, fallback: string) {
  const normalized = normalizeString(value, 64, fallback);
  return normalized || fallback;
}

export function parseMerchantOnboardingInput(input: unknown): MerchantOnboardingInput {
  const payload = ensureObject(input);

  return {
    companyName: normalizeString(payload.companyName, 120),
    industry: normalizeString(payload.industry, 80),
    restaurantType: normalizeString(payload.restaurantType, 80),
    city: normalizeString(payload.city, 80),
    contactName: normalizeString(payload.contactName, 120),
    phone: normalizeString(payload.phone, 40),
    restaurantEmail: normalizeEmail(payload.restaurantEmail, false),
    websiteUrl: normalizeUrl(payload.websiteUrl),
    address: normalizeString(payload.address, 200),
    defaultPrizeCost: normalizeNumber(payload.defaultPrizeCost, {
      min: 0,
      max: 100000,
      fallback: 0,
    }),
    preferredGoals: normalizeStringArray(payload.preferredGoals, 12, 80),
    diffusionSupport: normalizeStringArray(payload.diffusionSupport, 12, 80),
    googleReviewUrl: normalizeUrl(payload.googleReviewUrl),
    instagramUrl: normalizeUrl(payload.instagramUrl),
    facebookUrl: normalizeUrl(payload.facebookUrl),
    tiktokUrl: normalizeUrl(payload.tiktokUrl),
    tripadvisorUrl: normalizeUrl(payload.tripadvisorUrl),
    customLinkUrl: normalizeUrl(payload.customLinkUrl),
  };
}

export function parseMerchantAccountSettingsInput(input: unknown): MerchantAccountSettingsInput {
  const payload = ensureObject(input);

  return {
    companyName: normalizeString(payload.companyName, 120),
    industry: normalizeString(payload.industry, 80),
    restaurantType: normalizeString(payload.restaurantType, 80),
    city: normalizeString(payload.city, 80),
    address: normalizeString(payload.address, 200),
    contactName: normalizeString(payload.contactName, 120),
    phone: normalizeString(payload.phone, 40),
    restaurantEmail: normalizeEmail(payload.restaurantEmail, false),
    websiteUrl: normalizeUrl(payload.websiteUrl),
    googleReviewUrl: normalizeUrl(payload.googleReviewUrl),
    instagramUrl: normalizeUrl(payload.instagramUrl),
    facebookUrl: normalizeUrl(payload.facebookUrl),
    tiktokUrl: normalizeUrl(payload.tiktokUrl),
    tripadvisorUrl: normalizeUrl(payload.tripadvisorUrl),
    customLinkUrl: normalizeUrl(payload.customLinkUrl),
    timeZone: normalizeEnum(payload.timeZone, MERCHANT_TIME_ZONES, "Europe/Paris"),
    defaultPrizeCost: normalizeNumber(payload.defaultPrizeCost, {
      min: 0,
      max: 100000,
      fallback: 0,
    }),
    redemptionPin:
      /^\d{4,6}$/.test(normalizeString(payload.redemptionPin, 6))
        ? normalizeString(payload.redemptionPin, 6)
        : undefined,
    firstName: normalizeString(payload.firstName, 80),
    lastName: normalizeString(payload.lastName, 80),
    email: normalizeEmail(payload.email, true),
  };
}

export function parseCampaignSetupInput(input: unknown, merchantId: string): CampaignSetupInput {
  const payload = ensureObject(input);
  const presentation = ensureObject(payload.presentation);
  const logo = ensureObject(presentation.logo);
  const background = ensureObject(presentation.background);
  const heading = ensureObject(presentation.heading);
  const button = ensureObject(presentation.button);
  const layout = ensureObject(presentation.layout);
  const wheel = ensureObject(presentation.wheel);
  const poster = ensureObject(presentation.poster);
  const email = ensureObject(presentation.email);
  const rewardRules = ensureObject(payload.rewardRules);

  const actions = Array.isArray(payload.actions) ? payload.actions : [];
  const prizes = Array.isArray(payload.prizes) ? payload.prizes : [];
  const title = normalizeString(payload.title, 120);

  if (!title) {
    throw new Error("Le nom de l'animation est requis.");
  }

  if (!prizes.length) {
    throw new Error("Au moins une dotation est requise.");
  }

  const sanitizedPrizes = prizes.slice(0, 50).map((item, index) => {
    const prize = ensureObject(item);
    const label = normalizeString(prize.label, 120);

    if (!label) {
      throw new Error(`Le libellé du lot ${index + 1} est requis.`);
    }

    return {
      id: normalizeString(prize.id, 120),
      label,
      totalQuantity: normalizeNullableInteger(prize.totalQuantity, 0, 1000000),
      probability: normalizeNumber(prize.probability, {
        min: 0,
        max: 100,
        fallback: 0,
      }),
      estimatedUnitCost: normalizeNumber(prize.estimatedUnitCost, {
        min: 0,
        max: 100000,
        fallback: 0,
      }),
      usageConditions: normalizeMultiline(prize.usageConditions, 1200),
    };
  });

  const totalProbability = sanitizedPrizes.reduce((total, prize) => total + prize.probability, 0);
  if (sanitizedPrizes.some((prize) => prize.totalQuantity !== null && prize.totalQuantity <= 0)) {
    throw new Error("La quantité d’un lot doit être supérieure à 0 (ou illimitée).");
  }
  if (totalProbability > 100.0001) {
    throw new Error("Le total des probabilités ne peut pas dépasser 100 %.");
  }
  if (rewardRules.isWinningEveryTime && totalProbability < 99.9999) {
    throw new Error("Un jeu 100 % gagnant doit totaliser exactement 100 % de probabilités.");
  }

  const sanitizedActions = actions.slice(0, 12).map((item) => {
    const action = ensureObject(item);
    const kind = normalizeEnum(action.kind, ACTION_KINDS, "custom");
    const url = kind === "crm" ? "" : normalizeUrl(action.url);

    if (kind !== "crm" && !url) {
      throw new Error("Chaque action marketing doit contenir un lien valide.");
    }

    return {
      id: normalizeString(action.id, 120),
      kind,
      label: normalizeString(action.label, 120),
      url,
    };
  });

  return {
    id: normalizeString(payload.id, 120) || undefined,
    merchantId,
    creationMode: payload.creationMode === "wizard" ? "wizard" : "editor",
    title,
    subtitle: normalizeMultiline(payload.subtitle, 240),
    goalType: normalizeEnum(payload.goalType, GOAL_TYPES, "review_prompt"),
    ctaLabel: normalizeString(payload.ctaLabel, 80),
    successMetric: normalizeString(payload.successMetric, 80),
    targetUrl: normalizeUrl(payload.targetUrl) || undefined,
    isActive: Boolean(payload.isActive),
    accent: {
      ink: normalizeColor(ensureObject(payload.accent).ink, "#1f2937"),
      paper: normalizeColor(ensureObject(payload.accent).paper, "#ffffff"),
      signal: normalizeColor(ensureObject(payload.accent).signal, "#f4c14a"),
    },
    gameType: normalizeEnum(payload.gameType, GAME_TYPES, "wheel"),
    logoMode: normalizeEnum(payload.logoMode, LOGO_MODES, "text"),
    logoText: normalizeString(payload.logoText, 120) || undefined,
    logoUrl: normalizeImageSource(payload.logoUrl) || undefined,
    presentation: {
      logo: {
        sizePercent: normalizeNumber(logo.sizePercent, {
          min: 10,
          max: 240,
          fallback: 100,
          integer: true,
        }),
        marginBottomPx: normalizeNumber(logo.marginBottomPx, {
          min: 0,
          max: 240,
          fallback: 20,
          integer: true,
        }),
        align: normalizeEnum(logo.align, TEXT_ALIGNS, "center"),
      },
      background: {
        mode: normalizeEnum(background.mode, BACKGROUND_MODES, "color"),
        color: normalizeColor(background.color, "#ffffff"),
        imageUrl: normalizeImageSource(background.imageUrl) || undefined,
      },
      heading: {
        textColor: normalizeColor(heading.textColor, "#1f2937"),
        fontSizePx: normalizeNumber(heading.fontSizePx, {
          min: 14,
          max: 96,
          fallback: 42,
          integer: true,
        }),
        fontFamily: normalizeEnum(heading.fontFamily, TEXT_FONTS, "anton"),
        fontWeight: normalizeNumber(heading.fontWeight, {
          min: 300,
          max: 900,
          fallback: 500,
          integer: true,
        }),
        align: normalizeEnum(heading.align, TEXT_ALIGNS, "center"),
      },
      button: {
        backgroundColor: normalizeColor(button.backgroundColor, "#2f6df6"),
        textColor: normalizeColor(button.textColor, "#ffffff"),
        borderColor: normalizeColor(button.borderColor, "#2f6df6"),
        size: normalizeEnum(button.size, BUTTON_SIZES, "md"),
        textSizePx: normalizeNumber(button.textSizePx, {
          min: 10,
          max: 48,
          fallback: 24,
          integer: true,
        }),
        isBold: Boolean(button.isBold),
      },
      layout: {
        blockSpacingPx: normalizeNumber(layout.blockSpacingPx, {
          min: 0,
          max: 160,
          fallback: 40,
          integer: true,
        }),
        templateId: normalizeEnum(layout.templateId, GAME_PAGE_TEMPLATE_IDS, "classic"),
      },
      wheel: {
        rimColor: normalizeColor(wheel.rimColor, "#bac0ca"),
        winColor: normalizeColor(wheel.winColor, "#f4c14a"),
        alternateWinColor: normalizeColor(wheel.alternateWinColor, "#eef2ff"),
        loseColor: normalizeColor(wheel.loseColor, "#1b2842"),
        alternateLoseColor: normalizeColor(wheel.alternateLoseColor, "#8795db"),
      },
      poster: {
        templateId: normalizeEnum(poster.templateId, POSTER_TEMPLATE_IDS, "classic-wheel"),
        logoMode: normalizeEnum(poster.logoMode, LOGO_MODES, "text"),
        logoText: normalizeString(poster.logoText, 120) || undefined,
        logoUrl: normalizeImageSource(poster.logoUrl) || undefined,
        logoSizePercent: normalizeNumber(poster.logoSizePercent, {
          min: 10,
          max: 240,
          fallback: 100,
          integer: true,
        }),
        logoBottomMarginPx: normalizeNumber(poster.logoBottomMarginPx, {
          min: 0,
          max: 240,
          fallback: 28,
          integer: true,
        }),
        backgroundMode: normalizeEnum(poster.backgroundMode, BACKGROUND_MODES, "color"),
        backgroundColor: normalizeColor(poster.backgroundColor, "#ffffff"),
        backgroundImageUrl: normalizeImageSource(poster.backgroundImageUrl) || undefined,
        headline: normalizeMultiline(poster.headline, 240),
        headlineTextColor: normalizeColor(poster.headlineTextColor, "#ffffff"),
        headlineFontSizePx: normalizeNumber(poster.headlineFontSizePx, {
          min: 14,
          max: 96,
          fallback: 42,
          integer: true,
        }),
        headlineFontFamily: normalizeEnum(poster.headlineFontFamily, TEXT_FONTS, "anton"),
        wheel: {
          rimColor: normalizeColor(ensureObject(poster.wheel).rimColor, "#f4c14a"),
          winColor: normalizeColor(ensureObject(poster.wheel).winColor, "#f4c14a"),
          alternateWinColor: normalizeColor(
            ensureObject(poster.wheel).alternateWinColor,
            "#eef2ff",
          ),
          loseColor: normalizeColor(ensureObject(poster.wheel).loseColor, "#1b2842"),
          alternateLoseColor: normalizeColor(
            ensureObject(poster.wheel).alternateLoseColor,
            "#8795db",
          ),
        },
        footerBackgroundColor: normalizeColor(poster.footerBackgroundColor, "transparent"),
      },
      email: {
        senderName: normalizeString(email.senderName, 120),
        replyTo: normalizeEmail(email.replyTo, false),
        subject: normalizeString(email.subject, 160),
        preheader: normalizeString(email.preheader, 160),
        headline: normalizeMultiline(email.headline, 240),
        body: normalizeMultiline(email.body, 4000),
        buttonLabel: normalizeString(email.buttonLabel, 80),
        footerNote: normalizeMultiline(email.footerNote, 600),
        accentColor: normalizeColor(email.accentColor, "#2f6df6"),
      },
    },
    actions: sanitizedActions,
    rewardRules: {
      rewardExpiryMinutes: normalizeNumber(rewardRules.rewardExpiryMinutes, {
        min: 0,
        max: 60 * 24 * 30,
        fallback: 20,
        integer: true,
      }),
      purchaseRequired: Boolean(rewardRules.purchaseRequired),
      availableAfterHours: normalizeNumber(rewardRules.availableAfterHours, {
        min: 0,
        max: 24 * 365,
        fallback: 0,
        integer: true,
      }),
      availabilityDurationDays: normalizeNumber(rewardRules.availabilityDurationDays, {
        min: 0,
        max: 365,
        fallback: 0,
        integer: true,
      }),
      participationIntervalDays: normalizeNumber(rewardRules.participationIntervalDays, {
        min: 1,
        max: 365,
        fallback: 1,
        integer: true,
      }),
      isWinningEveryTime: Boolean(rewardRules.isWinningEveryTime),
    },
    prizes: sanitizedPrizes,
  };
}

export function assertBackgroundUpload(file: File, label: string, category: string) {
  if (!label) {
    throw new Error("Le libellé est requis.");
  }

  if (label.length > 120) {
    throw new Error("Le libellé est trop long.");
  }

  if (category.length > 80) {
    throw new Error("La catégorie est trop longue.");
  }

  if (!ALLOWED_BACKGROUND_MIME_TYPES.has(file.type)) {
    throw new Error("Format d'image non pris en charge. Utilisez JPG, PNG ou WEBP.");
  }

  if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
    throw new Error("Le fichier doit peser moins de 8 Mo.");
  }
}

