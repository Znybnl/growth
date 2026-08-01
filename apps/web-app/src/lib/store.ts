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
      headline: "Scannez, jouez, rÃ©cupÃ©rez votre cadeau !",
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
    emailCaptureEnabled: false,
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
    emailCaptureEnabled: false,
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
    emailCaptureEnabled: true,
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
  { id: "evt-007", campaignId: "camp-sora-rev×®|âÚ$z{-®éÜj×&6¶VæB‚&ÆÆV7GW&RFW2W&f÷&Öæ6W26×væR"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âvWE7W&6T6×–våW&f÷&Öæ6R†6×–vä–BÂfÆÆ&6´ÖW&6†çB“°Ğ¢ĞĞ Ğ¢&WGW&âvWD6×–våW&f÷&Öæ6Tg&öÔÖVÖ÷'’†6×–vä–B“°Ğ§Ò“°Ğ Ğ¦W‡÷'B6öç7BvWD6×–vå6WGWW&f÷&Öæ6RÒ66†R†7–æ2gVæ7F–öâvWD6×–vå6WGWW&f÷&Öæ6R€Ğ¢6×–vä–C¢7G&–ærÀĞ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀĞ¢’°Ğ¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RGR&Ü:—G&vR6×væR"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âvWD66†VE7W&6T6×–vå6WGWW&f÷&Öæ6R†6×–vä–BÂfÆÆ&6´ÖW&6†çB“°Ğ¢ĞĞ Ğ¢&WGW&âvWD6×–våW&f÷&Öæ6Tg&öÔÖVÖ÷'’†6×–vä–B“°Ğ§Ò“°Ğ Ğ¦W‡÷'B6öç7BvWDÖW&6†çDF6†&ö&BÒ66†R†7–æ2gVæ7F–öâvWDÖW&6†çDF6†&ö&B€Ğ¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀĞ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀĞ¢’°Ğ¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RGRF6†&ö&BÖ&6†æB"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âvWE7W&6TÖW&6†çDF6†&ö&B€Ğ¢v—B&W6öÇfTÖW&6†çDf÷%7W&6R†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB’ÀĞ¢“°Ğ¢ĞĞ Ğ¢&WGW&âvWDÖW&6†çDF6†&ö&Dg&öÔÖVÖ÷'’†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB“°Ğ§Ò“°Ğ Ğ¦W‡÷'B6öç7BvWDÖW&6†çEv÷&·76TF6†&ö&BÒ66†R†7–æ2gVæ7F–öâvWDÖW&6†çEv÷&·76TF6†&ö&B€Ğ¢W6W$–C¢7G&–ærÀĞ¢7F—fTÖW&6†çC¢ÖW&6†çBÀĞ¢’°Ğ¢6öç7B6öçFW‡BÒv—BvWDÖW&6†çEv÷&·76T6öçFW‡B‡W6W$–BÂ7F—fTÖW&6†çB“°Ğ¢6öç7BF6†&ö&G2Òv—B&öÖ—6RæÆÂ€Ğ¢6öçFW‡BæÆö6F–öç2æÖ‚‡²ÖW&6†çBÒ’ÓâvWDÖW&6†çDF6†&ö&B†ÖW&6†çBæ–BÂÖW&6†çB’’ÀĞ¢“°Ğ¢6öç7B6×–vç2ÒF6†&ö&G2æfÆDÖ‚†F6†&ö&B’ÓâF6†&ö&Bæ6×–vç2“°Ğ¢6öç7B7F—f—G”'”F’ÒæWrÖÇ7G&–ærÂ²66ç3¢çVÖ&W#²'F–6—F–öç3¢çVÖ&W"Óâ‚“°Ğ¢F6†&ö&G2æf÷$V6‚‚†F6†&ö&B’Óâ°Ğ¢F6†&ö&Bæ7F—f—G•ö–çG2æf÷$V6‚‚‡ö–çB’Óâ°Ğ¢6öç7B7W'&VçBÒ7F—f—G”'”F’ævWB‡ö–çBæÆ&VÂ’óò²66ç3¢Â'F–6—F–öç3¢Ó°Ğ¢7F—f—G”'”F’ç6WB‡ö–çBæÆ&VÂÂ°Ğ¢66ç3¢7W'&VçBç66ç2²ö–çBç66ç2ÀĞ¢'F–6—F–öç3¢7W'&VçBç'F–6—F–öç2²ö–çBç'F–6—F–öç2ÀĞ¢Ò“°Ğ¢Ò“°Ğ¢Ò“°Ğ Ğ¢&WGW&â°Ğ¢ÖW&6†çC¢7F—fTÖW&6†çBÀĞ¢6×–vç2ÀĞ¢F÷FÄÆVG3¢F6†&ö&G2ç&VGV6R‚‡F÷FÂÂF6†&ö&B’ÓâF÷FÂ²F6†&ö&BçF÷FÄÆVG2Â’ÀĞ¢F÷FÅ&VFVVÖVC¢F6†&ö&G2ç&VGV6R‚‡F÷FÂÂF6†&ö&B’ÓâF÷FÂ²F6†&ö&BçF÷FÅ&VFVVÖVBÂ’ÀĞ¢fW&vT6öçfW'6–öã¢6×–vç2æÆVæwF€Ğ¢òÖF‚ç&÷VæB†6×–vç2ç&VGV6R‚‡F÷FÂÂ—FVÒ’ÓâF÷FÂ²—FVÒæ·—2æ6öçfW'6–öå&FRÂ’ò6×–vç2æÆVæwF‚Ğ¢¢ÀĞ¢7F—f—G•ö–çG3¢²ââæ7F—f—G”'”F’æVçG&–W2‚•ÒæÖ‚…¶Æ&VÂÂfÇVW5Ò’Óâ‡²Æ&VÂÂââçfÇVW2Ò’’ÀĞ¢Ò6F—6f–W2ÖW&6†çDF6†&ö&DFF°Ğ§Ò“°Ğ Ğ¦W‡÷'B6öç7BvWDÖW&6†çD6×–vä÷fW'f–WrÒ66†R†7–æ2gVæ7F–öâvWDÖW&6†çD6×–vä÷fW'f–Wr€Ğ¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀĞ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀĞ¢’°Ğ¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFRÆÆ—7FRFW26×væW2"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âvWD66†VE7W&6TÖW&6†çD6×–vä÷fW'f–Wr€Ğ¢v—B&W6öÇfTÖW&6†çDf÷%7W&6R†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB’ÀĞ¢“°Ğ¢ĞĞ Ğ¢&WGW&âvWDÖW&6†çDF6†&ö&Dg&öÔÖVÖ÷'’†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB“°Ğ§Ò“°Ğ Ğ¦W‡÷'B6öç7BvWDÖW&6†çD6×–väÆ–'&'’Ò66†R†7–æ2gVæ7F–öâvWDÖW&6†çD6×–väÆ–'&'’€Ğ¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀĞ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀĞ¢’°Ğ¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFRÆ&–&Æ–÷FŒ:‡VRFR6×væW2"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âvWD66†VE7W&6TÖW&6†çD6×–väÆ–'&'’†fÆÆ&6´ÖW&6†çCòæ–BóòÖW&6†çD–B“°Ğ¢ĞĞ Ğ¢&WGW&âvWDÖW&6†çD6×–väÆ–'&'”g&öÔÖVÖ÷'’†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB“°Ğ§Ò“°Ğ Ğ¦W‡÷'B6öç7BvWDÖW&6†çDÆVG2Ò66†R†7–æ2gVæ7F–öâvWDÖW&6†çDÆVG2†ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÂ6×–vä–Có¢7G&–ær’°Ğ¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFW2ÆVG2"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âvWE7W&6TÖW&6†çDÆVG2†ÖW&6†çD–BÂ6×–vä–B“°Ğ¢ĞĞ Ğ¢&WGW&âvWDÖW&6†çDÆVG4g&öÔÖVÖ÷'’†6×–vä–B“°Ğ§Ò“°Ğ Ğ¦W‡÷'B7–æ2gVæ7F–öâ&VÖVÖ&W%V&Æ–46×–vå'F–6—çB€Ğ¢6×–vä–C¢7G&–ærÀĞ¢VÖ–Ã¢7G&–ærÀĞ¢Fö¶Vã¢7G&–ærÀĞ¢’°Ğ¢–b†vWDFF&6¶VæB‚&ÆÜ:–Ö÷&—6F–öâGR&6÷W'2¦÷VWW""’ÓÓÒ'7W&6R"’°Ğ¢&WGW&â7&VFUV&Æ–46×–vä–FVçF—G’†6×–vä–BÂVÖ–ÂÂFö¶Vâ“°Ğ¢ĞĞ¢&WGW&âFö¶Vã°Ğ§ĞĞ Ğ¦W‡÷'B6öç7Bf–æDÖW&6†çDÆVD6×–vâÒ66†R†7–æ2gVæ7F–öâf–æDÖW&6†çDÆVD6×–vâ€Ğ¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀĞ¢VW'’Ò""ÀĞ¢’°Ğ¢–b†vWDFF&6¶VæB‚&Æ&V6†W&6†RBwVâÆVB"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âf–æE7W&6TÖW&6†çDÆVD6×–vâ†ÖW&6†çD–BÂVW'’“°Ğ¢ĞĞ Ğ¢6öç7Bæ÷&ÖÆ—¦VEVW'’ÒVW'’çG&–Ò‚’çFôÆ÷vW$66R‚“°Ğ¢&WGW&â€Ğ¢vWDÖW&6†çDÆVG4g&öÔÖVÖ÷'’‚’æf–æB‚†ÆVB’ÓàĞ¢¶ÆVBç&VFV×F–öä6öFRóò""ÂÆVBæVÖ–ÂÂÆVBæf—'7DæÖUĞĞ¢æ¦ö–â‚""Ğ¢çFôÆ÷vW$66R‚Ğ¢æ–æ6ÇVFW2†æ÷&ÖÆ—¦VEVW'’’ÀĞ¢“òæ6×–vä–BóòçVÆÀĞ¢“°Ğ§Ò“°Ğ Ğ¦W‡÷'B6öç7BvWDÖW&6†çE&V6VçDÆVG2Ò66†R†7–æ2gVæ7F–öâvWDÖW&6†çE&V6VçDÆVG2€Ğ¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀĞ¢Æ–Ö—BÒRÀĞ¢VW'’Ò""ÀĞ¢’°Ğ¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFW2ÆVG2,:–6VçG2"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âvWE7W&6TÖW&6†çE&V6VçDÆVG2†ÖW&6†çD–BÂÆ–Ö—BÂVW'’“°Ğ¢ĞĞ Ğ¢6öç7Bæ÷&ÖÆ—¦VEVW'’ÒVW'’çG&–Ò‚’çFôÆ÷vW$66R‚“°Ğ Ğ¢&WGW&âvWDÖW&6†çDÆVG4g&öÔÖVÖ÷'’‚Ğ¢æf–ÇFW"‚†ÆVB’ÓàĞ¢æ÷&ÖÆ—¦VEVW'Ğ¢òG¶ÆVBæf—'7DæÖWÒG¶ÆVBæVÖ–ÇÒG¶ÆVBæ6×–våF—FÆWÖçFôÆ÷vW$66R‚’æ–æ6ÇVFW2†æ÷&ÖÆ—¦VEVW'’Ğ¢¢G'VRÀĞ¢Ğ¢ç6Æ–6RƒÂÆ–Ö—B“°Ğ§Ò“°Ğ Ğ¦W‡÷'B6öç7BvWD6×–väFFf–WrÒ66†R†7–æ2gVæ7F–öâvWD6×–väFFf–Wr€Ğ¢6×–vä–C¢7G&–ærÀĞ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀĞ¢÷F–öç3¢²ÆVDÆ–Ö—Có¢çVÖ&W#²ÆVDöfg6WCó¢çVÖ&W#²VW'“ó¢7G&–æs²VÖ–Å7FGW3ó¢&GFVçF–öâ"ÒÒ·ÒÀĞ¢’°Ğ¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFW2Föæì:–W26×væR"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âvWE7W&6T6×–väFFf–Wr†6×–vä–BÂfÆÆ&6´ÖW&6†çBÂ÷F–öç2“°Ğ¢ĞĞ Ğ¢&WGW&âvWD6×–väFFf–Wtg&öÔÖVÖ÷'’†6×–vä–BÂ÷F–öç2“°Ğ§Ò“°Ğ Ğ¦W‡÷'B6öç7BvWDÖW&6†çE7W÷'D÷fW'f–WrÒ66†R†7–æ2gVæ7F–öâvWDÖW&6†çE7W÷'D÷fW'f–Wr€Ğ¢ÖW&6†çD–BÒÖW&6†çE6VVBæ–BÀĞ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀĞ¢÷F–öç3¢²–æ6ÇVFTÆÄÖW&6†çG3ó¢&ööÆVâÒÒ·ÒÀĞ¢’°Ğ¢–b†vWDFF&6¶VæB‚&ÆÆV7GW&RFRÆ7WW'f—6–öâ"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âvWE7W&6TÖW&6†çE7W÷'D÷fW'f–Wr€Ğ¢v—B&W6öÇfTÖW&6†çDf÷%7W&6R†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB’ÀĞ¢÷F–öç2ÀĞ¢“°Ğ¢ĞĞ Ğ¢6öç7BÆVG2ÒvWDÖW&6†çDÆVG4g&öÔÖVÖ÷'’‚“°Ğ¢6öç7B6×–vç2ÒvWDÖW&6†çDF6†&ö&Dg&öÔÖVÖ÷'’†ÖW&6†çD–BÂfÆÆ&6´ÖW&6†çB’æ6×–vç3°Ğ¢6öç7B6×–våF—FÆT'”–BÒæWrÖ†6×–vç2æÖ‚†—FVÒ’Óâ¶—FVÒæ6×–vâæ–BÂ—FVÒæ6×–vâçF—FÆUÒ’“°Ğ Ğ¢6öç7BVæF–æt6Æ–×3¢ÖW&6†çE7W÷'D÷fW'f–Wu²'VæF–æt6Æ–×2%ÒÒÆVG0Ğ¢æf–ÇFW"‚†ÆVB’ÓâÆVBç7FGW2ÓÓÒ&6Æ–ÖVB"bbÆVBç&VFV×F–öä6öFRĞ¢ç6Æ–6RƒÂ3Ğ¢æÖ‚†ÆVB’Óâ‡°Ğ¢ÆVD–C¢ÆVBæ–BÀĞ¢6×–vä–C¢ÆVBæ6×–vä–BÀĞ¢6×–våF—FÆS¢6×–våF—FÆT'”–BævWB†ÆVBæ6×–vä–B’óò$6×væR"ÀĞ¢f—'7DæÖS¢ÆVBæf—'7DæÖRÀĞ¢VÖ–Ã¢ÆVBæVÖ–ÂÀĞ¢&—¦TÆ&VÃ¢ÆVBç&—¦TÆ&VÂÀĞ¢&VFV×F–öä6öFS¢ÆVBç&VFV×F–öä6öFRóò""ÀĞ¢7FGW3¢ÆVBç7FGW2ÀĞ¢f–Æ&ÆTC¢ÆVBç&Wv&Df–Æ&ÆTBÀĞ¢W‡—&W4C¢ÆVBç&Wv&DW‡—&W4BÀĞ¢Ò’“°Ğ Ğ¢&WGW&â°Ğ¢f–ÆVDVÖ–Ç3¢µÒÀĞ¢vV&†öö·3¢µÒÀĞ¢VæF–æt6Æ–×2ÀĞ¢'W6–æW74Æöw3¢vWDÖVÖ÷'•7W÷'DÆöw2‚Ğ¢æf–ÇFW"‚†VçG'’’Óâ÷F–öç2æ–æ6ÇVFTÆÄÖW&6†çG2ÇÂVçG'’ç–ÆöCòæÖW&6†çD–BÓÓÒÖW&6†çD–BĞ¢ç6Æ–6RƒÂSĞ¢æÖ‚†VçG'’’Óâ‡°Ğ¢–C¢VçG'’æ–BÀĞ¢7&VFVDC¢VçG'’æ7&VFVDBÀĞ¢ÆWfVÃ¢VçG'’æÆWfVÂÀĞ¢WfVçC¢VçG'’æWfVçBÀĞ¢ÖW&6†çD–C Ğ¢G—VöbVçG'’ç–ÆöCòæÖW&6†çD–BÓÓÒ'7G&–ær"òVçG'’ç–ÆöBæÖW&6†çD–B¢VæFVf–æVBÀĞ¢6×–vä–C Ğ¢G—VöbVçG'’ç–ÆöCòæ6×–vä–BÓÓÒ'7G&–ær"òVçG'’ç–ÆöBæ6×–vä–B¢VæFVf–æVBÀĞ¢ÆVD–C¢G—VöbVçG'’ç–ÆöCòæÆVD–BÓÓÒ'7G&–ær"òVçG'’ç–ÆöBæÆVD–B¢VæFVf–æVBÀĞ¢VÖ–Ã Ğ¢G—VöbVçG'’ç–ÆöCòæVÖ–ÂÓÓÒ'7G&–ær Ğ¢òVçG'’ç–ÆöBæVÖ–ÀĞ¢¢G—VöbVçG'’ç–ÆöCòç&V6—–VçDVÖ–ÂÓÓÒ'7G&–ær Ğ¢òVçG'’ç–ÆöBç&V6—–VçDVÖ–ÀĞ¢¢VæFVf–æVBÀĞ¢&VFV×F–öä6öFS Ğ¢G—VöbVçG'’ç–ÆöCòç&VFV×F–öä6öFRÓÓÒ'7G&–ær Ğ¢òVçG'’ç–ÆöBç&VFV×F–öä6öFPĞ¢¢VæFVf–æVBÀĞ¢7VÖÖ'“ Ğ¢G—VöbVçG'’ç–ÆöCòæW'&÷"ÓÓÒ'7G&–ær Ğ¢òVçG'’ç–ÆöBæW'&÷ Ğ¢¢G—VöbVçG'’ç–ÆöCòç7FGW2ÓÓÒ'7G&–ær Ğ¢òVçG'’ç–ÆöBç7FGW0Ğ¢¢VæFVf–æVBÀĞ¢Ò’’ÀĞ¢Ó°Ğ§Ò“°Ğ Ğ¦W‡÷'B7–æ2gVæ7F–öâG&tf÷$ÆVB†–çWC¢G&u&WVW7BÂfÆÆ&6´ÖW&6†çCó¢ÖW&6†çB’°Ğ¢–b†vWDFF&6¶VæB‚&Æ'F–6—F–öâ:Vâ¦WR"’ÓÓÒ'7W&6R"’°Ğ¢6öç7BÖW&6†çBĞĞ¢fÆÆ&6´ÖW&6†çBóò†v—B&W6öÇfT6×–väÖW&6†çDf÷%7W&6R†–çWBæ6×–vä–B’“°Ğ¢&WGW&âG&tf÷$ÆVD–å7W&6R†–çWBÂÖW&6†çB“°Ğ¢ĞĞ Ğ¢&WGW&âG&tf÷$ÆVDg&öÔÖVÖ÷'’†–çWB“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâ7&VFTG&u6W76–öâ€Ğ¢–çWC¢7&VFTG&u6W76–öå&WVW7BÀĞ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀĞ¢’°Ğ¢–b†vWDFF&6¶VæB‚&Æ,:—&F–öâBwVæR'F–R"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&â7&VFTG&u6W76–öä–å7W&6R†–çWBÂfÆÆ&6´ÖW&6†çB“°Ğ¢ĞĞ Ğ¢&WGW&â7&VFTG&u6W76–öäg&öÔÖVÖ÷'’†–çWB“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâf–æÆ—¦TG&u6W76–öâ€Ğ¢–çWC¢f–æÆ—¦TG&u6W76–öå&WVW7BÀĞ¢fÆÆ&6´ÖW&6†çCó¢ÖW&6†çBÀĞ¢’°Ğ¢–b†vWDFF&6¶VæB‚&Æf–æÆ—6F–öâBwVæR'F–R"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âf–æÆ—¦TG&u6W76–öä–å7W&6R†–çWBÂfÆÆ&6´ÖW&6†çB“°Ğ¢ĞĞ Ğ¢&WGW&âf–æÆ—¦TG&u6W76–öäg&öÔÖVÖ÷'’†–çWB“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâÖ&´7F–öä6öæf—&ÖVB†ÆVD–C¢7G&–ærÂ6×–vä–Có¢7G&–ær’°Ğ¢–b†vWDFF&6¶VæB‚&Æ6öæf—&ÖF–öâBwVæR7F–öâÖ&¶WF–ær"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âÖ&´7F–öä6öæf—&ÖVD–å7W&6R†ÆVD–BÂ6×–vä–B“°Ğ¢ĞĞ Ğ¢&WGW&âÖ&´7F–öä6öæf—&ÖVD–äÖVÖ÷'’†ÆVD–BÂ6×–vä–B“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâ&VFVVÔÆVE&—¦R†ÆVD–C¢7G&–ær’°Ğ¢–b†vWDFF&6¶VæB‚&ÆR&WG&—BBwVâÆ÷B"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&â&VFVVÔÆVE&—¦T–å7W&6R†ÆVD–B“°Ğ¢ĞĞ Ğ¢&WGW&â&VFVVÔÆVE&—¦T–äÖVÖ÷'’†ÆVD–B“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâf–æDÖW&6†çDÆVD'•&VFV×F–öä6öFR†ÖW&6†çD–C¢7G&–ærÂ6öFS¢7G&–ær’°Ğ¢–b†vWDFF&6¶VæB‚&Æ&V6†W&6†R6—76RBwVâ6öFR"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âf–æE7W&6TÖW&6†çDÆVD'•&VFV×F–öä6öFR†ÖW&6†çD–BÂ6öFR“°Ğ¢ĞĞ Ğ¢&WGW&âf–æDÖW&6†çDÆVD'•&VFV×F–öä6öFT–äÖVÖ÷'’†ÖW&6†çD–BÂ6öFR“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâ&VFVVÔÖW&6†çDÆVE&—¦Tg&öÔ66†–W"†–çWC¢°Ğ¢ÆVD–C¢7G&–æs°Ğ¢ÖW&6†çD–C¢7G&–æs°Ğ¢÷W&F÷%W6W$–C¢7G&–æs°Ğ¢W&6†6T6öæf—&ÖVC¢&ööÆVã°Ğ¢–FV×÷FVæ7”¶W“¢7G&–æs°Ğ§Ò’°Ğ¢–b†vWDFF&6¶VæB‚&ÆR&WG&—B6—76RBwVâÆ÷B"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&â&VFVVÕ7W&6T66†–W$ÆVE&—¦R†–çWB“°Ğ¢ĞĞ Ğ¢&WGW&â&VFVVÔÖW&6†çDÆVE&—¦T–äÖVÖ÷'’†–çWB“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâ&W6WDÆVE&—¦R†ÆVD–C¢7G&–ær’°Ğ¢–b†vWDFF&6¶VæB‚&Æ,:––æ—F–Æ—6F–öâBwVâÆ÷B"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&â&W6WDÆVE&—¦T–å7W&6R†ÆVD–B“°Ğ¢ĞĞ Ğ¢&WGW&â&W6WDÆVE&—¦T–äÖVÖ÷'’†ÆVD–B“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâWFFU&—¦U7Fö6²‡&—¦T–C¢7G&–ærÂ&VÖ–æ–æuVçF—G“¢çVÖ&W"ÂçVÆÂ’°Ğ¢–b†vWDFF&6¶VæB‚&ÆÖ—6R:¦÷W"GR7Fö6²BwVâÆ÷B"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&âWFFU&—¦U7Fö6´–å7W&6R‡&—¦T–BÂ&VÖ–æ–æuVçF—G’“°Ğ¢ĞĞ Ğ¢&WGW&âWFFU&—¦U7Fö6´–äÖVÖ÷'’‡&—¦T–BÂ&VÖ–æ–æuVçF—G’“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâ&W6WE&—¦U7Fö6²‡&—¦T–C¢7G&–ær’°Ğ¢–b†vWDFF&6¶VæB‚&Æ&VÖ—6R:¬:—&òGR7Fö6²BwVâÆ÷B"’ÓÓÒ'7W&6R"’°Ğ¢&WGW&â&W6WE&—¦U7Fö6´–å7W&6R‡&—¦T–B“°Ğ¢ĞĞ Ğ¢&WGW&â&W6WE&—¦U7Fö6´–äÖVÖ÷'’‡&—¦T–B“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâWFFT6×–vå6WGW†–çWC¢6×–vå6WGW–çWB’°Ğ¢76W'D6×–vä6åV&Æ—6‚†–çWB“°Ğ Ğ¢–b†vWDFF&6¶VæB‚&ÆÖ—6R:¦÷W"BwVæR6×væR"’ÓÓÒ'7W&6R"’°Ğ¢6öç7B6×–vä–BÒv—BWFFT6×–vå6WGW–å7W&6R†–çWB“°Ğ¢–çfÆ–FFT6×–väæf–vF–öä66†R†–çWBæÖW&6†çD–BÂ6×–vä–B“°Ğ¢&WGW&âvWD6×–våW&f÷&Öæ6R€Ğ¢6×–vä–BÀĞ¢v—B&W6öÇfTÖW&6†çDf÷%7W&6R†–çWBæÖW&6†çD–B’ÀĞ¢“°Ğ¢ĞĞ Ğ¢&WGW&âWFFT6×–vå6WGW–äÖVÖ÷'’†–çWB“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâFövvÆT6×–vâ†–C¢7G&–ærÂ—47F—fS¢&ööÆVâÂÖW&6†çD–Có¢7G&–ær’°Ğ¢–b†vWDFF&6¶VæB‚&Âv7F—fF–öâBwVæR6×væR"’ÓÓÒ'7W&6R"’°Ğ¢–b†ÖW&6†çD–B’°Ğ¢v—BFövvÆT6×–väf÷$ÖW&6†çD–å7W&6R†–BÂ—47F—fRÂÖW&6†çD–B“°Ğ¢–çfÆ–FFT6×–väæf–vF–öä66†R†ÖW&6†çD–BÂ–B“°Ğ¢&WGW&âçVÆÃ°Ğ¢ĞĞ Ğ¢v—BFövvÆT6×–vä–å7W&6R†–BÂ—47F—fR“°Ğ¢–çfÆ–FFT6×–väæf–vF–öä66†R‡VæFVf–æVBÂ–B“°Ğ¢&WGW&âçVÆÃ°Ğ¢ĞĞ Ğ¢&WGW&âFövvÆT6×–vä–äÖVÖ÷'’†–BÂ—47F—fR“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâFVÆWFT6×–vâ†–C¢7G&–ærÂÖW&6†çD–Có¢7G&–ær’°Ğ¢–b†vWDFF&6¶VæB‚&Æ7W&W76–öâBwVæR6×væR"’ÓÓÒ'7W&6R"’°Ğ¢–b†ÖW&6†çD–B’°Ğ¢v—BFVÆWFT6×–väf÷$ÖW&6†çD–å7W&6R†–BÂÖW&6†çD–B“°Ğ¢–çfÆ–FFT6×–väæf–vF–öä66†R†ÖW&6†çD–BÂ–B“°Ğ¢&WGW&âçVÆÃ°Ğ¢ĞĞ Ğ¢v—BFVÆWFT6×–vä–å7W&6R†–B“°Ğ¢–çfÆ–FFT6×–väæf–vF–öä66†R‡VæFVf–æVBÂ–B“°Ğ¢&WGW&âçVÆÃ°Ğ¢ĞĞ Ğ¢&WGW&âFVÆWFT6×–vä–äÖVÖ÷'’†–B“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâGWÆ–6FT6×–vâ†–C¢7G&–ærÂfÆÆ&6´ÖW&6†çC¢ÖW&6†çB’°Ğ¢–b†vWDFF&6¶VæB‚&ÆGWÆ–6F–öâBwVæR6×væR"’ÓÓÒ'7W&6R"’°Ğ¢6öç7B6×–vä–BÒv—BGWÆ–6FT6×–vä–å7W&6R†–BÂfÆÆ&6´ÖW&6†çB“°Ğ¢–çfÆ–FFT6×–väæf–vF–öä66†R†fÆÆ&6´ÖW&6†çBæ–BÂ6×–vä–B“°Ğ¢&WGW&âvWD6×–våW&f÷&Öæ6R†6×–vä–BÂfÆÆ&6´ÖW&6†çB“°Ğ¢ĞĞ Ğ¢&WGW&âGWÆ–6FT6×–vä–äÖVÖ÷'’†–BÂfÆÆ&6´ÖW&6†çBæ–B“°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâGWÆ–6FT6×–våFôÆö6F–öç2€Ğ¢–C¢7G&–ærÀĞ¢W6W$–C¢7G&–ærÀĞ¢6÷W&6TÖW&6†çC¢ÖW&6†çBÀĞ¢F&vWDÆö6F–öä–G3¢7G&–æuµÒÀĞ¢’°Ğ¢6öç7BVæ—VUF&vWD–G2Ò²ââææWr6WB‡F&vWDÆö6F–öä–G2•Òæf–ÇFW"‚†Æö6F–öä–B’ÓâÆö6F–öä–BÓÒ6÷W&6TÖW&6†çBæ–B“°Ğ¢–b‚Væ—VUF&vWD–G2æÆVæwF‚’F‡&÷ræWrW'&÷"‚%<:–ÆV7F–öææW¢RÖö–ç2VâWG&R6—FRâ"“°Ğ Ğ¢6öç7B6öçFW‡BÒ6÷W&6TÖW&6†çBçv÷&·76T–@Ğ¢òv—BvWDÖW&6†çEv÷&·76T6öçFW‡B‡W6W$–BÂ6÷W&6TÖW&6†çBĞ¢¢²Æö6F–öç3¢·²ÖW&6†çC¢6÷W&6TÖW&6†çBÂ&öÆS¢&÷væW""26öç7BÕÒÓ°Ğ¢6öç7BF&vWDÖW&6†çG2Ò6öçFW‡BæÆö6F–öç0Ğ¢æÖ‚‡²ÖW&6†çBÒ’ÓâÖW&6†çBĞ¢æf–ÇFW"‚†ÖW&6†çB’ÓâVæ—VUF&vWD–G2æ–æ6ÇVFW2†ÖW&6†çBæ–B’“°Ğ¢–b‡F&vWDÖW&6†çG2æÆVæwF‚ÓÒVæ—VUF&vWD–G2æÆVæwF‚’F‡&÷ræWrW'&÷"‚%Vâ6—FR<:–ÆV7F–öæì:’âvW7B266W76–&ÆRâ"“°Ğ Ğ¢–b†vWDFF&6¶VæB‚&ÆGWÆ–6F–öâ×VÇF’×6—FR"’ÓÓÒ'7W&6R"’°Ğ¢6öç7BGWÆ–6FVD–G2ÒµÓ°Ğ¢f÷"†6öç7BF&vWDÖW&6†çBöbF&vWDÖW&6†çG2’°Ğ¢GWÆ–6FVD–G2çW6‚†v—BGWÆ–6FT6×–våFôÖW&6†çD–å7W&6R†–BÂ6÷W&6TÖW&6†çBÂF&vWDÖW&6†çB’“°Ğ¢ĞĞ¢&WGW&âGWÆ–6FVD–G3°Ğ¢ĞĞ Ğ¢6öç7B6÷W&6RÒ7F÷&Ræ6×–vç2æf–æB‚†6×–vâ’Óâ6×–vâæ–BÓÓÒ–Bbb6×–vâæÖW&6†çD–BÓÓÒ6÷W&6TÖW&6†çBæ–B“°Ğ¢–b‚6÷W&6R’F‡&÷ræWrW'&÷"‚$6×væR6÷W&6R–çG&÷Wf&ÆRâ"“°Ğ¢&WGW&âF&vWDÖW&6†çG2æÖ‚‡F&vWDÖW&6†çB’Óâ°Ğ¢6öç7BGWÆ–6FRÒGWÆ–6FT6×–vä–äÖVÖ÷'’†–BÂ6÷W&6TÖW&6†çBæ–B“°Ğ¢6öç7B7&VFVBÒ7F÷&Ræ6×–vç2æf–æB‚†6×–vâ’Óâ6×–vâæ–BÓÓÒGWÆ–6FRæ–B“°Ğ¢–b†7&VFVB’°Ğ¢7&VFVBæÖW&6†çD–BÒF&vWDÖW&6†çBæ–C°Ğ¢7&VFVBçF—FÆRÒG·6÷W&6RçF—FÆWÒ+rG·F&vWDÖW&6†çBæ6—G’óòF&vWDÖW&6†çBæ6ö×ç”æÖWÖ°Ğ¢ĞĞ¢&WGW&âGWÆ–6FRæ–C°Ğ¢Ò“°Ğ§ĞĞ 