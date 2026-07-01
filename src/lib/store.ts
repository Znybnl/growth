import {
  createDrawSessionInSupabase,
  deleteCampaignForMerchantInSupabase,
  drawForLeadInSupabase,
  finalizeDrawSessionInSupabase,
  getSupabaseCampaignDataView,
  getSupabaseCampaignPerformance,
  getSupabaseCampaignSetupPerformance,
  getSupabaseMerchantCampaignLibrary,
  getSupabaseMerchantCampaignOverview,
  getSupabaseMerchantDashboard,
  getSupabaseMerchantLeads,
  getSupabaseMerchantRecentLeads,
  getSupabaseMerchantSupportOverview,
  getSupabasePublicCampaign,
  deleteCampaignInSupabase,
  duplicateCampaignInSupabase,
  markActionConfirmedInSupabase,
  recordEventInSupabase,
  redeemLeadPrizeInSupabase,
  resetPrizeStockInSupabase,
  resetLeadPrizeInSupabase,
  toggleCampaignInSupabase,
  toggleCampaignForMerchantInSupabase,
  updatePrizeStockInSupabase,
  updateCampaignSetupInSupabase,
} from "@/lib/campaign-repository";
import {
  authenticateMerchantInSupabase,
  createMerchantAccountInSupabase,
  getSupabaseMerchantProfile,
  getSupabaseMerchantUser,
  getSupabaseMerchantUserByEmail,
  updateMerchantAccountInSupabase,
  updateMerchantOnboardingInSupabase,
} from "@/lib/merchant-account-repository";
import { assertDataBackendAvailable } from "@/lib/supabase";
import { getMemorySupportLogs } from "@/lib/support-log";
import { createPosterSettingsDefaults, normalizePosterSettings } from "@/lib/poster-utils";
import { cache } from "react";
import {
  Campaign,
  CampaignAction,
  CampaignDataView,
  CampaignEmailSettings,
  CampaignEvent,
  CampaignLibraryItem,
  CampaignPerformance,
  CampaignPresentation,
  CampaignBackgroundSettings,
  CampaignButtonSettings,
  CampaignHeadingSettings,
  CampaignLogoSettings,
  CampaignPosterSettings,
  CampaignRewardRules,
  CampaignWheelSettings,
  CampaignSetupInput,
  CreateDrawSessionRequest,
  CreateDrawSessionResult,
  DrawSession,
  DrawRequest,
  DrawResult,
  FinalizeDrawSessionRequest,
  Lead,
  Merchant,
  MerchantAccountSettingsInput,
  MerchantDashboardData,
  MerchantLeadRow,
  MerchantSupportOverview,
  MerchantOnboardingInput,
  MerchantSignInInput,
  MerchantSignUpInput,
  MerchantUser,
  Prize,
  PublicCampaign,
} from "@/lib/types";
import { createCampaignEmailDefaults, normalizeCampaignEmailSettings } from "@/lib/email-settings";
import { unstable_cache } from "next/cache";

type Store = {
  merchants: Merchant[];
  users: MerchantUser[];
  campaigns: Campaign[];
  prizes: Prize[];
  leads: Lead[];
  events: CampaignEvent[];
  drawSessions: DrawSession[];
};

type CampaignPresentationOverrides = {
  logo?: Partial<CampaignLogoSettings>;
  background?: Partial<CampaignBackgroundSettings>;
  heading?: Partial<CampaignHeadingSettings>;
  button?: Partial<CampaignButtonSettings>;
  layout?: Partial<{ blockSpacingPx: number }>;
  wheel?: Partial<CampaignWheelSettings>;
  poster?: Partial<CampaignPosterSettings>;
  email?: Partial<CampaignEmailSettings>;
};

function createPresentation(overrides?: CampaignPresentationOverrides): CampaignPresentation {
  const wheel = {
    rimColor: "#f4c14a",
    winColor: "#f4c14a",
    alternateWinColor: "#eef2ff",
    loseColor: "#1b2842",
    alternateLoseColor: "#8795db",
    ...overrides?.wheel,
  };

  return {
    logo: {
      sizePercent: 100,
      marginBottomPx: 20,
      align: "center",
      ...overrides?.logo,
    },
    background: {
      mode: "color",
      color: "#ffffff",
      imageUrl: undefined,
      ...overrides?.background,
    },
    heading: {
      textColor: "#1f2937",
      fontSizePx: 42,
      fontFamily: "display",
      align: "center",
      ...overrides?.heading,
    },
    button: {
      backgroundColor: "#2f6df6",
      textColor: "#ffffff",
      borderColor: "#2f6df6",
      size: "md",
      textSizePx: 24,
      isBold: true,
      ...overrides?.button,
    },
    layout: {
      blockSpacingPx: 28,
      ...overrides?.layout,
    },
    wheel: {
      ...wheel,
    },
    poster: {
      logoUrl: undefined,
      logoSizePercent: 100,
      logoBottomMarginPx: 28,
      backgroundImageUrl: "",
      headline: "Scannez, jouez, récupérez votre cadeau",
      headlineTextColor: "#ffffff",
      headlineFontSizePx: 42,
      headlineFontFamily: "display",
      wheel,
      footerBackgroundColor: "#8d9ae8",
      ...overrides?.poster,
    },
    email: normalizeCampaignEmailSettings(overrides?.email, createCampaignEmailDefaults(merchantSeed)),
  };
}

function createRewardRules(
  overrides?: Partial<CampaignRewardRules>,
): CampaignRewardRules {
  return {
    rewardExpiryMinutes: 20,
    purchaseRequired: false,
    availableAfterHours: 0,
    availabilityDurationDays: 0,
    isWinningEveryTime: false,
    ...overrides,
  };
}

function createAction(id: string, label: string, url: string, kind: CampaignAction["kind"]) {
  return { id, label, url, kind };
}

const merchantSeed: Merchant = {
  id: "merchant-maison-sora",
  companyName: "Maison Sora",
  logoText: "MS",
  logoUrl: undefined,
  industry: "Mode et maison",
  restaurantType: "Brasserie",
  city: "Paris Marais",
  address: "12 rue du Marais, 75004 Paris",
  contactName: "Pierre-Henri Brunelle",
  phone: "01 40 00 00 00",
  restaurantEmail: "contact@maisonsora.fr",
  websiteUrl: "https://maisonsora.fr",
  onboardingCompleted: true,
  preferredGoals: ["Avis Google", "Collecte CRM"],
  diffusionSupport: ["QR code vitrine et comptoir", "Script équipe magasin"],
  googleReviewUrl: "https://g.page/r/CampaignReview",
  instagramUrl: "https://instagram.com/maisonsora",
  facebookUrl: "https://facebook.com/maisonsora",
  tiktokUrl: "https://tiktok.com/@maisonsora",
  tripadvisorUrl: "https://tripadvisor.com/",
  defaultPrizeCost: 3.4,
  createdAt: "2026-06-01T08:00:00.000Z",
};

const userSeed: MerchantUser[] = [
  {
    id: "user-maison-sora-admin",
    merchantId: merchantSeed.id,
    firstName: "Pierre-Henri",
    lastName: "Brunelle",
    email: "camille@maisonsora.fr",
    password: "demo1234",
    createdAt: "2026-06-01T08:00:00.000Z",
  },
];

