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
  findSupabaseMerchantLeadCampaign,
  getSupabaseMerchantLeads,
  getSupabaseMerchantRecentLeads,
  getSupabaseMerchantSupportOverview,
  findSupabaseMerchantLeadByRedemptionCode,
  findSupabasePublicRedemptionContextByCode,
  redeemSupabaseCashierLeadPrize,
  getSupabasePublicCampaign,
  createPublicCampaignIdentity,
  deleteCampaignInSupabase,
  duplicateCampaignInSupabase,
  duplicateCampaignToMerchantInSupabase,
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
  createSupabaseMerchantLocation,
  archiveSupabaseMerchantLocation,
  getSupabaseMerchantWorkspaceContext,
  updateMerchantAccountInSupabase,
  updateMerchantOnboardingInSupabase,
  verifySupabaseMerchantRedemptionPin,
} from "@/lib/merchant-account-repository";
import { assertDataBackendAvailable } from "@/lib/supabase";
import { assertCampaignCanPublish } from "@/lib/campaign-compliance";
import { getMemorySupportLogs } from "@/lib/support-log";
import { createPosterSettingsDefaults, normalizePosterSettings } from "@/lib/poster-utils";
import { cache } from "react";
import {
  Campaign,
  CashierRedemptionContext,
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
  CampaignLayoutSettings,
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
  MerchantLocationAccess,
  MerchantWorkspace,
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
  PublicRedemptionContext,
} from "@/lib/types";
import { createCampaignEmailDefaults, normalizeCampaignEmailSettings } from "@/lib/email-settings";
import { revalidateTag, unstable_cache } from "next/cache";
import { hashPassword, verifyPassword } from "@/lib/passwords";

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
  layout?: Partial<CampaignLayoutSettings>;
  wheel?: Partial<CampaignWheelSettings>;
  poster?: Partial<CampaignPosterSettings>;
  email?: Partial<CampaignEmailSettings>;
};

function createPresentation(overrides?: CampaignPresentationOverrides): CampaignPresentation {
  const wheel = {
    rimColor: "#bac0ca",
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
      fontWeight: 600,
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
      blockSpacingPx: 40,
      templateId: "classic",
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
    participationIntervalDays: 1,
    isWinningEveryTime: false,
    ...overrides,
  };
}

function createAction(id: string, label: string, url: string, kind: CampaignAction["kind"]) {
  return { id, label, url, kind };
}

const merchantSeed: Merchant = {
  id: "merchant-maison-sora",
  workspaceId: "workspace-merchant-maison-sora",
  locationCode: "SORA-PAR",
  locationStatus: "active",
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
  customLinkUrl: "",
  defaultPrizeCost: 3.4,
  createdAt: "2026-06-01T08:00:00.000Z",
};

const memoryRedemptionPinHashes = new Map<string, string>([
  [merchantSeed.id, hashPassword("2468")],
]);

