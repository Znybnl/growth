import {
  drawForLeadInSupabase,
  getSupabaseCampaignDataView,
  getSupabaseCampaignPerformance,
  getSupabaseMerchantDashboard,
  getSupabaseMerchantLeads,
  getSupabasePublicCampaign,
  markActionConfirmedInSupabase,
  recordEventInSupabase,
  redeemLeadPrizeInSupabase,
  toggleCampaignInSupabase,
  updateCampaignSetupInSupabase,
} from "@/lib/campaign-repository";
import {
  authenticateMerchantInSupabase,
  createMerchantAccountInSupabase,
  getSupabaseMerchantProfile,
  getSupabaseMerchantUser,
  updateMerchantOnboardingInSupabase,
} from "@/lib/merchant-account-repository";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  Campaign,
  CampaignAction,
  CampaignDataView,
  CampaignEvent,
  CampaignPerformance,
  CampaignPresentation,
  CampaignBackgroundSettings,
  CampaignButtonSettings,
  CampaignHeadingSettings,
  CampaignLogoSettings,
  CampaignRewardRules,
  CampaignWheelSettings,
  CampaignSetupInput,
  DrawRequest,
  DrawResult,
  Lead,
  Merchant,
  MerchantDashboardData,
  MerchantLeadRow,
  MerchantOnboardingInput,
  MerchantSignInInput,
  MerchantSignUpInput,
  MerchantUser,
  Prize,
  PublicCampaign,
} from "@/lib/types";

type Store = {
  merchants: Merchant[];
  users: MerchantUser[];
  campaigns: Campaign[];
  prizes: Prize[];
  leads: Lead[];
  events: CampaignEvent[];
};