const campaignSeed: Campaign[] = [
  {
    id: "camp-sora-review",
    merchantId: merchantSeed.id,
    title: "Ticket vitrine · avis authentiques",
    subtitle: "Partagez votre expérience puis découvrez instantanément votre lot.",
    goalType: "review_prompt",
    ctaLabel: "Je participe",
    successMetric: "Clics vers avis",
    targetUrl: merchantSeed.googleReviewUrl,
    isActive: true,
    createdAt: "2026-06-03T10:00:00.000Z",
    accent: {
      ink: "#121317",
      paper: "#f3eee6",
      signal: "#f5b93d",
    },
    gameType: "scratch",
    logoMode: "text",
    logoText: merchantSeed.companyName,
    logoUrl: undefined,
    presentation: createPresentation({
      background: { color: "#121317" },
      button: {
        backgroundColor: "#8d9ae8",
        textColor: "#ffffff",
        borderColor: "#f5b93d",
        textSizePx: 24,
      },
      layout: {
        blockSpacingPx: 30,
      },
    }),
    actions: [
      createAction(
        "action-google-1",
        "Partager mon expérience sur Google",
        merchantSeed.googleReviewUrl ?? "",
        "google",
      ),
    ],
    rewardRules: createRewardRules({
      rewardExpiryMinutes: 18,
      availabilityDurationDays: 0,
    }),
  },
  {
    id: "camp-sora-social",
    merchantId: merchantSeed.id,
    title: "Summer drop · traction Instagram",
    subtitle: "Découvrez nos réseaux puis tentez votre chance en sortie de caisse.",
    goalType: "social_follow",
    ctaLabel: "Je participe",
    successMetric: "Clics sociaux",
    targetUrl: merchantSeed.instagramUrl,
    isActive: true,
    createdAt: "2026-06-06T09:00:00.000Z",
    accent: {
      ink: "#1e2231",
      paper: "#edf1ff",
      signal: "#8d9ae8",
    },
    gameType: "wheel",
    logoMode: "text",
    logoText: merchantSeed.companyName,
    logoUrl: undefined,
    presentation: createPresentation({
      background: { color: "#1e2231" },
      button: {
        backgroundColor: "#8d9ae8",
        textColor: "#ffffff",
        borderColor: "#8d9ae8",
        textSizePx: 24,
      },
      layout: {
        blockSpacingPx: 30,
      },
      wheel: {
        rimColor: "#f4c14a",
        winColor: "#f4c14a",
        alternateWinColor: "#f3f0ff",
      },
    }),
    actions: [
      createAction(
        "action-instagram-1",
        "Découvrir notre Instagram",
        merchantSeed.instagramUrl ?? "",
        "instagram",
      ),
      createAction(
        "action-facebook-1",
        "Voir notre Facebook",
        "https://facebook.com/maisonsora",
        "facebook",
      ),
    ],
    rewardRules: createRewardRules({
      rewardExpiryMinutes: 25,
      availableAfterHours: 24,
      availabilityDurationDays: 14,
    }),
  },
  {
    id: "camp-sora-leads",
    merchantId: merchantSeed.id,
    title: "Collectors club · base CRM locale",
    subtitle: "Laissez vos coordonnées et gagnez un avantage à utiliser plus tard en boutique.",
    goalType: "lead_capture",
    ctaLabel: "Je participe",
    successMetric: "Nouveaux contacts opt-in",
    isActive: false,
    createdAt: "2026-06-07T10:00:00.000Z",
    accent: {
      ink: "#171210",
      paper: "#fff3e3",
      signal: "#ff7f50",
    },
    gameType: "scratch",
    logoMode: "text",
    logoText: merchantSeed.companyName,
    logoUrl: undefined,
    presentation: createPresentation({
      background: { color: "#171210" },
      button: {
        backgroundColor: "#ff7f50",
        textColor: "#ffffff",
        borderColor: "#ff7f50",
        textSizePx: 24,
      },
      layout: {
        blockSpacingPx: 30,
      },
    }),
    actions: [],
    rewardRules: createRewardRules({
      rewardExpiryMinutes: 15,
      purchaseRequired: true,
      isWinningEveryTime: true,
    }),
  },
];

const prizeSeed: Prize[] = [
  {
    id: "prize-review-1",
    campaignId: "camp-sora-review",
    label: "Café signature offert",
    totalQuantity: 50,
    remainingQuantity: 37,
    probability: 32,
    estimatedUnitCost: 1.9,
  },
  {
    id: "prize-review-2",
    campaignId: "camp-sora-review",
    label: "Mini dessert du jour",
    totalQuantity: 24,
    remainingQuantity: 17,
    probability: 14,
    estimatedUnitCost: 2.8,
  },
  {
    id: "prize-review-3",
    campaignId: "camp-sora-review",
    label: "Brunch upgrade",
    totalQuantity: null,
    remainingQuantity: null,
    probability: 54,
    estimatedUnitCost: 7.5,
  },
  {
    id: "prize-social-1",
    campaignId: "camp-sora-social",
    label: "Cookie atelier",
    totalQuantity: 60,
    remainingQuantity: 48,
    probability: 28,
    estimatedUnitCost: 1.5,
  },
  {
    id: "prize-social-2",
    campaignId: "camp-sora-social",
    label: "Bon retour 10%",
    totalQuantity: 80,
    remainingQuantity: 61,
    probability: 25,
    estimatedUnitCost: 2,
  },
  {
    id: "prize-leads-1",
    campaignId: "camp-sora-leads",
    label: "Tote bag capsule",
    totalQuantity: null,
    remainingQuantity: null,
    probability: 100,
    estimatedUnitCost: 5.8,
  },
];

const leadSeed: Lead[] = [
  {
    id: "lead-001",
    campaignId: "camp-sora-review",
    firstName: "Léa",
    email: "lea@example.com",
    marketingConsent: true,
    consentTimestamp: "2026-06-08T08:32:00.000Z",
    prizeId: "prize-review-1",
    status: "redeemed",
    createdAt: "2026-06-08T08:32:00.000Z",
    actionConfirmed: true,
    redemptionCode: "OK-4012",
    rewardAvailableAt: "2026-06-08T08:32:00.000Z",
    rewardExpiresAt: "2026-06-08T08:50:00.000Z",
  },
  {
    id: "lead-002",
    campaignId: "camp-sora-review",
    firstName: "Noé",
    email: "noe@example.com",
    marketingConsent: true,
    consentTimestamp: "2026-06-09T10:10:00.000Z",
    status: "lost",
    createdAt: "2026-06-09T10:10:00.000Z",
    actionConfirmed: false,
  },
  {
    id: "lead-003",
    campaignId: "camp-sora-social",
    firstName: "Inès",
    email: "ines@example.com",
    marketingConsent: true,
    consentTimestamp: "2026-06-10T12:05:00.000Z",
    prizeId: "prize-social-2",
    status: "claimed",
    createdAt: "2026-06-10T12:05:00.000Z",
    actionConfirmed: true,
    redemptionCode: "OK-5099",
    rewardAvailableAt: "2026-06-11T12:05:00.000Z",
    rewardExpiresAt: "2026-06-25T12:05:00.000Z",
  },
  {
    id: "lead-004",
    campaignId: "camp-sora-social",
    firstName: "Maya",
    email: "maya@example.com",
    marketingConsent: true,
    consentTimestamp: "2026-06-10T14:18:00.000Z",
    status: "lost",
    createdAt: "2026-06-10T14:18:00.000Z",
    actionConfirmed: true,
  },
];