const userSeed: MerchantUser[] = [
  {
    id: "user-maison-sora-admin",
    merchantId: merchantSeed.id,
    workspaceId: merchantSeed.workspaceId,
    role: "owner",
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
          headlineFontSizePx: presentation.heading?.fontSizePx ?? 42,…9472 tokens truncated…n introuvable");
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

export const getPublicCampaign = cache(async function getPublicCampaign(
  id: string,
  participantToken?: string,
) {
  if (getDataBackend("la lecture d'une campagne publique") === "supabase") {
    return getSupabasePublicCampaign(id, participantToken);
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

export const getMerchantWorkspaceDashboard = cache(async function getMerchantWorkspaceDashboard(
  userId: string,
  activeMerchant: Merchant,
) {
  const context = await getMerchantWorkspaceContext(userId, activeMerchant);
  const dashboards = await Promise.all(
    context.locations.map(({ merchant }) => getMerchantDashboard(merchant.id, merchant)),
  );
  const campaigns = dashboards.flatMap((dashboard) => dashboard.campaigns);
  const activityByDay = new Map<string, { scans: number; participations: number }>();
  dashboards.forEach((dashboard) => {
    dashboard.activityPoints.forEach((point) => {
      const current = activityByDay.get(point.label) ?? { scans: 0, participations: 0 };
      activityByDay.set(point.label, {
        scans: current.scans + point.scans,
        participations: current.participations + point.participations,
      });
    });
  });

  return {
    merchant: activeMerchant,
    campaigns,
    totalLeads: dashboards.reduce((total, dashboard) => total + dashboard.totalLeads, 0),
    totalRedeemed: dashboards.reduce((total, dashboard) => total + dashboard.totalRedeemed, 0),
    averageConversion: campaigns.length
      ? Math.round(campaigns.reduce((total, item) => total + item.kpis.conversionRate, 0) / campaigns.length)
      : 0,
    activityPoints: [...activityByDay.entries()].map(([label, values]) => ({ label, ...values })),
  } satisfies MerchantDashboardData;
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

export async function rememberPublicCampaignParticipant(
  campaignId: string,
  email: string,
  token: string,
) {
  if (getDataBackend("la mémorisation du parcours joueur") === "supabase") {
    return createPublicCampaignIdentity(campaignId, email, token);
  }
  return token;
}

export const findMerchantLeadCampaign = cache(async function findMerchantLeadCampaign(
  merchantId = merchantSeed.id,
  query = "",
) {
  if (getDataBackend("la recherche d'un lead") === "supabase") {
    return findSupabaseMerchantLeadCampaign(merchantId, query);
  }

  const normalizedQuery = query.trim().toLowerCase();
  return (
    getMerchantLeadsFromMemory().find((lead) =>
      [lead.redemptionCode ?? "", lead.email, lead.firstName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    )?.campaignId ?? null
  );
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

export const getCampaignDataView = cache(async function getCampaignDataView(
  campaignId: string,
  fallbackMerchant?: Merchant,
  options: { leadLimit?: number; leadOffset?: number; query?: string; emailStatus?: "attention" } = {},
) {
  if (getDataBackend("la lecture des données campagne") === "supabase") {
    return getSupabaseCampaignDataView(campaignId, fallbackMerchant, options);
  }

  return getCampaignDataViewFromMemory(campaignId, options);
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

export async function markActionConfirmed(leadId: string, campaignId?: string) {
  if (getDataBackend("la confirmation d'une action marketing") === "supabase") {
    return markActionConfirmedInSupabase(leadId, campaignId);
  }

  return markActionConfirmedInMemory(leadId, campaignId);
}

export async function redeemLeadPrize(leadId: string) {
  if (getDataBackend("le retrait d'un lot") === "supabase") {
    return redeemLeadPrizeInSupabase(leadId);
  }

  return redeemLeadPrizeInMemory(leadId);
}

export async function findMerchantLeadByRedemptionCode(merchantId: string, code: string) {
  if (getDataBackend("la recherche caisse d'un code") === "supabase") {
    return findSupabaseMerchantLeadByRedemptionCode(merchantId, code);
  }

  return findMerchantLeadByRedemptionCodeInMemory(merchantId, code);
}

export async function redeemMerchantLeadPrizeFromCashier(input: {
  leadId: string;
  merchantId: string;
  operatorUserId: string;
  purchaseConfirmed: boolean;
  idempotencyKey: string;
}) {
  if (getDataBackend("le retrait caisse d'un lot") === "supabase") {
    return redeemSupabaseCashierLeadPrize(input);
  }

  return redeemMerchantLeadPrizeInMemory(input);
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
  assertCampaignCanPublish(input);

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

export async function duplicateCampaignToLocations(
  id: string,
  userId: string,
  sourceMerchant: Merchant,
  targetLocationIds: string[],
) {
  const uniqueTargetIds = [...new Set(targetLocationIds)].filter((locationId) => locationId !== sourceMerchant.id);
  if (!uniqueTargetIds.length) throw new Error("Sélectionnez au moins un autre site.");

  const context = sourceMerchant.workspaceId
    ? await getMerchantWorkspaceContext(userId, sourceMerchant)
    : { locations: [{ merchant: sourceMerchant, role: "owner" as const }] };
  const targetMerchants = context.locations
    .map(({ merchant }) => merchant)
    .filter((merchant) => uniqueTargetIds.includes(merchant.id));
  if (targetMerchants.length !== uniqueTargetIds.length) throw new Error("Un site sélectionné n'est pas accessible.");

  if (getDataBackend("la duplication multi-site") === "supabase") {
    const duplicatedIds = [];
    for (const targetMerchant of targetMerchants) {
      duplicatedIds.push(await duplicateCampaignToMerchantInSupabase(id, sourceMerchant, targetMerchant));
    }
    return duplicatedIds;
  }

  const source = store.campaigns.find((campaign) => campaign.id === id && campaign.merchantId === sourceMerchant.id);
  if (!source) throw new Error("Campagne source introuvable.");
  return targetMerchants.map((targetMerchant) => {
    const duplicate = duplicateCampaignInMemory(id, sourceMerchant.id);
    const created = store.campaigns.find((campaign) => campaign.id === duplicate.id);
    if (created) {
      created.merchantId = targetMerchant.id;
      created.title = `${source.title} · ${targetMerchant.city ?? targetMerchant.companyName}`;
    }
    return duplicate.id;
  });
}