const defaultLogoUrl =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#132238"/>
          <stop offset="100%" stop-color="#243a57"/>
        </linearGradient>
      </defs>
      <rect width="220" height="220" rx="56" fill="url(#bg)"/>
      <rect x="28" y="28" width="164" height="164" rx="38" fill="#f4efe6" opacity="0.95"/>
      <text x="110" y="118" text-anchor="middle" font-size="72" font-family="Georgia, serif" font-weight="700" fill="#132238">MS</text>
      <text x="110" y="154" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" letter-spacing="4" fill="#786746">MAISON</text>
    </svg>
  `);

type CampaignPresentationOverrides = {
  logo?: Partial<CampaignLogoSettings>;
  background?: Partial<CampaignBackgroundSettings>;
  heading?: Partial<CampaignHeadingSettings>;
  button?: Partial<CampaignButtonSettings>;
  layout?: Partial<{ blockSpacingPx: number }>;
  wheel?: Partial<CampaignWheelSettings>;
};

function createPresentation(overrides?: CampaignPresentationOverrides): CampaignPresentation {
  return {
    logo: {
      sizePercent: 100,
      marginBottomPx: 20,
      align: "center",
      ...overrides?.logo,
    },
    background: {
      mode: "color",
      color: "#111827",
      imageUrl: undefined,
      ...overrides?.background,
    },
    heading: {
      textColor: "#ffffff",
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
      textSizePx: 18,
      ...overrides?.button,
    },
    layout: {
      blockSpacingPx: 28,
      ...overrides?.layout,
    },
    wheel: {
      rimColor: "#f4c14a",
      winColor: "#f4c14a",
      alternateWinColor: "#eef2ff",
      loseColor: "#1b2842",
      alternateLoseColor: "#8795db",
      ...overrides?.wheel,
    },
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
  logoUrl: defaultLogoUrl,
  city: "Paris Marais",
  contactName: "Pierre-Henri Brunelle",
  phone: "01 40 00 00 00",
  onboardingCompleted: true,
  preferredGoals: ["Avis Google", "Collecte CRM"],
  diffusionSupport: ["QR code vitrine et comptoir", "Script équipe magasin"],
  googleReviewUrl: "https://g.page/r/CampaignReview",
  instagramUrl: "https://instagram.com/maisonsora",
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
    logoUrl: defaultLogoUrl,
    presentation: createPresentation({
      background: { color: "#121317" },
      button: {
        backgroundColor: "#8d9ae8",
        textColor: "#ffffff",
        borderColor: "#f5b93d",
        textSizePx: 18,
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
    logoUrl: defaultLogoUrl,
    presentation: createPresentation({
      background: { color: "#1e2231" },
      button: {
        backgroundColor: "#8d9ae8",
        textColor: "#ffffff",
        borderColor: "#8d9ae8",
        textSizePx: 18,
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
    logoUrl: defaultLogoUrl,
    presentation: createPresentation({
      background: { color: "#171210" },
      button: {
        backgroundColor: "#ff7f50",
        textColor: "#ffffff",
        borderColor: "#ff7f50",
        textSizePx: 18,
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
    redemptionCode: "SORA-4012",
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
    redemptionCode: "SORA-5099",
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
    logoUrl: rawCampaign.logoUrl ?? merchantSeed.logoUrl,
    presentation: rawCampaign.presentation ?? fallback.presentation,
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
  };
}

const store = normalizeStore(globalThis.__retailActivationStore ?? createSeededStore());
globalThis.__retailActivationStore = store;

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
    prizeLabel: prize?.label ?? "Aucun lot",
  };
}

function toPublicCampaign(campaign: Campaign): PublicCampaign {
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
    logoUrl: campaign.logoUrl ?? merchant.logoUrl,
    accent: campaign.accent,
    prizes: getCampaignPrizes(campaign.id).map((prize) => ({
      id: prize.id,
      label: prize.label,
    })),
    presentation: campaign.presentation,
    actions: campaign.actions,
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
  const actions =
    campaign.goalType === "review_prompt"
      ? events.filter((event) =>
          ["review_clicked", "review_confirmed"].includes(event.eventType),
        ).length
      : campaign.goalType === "social_follow"
        ? events.filter((event) => event.eventType === "social_clicked").length
        : leads.length;
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
  const phone = input.phone.trim();

  const merchant: Merchant = {
    id: merchantId,
    companyName,
    logoText: companyName.slice(0, 2).toUpperCase(),
    logoUrl: defaultLogoUrl,
    city,
    contactName: `${firstName} ${lastName}`.trim(),
    phone,
    onboardingCompleted: false,
    preferredGoals: [],
    diffusionSupport: [],
    googleReviewUrl: "",
    instagramUrl: "",
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
  merchant.city = input.city.trim();
  merchant.contactName = input.contactName.trim();
  merchant.phone = input.phone.trim();
  merchant.preferredGoals = input.preferredGoals;
  merchant.diffusionSupport = input.diffusionSupport;
  merchant.onboardingCompleted = true;

  return clone(merchant);
}

export async function getMerchantProfile(merchantId = merchantSeed.id) {
  if (isSupabaseConfigured()) {
    const merchant = await getSupabaseMerchantProfile(merchantId);

    if (merchant) {
      return merchant;
    }
  }

  return getMerchantProfileFromMemory(merchantId);
}

export async function getMerchantUser(userId: string) {
  if (isSupabaseConfigured()) {
    const user = await getSupabaseMerchantUser(userId);

    if (user) {
      return user;
    }
  }

  return getMerchantUserFromMemory(userId);
}

export async function getMerchantUserByEmail(email: string) {
  if (isSupabaseConfigured()) {
    throw new Error("Recherche directe par email non exposee en mode Supabase.");
  }

  return getMerchantUserByEmailFromMemory(email);
}

export async function createMerchantAccount(input: MerchantSignUpInput) {
  if (isSupabaseConfigured()) {
    return createMerchantAccountInSupabase(input);
  }

  return createMerchantAccountInMemory(input);
}

export async function authenticateMerchant(input: MerchantSignInInput) {
  if (isSupabaseConfigured()) {
    return authenticateMerchantInSupabase(input);
  }

  return authenticateMerchantInMemory(input);
}

export async function updateMerchantOnboarding(userId: string, input: MerchantOnboardingInput) {
  if (isSupabaseConfigured()) {
    return updateMerchantOnboardingInSupabase(userId, input);
  }

  return updateMerchantOnboardingInMemory(userId, input);
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

  return {
    merchant: clone(merchant),
    campaigns,
    totalLeads,
    totalRedeemed,
    averageConversion,
  };
}

function getMerchantLeadsFromMemory(campaignId?: string) {
  return clone(
    store.leads
      .filter((lead) => (campaignId ? lead.campaignId === campaignId : true))
      .map((lead) => toLeadRow(lead))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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

function drawForLeadFromMemory(input: DrawRequest): DrawResult {
  const campaign = getCampaign(input.campaignId);

  if (!campaign || !campaign.isActive) {
    throw new Error("Campagne indisponible");
  }

  const lead: Lead = {
    id: generateId("lead"),
    campaignId: campaign.id,
    firstName: input.firstName.trim(),
    email: input.email.trim().toLowerCase(),
    marketingConsent: input.marketingConsent,
    consentTimestamp: new Date().toISOString(),
    status: "lost",
    createdAt: new Date().toISOString(),
    actionConfirmed: false,
  };

  const prize = choosePrize(campaign, getCampaignPrizes(campaign.id));

  if (prize) {
    const now = Date.now();
    const availableAt = new Date(
      now + campaign.rewardRules.availableAfterHours * 60 * 60 * 1000,
    );
    const expiresAt =
      campaign.rewardRules.availabilityDurationDays > 0
        ? new Date(
            availableAt.getTime() +
              campaign.rewardRules.availabilityDurationDays * 24 * 60 * 60 * 1000,
          )
        : new Date(
            now + campaign.rewardRules.rewardExpiryMinutes * 60 * 1000,
          );

    lead.prizeId = prize.id;
    lead.status = "claimed";
    lead.redemptionCode = `SORA-${Math.floor(1000 + Math.random() * 9000)}`;
    lead.rewardAvailableAt = availableAt.toISOString();
    lead.rewardExpiresAt = expiresAt.toISOString();
  }

  store.leads.push(lead);
  recordEventInMemory(campaign.id, "lead_created", lead.id);
  recordEventInMemory(campaign.id, "game_played", lead.id);

  if (prize) {
    recordEventInMemory(campaign.id, "prize_won", lead.id, { prizeId: prize.id });
  }

  return {
    lead: clone(lead),
    prize: prize ? clone(prize) : null,
    campaign: toPublicCampaign(campaign),
  };
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
    });
  });

  return clone(campaign);
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
  if (isSupabaseConfigured()) {
    return recordEventInSupabase(campaignId, eventType, leadId, metadata);
  }

  return recordEventInMemory(campaignId, eventType, leadId, metadata);
}

export async function getPublicCampaign(id: string) {
  if (isSupabaseConfigured()) {
    return getSupabasePublicCampaign(id);
  }

  return getPublicCampaignFromMemory(id);
}

export async function getCampaignPerformance(campaignId: string, fallbackMerchant?: Merchant) {
  if (isSupabaseConfigured()) {
    return getSupabaseCampaignPerformance(campaignId, fallbackMerchant);
  }

  return getCampaignPerformanceFromMemory(campaignId);
}

export async function getMerchantDashboard(
  merchantId = merchantSeed.id,
  fallbackMerchant?: Merchant,
) {
  if (isSupabaseConfigured() && fallbackMerchant) {
    return getSupabaseMerchantDashboard(fallbackMerchant);
  }

  return getMerchantDashboardFromMemory(merchantId, fallbackMerchant);
}

export async function getMerchantLeads(merchantId = merchantSeed.id, campaignId?: string) {
  if (isSupabaseConfigured()) {
    return getSupabaseMerchantLeads(merchantId, campaignId);
  }

  return getMerchantLeadsFromMemory(campaignId);
}

export async function getCampaignDataView(campaignId: string, fallbackMerchant?: Merchant) {
  if (isSupabaseConfigured()) {
    return getSupabaseCampaignDataView(campaignId, fallbackMerchant);
  }

  return getCampaignDataViewFromMemory(campaignId);
}

export async function drawForLead(input: DrawRequest, fallbackMerchant?: Merchant) {
  if (isSupabaseConfigured()) {
    const merchant = fallbackMerchant ?? (await getMerchantProfile());
    return drawForLeadInSupabase(input, merchant);
  }

  return drawForLeadFromMemory(input);
}

export async function markActionConfirmed(leadId: string) {
  if (isSupabaseConfigured()) {
    return markActionConfirmedInSupabase(leadId);
  }

  return markActionConfirmedInMemory(leadId);
}

export async function redeemLeadPrize(leadId: string) {
  if (isSupabaseConfigured()) {
    return redeemLeadPrizeInSupabase(leadId);
  }

  return redeemLeadPrizeInMemory(leadId);
}

export async function updateCampaignSetup(input: CampaignSetupInput) {
  if (isSupabaseConfigured()) {
    const campaignId = await updateCampaignSetupInSupabase(input);
    return getCampaignPerformance(campaignId, await getMerchantProfile(input.merchantId));
  }

  return updateCampaignSetupInMemory(input);
}

export async function toggleCampaign(id: string, isActive: boolean) {
  if (isSupabaseConfigured()) {
    await toggleCampaignInSupabase(id, isActive);
    return null;
  }

  return toggleCampaignInMemory(id, isActive);
}