const eventSeed: CampaignEvent[] = [
  { id: "evt-001", campaignId: "camp-sora-review", eventType: "scan", createdAt: "2026-06-08T08:30:00.000Z" },
  { id: "evt-002", campaignId: "camp-sora-review", eventType: "form_started", createdAt: "2026-06-08T08:31:00.000Z" },
  { id: "evt-003", campaignId: "camp-sora-review", leadId: "lead-001", eventType: "lead_created", createdAt: "2026-06-08T08:32:00.000Z" },
  { id: "evt-004", campaignId: "camp-sora-review", leadId: "lead-001", eventType: "review_clicked", createdAt: "2026-06-08T08:32:10.000Z" },
  { id: "evt-005", campaignId: "camp-sora-review", leadId: "lead-001", eventType: "review_confirmed", createdAt: "2026-06-08T08:32:34.000Z" },
  { id: "evt-006", campaignId: "camp-sora-review", leadId: "lead-001", eventType: "game_played", createdAt: "2026-06-08T08:32:36.000Z" },
  { id: "evt-007", campaignId: "camp-sora-review", leadId: "lead-001", eventType: "prize_won", createdAt: "2026-06-08T08:32:36.000Z" },
  { id: "evt-008", campaignId: "camp-sora-review", leadId: "lead-001", eventType: "prize_redeemed", createdAt: "2026-06-08T08:37:00.000Z" },
  { id: "evt-009", campaignId: "camp-sora-review", eventType: "scan", createdAt: "2026-06-09T10:08:00.000Z" },
  { id: "evt-010", campaignId: "camp-sora-review", leadId: "lead-002", eventType: "lead_created", createdAt: "2026-06-09T10:10:00.000Z" },
  { id: "evt-011", campaignId: "camp-sora-review", leadId: "lead-002", eventType: "game_played", createdAt: "2026-06-09T10:10:24.000Z" },
  { id: "evt-012", campaignId: "camp-sora-social", eventType: "scan", createdAt: "2026-06-10T12:03:00.000Z" },
  { id: "evt-013", campaignId: "camp-sora-social", leadId: "lead-003", eventType: "lead_created", createdAt: "2026-06-10T12:05:00.000Z" },
  { id: "evt-014", campaignId: "camp-sora-social", leadId: "lead-003", eventType: "social_clicked", createdAt: "2026-06-10T12:05:12.000Z" },
  { id: "evt-015", campaignId: "camp-sora-social", leadId: "lead-003", eventType: "game_played", createdAt: "2026-06-10T12:05:20.000Z" },
  { id: "evt-016", campaignId: "camp-sora-social", leadId: "lead-003", eventType: "prize_won", createdAt: "2026-06-10T12:05:20.000Z" },
  { id: "evt-017", campaignId: "camp-sora-social", eventType: "scan", createdAt: "2026-06-10T14:15:00.000Z" },
  { id: "evt-018", campaignId: "camp-sora-social", leadId: "lead-004", eventType: "lead_created", createdAt: "2026-06-10T14:18:00.000Z" },
  { id: "evt-019", campaignId: "camp-sora-social", leadId: "lead-004", eventType: "social_clicked", createdAt: "2026-06-10T14:18:10.000Z" },
  { id: "evt-020", campaignId: "camp-sora-social", leadId: "lead-004", eventType: "game_played", createdAt: "2026-06-10T14:18:20.000Z" },
];

function createSeededStore(): Store {
  return {
    merchants: [merchantSeed],
    users: userSeed,
    campaigns: campaignSeed,
    prizes: prizeSeed,
    leads: leadSeed,
    events: eventSeed,
    drawSessions: [],
  };
}

declare global {
  var __retailActivationStore: Store | undefined;
}

function normalizeCampaign(rawCampaign: Campaign | (Partial<Campaign> & Record<string, unknown>)): Campaign {
  const fallback =
    campaignSeed.find((campaign) => campaign.id === rawCampaign.id) ?? campaignSeed[0];
  const goalType = rawCampaign.goalType ?? fallback.goalType;
  const targetUrl =
    typeof rawCampaign.targetUrl === "string" && rawCampaign.targetUrl.length > 0
      ? rawCampaign.targetUrl
      : goalType === "review_prompt"
        ? merchantSeed.googleReviewUrl
        : merchantSeed.instagramUrl;
  const presentation = rawCampaign.presentation ?? fallback.presentation;
  const wheel = {
    rimColor: presentation.wheel?.rimColor ?? "#f4c14a",
    winColor: presentation.wheel?.winColor ?? "#f4c14a",
    alternateWinColor: presentation.wheel?.alternateWinColor ?? "#eef2ff",
    loseColor: presentation.wheel?.loseColor ?? "#1b2842",
    alternateLoseColor: presentation.wheel?.alternateLoseColor ?? "#8795db",
  };

  return {
    id: rawCampaign.id ?? fallback.id,
    merchantId: rawCampaign.merchantId ?? merchantSeed.id,
    title: rawCampaign.title ?? fallback.title,
    subtitle: rawCampaign.subtitle ?? fallback.subtitle,
    goalType,
    ctaLabel: rawCampaign.ctaLabel ?? fallback.ctaLabel,
    successMetric: rawCampaign.successMetric ?? fallback.successMetric,
    targetUrl,
    isActive: rawCampaign.isActive ?? fallback.isActive,
    createdAt: rawCampaign.createdAt ?? fallback.createdAt,
    accent: rawCampaign.accent ?? fallback.accent,
    gameType: rawCampaign.gameType ?? fallback.gameType,
    logoMode: rawCampaign.logoMode ?? fallback.logoMode ?? "text",
    logoText:
      typeof rawCampaign.logoText === "string" && rawCampaign.logoText.trim()
        ? rawCampaign.logoText
        : fallback.logoText ?? merchantSeed.companyName,
    logoUrl: rawCampaign.logoUrl,
    presentation: {
      ...presentation,
      wheel,
      button: {
        ...presentation.button,
        isBold: presentation.button.isBold ?? true,
      },
      poster: normalizePosterSettings(
        presentation.poster,
        createPosterSettingsDefaults({
          logoMode: rawCampaign.logoMode ?? fallback.logoMode ?? "text",
          logoText:
            typeof rawCampaign.logoText === "string" && rawCampaign.logoText.trim()
              ? rawCampaign.logoText
              : fallback.logoText ?? merchantSeed.companyName,
          logoUrl: rawCampaign.logoUrl,
          logoSizePercent: presentation.logo?.sizePercent ?? 100,
          logoBottomMarginPx: presentation.logo?.marginBottomPx ?? 28,
          backgroundMode: presentation.background?.mode ?? "color",
          backgroundColor: presentation.background?.color ?? "#ffffff",
          backgroundImageUrl: presentation.background?.imageUrl ?? "",
          headline: rawCampaign.subtitle ?? fallback.subtitle,
          headlineTextColor: presentation.heading?.textColor ?? "#ffffff",
          headlineFontSizePx: presentation.heading?.fontSizePx ?? 42,
          headlineFontFamily: presentation.heading?.fontFamily ?? "display",
          wheel,
          footerBackgroundColor: rawCampaign.accent?.signal ?? fallback.accent.signal,
        }),
      ),
      email: normalizeCampaignEmailSettings(
        presentation.email,
        createCampaignEmailDefaults(merchantSeed),
      ),
    },
    actions:
      rawCampaign.actions ??
      (targetUrl
        ? [
            createAction(
              `action-${rawCampaign.id ?? fallback.id}-1`,
              goalType === "review_prompt"
                ? "Partager mon expérience sur Google"
                : "Découvrir notre univers",
              targetUrl,
              goalType === "review_prompt" ? "google" : "instagram",
            ),
          ]
        : []),
    rewardRules:
      rawCampaign.rewardRules ??
      createRewardRules({
        rewardExpiryMinutes:
          typeof (rawCampaign as { rewardExpiryMinutes?: unknown }).rewardExpiryMinutes ===
          "number"
            ? ((rawCampaign as { rewardExpiryMinutes: number }).rewardExpiryMinutes ?? 20)
            : fallback.rewardRules.rewardExpiryMinutes,
      }),
  };
}

function normalizeStore(rawStore: Store): Store {
  return {
    merchants: rawStore.merchants?.length ? rawStore.merchants : [merchantSeed],
    users: rawStore.users?.length ? rawStore.users : userSeed,
    campaigns: (rawStore.campaigns ?? campaignSeed).map((campaign) => normalizeCampaign(campaign)),
    prizes: (rawStore.prizes ?? prizeSeed).map((prize) => ({
      ...prize,
      totalQuantity: prize.totalQuantity ?? null,
      remainingQuantity: prize.remainingQuantity ?? prize.totalQuantity ?? null,
    })),
    leads: rawStore.leads ?? [],
    events: rawStore.events ?? [],
    drawSessions: rawStore.drawSessions ?? [],
  };
}

const store = normalizeStore(globalThis.__retailActivationStore ?? createSeededStore());
globalThis.__retailActivationStore = store;

function getDataBackend(operation: string) {
  return assertDataBackendAvailable(operation);
}

async function resolveMerchantForSupabase(
  merchantId: string,
  fallbackMerchant?: Merchant,
): Promise<Merchant> {
  if (fallbackMerchant?.id === merchantId) {
    return fallbackMerchant;
  }

  const merchant = await getSupabaseMerchantProfile(merchantId);

  if (!merchant) {
    throw new Error("Marchand introuvable");
  }

  return merchant;
}

