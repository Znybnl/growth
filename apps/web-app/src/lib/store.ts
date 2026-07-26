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
      headline: "Scannez, jouez, rÃ©cupÃ©rez votre cadeau",
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
  diffusionSupport: ["QR code vitrine et comptoir", "Script Ã©quipe magasin"],
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
    title: "Ticket vitrine Â· avis authentiques",
    subtitle: "Partagez votre expÃ©rience puis dÃ©couvrez instantanÃ©ment votre lot.",
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
        "Partager mon expÃ©rience sur Google",
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
    title: "Summer drop Â· traction Instagram",
    subtitle: "DÃ©couvrez nos rÃ©seaux puis tentez votre chance en sortie de caisse.",
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
        "DÃ©couvrir notre Instagram",
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
    title: "Collectors club Â· base CRM locale",
    subtitle: "Laissez vos coordonnÃ©es et gagnez un avantage Ã  utiliser plus tard en boutique.",
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
    label: "CafÃ© signature offert",
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
    firstName: "LÃ©a",
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
    firstName: "NoÃ©",
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
    firstName: "InÃ¨s",
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
  { id: "evt-011", campaignId: "camp-sora-review", leadId: "lead-002", eventType: "game_played", createdAt: "2026-06-09T10:10:2×ıæÚ$z{-®éÜj×7–æ2gVæ7F–öâvWEV&Æ–46×–vâ€¢–C¢7G&–ærÀ¢'F–6—çEFö¶Vãó¢7G&–ærÀ¢’°¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RBwVæR6×væRV&Æ—VR"’ÓÓÒ'7W&6R"’°¢&WGW&âvWE7W&6UV&Æ–46×–vâ†–BÂ'F–6—çEFö¶Vâ“°¢Ğ ¢&WGW&âvWEV&Æ–46×–väg&öÔÖVÖ÷'’†–B“°§Ò“° ¦W‡÷'B6öç7BvWD6×–våW&f÷&Öæ6RÒ66†R†7–æ2gVæ7F–öâvWD6×–våW&f÷&Öæ6R†6×–vä–C¢7G&–ærÂfÆÆ&6´ÖW&6†çCó¢ÖW&6†çB’°¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFW2W&f÷&Öæ6W26×væR"’ÓÓÒ'7W&6R"’°¢&WGW&âvWE7W&6T6×–våW&f÷&Öæ6R†6×–vä–BÂfÆÆ&6´ÖW&6†çB“°¢Ğ ¢&WGW&âvWD6×–våW&f÷&Öæ6Tg&öÔÖVÖ÷'’†6×–vä–B“°§Ò“° ¦W‡÷'B6öç7BvWD6×–vå6WGWW&f÷&Öæ6RÒ66†R†7–æ2gVæ7F–öâvWD6×–vå6WGWW&f÷&Öæ6R€¢6×–vä–C¢7G&–ærÀ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀ¢’°¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RGR&Ü:—G&vR6×væR"’ÓÓÒ'7W&6R"’°¢&WGW&âvWD66†VE7W&6T6×–vå6WGWW&f÷&Öæ6R†6×–vä–BÂfÆÆ&6´ÖW&6†çB“°¢Ğ ¢&WGW&âvWD6×–våW&f÷&Öæ6Tg&öÔÖVÖ÷'’†6×–vä–B“°§Ò“° ¦W‡÷'B6öç7BvWDÖW&6†çDF6†&ö&BÒ66†R†7–æ2gVæ7F–öâvWDÖW&6†çDF6†&ö&B€¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀ¢’°¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RGRF6†&ö&BÖ&6†æB"’ÓÓÒ'7W&6R"’°¢&WGW&âvWE7W&6TÖW&6†çDF6†&ö&B€¢v—B&W6öÇfTÖW&6†çDf÷%7W&6R†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB’À¢“°¢Ğ ¢&WGW&âvWDÖW&6†çDF6†&ö&Dg&öÔÖVÖ÷'’†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB“°§Ò“° ¦W‡÷'B6öç7BvWDÖW&6†çEv÷&·76TF6†&ö&BÒ66†R†7–æ2gVæ7F–öâvWDÖW&6†çEv÷&·76TF6†&ö&B€¢W6W$–C¢7G&–ærÀ¢7F—fTÖW&6†çC¢ÖW&6†çBÀ¢’°¢6öç7B6öçFW‡BÒv—BvWDÖW&6†çEv÷&·76T6öçFW‡B‡W6W$–BÂ7F—fTÖW&6†çB“°¢6öç7BF6†&ö&G2Òv—B&öÖ—6RæÆÂ€¢6öçFW‡BæÆö6F–öç2æÖ‚‡²ÖW&6†çBÒ’ÓâvWDÖW&6†çDF6†&ö&B†ÖW&6†çBæ–BÂÖW&6†çB’’À¢“°¢6öç7B6×–vç2ÒF6†&ö&G2æfÆDÖ‚†F6†&ö&B’ÓâF6†&ö&Bæ6×–vç2“°¢6öç7B7F—f—G”'”F’ÒæWrÖÇ7G&–ærÂ²66ç3¢çVÖ&W#²'F–6—F–öç3¢çVÖ&W"Óâ‚“°¢F6†&ö&G2æf÷$V6‚‚†F6†&ö&B’Óâ°¢F6†&ö&Bæ7F—f—G•ö–çG2æf÷$V6‚‚‡ö–çB’Óâ°¢6öç7B7W'&VçBÒ7F—f—G”'”F’ævWB‡ö–çBæÆ&VÂ’óò²66ç3¢Â'F–6—F–öç3¢Ó°¢7F—f—G”'”F’ç6WB‡ö–çBæÆ&VÂÂ°¢66ç3¢7W'&VçBç66ç2²ö–çBç66ç2À¢'F–6—F–öç3¢7W'&VçBç'F–6—F–öç2²ö–çBç'F–6—F–öç2À¢Ò“°¢Ò“°¢Ò“° ¢&WGW&â°¢ÖW&6†çC¢7F—fTÖW&6†çBÀ¢6×–vç2À¢F÷FÄÆVG3¢F6†&ö&G2ç&VGV6R‚‡F÷FÂÂF6†&ö&B’ÓâF÷FÂ²F6†&ö&BçF÷FÄÆVG2Â’À¢F÷FÅ&VFVVÖVC¢F6†&ö&G2ç&VGV6R‚‡F÷FÂÂF6†&ö&B’ÓâF÷FÂ²F6†&ö&BçF÷FÅ&VFVVÖVBÂ’À¢fW&vT6öçfW'6–öã¢6×–vç2æÆVæwF€¢òÖF‚ç&÷VæB†6×–vç2ç&VGV6R‚‡F÷FÂÂ—FVÒ’ÓâF÷FÂ²—FVÒæ·—2æ6öçfW'6–öå&FRÂ’ò6×–vç2æÆVæwF‚¢¢À¢7F—f—G•ö–çG3¢²ââæ7F—f—G”'”F’æVçG&–W2‚•ÒæÖ‚…¶Æ&VÂÂfÇVW5Ò’Óâ‡²Æ&VÂÂââçfÇVW2Ò’’À¢Ò6F—6f–W2ÖW&6†çDF6†&ö&DFF°§Ò“° ¦W‡÷'B6öç7BvWDÖW&6†çD6×–vä÷fW'f–WrÒ66†R†7–æ2gVæ7F–öâvWDÖW&6†çD6×–vä÷fW'f–Wr€¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀ¢’°¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFRÆÆ—7FRFW26×væW2"’ÓÓÒ'7W&6R"’°¢&WGW&âvWD66†VE7W&6TÖW&6†çD6×–vä÷fW'f–Wr€¢v—B&W6öÇfTÖW&6†çDf÷%7W&6R†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB’À¢“°¢Ğ ¢&WGW&âvWDÖW&6†çDF6†&ö&Dg&öÔÖVÖ÷'’†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB“°§Ò“° ¦W‡÷'B6öç7BvWDÖW&6†çD6×–väÆ–'&'’Ò66†R†7–æ2gVæ7F–öâvWDÖW&6†çD6×–väÆ–'&'’€¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀ¢’°¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFRÆ&–&Æ–÷FŒ:‡VRFR6×væW2"’ÓÓÒ'7W&6R"’°¢&WGW&âvWD66†VE7W&6TÖW&6†çD6×–väÆ–'&'’†fÆÆ&6´ÖW&6†çCòæ–BóòÖW&6†çD–B“°¢Ğ ¢&WGW&âvWDÖW&6†çD6×–väÆ–'&'”g&öÔÖVÖ÷'’†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB“°§Ò“° ¦W‡÷'B6öç7BvWDÖW&6†çDÆVG2Ò66†R†7–æ2gVæ7F–öâvWDÖW&6†çDÆVG2†ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÂ6×–vä–Có¢7G&–ær’°¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFW2ÆVG2"’ÓÓÒ'7W&6R"’°¢&WGW&âvWE7W&6TÖW&6†çDÆVG2†ÖW&6†çD–BÂ6×–vä–B“°¢Ğ ¢&WGW&âvWDÖW&6†çDÆVG4g&öÔÖVÖ÷'’†6×–vä–B“°§Ò“° ¦W‡÷'B7–æ2gVæ7F–öâ&VÖVÖ&W%V&Æ–46×–vå'F–6—çB€¢6×–vä–C¢7G&–ærÀ¢VÖ–Ã¢7G&–ærÀ¢Fö¶Vã¢7G&–ærÀ¢’°¢–b†vWDFF&6¶VæB‚&ÆÜ:–Ö÷&—6F–öâGR&6÷W'2¦÷VWW""’ÓÓÒ'7W&6R"’°¢&WGW&â7&VFUV&Æ–46×–vä–FVçF—G’†6×–vä–BÂVÖ–ÂÂFö¶Vâ“°¢Ğ¢&WGW&âFö¶Vã°§Ğ ¦W‡÷'B6öç7Bf–æDÖW&6†çDÆVD6×–vâÒ66†R†7–æ2gVæ7F–öâf–æDÖW&6†çDÆVD6×–vâ€¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀ¢VW'’Ò""À¢’°¢–b†vWDFF&6¶VæB‚&Æ&V6†W&6†RBwVâÆVB"’ÓÓÒ'7W&6R"’°¢&WGW&âf–æE7W&6TÖW&6†çDÆVD6×–vâ†ÖW&6†çD–BÂVW'’“°¢Ğ ¢6öç7Bæ÷&ÖÆ—¦VEVW'’ÒVW'’çG&–Ò‚’çFôÆ÷vW$66R‚“°¢&WGW&â€¢vWDÖW&6†çDÆVG4g&öÔÖVÖ÷'’‚’æf–æB‚†ÆVB’Óà¢¶ÆVBç&VFV×F–öä6öFRóò""ÂÆVBæVÖ–ÂÂÆVBæf—'7DæÖUĞ¢æ¦ö–â‚""¢çFôÆ÷vW$66R‚¢æ–æ6ÇVFW2†æ÷&ÖÆ—¦VEVW'’’À¢“òæ6×–vä–BóòçVÆÀ¢“°§Ò“° ¦W‡÷'B6öç7BvWDÖW&6†çE&V6VçDÆVG2Ò66†R†7–æ2gVæ7F–öâvWDÖW&6†çE&V6VçDÆVG2€¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀ¢Æ–Ö—BÒRÀ¢VW'’Ò""À¢’°¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFW2ÆVG2,:–6VçG2"’ÓÓÒ'7W&6R"’°¢&WGW&âvWE7W&6TÖW&6†çE&V6VçDÆVG2†ÖW&6†çD–BÂÆ–Ö—BÂVW'’“°¢Ğ ¢6öç7Bæ÷&ÖÆ—¦VEVW'’ÒVW'’çG&–Ò‚’çFôÆ÷vW$66R‚“° ¢&WGW&âvWDÖW&6†çDÆVG4g&öÔÖVÖ÷'’‚¢æf–ÇFW"‚†ÆVB’Óà¢æ÷&ÖÆ—¦VEVW'¢òG¶ÆVBæf—'7DæÖWÒG¶ÆVBæVÖ–ÇÒG¶ÆVBæ6×–våF—FÆWÖçFôÆ÷vW$66R‚’æ–æ6ÇVFW2†æ÷&ÖÆ—¦VEVW'’¢¢G'VRÀ¢¢ç6Æ–6RƒÂÆ–Ö—B“°§Ò“° ¦W‡÷'B6öç7BvWD6×–väFFf–WrÒ66†R†7–æ2gVæ7F–öâvWD6×–väFFf–Wr€¢6×–vä–C¢7G&–ærÀ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀ¢÷F–öç3¢²ÆVDÆ–Ö—Có¢çVÖ&W#²ÆVDöfg6WCó¢çVÖ&W#²VW'“ó¢7G&–æs²VÖ–Å7FGW3ó¢&GFVçF–öâ"ÒÒ·ÒÀ¢’°¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFW2Föæì:–W26×væR"’ÓÓÒ'7W&6R"’°¢&WGW&âvWE7W&6T6×–väFFf–Wr†6×–vä–BÂfÆÆ&6´ÖW&6†çBÂ÷F–öç2“°¢Ğ ¢&WGW&âvWD6×–väFFf–Wtg&öÔÖVÖ÷'’†6×–vä–BÂ÷F–öç2“°§Ò“° ¦W‡÷'B6öç7BvWDÖW&6†çE7W÷'D÷fW'f–WrÒ66†R†7–æ2gVæ7F–öâvWDÖW&6†çE7W÷'D÷fW'f–Wr€¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀ¢÷F–öç3¢²–æ6ÇVFTÆÄÖW&6†çG3ó¢&ööÆVâÒÒ·ÒÀ¢’°¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFRÆ7WW'f—6–öâ"’ÓÓÒ'7W&6R"’°¢&WGW&âvWE7W&6TÖW&6†çE7W÷'D÷fW'f–Wr€¢v—B&W6öÇfTÖW&6†çDf÷%7W&6R†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB’À¢÷F–öç2À¢“°¢Ğ ¢6öç7BÆVG2ÒvWDÖW&6†çDÆVG4g&öÔÖVÖ÷'’‚“°¢6öç7B6×–vç2ÒvWDÖW&6†çDF6†&ö&Dg&öÔÖVÖ÷'’†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB’æ6×–vç3°¢6öç7B6×–våF—FÆT'”–BÒæWrÖ†6×–vç2æÖ‚†—FVÒ’Óâ¶—FVÒæ6×–vâæ–BÂ—FVÒæ6×–vâçF—FÆUÒ’“° ¢6öç7BVæF–æt6Æ–×3¢ÖW&6†çE7W÷'D÷fW'f–Wu²'VæF–æt6Æ–×2%ÒÒÆVG0¢æf–ÇFW"‚†ÆVB’ÓâÆVBç7FGW2ÓÓÒ&6Æ–ÖVB"bbÆVBç&VFV×F–öä6öFR¢ç6Æ–6RƒÂ3¢æÖ‚†ÆVB’Óâ‡°¢ÆVD–C¢ÆVBæ–BÀ¢6×–vä–C¢ÆVBæ6×–vä–BÀ¢6×–våF—FÆS¢6×–våF—FÆT'”–BævWB†ÆVBæ6×–vä–B’óò$6×væR"À¢f—'7DæÖS¢ÆVBæf—'7DæÖRÀ¢VÖ–Ã¢ÆVBæVÖ–ÂÀ¢&—¦TÆ&VÃ¢ÆVBç&—¦TÆ&VÂÀ¢&VFV×F–öä6öFS¢ÆVBç&VFV×F–öä6öFRóò""À¢7FGW3¢ÆVBç7FGW2À¢f–Æ&ÆTC¢ÆVBç&Wv&Df–Æ&ÆTBÀ¢W‡—&W4C¢ÆVBç&Wv&DW‡—&W4BÀ¢Ò’“° ¢&WGW&â°¢f–ÆVDVÖ–Ç3¢µÒÀ¢vV&†öö·3¢µÒÀ¢VæF–æt6Æ–×2À¢'W6–æW74Æöw3¢vWDÖVÖ÷'•7W÷'DÆöw2‚¢æf–ÇFW"‚†VçG'’’Óâ÷F–öç2æ–æ6ÇVFTÆÄÖW&6†çG2ÇÂVçG'’ç–ÆöCòæÖW&6†çD–BÓÓÒÖW&6†çD–B¢ç6Æ–6RƒÂS¢æÖ‚†VçG'’’Óâ‡°¢–C¢VçG'’æ–BÀ¢7&VFVDC¢VçG'’æ7&VFVDBÀ¢ÆWfVÃ¢VçG'’æÆWfVÂÀ¢WfVçC¢VçG'’æWfVçBÀ¢ÖW&6†çD–C ¢G—VöbVçG'’ç–ÆöCòæÖW&6†çD–BÓÓÒ'7G&–ær"òVçG'’ç–ÆöBæÖW&6†çD–B¢VæFVf–æVBÀ¢6×–vä–C ¢G—VöbVçG'’ç–ÆöCòæ6×–vä–BÓÓÒ'7G&–ær"òVçG'’ç–ÆöBæ6×–vä–B¢VæFVf–æVBÀ¢ÆVD–C¢G—VöbVçG'’ç–ÆöCòæÆVD–BÓÓÒ'7G&–ær"òVçG'’ç–ÆöBæÆVD–B¢VæFVf–æVBÀ¢VÖ–Ã ¢G—VöbVçG'’ç–ÆöCòæVÖ–ÂÓÓÒ'7G&–ær ¢òVçG'’ç–ÆöBæVÖ–À¢¢G—VöbVçG'’ç–ÆöCòç&V6—–VçDVÖ–ÂÓÓÒ'7G&–ær ¢òVçG'’ç–ÆöBç&V6—–VçDVÖ–À¢¢VæFVf–æVBÀ¢&VFV×F–öä6öFS ¢G—VöbVçG'’ç–ÆöCòç&VFV×F–öä6öFRÓÓÒ'7G&–ær ¢òVçG'’ç–ÆöBç&VFV×F–öä6öFP¢¢VæFVf–æVBÀ¢7VÖÖ'“ ¢G—VöbVçG'’ç–ÆöCòæW'&÷"ÓÓÒ'7G&–ær ¢òVçG'’ç–ÆöBæW'&÷ ¢¢G—VöbVçG'’ç–ÆöCòç7FGW2ÓÓÒ'7G&–ær ¢òVçG'’ç–ÆöBç7FGW0¢¢VæFVf–æVBÀ¢Ò’’À¢Ó°§Ò“° ¦W‡÷'B7–æ2gVæ7F–öâG&tf÷$ÆVB†–çWC¢G&u&WVW7BÂfÆÆ&6´ÖW&6†çCó¢ÖW&6†çB’°¢–b†vWDFF&6¶VæB‚&Æ'F–6—F–öâ:Vâ¦WR"’ÓÓÒ'7W&6R"’°¢6öç7BÖW&6†çBĞ¢fÆÆ&6´ÖW&6†çBóò†v—B&W6öÇfT6×–väÖW&6†çDf÷%7W&6R†–çWBæ6×–vä–B’“°¢&WGW&âG&tf÷$ÆVD–å7W&6R†–çWBÂÖW&6†çB“°¢Ğ ¢&WGW&âG&tf÷$ÆVDg&öÔÖVÖ÷'’†–çWB“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâ7&VFTG&u6W76–öâ€¢–çWC¢7&VFTG&u6W76–öå&WVW7BÀ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀ¢’°¢–b†vWDFF&6¶VæB‚&Æ,:—&F–öâBwVæR'F–R"’ÓÓÒ'7W&6R"’°¢&WGW&â7&VFTG&u6W76–öä–å7W&6R†–çWBÂfÆÆ&6´ÖW&6†çB“°¢Ğ ¢&WGW&â7&VFTG&u6W76–öäg&öÔÖVÖ÷'’†–çWB“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâf–æÆ—¦TG&u6W76–öâ€¢–çWC¢f–æÆ—¦TG&u6W76–öå&WVW7BÀ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀ¢’°¢–b†vWDFF&6¶VæB‚&Æf–æÆ—6F–öâBwVæR'F–R"’ÓÓÒ'7W&6R"’°¢&WGW&âf–æÆ—¦TG&u6W76–öä–å7W&6R†–çWBÂfÆÆ&6´ÖW&6†çB“°¢Ğ ¢&WGW&âf–æÆ—¦TG&u6W76–öäg&öÔÖVÖ÷'’†–çWB“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâÖ&´7F–öä6öæf—&ÖVB†ÆVD–C¢7G&–ærÂ6×–vä–Có¢7G&–ær’°¢–b†vWDFF&6¶VæB‚&Æ6öæf—&ÖF–öâBwVæR7F–öâÖ&¶WF–ær"’ÓÓÒ'7W&6R"’°¢&WGW&âÖ&´7F–öä6öæf—&ÖVD–å7W&6R†ÆVD–BÂ6×–vä–B“°¢Ğ ¢&WGW&âÖ&´7F–öä6öæf—&ÖVD–äÖVÖ÷'’†ÆVD–BÂ6×–vä–B“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâ&VFVVÔÆVE&—¦R†ÆVD–C¢7G&–ær’°¢–b†vWDFF&6¶VæB‚&ÆR&WG&—BBwVâÆ÷B"’ÓÓÒ'7W&6R"’°¢&WGW&â&VFVVÔÆVE&—¦T–å7W&6R†ÆVD–B“°¢Ğ ¢&WGW&â&VFVVÔÆVE&—¦T–äÖVÖ÷'’†ÆVD–B“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâf–æDÖW&6†çDÆVD'•&VFV×F–öä6öFR†ÖW&6†çD–C¢7G&–ærÂ6öFS¢7G&–ær’°¢–b†vWDFF&6¶VæB‚&Æ&V6†W&6†R6—76RBwVâ6öFR"’ÓÓÒ'7W&6R"’°¢&WGW&âf–æE7W&6TÖW&6†çDÆVD'•&VFV×F–öä6öFR†ÖW&6†çD–BÂ6öFR“°¢Ğ ¢&WGW&âf–æDÖW&6†çDÆVD'•&VFV×F–öä6öFT–äÖVÖ÷'’†ÖW&6†çD–BÂ6öFR“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâ&VFVVÔÖW&6†çDÆVE&—¦Tg&öÔ66†–W"†–çWC¢°¢ÆVD–C¢7G&–æs°¢ÖW&6†çD–C¢7G&–æs°¢÷W&F÷%W6W$–C¢7G&–æs°¢W&6†6T6öæf—&ÖVC¢&ööÆVã°¢–FV×÷FVæ7”¶W“¢7G&–æs°§Ò’°¢–b†vWDFF&6¶VæB‚&ÆR&WG&—B6—76RBwVâÆ÷B"’ÓÓÒ'7W&6R"’°¢&WGW&â&VFVVÕ7W&6T66†–W$ÆVE&—¦R†–çWB“°¢Ğ ¢&WGW&â&VFVVÔÖW&6†çDÆVE&—¦T–äÖVÖ÷'’†–çWB“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâ&W6WDÆVE&—¦R†ÆVD–C¢7G&–ær’°¢–b†vWDFF&6¶VæB‚&Æ,:––æ—F–Æ—6F–öâBwVâÆ÷B"’ÓÓÒ'7W&6R"’°¢&WGW&â&W6WDÆVE&—¦T–å7W&6R†ÆVD–B“°¢Ğ ¢&WGW&â&W6WDÆVE&—¦T–äÖVÖ÷'’†ÆVD–B“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâWFFU&—¦U7Fö6²‡&—¦T–C¢7G&–ærÂ&VÖ–æ–æuVçF—G“¢çVÖ&W"ÂçVÆÂ’°¢–b†vWDFF&6¶VæB‚&ÆÖ—6R:¦÷W"GR7Fö6²BwVâÆ÷B"’ÓÓÒ'7W&6R"’°¢&WGW&âWFFU&—¦U7Fö6´–å7W&6R‡&—¦T–BÂ&VÖ–æ–æuVçF—G’“°¢Ğ ¢&WGW&âWFFU&—¦U7Fö6´–äÖVÖ÷'’‡&—¦T–BÂ&VÖ–æ–æuVçF—G’“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâ&W6WE&—¦U7Fö6²‡&—¦T–C¢7G&–ær’°¢–b†vWDFF&6¶VæB‚&Æ&VÖ—6R:¬:—&òGR7Fö6²BwVâÆ÷B"’ÓÓÒ'7W&6R"’°¢&WGW&â&W6WE&—¦U7Fö6´–å7W&6R‡&—¦T–B“°¢Ğ ¢&WGW&â&W6WE&—¦U7Fö6´–äÖVÖ÷'’‡&—¦T–B“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâWFFT6×–vå6WGW†–çWC¢6×–vå6WGW–çWB’°¢76W'D6×–vä6åV&Æ—6‚†–çWB“° ¢–b†vWDFF&6¶VæB‚&ÆÖ—6R:¦÷W"BwVæR6×væR"’ÓÓÒ'7W&6R"’°¢6öç7B6×–vä–BÒv—BWFFT6×–vå6WGW–å7W&6R†–çWB“°¢–çfÆ–FFT6×–väæf–vF–öä66†R†–çWBæÖW&6†çD–BÂ6×–vä–B“°¢&WGW&âvWD6×–våW&f÷&Öæ6R€¢6×–vä–BÀ¢v—B&W6öÇfTÖW&6†çDf÷%7W&6R†–çWBæÖW&6†çD–B’À¢“°¢Ğ ¢&WGW&âWFFT6×–vå6WGW–äÖVÖ÷'’†–çWB“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâFövvÆT6×–vâ†–C¢7G&–ærÂ—47F—fS¢&ööÆVâÂÖW&6†çD–Có¢7G&–ær’°¢–b†vWDFF&6¶VæB‚&Âv7F—fF–öâBwVæR6×væR"’ÓÓÒ'7W&6R"’°¢–b†ÖW&6†çD–B’°¢v—BFövvÆT6×–väf÷$ÖW&6†çD–å7W&6R†–BÂ—47F—fRÂÖW&6†çD–B“°¢–çfÆ–FFT6×–väæf–vF–öä66†R†ÖW&6†çD–BÂ–B“°¢&WGW&âçVÆÃ°¢Ğ ¢v—BFövvÆT6×–vä–å7W&6R†–BÂ—47F—fR“°¢–çfÆ–FFT6×–väæf–vF–öä66†R‡VæFVf–æVBÂ–B“°¢&WGW&âçVÆÃ°¢Ğ ¢&WGW&âFövvÆT6×–vä–äÖVÖ÷'’†–BÂ—47F—fR“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâFVÆWFT6×–vâ†–C¢7G&–ærÂÖW&6†çD–Có¢7G&–ær’°¢–b†vWDFF&6¶VæB‚&Æ7W&W76–öâBwVæR6×væR"’ÓÓÒ'7W&6R"’°¢–b†ÖW&6†çD–B’°¢v—BFVÆWFT6×–väf÷$ÖW&6†çD–å7W&6R†–BÂÖW&6†çD–B“°¢–çfÆ–FFT6×–väæf–vF–öä66†R†ÖW&6†çD–BÂ–B“°¢&WGW&âçVÆÃ°¢Ğ ¢v—BFVÆWFT6×–vä–å7W&6R†–B“°¢–çfÆ–FFT6×–väæf–vF–öä66†R‡VæFVf–æVBÂ–B“°¢&WGW&âçVÆÃ°¢Ğ ¢&WGW&âFVÆWFT6×–vä–äÖVÖ÷'’†–B“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâGWÆ–6FT6×–vâ†–C¢7G&–ærÂfÆÆ&6´ÖW&6†çC¢ÖW&6†çB’°¢–b†vWDFF&6¶VæB‚&ÆGWÆ–6F–öâBwVæR6×væR"’ÓÓÒ'7W&6R"’°¢6öç7B6×–vä–BÒv—BGWÆ–6FT6×–vä–å7W&6R†–BÂfÆÆ&6´ÖW&6†çB“°¢–çfÆ–FFT6×–väæf–vF–öä66†R†fÆÆ&6´ÖW&6†çBæ–BÂ6×–vä–B“°¢&WGW&âvWD6×–våW&f÷&Öæ6R†6×–vä–BÂfÆÆ&6´ÖW&6†çB“°¢Ğ ¢&WGW&âGWÆ–6FT6×–vä–äÖVÖ÷'’†–BÂfÆÆ&6´ÖW&6†çBæ–B“°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâGWÆ–6FT6×–våFôÆö6F–öç2€¢–C¢7G&–ærÀ¢W6W$–C¢7G&–ærÀ¢6÷W&6TÖW&6†çC¢ÖW&6†çBÀ¢F&vWDÆö6F–öä–G3¢7G&–æuµÒÀ¢’°¢6öç7BVæ—VUF&vWD–G2Ò²ââææWr6WB‡F&vWDÆö6F–öä–G2•Òæf–ÇFW"‚†Æö6F–öä–B’ÓâÆö6F–öä–BÓÒ6÷W&6TÖW&6†çBæ–B“°¢–b‚Væ—VUF&vWD–G2æÆVæwF‚’F‡&÷ræWrW'&÷"‚%<:–ÆV7F–öææW¢RÖö–ç2VâWG&R6—FRâ"“° ¢6öç7B6öçFW‡BÒ6÷W&6TÖW&6†çBçv÷&·76T–@¢òv—BvWDÖW&6†çEv÷&·76T6öçFW‡B‡W6W$–BÂ6÷W&6TÖW&6†çB¢¢²Æö6F–öç3¢·²ÖW&6†çC¢6÷W&6TÖW&6†çBÂ&öÆS¢&÷væW""26öç7BÕÒÓ°¢6öç7BF&vWDÖW&6†çG2Ò6öçFW‡BæÆö6F–öç0¢æÖ‚‡²ÖW&6†çBÒ’ÓâÖW&6†çB¢æf–ÇFW"‚†ÖW&6†çB’ÓâVæ—VUF&vWD–G2æ–æ6ÇVFW2†ÖW&6†çBæ–B’“°¢–b‡F&vWDÖW&6†çG2æÆVæwF‚ÓÒVæ—VUF&vWD–G2æÆVæwF‚’F‡&÷ræWrW'&÷"‚%Vâ6—FR<:–ÆV7F–öæì:’âvW7B266W76–&ÆRâ"“° ¢–b†vWDFF&6¶VæB‚&ÆGWÆ–6F–öâ×VÇF’×6—FR"’ÓÓÒ'7W&6R"’°¢6öç7BGWÆ–6FVD–G2ÒµÓ°¢f÷"†6öç7BF&vWDÖW&6†çBöbF&vWDÖW&6†çG2’°¢GWÆ–6FVD–G2çW6‚†v—BGWÆ–6FT6×–våFôÖW&6†çD–å7W&6R†–BÂ6÷W&6TÖW&6†çBÂF&vWDÖW&6†çB’“°¢Ğ¢&WGW&âGWÆ–6FVD–G3°¢Ğ ¢6öç7B6÷W&6RÒ7F÷&Ræ6×–vç2æf–æB‚†6×–vâ’Óâ6×–vâæ–BÓÓÒ–Bbb6×–vâæÖW&6†çD–BÓÓÒ6÷W&6TÖW&6†çBæ–B“°¢–b‚6÷W&6R’F‡&÷ræWrW'&÷"‚$6×væR6÷W&6R–çG&÷Wf&ÆRâ"“°¢&WGW&âF&vWDÖW&6†çG2æÖ‚‡F&vWDÖW&6†çB’Óâ°¢6öç7BGWÆ–6FRÒGWÆ–6FT6×–vä–äÖVÖ÷'’†–BÂ6÷W&6TÖW&6†çBæ–B“°¢6öç7B7&VFVBÒ7F÷&Ræ6×–vç2æf–æB‚†6×–vâ’Óâ6×–vâæ–BÓÓÒGWÆ–6FRæ–B“°¢–b†7&VFVB’°¢7&VFVBæÖW&6†çD–BÒF&vWDÖW&6†çBæ–C°¢7&VFVBçF—FÆRÒG·6÷W&6RçF—FÆWÒ+rG·F&vWDÖW&6†çBæ6—G’óòF&vWDÖW&6†çBæ6ö×ç”æÖWÖ°¢Ğ¢&WGW&âGWÆ–6FRæ–C°¢Ò“°§Ğ