async function resolveCampaignMerchantForSupabase(
  campaignId: string,
  fallbackMerchant?: Merchant,
): Promise<Merchant> {
  const performance = await getSupabaseCampaignPerformance(campaignId, fallbackMerchant);

  if (!performance) {
    throw new Error("Campagne introuvable");
  }

  return performance.merchant;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getCampaign(id: string) {
  return store.campaigns.find((campaign) => campaign.id === id);
}

function getMerchant(id: string) {
  return store.merchants.find((merchant) => merchant.id === id);
}

function getUser(id: string) {
  return store.users.find((user) => user.id === id);
}

function getUserByEmail(email: string) {
  return store.users.find((user) => user.email === email.trim().toLowerCase());
}

function getCampaignPrizes(campaignId: string) {
  return store.prizes.filter((prize) => prize.campaignId === campaignId);
}

function toLeadRow(lead: Lead): MerchantLeadRow {
  const campaign = getCampaign(lead.campaignId);
  const prize = store.prizes.find((item) => item.id === lead.prizeId);

  return {
    ...lead,
    campaignTitle: campaign?.title ?? "Campagne",
    goalType: campaign?.goalType ?? "lead_capture",
    prizeLabel: lead.prizeId ? prize?.label ?? "Lot inconnu" : "Perdu",
    prizeUsageConditions: lead.prizeId ? prize?.usageConditions : undefined,
    emailDeliveryStatus: undefined,
    emailSentAt: undefined,
    emailDeliveredAt: undefined,
    emailErrorMessage: undefined,
  };
}

function toPublicCampaign(campaign: Campaign, actions = campaign.actions): PublicCampaign {
  const merchant = getMerchant(campaign.merchantId);

  if (!merchant) {
    throw new Error("Marchand introuvable");
  }

  return {
    id: campaign.id,
    title: campaign.title,
    subtitle: campaign.subtitle,
    goalType: campaign.goalType,
    gameType: campaign.gameType,
    ctaLabel: campaign.ctaLabel,
    targetUrl: campaign.targetUrl,
    merchantName: merchant.companyName,
    merchantLogoText: merchant.logoText,
    logoMode: campaign.logoMode ?? "text",
    logoText: campaign.logoText ?? merchant.companyName,
    logoUrl: campaign.logoUrl,
    accent: campaign.accent,
    prizes: getCampaignPrizes(campaign.id).map((prize) => ({
      id: prize.id,
      label: prize.label,
      totalQuantity: prize.totalQuantity,
      remainingQuantity: prize.remainingQuantity,
      probability: prize.probability,
    })),
    presentation: campaign.presentation,
    actions,
    rewardRules: campaign.rewardRules,
  };
}

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function recordEventInMemory(
  campaignId: string,
  eventType: CampaignEvent["eventType"],
  leadId?: string,
  metadata?: CampaignEvent["metadata"],
) {
  const event: CampaignEvent = {
    id: generateId("evt"),
    campaignId,
    leadId,
    eventType,
    metadata,
    createdAt: new Date().toISOString(),
  };

  store.events.push(event);

  return clone(event);
}

function computeKpis(campaign: Campaign) {
  const prizes = getCampaignPrizes(campaign.id);
  const leads = store.leads.filter((lead) => lead.campaignId === campaign.id);
  const events = store.events.filter((event) => event.campaignId === campaign.id);
  const scans = events.filter((event) => event.eventType === "scan").length;
  const actions = events.filter((event) => event.eventType === "review_clicked").length;
  const games = events.filter((event) => event.eventType === "game_played").length;
  const wins = leads.filter((lead) => Boolean(lead.prizeId)).length;
  const redeemed = leads.filter((lead) => lead.status === "redeemed").length;
  const estimatedSpend = leads.reduce((total, lead) => {
    const prize = prizes.find((item) => item.id === lead.prizeId);
    return total + (prize ? prize.estimatedUnitCost : 0);
  }, 0);

  return {
    scans,
    leads: leads.length,
    actions,
    games,
    wins,
    redeemed,
    conversionRate: scans ? Math.round((leads.length / scans) * 100) : 0,
    actionRate: leads.length ? Math.round((actions / leads.length) * 100) : 0,
    redemptionRate: wins ? Math.round((redeemed / wins) * 100) : 0,
    estimatedSpend: Number(estimatedSpend.toFixed(2)),
    costPerLead: leads.length ? Number((estimatedSpend / leads.length).toFixed(2)) : 0,
    costPerRedeemed: redeemed ? Number((estimatedSpend / redeemed).toFixed(2)) : 0,
  };
}

function buildPerformance(campaign: Campaign): CampaignPerformance {
  const merchant = getMerchant(campaign.merchantId);

  if (!merchant) {
    throw new Error("Marchand introuvable");
  }

  return {
    campaign: clone(campaign),
    merchant: clone(merchant),
    prizes: clone(getCampaignPrizes(campaign.id)),
    kpis: computeKpis(campaign),
  };
}

function isPrizeAvailable(prize: Prize) {
  return prize.remainingQuantity === null || prize.remainingQuantity > 0;
}

function decrementPrize(prize: Prize) {
  if (prize.remainingQuantity === null) {
    return;
  }

  prize.remainingQuantity -= 1;
}

function incrementPrize(prize: Prize) {
  if (prize.remainingQuantity === null) {
    return;
  }

  prize.remainingQuantity += 1;
}

function choosePrize(campaign: Campaign, prizes: Prize[]) {
  const available = prizes.filter(isPrizeAvailable);

  if (!available.length) {
    return null;
  }

  if (campaign.rewardRules.isWinningEveryTime) {
    const roll = Math.random() * 100;
    let cursor = 0;

    for (const prize of available) {
      cursor += Math.max(1, prize.probability);

      if (roll <= cursor) {
        decrementPrize(prize);
        return prize;
      }
    }

    decrementPrize(available[0]);
    return available[0];
  }

  const roll = Math.random() * 100;
  let cursor = 0;

  for (const prize of available) {
    cursor += prize.probability;

    if (roll <= cursor) {
      decrementPrize(prize);
      return prize;
    }
  }

  return null;
}

function expireDrawSessionsFromMemory() {
  const now = Date.now();

  for (const session of store.drawSessions) {
    if (session.status !== "pending" || new Date(session.expiresAt).getTime() > now) {
      continue;
    }

    session.status = "expired";

    if (session.prizeId) {
      const prize = store.prizes.find((item) => item.id === session.prizeId);

      if (prize) {
        incrementPrize(prize);
      }
    }
  }
}

function buildLeadFromSession(
  campaign: Campaign,
  session: DrawSession,
  input: FinalizeDrawSessionRequest,
): Lead {
  const now = new Date();
  const lead: Lead = {
    id: generateId("lead"),
    campaignId: campaign.id,
    firstName: input.firstName.trim(),
    email: input.email.trim().toLowerCase(),
    marketingConsent: Boolean(input.marketingConsent),
    consentTimestamp: now.toISOString(),
    status: "lost",
    createdAt: now.toISOString(),
    actionConfirmed: false,
  };

  if (!session.prizeId) {
    return lead;
  }

  const availableAt = new Date(
    now.getTime() + campaign.rewardRules.availableAfterHours * 60 * 60 * 1000,
  );
  const expiresAt =
    campaign.rewardRules.availabilityDurationDays > 0
      ? new Date(
          availableAt.getTime() +
            campaign.rewardRules.availabilityDurationDays * 24 * 60 * 60 * 1000,
        )
      : new Date(now.getTime() + campaign.rewardRules.rewardExpiryMinutes * 60 * 1000);

  lead.prizeId = session.prizeId;
  lead.status = "claimed";
  lead.redemptionCode = `OK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  lead.rewardAvailableAt = availableAt.toISOString();
  lead.rewardExpiresAt = expiresAt.toISOString();

  return lead;
}

function getMerchantProfileFromMemory(merchantId = merchantSeed.id) {
  const merchant = getMerchant(merchantId);

  if (!merchant) {
    throw new Error("Marchand introuvable");
  }

  return clone(merchant);
}

function getMerchantUserFromMemory(userId: string) {
  const user = getUser(userId);

  return user ? clone(user) : null;
}

function getMerchantUserByEmailFromMemory(email: string) {
  const user = getUserByEmail(email);

  return user ? clone(user) : null;
}

function createMerchantAccountInMemory(input: MerchantSignUpInput) {
  const email = input.email.trim().toLowerCase();

  if (getUserByEmail(email)) {
    throw new Error("Un compte existe déjà avec cette adresse e-mail.");
  }

  if (input.password !== input.confirmPassword) {
    throw new Error("Les mots de passe ne correspondent pas.");
  }

  const merchantId = generateId("merchant");
  const userId = generateId("user");
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const companyName = input.companyName.trim();
  const city = input.city.trim();
  const phone = (input.phone ?? "").trim();

  const merchant: Merchant = {
    id: merchantId,
    companyName,
    logoText: companyName.slice(0, 2).toUpperCase(),
    logoUrl: undefined,
    industry: "",
    restaurantType: "Brasserie",
    city,
    address: "",
    contactName: `${firstName} ${lastName}`.trim(),
    phone,
    restaurantEmail: "",
    websiteUrl: "",
    onboardingCompleted: false,
    preferredGoals: [],
    diffusionSupport: [],
    googleReviewUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    tripadvisorUrl: "",
    defaultPrizeCost: 3,
    createdAt: new Date().toISOString(),
  };

  const user: MerchantUser = {
    id: userId,
    merchantId,
    firstName,
    lastName,
    email,
    password: input.password,
    createdAt: new Date().toISOString(),
  };

  store.merchants.unshift(merchant);
  store.users.unshift(user);

  return {
    user: clone(user),
    merchant: clone(merchant),
  };
}

function authenticateMerchantInMemory(input: MerchantSignInInput) {
  const user = getUserByEmail(input.email);

  if (!user || user.password !== input.password) {
    throw new Error("Identifiants invalides.");
  }

  const merchant = getMerchant(user.merchantId);

  if (!merchant) {
    throw new Error("Marchand introuvable.");
  }

  return {
    user: clone(user),
    merchant: clone(merchant),
  };
}

function updateMerchantOnboardingInMemory(userId: string, input: MerchantOnboardingInput) {
  const user = getUser(userId);

  if (!user) {
    throw new Error("Utilisateur introuvable.");
  }

  const merchant = getMerchant(user.merchantId);

  if (!merchant) {
    throw new Error("Marchand introuvable.");
  }

  merchant.companyName = input.companyName.trim();
  merchant.logoText = input.companyName.trim().slice(0, 2).toUpperCase();
  merchant.industry = input.industry.trim();
  merchant.restaurantType = input.restaurantType.trim();
  merchant.city = input.city.trim();
  merchant.address = input.address.trim();
  merchant.contactName = input.contactName.trim();
  merchant.phone = input.phone.trim();
  merchant.restaurantEmail = input.restaurantEmail.trim().toLowerCase();
  merchant.websiteUrl = input.websiteUrl.trim();
  merchant.defaultPrizeCost = input.defaultPrizeCost;
  merchant.preferredGoals = input.preferredGoals;
  merchant.diffusionSupport = input.diffusionSupport;
  merchant.googleReviewUrl = input.googleReviewUrl.trim();
  merchant.instagramUrl = input.instagramUrl.trim();
  merchant.facebookUrl = input.facebookUrl.trim();
  merchant.tiktokUrl = input.tiktokUrl.trim();
  merchant.tripadvisorUrl = input.tripadvisorUrl.trim();
  merchant.onboardingCompleted = true;

  return clone(merchant);
}

function updateMerchantAccountInMemory(userId: string, input: MerchantAccountSettingsInput) {
  const user = getUser(userId);

  if (!user) {
    throw new Error("Utilisateur introuvable.");
  }

  const email = input.email.trim().toLowerCase();
  const duplicate = store.users.find((item) => item.email === email && item.id !== userId);

  if (duplicate) {
    throw new Error("Cette adresse e-mail est deja utilisee.");
  }

  const merchant = getMerchant(user.merchantId);

  if (!merchant) {
    throw new Error("Marchand introuvable.");
  }

  user.firstName = input.firstName.trim();
  user.lastName = input.lastName.trim();
  user.email = email;

  merchant.companyName = input.companyName.trim();
  merchant.logoText = input.companyName.trim().slice(0, 2).toUpperCase();
  merchant.industry = input.industry.trim();
  merchant.restaurantType = input.restaurantType.trim();
  merchant.city = input.city.trim();
  merchant.address = input.address.trim();
  merchant.contactName = input.contactName.trim();
  merchant.phone = input.phone.trim();
  merchant.restaurantEmail = input.restaurantEmail.trim().toLowerCase();
  merchant.websiteUrl = input.websiteUrl.trim();
  merchant.googleReviewUrl = input.googleReviewUrl.trim();
  merchant.instagramUrl = input.instagramUrl.trim();
  merchant.facebookUrl = input.facebookUrl.trim();
  merchant.tiktokUrl = input.tiktokUrl.trim();
  merchant.tripadvisorUrl = input.tripadvisorUrl.trim();
  merchant.defaultPrizeCost = input.defaultPrizeCost;

  return {
    merchant: clone(merchant),
    user: clone(user),
  };
}

export const getMerchantProfile = cache(async function getMerchantProfile(merchantId = merchantSeed.id) {
  if (getDataBackend("la lecture du profil marchand") === "supabase") {
    return getSupabaseMerchantProfile(merchantId);
  }

  return getMerchantProfileFromMemory(merchantId);
});

export const getMerchantUser = cache(async function getMerchantUser(userId: string) {
  if (getDataBackend("la lecture de l'utilisateur marchand") === "supabase") {
    return getSupabaseMerchantUser(userId);
  }

  return getMerchantUserFromMemory(userId);
});

export async function getMerchantUserByEmail(email: string) {
  if (getDataBackend("la recherche de l'utilisateur marchand") === "supabase") {
    return getSupabaseMerchantUserByEmail(email);
  }

  return getMerchantUserByEmailFromMemory(email);
}

export async function createMerchantAccount(input: MerchantSignUpInput) {
  if (getDataBackend("la création de compte marchand") === "supabase") {
    return createMerchantAccountInSupabase(input);
  }

  return createMerchantAccountInMemory(input);
}

export async function authenticateMerchant(input: MerchantSignInInput) {
  if (getDataBackend("la connexion marchand") === "supabase") {
    return authenticateMerchantInSupabase(input);
  }

  return authenticateMerchantInMemory(input);
}

export async function updateMerchantOnboarding(userId: string, input: MerchantOnboardingInput) {
  if (getDataBackend("la mise à jour de l'onboarding") === "supabase") {
    return updateMerchantOnboardingInSupabase(userId, input);
  }

  return updateMerchantOnboardingInMemory(userId, input);
}

export async function updateMerchantAccount(userId: string, input: MerchantAccountSettingsInput) {
  if (getDataBackend("la mise à jour du compte marchand") === "supabase") {
    return updateMerchantAccountInSupabase(userId, input);
  }

  return updateMerchantAccountInMemory(userId, input);
}

export function listCampaigns() {
  return clone(store.campaigns);
}

export function getPrimaryCampaignId() {
  return store.campaigns.find((campaign) => campaign.isActive)?.id ?? store.campaigns[0]?.id;
}

function getPublicCampaignFromMemory(id: string) {
  const campaign = getCampaign(id);

  if (!campaign || !campaign.isActive) {
    return null;
  }

  return clone(toPublicCampaign(campaign));
}

function getCampaignPerformanceFromMemory(campaignId: string) {
  const campaign = getCampaign(campaignId);

  if (!campaign) {
    return null;
  }

  return buildPerformance(campaign);
}

function getMerchantDashboardFromMemory(
  merchantId = merchantSeed.id,
  fallbackMerchant?: Merchant,
): MerchantDashboardData {
  const merchant = getMerchant(merchantId) ?? fallbackMerchant;

  if (!merchant) {
    throw new Error("Marchand introuvable");
  }

  const campaigns = store.campaigns
    .filter((campaign) => campaign.merchantId === merchantId)
    .map((campaign) => buildPerformance(campaign));

  const totalLeads = campaigns.reduce((total, item) => total + item.kpis.leads, 0);
  const totalRedeemed = campaigns.reduce((total, item) => total + item.kpis.redeemed, 0);
  const averageConversion = campaigns.length
    ? Math.round(
        campaigns.reduce((total, item) => total + item.kpis.conversionRate, 0) /
          campaigns.length,
      )
    : 0;
  const campaignIds = new Set(campaigns.map((item) => item.campaign.id));
  const relevantLeads = store.leads.filter((lead) => campaignIds.has(lead.campaignId));
  const relevantEvents = store.events.filter((event) => campaignIds.has(event.campaignId));
  const referenceDates = [
    ...relevantLeads.map((lead) => lead.createdAt),
    ...relevantEvents.map((event) => event.createdAt),
  ];
  const latest = referenceDates.length
    ? new Date([...referenceDates].sort((a, b) => a.localeCompare(b)).at(-1) ?? new Date().toISOString())
    : new Date();
  const dayKeys = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth(), latest.getUTCDate()));
    date.setUTCDate(latest.getUTCDate() - (30 - index - 1));
    return date.toISOString().slice(0, 10);
  });
  const scansByDay = new Map<string, number>();
  const participationsByDay = new Map<string, number>();

  for (const event of relevantEvents) {
    if (event.eventType === "scan") {
      const day = event.createdAt.slice(0, 10);
      scansByDay.set(day, (scansByDay.get(day) ?? 0) + 1);
    }
  }

  for (const lead of relevantLeads) {
    const day = lead.createdAt.slice(0, 10);
    participationsByDay.set(day, (participationsByDay.get(day) ?? 0) + 1);
  }

  return {
    merchant: clone(merchant),
    campaigns,
    totalLeads,
    totalRedeemed,
    averageConversion,
    activityPoints: dayKeys.map((label) => ({
      label,
      scans: scansByDay.get(label) ?? 0,
      participations: participationsByDay.get(label) ?? 0,
    })),
  };
}

function getMerchantLeadsFromMemory(campaignId?: string) {
  return clone(
    store.leads
      .filter((lead) => (campaignId ? lead.campaignId === campaignId : true))
      .map((lead) => toLeadRow(lead))
      .sort((a, b) => b.consentTimestamp.localeCompare(a.consentTimestamp)),
  );
}

function getCampaignDataViewFromMemory(campaignId: string): CampaignDataView | null {
  const performance = getCampaignPerformanceFromMemory(campaignId);

  if (!performance) {
    return null;
  }

  return {
    performance,
    leads: getMerchantLeadsFromMemory(campaignId),
    events: clone(
      store.events
        .filter((event) => event.campaignId === campaignId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ),
  };
}

function createDrawSessionFromMemory(input: CreateDrawSessionRequest): CreateDrawSessionResult {
  expireDrawSessionsFromMemory();
  const campaign = getCampaign(input.campaignId);

  if (!campaign || !campaign.isActive) {
    throw new Error("Campagne indisponible");
  }

  const prize = choosePrize(campaign, getCampaignPrizes(campaign.id));
  const session: DrawSession = {
    id: generateId("session"),
    campaignId: campaign.id,
    prizeId: prize?.id,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };

  store.drawSessions.push(session);
  recordEventInMemory(campaign.id, "game_played");

  return {
    session: clone(session),
    prize: prize ? clone(prize) : null,
    campaign: toPublicCampaign(campaign),
  };
}

function getMerchantCampaignLibraryFromMemory(
  merchantId = merchantSeed.id,
  fallbackMerchant?: Merchant,
): CampaignLibraryItem[] {
  const merchant = getMerchant(merchantId) ?? fallbackMerchant;

  if (!merchant) {
    throw new Error("Marchand introuvable");
  }

  return clone(
    store.campaigns
      .filter((campaign) => campaign.merchantId === merchantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((campaign) => ({
        id: campaign.id,
        title: campaign.title,
        gameType: campaign.gameType,
        isActive: campaign.isActive,
        createdAt: campaign.createdAt,
    })),
  );
}

const MERCHANT_NAVIGATION_CACHE_SECONDS = 15;

function merchantCampaignsTag(merchantId: string) {
  return `merchant:${merchantId}:campaigns`;
}

function getCachedSupabaseMerchantCampaignOverview(merchant: Merchant) {
  return getSupabaseMerchantCampaignOverview(merchant);
}

function getCachedSupabaseMerchantCampaignLibrary(merchantId: string) {
  return unstable_cache(
    () => getSupabaseMerchantCampaignLibrary(merchantId),
    ["merchant-campaign-library", merchantId],
    {
      tags: [merchantCampaignsTag(merchantId)],
      revalidate: MERCHANT_NAVIGATION_CACHE_SECONDS,
    },
  )();
}

function getCachedSupabaseCampaignSetupPerformance(campaignId: string, fallbackMerchant?: Merchant) {
  return getSupabaseCampaignSetupPerformance(campaignId, fallbackMerchant);
}

function invalidateCampaignNavigationCache(merchantId?: string, campaignId?: string) {
  void merchantId;
  void campaignId;
}

function finalizeDrawSessionFromMemory(input: FinalizeDrawSessionRequest): DrawResult {
  expireDrawSessionsFromMemory();
  const session = store.drawSessions.find((item) => item.id === input.sessionId);

  if (!session || session.status !== "pending") {
    throw new Error("Session de jeu introuvable ou expirée.");
  }

  const campaign = getCampaign(session.campaignId);

  if (!campaign || !campaign.isActive) {
    throw new Error("Campagne indisponible");
  }

  const lead = buildLeadFromSession(campaign, session, input);
  const previousParticipations = store.leads.filter(
    (item) => item.campaignId === campaign.id && item.email === lead.email,
  ).length;
  const actionForVisit = campaign.actions[previousParticipations];
  const prize = lead.prizeId
    ? getCampaignPrizes(campaign.id).find((item) => item.id === lead.prizeId) ?? null
    : null;

  store.leads.push(lead);
  session.status = "completed";
  recordEventInMemory(campaign.id, "lead_created", lead.id);

  if (prize) {
    recordEventInMemory(campaign.id, "prize_won", lead.id, { prizeId: prize.id });
  }

  return {
    lead: clone(lead),
    prize: prize ? clone(prize) : null,
    campaign: toPublicCampaign(campaign, actionForVisit ? [actionForVisit] : []),
  };
}

function drawForLeadFromMemory(input: DrawRequest): DrawResult {
  const preview = createDrawSessionFromMemory({ campaignId: input.campaignId });

  return finalizeDrawSessionFromMemory({
    sessionId: preview.session.id,
    firstName: input.firstName,
    email: input.email,
    marketingConsent: input.marketingConsent,
  });
}

function markActionConfirmedInMemory(leadId: string) {
  const lead = store.leads.find((item) => item.id === leadId);

  if (!lead) {
    return null;
  }

  lead.actionConfirmed = true;

  return clone(lead);
}

function redeemLeadPrizeInMemory(leadId: string) {
  const lead = store.leads.find((item) => item.id === leadId);

  if (!lead) {
    throw new Error("Lead introuvable");
  }

  if (lead.status === "redeemed") {
    throw new Error("Lot déjà retiré");
  }

  if (!lead.prizeId) {
    throw new Error("Aucun lot à retirer");
  }

  if (lead.rewardAvailableAt && new Date(lead.rewardAvailableAt).getTime() > Date.now()) {
    throw new Error("Lot pas encore disponible");
  }

  if (lead.rewardExpiresAt && new Date(lead.rewardExpiresAt).getTime() < Date.now()) {
    lead.status = "expired";
    recordEventInMemory(lead.campaignId, "prize_expired", lead.id);
    throw new Error("Lot expiré");
  }

  lead.status = "redeemed";
  recordEventInMemory(lead.campaignId, "prize_redeemed", lead.id);

  return clone(lead);
}

function resetLeadPrizeInMemory(leadId: string) {
  const lead = store.leads.find((item) => item.id === leadId);

  if (!lead) {
    throw new Error("Lead introuvable");
  }

  if (!lead.prizeId) {
    throw new Error("Aucun lot à réinitialiser");
  }

  lead.status = "claimed";
  recordEventInMemory(lead.campaignId, "prize_reset", lead.id);

  return clone(lead);
}

function updatePrizeStockInMemory(prizeId: string, remainingQuantity: number | null) {
  const prize = store.prizes.find((item) => item.id === prizeId);

  if (!prize) {
    throw new Error("Dotation introuvable");
  }

  prize.remainingQuantity = remainingQuantity;

  return clone(prize);
}

function resetPrizeStockInMemory(prizeId: string) {
  const prize = store.prizes.find((item) => item.id === prizeId);

  if (!prize) {
    throw new Error("Dotation introuvable");
  }

  prize.remainingQuantity = prize.totalQuantity;

  return clone(prize);
}

function updateCampaignSetupInMemory(input: CampaignSetupInput) {
  const existing = input.id ? getCampaign(input.id) : undefined;

  if (existing) {
    existing.title = input.title;
    existing.subtitle = input.subtitle;
    existing.goalType = input.goalType;
    existing.ctaLabel = input.ctaLabel;
    existing.successMetric = input.successMetric;
    existing.targetUrl = input.targetUrl;
    existing.isActive = input.isActive;
    existing.accent = input.accent;
    existing.gameType = input.gameType;
    existing.logoMode = input.logoMode;
    existing.logoText = input.logoText;
    existing.logoUrl = input.logoUrl;
    existing.presentation = input.presentation;
    existing.actions = input.actions;
    existing.rewardRules = input.rewardRules;

    store.prizes = store.prizes.filter((prize) => prize.campaignId !== existing.id);
    input.prizes.forEach((prize) => {
      store.prizes.push({
        id: prize.id ?? generateId("prize"),
        campaignId: existing.id,
        label: prize.label,
        totalQuantity: prize.totalQuantity ?? null,
        remainingQuantity: prize.totalQuantity ?? null,
        probability: prize.probability,
        estimatedUnitCost: prize.estimatedUnitCost,
        usageConditions: prize.usageConditions,
      });
    });

    return clone(existing);
  }

  const campaignId = generateId("camp");
  const campaign: Campaign = {
    id: campaignId,
    merchantId: input.merchantId,
    title: input.title,
    subtitle: input.subtitle,
    goalType: input.goalType,
    ctaLabel: input.ctaLabel,
    successMetric: input.successMetric,
    targetUrl: input.targetUrl,
    isActive: input.isActive,
    accent: input.accent,
    gameType: input.gameType,
    logoMode: input.logoMode,
    logoText: input.logoText,
    logoUrl: input.logoUrl,
    createdAt: new Date().toISOString(),
    presentation: input.presentation,
    actions: input.actions,
    rewardRules: input.rewardRules,
  };

  store.campaigns.unshift(campaign);

  input.prizes.forEach((prize) => {
    store.prizes.push({
      id: prize.id ?? generateId("prize"),
      campaignId,
      label: prize.label,
      totalQuantity: prize.totalQuantity ?? null,
      remainingQuantity: prize.totalQuantity ?? null,
      probability: prize.probability,
      estimatedUnitCost: prize.estimatedUnitCost,
      usageConditions: prize.usageConditions,
    });
  });

  return clone(campaign);
}

function deleteCampaignInMemory(id: string) {
  const campaign = getCampaign(id);

  if (!campaign) {
    throw new Error("Campagne introuvable");
  }

  store.events = store.events.filter((event) => event.campaignId !== id);
  store.leads = store.leads.filter((lead) => lead.campaignId !== id);
  store.prizes = store.prizes.filter((prize) => prize.campaignId !== id);
  store.campaigns = store.campaigns.filter((item) => item.id !== id);

  return clone(campaign);
}

function duplicateCampaignInMemory(id: string, merchantId = merchantSeed.id) {
  const campaign = store.campaigns.find((item) => item.id === id && item.merchantId === merchantId);

  if (!campaign) {
    throw new Error("Campagne introuvable");
  }

  const campaignId = generateId("camp");
  const duplicate: Campaign = {
    ...clone(campaign),
    id: campaignId,
    title: `${campaign.title} (copie)`,
    isActive: false,
    createdAt: new Date().toISOString(),
    actions: campaign.actions.map((action) => ({
      ...action,
      id: generateId("action"),
    })),
  };

  store.campaigns.unshift(duplicate);
  store.prizes
    .filter((prize) => prize.campaignId === id)
    .forEach((prize) => {
      store.prizes.push({
        ...clone(prize),
        id: generateId("prize"),
        campaignId,
        remainingQuantity: prize.totalQuantity,
      });
    });

  return clone(duplicate);
}

function toggleCampaignInMemory(id: string, isActive: boolean) {
  const campaign = getCampaign(id);

  if (!campaign) {
    throw new Error("Campagne introuvable");
  }

  campaign.isActive = isActive;

  return clone(campaign);
}

export async function recordEvent(
  campaignId: string,
  eventType: CampaignEvent["eventType"],
  leadId?: string,
  metadata?: CampaignEvent["metadata"],
) {
  if (getDataBackend("l'enregistrement d'un événement campagne") === "supabase") {
    return recordEventInSupabase(campaignId, eventType, leadId, metadata);
  }

  return recordEventInMemory(campaignId, eventType, leadId, metadata);
}

export const getPublicCampaign = cache(async function getPublicCampaign(id: string) {
  if (getDataBackend("la lecture d'une campagne publique") === "supabase") {
    return getSupabasePublicCampaign(id);
  }

  return getPublicCampaignFromMemory(id);
});

export const getCampaignPerformance = cache(async function getCampaignPerformance(campaignId: string, fallbackMerchant?: Merchant) {
  if (getDataBackend("la lecture des performances campagne") === "supabase") {
    return getSupabaseCampaignPerformance(campaignId, fallbackMerchant);
  }

  return getCampaignPerformanceFromMemory(campaignId);
});

export const getCampaignSetupPerformance = cache(async function getCampaignSetupPerformance(
  campaignId: string,
  fallbackMerchant?: Merchant,
) {
  if (getDataBackend("la lecture du paramétrage campagne") === "supabase") {
    return getCachedSupabaseCampaignSetupPerformance(campaignId, fallbackMerchant);
  }

  return getCampaignPerformanceFromMemory(campaignId);
});

export const getMerchantDashboard = cache(async function getMerchantDashboard(
  merchantId = merchantSeed.id,
  fallbackMerchant?: Merchant,
) {
  if (getDataBackend("la lecture du dashboard marchand") === "supabase") {
    return getSupabaseMerchantDashboard(
      await resolveMerchantForSupabase(merchantId, fallbackMerchant),
    );
  }

  return getMerchantDashboardFromMemory(merchantId, fallbackMerchant);
});

export const getMerchantCampaignOverview = cache(async function getMerchantCampaignOverview(
  merchantId = merchantSeed.id,
  fallbackMerchant?: Merchant,
) {
  if (getDataBackend("la lecture de la liste des campagnes") === "supabase") {
    return getCachedSupabaseMerchantCampaignOverview(
      await resolveMerchantForSupabase(merchantId, fallbackMerchant),
    );
  }

  return getMerchantDashboardFromMemory(merchantId, fallbackMerchant);
});

export const getMerchantCampaignLibrary = cache(async function getMerchantCampaignLibrary(
  merchantId = merchantSeed.id,
  fallbackMerchant?: Merchant,
) {
  if (getDataBackend("la lecture de la bibliothèque de campagnes") === "supabase") {
    return getCachedSupabaseMerchantCampaignLibrary(fallbackMerchant?.id ?? merchantId);
  }

  return getMerchantCampaignLibraryFromMemory(merchantId, fallbackMerchant);
});

export const getMerchantLeads = cache(async function getMerchantLeads(merchantId = merchantSeed.id, campaignId?: string) {
  if (getDataBackend("la lecture des leads") === "supabase") {
    return getSupabaseMerchantLeads(merchantId, campaignId);
  }

  return getMerchantLeadsFromMemory(campaignId);
});

export const getMerchantRecentLeads = cache(async function getMerchantRecentLeads(
  merchantId = merchantSeed.id,
  limit = 5,
  query = "",
) {
  if (getDataBackend("la lecture des leads récents") === "supabase") {
    return getSupabaseMerchantRecentLeads(merchantId, limit, query);
  }

  const normalizedQuery = query.trim().toLowerCase();

  return getMerchantLeadsFromMemory()
    .filter((lead) =>
      normalizedQuery
        ? `${lead.firstName} ${lead.email} ${lead.campaignTitle}`.toLowerCase().includes(normalizedQuery)
        : true,
    )
    .slice(0, limit);
});

export const getCampaignDataView = cache(async function getCampaignDataView(campaignId: string, fallbackMerchant?: Merchant) {
  if (getDataBackend("la lecture des données campagne") === "supabase") {
    return getSupabaseCampaignDataView(campaignId, fallbackMerchant);
  }

  return getCampaignDataViewFromMemory(campaignId);
});

export const getMerchantSupportOverview = cache(async function getMerchantSupportOverview(
  merchantId = merchantSeed.id,
  fallbackMerchant?: Merchant,
  options: { includeAllMerchants?: boolean } = {},
) {
  if (getDataBackend("la lecture de la supervision") === "supabase") {
    return getSupabaseMerchantSupportOverview(
      await resolveMerchantForSupabase(merchantId, fallbackMerchant),
      options,
    );
  }

  const leads = getMerchantLeadsFromMemory();
  const campaigns = getMerchantDashboardFromMemory(merchantId, fallbackMerchant).campaigns;
  const campaignTitleById = new Map(campaigns.map((item) => [item.campaign.id, item.campaign.title]));

  const pendingClaims: MerchantSupportOverview["pendingClaims"] = leads
    .filter((lead) => lead.status === "claimed" && lead.redemptionCode)
    .slice(0, 30)
    .map((lead) => ({
      leadId: lead.id,
      campaignId: lead.campaignId,
      campaignTitle: campaignTitleById.get(lead.campaignId) ?? "Campagne",
      firstName: lead.firstName,
      email: lead.email,
      prizeLabel: lead.prizeLabel,
      redemptionCode: lead.redemptionCode ?? "",
      status: lead.status,
      availableAt: lead.rewardAvailableAt,
      expiresAt: lead.rewardExpiresAt,
    }));

  return {
    failedEmails: [],
    webhooks: [],
    pendingClaims,
    businessLogs: getMemorySupportLogs()
      .filter((entry) => options.includeAllMerchants || entry.payload?.merchantId === merchantId)
      .slice(0, 50)
      .map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        level: entry.level,
        event: entry.event,
        merchantId:
          typeof entry.payload?.merchantId === "string" ? entry.payload.merchantId : undefined,
        campaignId:
          typeof entry.payload?.campaignId === "string" ? entry.payload.campaignId : undefined,
        leadId: typeof entry.payload?.leadId === "string" ? entry.payload.leadId : undefined,
        email:
          typeof entry.payload?.email === "string"
            ? entry.payload.email
            : typeof entry.payload?.recipientEmail === "string"
              ? entry.payload.recipientEmail
              : undefined,
        redemptionCode:
          typeof entry.payload?.redemptionCode === "string"
            ? entry.payload.redemptionCode
            : undefined,
        summary:
          typeof entry.payload?.error === "string"
            ? entry.payload.error
            : typeof entry.payload?.status === "string"
              ? entry.payload.status
              : undefined,
      })),
  };
});

export async function drawForLead(input: DrawRequest, fallbackMerchant?: Merchant) {
  if (getDataBackend("la participation à un jeu") === "supabase") {
    const merchant =
      fallbackMerchant ?? (await resolveCampaignMerchantForSupabase(input.campaignId));
    return drawForLeadInSupabase(input, merchant);
  }

  return drawForLeadFromMemory(input);
}

export async function createDrawSession(
  input: CreateDrawSessionRequest,
  fallbackMerchant?: Merchant,
) {
  if (getDataBackend("la préparation d'une partie") === "supabase") {
    return createDrawSessionInSupabase(input, fallbackMerchant);
  }

  return createDrawSessionFromMemory(input);
}

export async function finalizeDrawSession(
  input: FinalizeDrawSessionRequest,
  fallbackMerchant?: Merchant,
) {
  if (getDataBackend("la finalisation d'une partie") === "supabase") {
    return finalizeDrawSessionInSupabase(input, fallbackMerchant);
  }

  return finalizeDrawSessionFromMemory(input);
}

export async function markActionConfirmed(leadId: string) {
  if (getDataBackend("la confirmation d'une action marketing") === "supabase") {
    return markActionConfirmedInSupabase(leadId);
  }

  return markActionConfirmedInMemory(leadId);
}

export async function redeemLeadPrize(leadId: string) {
  if (getDataBackend("le retrait d'un lot") === "supabase") {
    return redeemLeadPrizeInSupabase(leadId);
  }

  return redeemLeadPrizeInMemory(leadId);
}

export async function resetLeadPrize(leadId: string) {
  if (getDataBackend("la réinitialisation d'un lot") === "supabase") {
    return resetLeadPrizeInSupabase(leadId);
  }

  return resetLeadPrizeInMemory(leadId);
}

export async function updatePrizeStock(prizeId: string, remainingQuantity: number | null) {
  if (getDataBackend("la mise à jour du stock d'un lot") === "supabase") {
    return updatePrizeStockInSupabase(prizeId, remainingQuantity);
  }

  return updatePrizeStockInMemory(prizeId, remainingQuantity);
}

export async function resetPrizeStock(prizeId: string) {
  if (getDataBackend("la remise à zéro du stock d'un lot") === "supabase") {
    return resetPrizeStockInSupabase(prizeId);
  }

  return resetPrizeStockInMemory(prizeId);
}

export async function updateCampaignSetup(input: CampaignSetupInput) {
  if (getDataBackend("la mise à jour d'une campagne") === "supabase") {
    const campaignId = await updateCampaignSetupInSupabase(input);
    invalidateCampaignNavigationCache(input.merchantId, campaignId);
    return getCampaignPerformance(
      campaignId,
      await resolveMerchantForSupabase(input.merchantId),
    );
  }

  return updateCampaignSetupInMemory(input);
}

export async function toggleCampaign(id: string, isActive: boolean, merchantId?: string) {
  if (getDataBackend("l'activation d'une campagne") === "supabase") {
    if (merchantId) {
      await toggleCampaignForMerchantInSupabase(id, isActive, merchantId);
      invalidateCampaignNavigationCache(merchantId, id);
      return null;
    }

    await toggleCampaignInSupabase(id, isActive);
    invalidateCampaignNavigationCache(undefined, id);
    return null;
  }

  return toggleCampaignInMemory(id, isActive);
}

export async function deleteCampaign(id: string, merchantId?: string) {
  if (getDataBackend("la suppression d'une campagne") === "supabase") {
    if (merchantId) {
      await deleteCampaignForMerchantInSupabase(id, merchantId);
      invalidateCampaignNavigationCache(merchantId, id);
      return null;
    }

    await deleteCampaignInSupabase(id);
    invalidateCampaignNavigationCache(undefined, id);
    return null;
  }

  return deleteCampaignInMemory(id);
}

export async function duplicateCampaign(id: string, fallbackMerchant: Merchant) {
  if (getDataBackend("la duplication d'une campagne") === "supabase") {
    const campaignId = await duplicateCampaignInSupabase(id, fallbackMerchant);
    invalidateCampaignNavigationCache(fallbackMerchant.id, campaignId);
    return getCampaignPerformance(campaignId, fallbackMerchant);
  }

  return duplicateCampaignInMemory(id, fallbackMerchant.id);
}
