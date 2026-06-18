import {
  Campaign,
  CampaignAction,
  CampaignDataView,
  CampaignEvent,
  CampaignKpi,
  CampaignPerformance,
  CampaignSetupInput,
  DrawRequest,
  DrawResult,
  Lead,
  Merchant,
  MerchantDashboardData,
  MerchantFailedEmailItem,
  MerchantLeadRow,
  MerchantPendingClaimItem,
  MerchantSupportOverview,
  MerchantWebhookItem,
  Prize,
  PublicCampaign,
  RewardEmailDelivery,
  RewardEmailEvent,
} from "@/lib/types";
import {
  getCampaignLocalSettings,
  setCampaignLocalSettings,
} from "@/lib/campaign-local-settings";
import {
  createCampaignEmailDefaults,
  normalizeCampaignEmailSettings,
} from "@/lib/email-settings";
import { createPosterSettingsDefaults, normalizePosterSettings } from "@/lib/poster-utils";
import { getSupabaseAdmin } from "@/lib/supabase";
import { WebhookEventPayload } from "resend";

type CampaignRow = {
  id: string;
  merchant_id: string;
  title: string;
  subtitle: string;
  goal_type: Campaign["goalType"];
  cta_label: string;
  success_metric: string;
  target_url: string | null;
  is_active: boolean;
  created_at: string;
  accent_ink: string;
  accent_paper: string;
  accent_signal: string;
  game_type: Campaign["gameType"];
  logo_url: string | null;
  logo_size_percent: number;
  logo_margin_bottom_px: number;
  logo_align: Campaign["presentation"]["logo"]["align"];
  background_mode: Campaign["presentation"]["background"]["mode"];
  background_color: string;
  background_image_url: string | null;
  heading_text_color: string;
  heading_font_size_px: number;
  heading_font_family: Campaign["presentation"]["heading"]["fontFamily"];
  heading_align: Campaign["presentation"]["heading"]["align"];
  button_background_color: string;
  button_text_color: string;
  button_border_color: string;
  button_size: Campaign["presentation"]["button"]["size"];
  button_text_size_px?: number;
  wheel_rim_color: string;
  wheel_win_color: string;
  wheel_alternate_win_color: string;
  wheel_lose_color: string;
  wheel_alternate_lose_color: string;
  reward_expiry_minutes: number;
  purchase_required: boolean;
  available_after_hours: number;
  availability_duration_days: number;
  is_winning_every_time: boolean;
};

type CampaignLocalSettings = Awaited<ReturnType<typeof getCampaignLocalSettings>>;

type ActionRow = {
  id: string;
  campaign_id: string;
  position: number;
  kind: CampaignAction["kind"];
  label: string;
  url: string;
  created_at: string;
};

type PrizeRow = {
  id: string;
  campaign_id: string;
  label: string;
  total_quantity: number | null;
  remaining_quantity: number | null;
  probability: number;
  estimated_unit_cost: number;
  created_at: string;
};

type LeadRow = {
  id: string;
  campaign_id: string;
  first_name: string;
  email: string;
  phone: string | null;
  marketing_consent: boolean;
  consent_timestamp: string;
  prize_id: string | null;
  status: Lead["status"];
  created_at: string;
  action_confirmed: boolean;
  redemption_code: string | null;
  reward_available_at: string | null;
  reward_expires_at: string | null;
};

type DrawLeadRpcRow = {
  lead_id: string;
  campaign_id: string;
  first_name: string;
  email: string;
  marketing_consent: boolean;
  consent_timestamp: string;
  prize_id: string | null;
  status: Lead["status"];
  created_at: string;
  action_confirmed: boolean;
  redemption_code: string | null;
  reward_available_at: string | null;
  reward_expires_at: string | null;
  action_index: number;
};

type EventRow = {
  id: string;
  campaign_id: string;
  lead_id: string | null;
  event_type: CampaignEvent["eventType"];
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
};

type MerchantRow = {
  id: string;
  company_name: string;
  logo_text: string;
  logo_url: string | null;
  industry: string | null;
  city: string | null;
  contact_name: string | null;
  phone: string | null;
  website_url: string | null;
  onboarding_completed: boolean | null;
  preferred_goals: string[] | null;
  diffusion_support: string[] | null;
  google_review_url: string | null;
  instagram_url: string | null;
  default_prize_cost: number | null;
  created_at: string;
};

type RewardEmailDeliveryRow = {
  id: string;
  campaign_id: string;
  lead_id: string;
  resend_email_id: string | null;
  recipient_email: string;
  sender_email: string | null;
  reply_to_email: string | null;
  subject: string;
  status: "queued" | "sent" | "delivered" | "bounced" | "complained" | "suppressed" | "failed";
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  last_event_at: string | null;
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
  updated_at: string;
};

type RewardEmailDeliverySummaryRow = {
  lead_id: string;
  status: RewardEmailDeliveryRow["status"];
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
};

type RewardEmailEventRow = {
  id: string;
  reward_email_delivery_id: string | null;
  resend_email_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function toMerchant(row: MerchantRow): Merchant {
  return {
    id: row.id,
    companyName: row.company_name,
    logoText: row.logo_text,
    logoUrl: row.logo_url ?? undefined,
    industry: row.industry ?? undefined,
    city: row.city ?? undefined,
    contactName: row.contact_name ?? undefined,
    phone: row.phone ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    onboardingCompleted: row.onboarding_completed ?? false,
    preferredGoals: row.preferred_goals ?? [],
    diffusionSupport: row.diffusion_support ?? [],
    googleReviewUrl: row.google_review_url ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    defaultPrizeCost: row.default_prize_cost ?? undefined,
    createdAt: row.created_at,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function extractWebhookSummary(payload?: Record<string, unknown> | null) {
  if (!payload) {
    return "";
  }

  const data =
    "data" in payload && typeof payload.data === "object" && payload.data !== null
      ? (payload.data as Record<string, unknown>)
      : null;

  const firstString = (...values: Array<unknown>) =>
    values.find((value) => typeof value === "string" && value.trim().length > 0) as
      | string
      | undefined;

  return (
    firstString(
      data?.reason,
      data?.message,
      data?.response,
      data?.["bounce"] && typeof data.bounce === "object"
        ? (data.bounce as Record<string, unknown>).message
        : undefined,
      data?.["failed"] && typeof data.failed === "object"
        ? (data.failed as Record<string, unknown>).reason
        : undefined,
      data?.["suppressed"] && typeof data.suppressed === "object"
        ? (data.suppressed as Record<string, unknown>).message
        : undefined,
    ) ?? ""
  );
}

function toCampaign(
  row: CampaignRow,
  merchant: Merchant,
  actions: ActionRow[],
  prizes: PrizeRow[],
  localSettings: CampaignLocalSettings = {},
): Campaign {
  void prizes;
  const wheel = {
    rimColor: row.wheel_rim_color,
    winColor: row.wheel_win_color,
    alternateWinColor: row.wheel_alternate_win_color,
    loseColor: row.wheel_lose_color,
    alternateLoseColor: row.wheel_alternate_lose_color,
  };

  return {
    id: row.id,
    merchantId: row.merchant_id,
    title: row.title,
    subtitle: row.subtitle,
    goalType: row.goal_type,
    ctaLabel: row.cta_label,
    successMetric: row.success_metric,
    targetUrl: row.target_url ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    accent: {
      ink: row.accent_ink,
      paper: row.accent_paper,
      signal: row.accent_signal,
    },
    gameType: row.game_type,
    logoMode: localSettings.logoMode ?? (row.logo_url ? "image" : "text"),
    logoText: localSettings.logoText,
    logoUrl: row.logo_url ?? undefined,
    presentation: {
      logo: {
        sizePercent: row.logo_size_percent,
        marginBottomPx: row.logo_margin_bottom_px,
        align: row.logo_align,
      },
      background: {
        mode: row.background_mode,
        color: row.background_color,
        imageUrl: row.background_image_url ?? "",
      },
      heading: {
        textColor: row.heading_text_color,
        fontSizePx: row.heading_font_size_px,
        fontFamily: row.heading_font_family,
        align: row.heading_align,
      },
      button: {
        backgroundColor: row.button_background_color,
        textColor: row.button_text_color,
        borderColor: row.button_border_color,
        size: row.button_size,
        textSizePx: localSettings.buttonTextSizePx ?? row.button_text_size_px ?? 24,
        isBold: localSettings.buttonIsBold ?? true,
      },
      layout: {
        blockSpacingPx: localSettings.blockSpacingPx ?? 28,
      },
      wheel: {
        ...wheel,
      },
      poster: normalizePosterSettings(
        localSettings.poster,
        createPosterSettingsDefaults({
          logoUrl: row.logo_url ?? undefined,
          logoSizePercent: row.logo_size_percent,
          logoBottomMarginPx: row.logo_margin_bottom_px,
          backgroundImageUrl: row.background_image_url ?? "",
          headline: row.subtitle,
          headlineTextColor: row.heading_text_color,
          headlineFontSizePx: row.heading_font_size_px,
          headlineFontFamily: row.heading_font_family,
          wheel,
          footerBackgroundColor: row.accent_signal,
        }),
      ),
      email: normalizeCampaignEmailSettings(
        localSettings.email,
        createCampaignEmailDefaults(merchant),
      ),
    },
    actions: actions
      .sort((a, b) => a.position - b.position)
      .map((action) => ({
        id: action.id,
        kind: action.kind,
        label: action.label,
        url: action.url,
      })),
    rewardRules: {
      rewardExpiryMinutes: row.reward_expiry_minutes,
      purchaseRequired: row.purchase_required,
      availableAfterHours: row.available_after_hours,
      availabilityDurationDays: row.availability_duration_days,
      isWinningEveryTime: row.is_winning_every_time,
    },
  };
}

function toPrize(row: PrizeRow): Prize {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    label: row.label,
    totalQuantity: row.total_quantity,
    remainingQuantity: row.remaining_quantity,
    probability: Number(row.probability),
    estimatedUnitCost: Number(row.estimated_unit_cost),
  };
}

function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    firstName: row.first_name,
    email: row.email,
    phone: row.phone ?? undefined,
    marketingConsent: row.marketing_consent,
    consentTimestamp: row.consent_timestamp,
    prizeId: row.prize_id ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    actionConfirmed: row.action_confirmed,
    redemptionCode: row.redemption_code ?? undefined,
    rewardAvailableAt: row.reward_available_at ?? undefined,
    rewardExpiresAt: row.reward_expires_at ?? undefined,
  };
}

function toEvent(row: EventRow): CampaignEvent {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    leadId: row.lead_id ?? undefined,
    eventType: row.event_type,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

function toRewardEmailDelivery(row: RewardEmailDeliveryRow): RewardEmailDelivery {
  return {
    id: row.id,
    leadId: row.lead_id,
    campaignId: row.campaign_id,
    resendEmailId: row.resend_email_id ?? undefined,
    recipientEmail: row.recipient_email,
    senderEmail: row.sender_email ?? undefined,
    replyToEmail: row.reply_to_email ?? undefined,
    subject: row.subject,
    status: row.status,
    errorMessage: row.error_message ?? undefined,
    sentAt: row.sent_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    bouncedAt: row.bounced_at ?? undefined,
    complainedAt: row.complained_at ?? undefined,
    lastEventAt: row.last_event_at ?? undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRewardEmailEvent(row: RewardEmailEventRow): RewardEmailEvent {
  return {
    id: row.id,
    rewardEmailDeliveryId: row.reward_email_delivery_id ?? undefined,
    resendEmailId: row.resend_email_id ?? undefined,
    eventType: row.event_type,
    payload: row.payload ?? undefined,
    createdAt: row.created_at,
  };
}

function enrichLeadRowsWithEmailDeliveries(
  leads: MerchantLeadRow[],
  deliveries: RewardEmailDeliverySummaryRow[],
) {
  const deliveryMap = new Map(deliveries.map((item) => [item.lead_id, item]));

  return leads.map((lead) => {
    const delivery = deliveryMap.get(lead.id);

    return {
      ...lead,
      emailDeliveryStatus: delivery?.status,
      emailSentAt: delivery?.sent_at ?? undefined,
      emailDeliveredAt: delivery?.delivered_at ?? undefined,
      emailErrorMessage: delivery?.error_message ?? undefined,
    };
  });
}

function toPublicCampaign(
  campaign: Campaign,
  merchant: Merchant,
  prizes: Prize[],
  actions = campaign.actions,
): PublicCampaign {
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
    prizes: prizes.map((prize) => ({ id: prize.id, label: prize.label })),
    presentation: campaign.presentation,
    actions,
    rewardRules: campaign.rewardRules,
  };
}

function computeKpis(campaign: Campaign, prizes: Prize[], leads: Lead[], events: CampaignEvent[]): CampaignKpi {
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

async function fetchCampaignDependencies(campaignIds: string[]) {
  const supabase = getSupabaseAdmin();

  if (!campaignIds.length) {
    return { actions: [] as ActionRow[], prizes: [] as PrizeRow[], leads: [] as LeadRow[], events: [] as EventRow[] };
  }

  const [{ data: actions }, { data: prizes }, { data: leads }, { data: events }] = await Promise.all([
    supabase
      .from("campaign_actions")
      .select("id,campaign_id,position,kind,label,url,created_at")
      .in("campaign_id", campaignIds),
    supabase
      .from("prizes")
      .select("id,campaign_id,label,total_quantity,remaining_quantity,probability,estimated_unit_cost,created_at")
      .in("campaign_id", campaignIds),
    supabase
      .from("leads")
      .select("id,campaign_id,first_name,email,phone,marketing_consent,consent_timestamp,prize_id,status,created_at,action_confirmed,redemption_code,reward_available_at,reward_expires_at")
      .in("campaign_id", campaignIds),
    supabase
      .from("campaign_events")
      .select("id,campaign_id,lead_id,event_type,metadata,created_at")
      .in("campaign_id", campaignIds),
  ]);

  return {
    actions: (actions as ActionRow[] | null) ?? [],
    prizes: (prizes as PrizeRow[] | null) ?? [],
    leads: (leads as LeadRow[] | null) ?? [],
    events: (events as EventRow[] | null) ?? [],
  };
}

function buildPerformanceBundle(
  merchant: Merchant,
  campaignRows: CampaignRow[],
  actionRows: ActionRow[],
  prizeRows: PrizeRow[],
  leadRows: LeadRow[],
  eventRows: EventRow[],
  localSettingsByCampaignId: Record<string, CampaignLocalSettings> = {},
) {
  return campaignRows.map((row) => {
    const campaignId = row.id;
    const campaignActions = actionRows.filter((item) => item.campaign_id === campaignId);
    const campaignPrizes = prizeRows.filter((item) => item.campaign_id === campaignId).map(toPrize);
    const campaignLeads = leadRows.filter((item) => item.campaign_id === campaignId).map(toLead);
    const campaignEvents = eventRows.filter((item) => item.campaign_id === campaignId).map(toEvent);
    const campaign = toCampaign(
      row,
      merchant,
      campaignActions,
      campaignPrizes.map((item) => ({
        id: item.id,
        campaign_id: item.campaignId,
        label: item.label,
        total_quantity: item.totalQuantity,
        remaining_quantity: item.remainingQuantity,
        probability: item.probability,
        estimated_unit_cost: item.estimatedUnitCost,
        created_at: "",
      })),
      localSettingsByCampaignId[campaignId],
    );

    return {
      campaign,
      merchant: clone(merchant),
      prizes: campaignPrizes,
      kpis: computeKpis(campaign, campaignPrizes, campaignLeads, campaignEvents),
    } satisfies CampaignPerformance;
  });
}

export async function getSupabaseMerchantDashboard(
  merchant: Merchant,
): Promise<MerchantDashboardData> {
  const supabase = getSupabaseAdmin();
  const { data: campaignsData } = await supabase
    .from("campaigns")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  const campaignRows = (campaignsData as CampaignRow[] | null) ?? [];
  const campaignIds = campaignRows.map((campaign) => campaign.id);
  const localSettingsEntries = await Promise.all(
    campaignIds.map(async (campaignId) => [campaignId, await getCampaignLocalSettings(campaignId)] as const),
  );
  const localSettingsByCampaignId = Object.fromEntries(localSettingsEntries);
  const { actions, prizes, leads, events } = await fetchCampaignDependencies(campaignIds);
  const campaigns = buildPerformanceBundle(
    merchant,
    campaignRows,
    actions,
    prizes,
    leads,
    events,
    localSettingsByCampaignId,
  );
  const totalLeads = campaigns.reduce((total, item) => total + item.kpis.leads, 0);
  const totalRedeemed = campaigns.reduce((total, item) => total + item.kpis.redeemed, 0);
  const averageConversion = campaigns.length
    ? Math.round(campaigns.reduce((total, item) => total + item.kpis.conversionRate, 0) / campaigns.length)
    : 0;

  return {
    merchant: clone(merchant),
    campaigns,
    totalLeads,
    totalRedeemed,
    averageConversion,
  };
}

export async function getSupabaseCampaignPerformance(
  campaignId: string,
  fallbackMerchant?: Merchant,
): Promise<CampaignPerformance | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!data) return null;
  const row = data as CampaignRow;
  const [merchant, { actions, prizes, leads, events }, localSettings] = await Promise.all([
    fallbackMerchant && fallbackMerchant.id === row.merchant_id
      ? Promise.resolve(fallbackMerchant)
      : (async () => {
          const merchantResult = await supabase
            .from("merchants")
            .select("*")
            .eq("id", row.merchant_id)
            .maybeSingle();
          return merchantResult.data ? toMerchant(merchantResult.data as MerchantRow) : null;
        })(),
    fetchCampaignDependencies([campaignId]),
    getCampaignLocalSettings(campaignId),
  ]);
  if (!merchant) return null;
  return buildPerformanceBundle(
    merchant,
    [row],
    actions,
    prizes,
    leads,
    events,
    { [campaignId]: localSettings },
  )[0] ?? null;
}

export async function getSupabasePublicCampaign(
  campaignId: string,
): Promise<PublicCampaign | null> {
  const performance = await getSupabaseCampaignPerformance(campaignId);
  if (!performance || !performance.campaign.isActive) return null;
  return toPublicCampaign(performance.campaign, performance.merchant, performance.prizes);
}

export async function getSupabaseMerchantLeads(
  merchantId: string,
  campaignId?: string,
): Promise<MerchantLeadRow[]> {
  const supabase = getSupabaseAdmin();
  const { data: campaignsData } = await supabase
    .from("campaigns")
    .select("id,title,goal_type")
    .eq("merchant_id", merchantId);

  const campaigns = (campaignsData as Array<{ id: string; title: string; goal_type: Campaign["goalType"] }> | null) ?? [];
  const campaignIds = campaignId ? [campaignId] : campaigns.map((item) => item.id);
  if (!campaignIds.length) return [];
  const [{ data: leadsData }, { data: prizesData }, { data: deliveriesData }] = await Promise.all([
    supabase.from("leads").select("*").in("campaign_id", campaignIds),
    supabase.from("prizes").select("id,label,campaign_id,total_quantity,remaining_quantity,probability,estimated_unit_cost,created_at").in("campaign_id", campaignIds),
    supabase
      .from("reward_email_deliveries")
      .select("lead_id,status,sent_at,delivered_at,error_message")
      .in("campaign_id", campaignIds),
  ]);
  const prizes = ((prizesData as PrizeRow[] | null) ?? []).map(toPrize);
  const campaignMap = new Map(campaigns.map((item) => [item.id, item]));
  const leads = ((leadsData as LeadRow[] | null) ?? [])
    .map(toLead)
    .map((lead) => ({
      ...lead,
      campaignTitle: campaignMap.get(lead.campaignId)?.title ?? "Campagne",
      goalType: campaignMap.get(lead.campaignId)?.goal_type ?? "lead_capture",
      prizeLabel: lead.prizeId
        ? prizes.find((item) => item.id === lead.prizeId)?.label ?? "Lot inconnu"
        : "Perdu",
    }))
    .sort((a, b) => b.consentTimestamp.localeCompare(a.consentTimestamp));

  return enrichLeadRowsWithEmailDeliveries(
    leads,
    (deliveriesData as RewardEmailDeliverySummaryRow[] | null) ?? [],
  );
}

export async function getSupabaseCampaignDataView(
  campaignId: string,
  merchant?: Merchant,
): Promise<CampaignDataView | null> {
  const performance = await getSupabaseCampaignPerformance(campaignId, merchant);
  if (!performance) return null;
  const supabase = getSupabaseAdmin();
  const [{ data: leadsData }, { data: eventsData }, { data: deliveriesData }] = await Promise.all([
    supabase.from("leads").select("*").eq("campaign_id", campaignId),
    supabase.from("campaign_events").select("*").eq("campaign_id", campaignId),
    supabase
      .from("reward_email_deliveries")
      .select("lead_id,status,sent_at,delivered_at,error_message")
      .eq("campaign_id", campaignId),
  ]);
  const prizes = performance.prizes;
  const leads = enrichLeadRowsWithEmailDeliveries(
    ((leadsData as LeadRow[] | null) ?? [])
      .map(toLead)
      .map((lead) => ({
        ...lead,
        campaignTitle: performance.campaign.title,
        goalType: performance.campaign.goalType,
        prizeLabel: lead.prizeId
          ? prizes.find((item) => item.id === lead.prizeId)?.label ?? "Lot inconnu"
          : "Perdu",
      }))
      .sort((a, b) => b.consentTimestamp.localeCompare(a.consentTimestamp)),
    (deliveriesData as RewardEmailDeliverySummaryRow[] | null) ?? [],
  );
  const events = ((eventsData as EventRow[] | null) ?? []).map(toEvent).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { performance, leads, events };
}

export async function updateCampaignSetupInSupabase(input: CampaignSetupInput) {
  const supabase = getSupabaseAdmin();
  const campaignId = input.id ?? generateId("camp");
  const payload = {
    id: campaignId,
    merchant_id: input.merchantId,
    title: input.title,
    subtitle: input.subtitle,
    goal_type: input.goalType,
    cta_label: input.ctaLabel,
    success_metric: input.successMetric,
    target_url: input.targetUrl ?? null,
    is_active: input.isActive,
    accent_ink: input.accent.ink,
    accent_paper: input.accent.paper,
    accent_signal: input.accent.signal,
    game_type: input.gameType,
    logo_url: input.logoUrl ?? null,
    logo_size_percent: input.presentation.logo.sizePercent,
    logo_margin_bottom_px: input.presentation.logo.marginBottomPx,
    logo_align: input.presentation.logo.align,
    background_mode: input.presentation.background.mode,
    background_color: input.presentation.background.color,
    background_image_url: input.presentation.background.imageUrl || null,
    heading_text_color: input.presentation.heading.textColor,
    heading_font_size_px: input.presentation.heading.fontSizePx,
    heading_font_family: input.presentation.heading.fontFamily,
    heading_align: input.presentation.heading.align,
    button_background_color: input.presentation.button.backgroundColor,
    button_text_color: input.presentation.button.textColor,
    button_border_color: input.presentation.button.borderColor,
    button_size: input.presentation.button.size,
    wheel_rim_color: input.presentation.wheel.rimColor,
    wheel_win_color: input.presentation.wheel.winColor,
    wheel_alternate_win_color: input.presentation.wheel.alternateWinColor,
    wheel_lose_color: input.presentation.wheel.loseColor,
    wheel_alternate_lose_color: input.presentation.wheel.alternateLoseColor,
    reward_expiry_minutes: input.rewardRules.rewardExpiryMinutes,
    purchase_required: input.rewardRules.purchaseRequired,
    available_after_hours: input.rewardRules.availableAfterHours,
    availability_duration_days: input.rewardRules.availabilityDurationDays,
    is_winning_every_time: input.rewardRules.isWinningEveryTime,
  };

  const existingPrizesQuery = await supabase.from("prizes").select("*").eq("campaign_id", campaignId);
  if (existingPrizesQuery.error) {
    throw new Error(`Lecture des lots existants impossible: ${existingPrizesQuery.error.message}`);
  }

  const { data: existingPrizesData } = existingPrizesQuery;
  const existingPrizes = (existingPrizesData as PrizeRow[] | null) ?? [];
  const remainingMap = new Map(existingPrizes.map((item) => [item.id, item.remaining_quantity]));

  const upsert = await supabase.from("campaigns").upsert(payload).select("*").single();
  if (upsert.error || !upsert.data) {
    throw new Error(
      `La campagne n'a pas pu etre enregistree: ${upsert.error?.message ?? "ligne absente"}`,
    );
  }

  const deleteActions = await supabase.from("campaign_actions").delete().eq("campaign_id", campaignId);
  if (deleteActions.error) {
    throw new Error(`Suppression des actions impossible: ${deleteActions.error.message}`);
  }

  const deletePrizes = await supabase.from("prizes").delete().eq("campaign_id", campaignId);
  if (deletePrizes.error) {
    throw new Error(`Suppression des lots impossible: ${deletePrizes.error.message}`);
  }

  if (input.actions.length) {
    const actionsInsert = input.actions.map((action, index) => ({
      id: action.id || generateId("action"),
      campaign_id: campaignId,
      position: index,
      kind: action.kind,
      label: action.label,
      url: action.url,
    }));
    const actionsResult = await supabase.from("campaign_actions").insert(actionsInsert);
    if (actionsResult.error) {
      throw new Error(`Les actions n'ont pas pu etre enregistrees: ${actionsResult.error.message}`);
    }
  }

  const prizesInsert = input.prizes.map((prize) => {
    const prizeId = prize.id ?? generateId("prize");
    const remaining = remainingMap.has(prizeId)
      ? remainingMap.get(prizeId)
      : prize.totalQuantity ?? null;
    return {
      id: prizeId,
      campaign_id: campaignId,
      label: prize.label,
      total_quantity: prize.totalQuantity ?? null,
      remaining_quantity: prize.totalQuantity === null ? null : remaining ?? prize.totalQuantity ?? null,
      probability: prize.probability,
      estimated_unit_cost: prize.estimatedUnitCost,
    };
  });
  if (prizesInsert.length) {
    const prizeResult = await supabase.from("prizes").insert(prizesInsert);
    if (prizeResult.error) {
      throw new Error(`Les lots n'ont pas pu etre enregistres: ${prizeResult.error.message}`);
    }
  }

  await setCampaignLocalSettings(campaignId, {
    buttonTextSizePx: input.presentation.button.textSizePx,
    buttonIsBold: input.presentation.button.isBold,
    blockSpacingPx: input.presentation.layout.blockSpacingPx,
    logoMode: input.logoMode,
    logoText: input.logoText,
    poster: input.presentation.poster,
    email: input.presentation.email,
  });

  return campaignId;
}

export async function duplicateCampaignInSupabase(id: string, merchant: Merchant) {
  const performance = await getSupabaseCampaignPerformance(id, merchant);

  if (!performance || performance.campaign.merchantId !== merchant.id) {
    throw new Error("Campagne introuvable");
  }

  const campaignId = generateId("camp");
  await updateCampaignSetupInSupabase({
    id: campaignId,
    merchantId: merchant.id,
    title: `${performance.campaign.title} (copie)`,
    subtitle: performance.campaign.subtitle,
    goalType: performance.campaign.goalType,
    ctaLabel: performance.campaign.ctaLabel,
    successMetric: performance.campaign.successMetric,
    targetUrl: performance.campaign.targetUrl,
    isActive: false,
    accent: performance.campaign.accent,
    gameType: performance.campaign.gameType,
    logoMode: performance.campaign.logoMode,
    logoText: performance.campaign.logoText,
    logoUrl: performance.campaign.logoUrl,
    presentation: performance.campaign.presentation,
    actions: performance.campaign.actions.map((action) => ({
      ...action,
      id: generateId("action"),
    })),
    rewardRules: performance.campaign.rewardRules,
    prizes: performance.prizes.map((prize) => ({
      id: generateId("prize"),
      label: prize.label,
      totalQuantity: prize.totalQuantity,
      probability: prize.probability,
      estimatedUnitCost: prize.estimatedUnitCost,
    })),
  });

  return campaignId;
}

export async function toggleCampaignInSupabase(id: string, isActive: boolean) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("campaigns").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error("Campagne introuvable");
}

export async function deleteCampaignInSupabase(id: string) {
  const supabase = getSupabaseAdmin();

  await supabase.from("campaign_events").delete().eq("campaign_id", id);
  await supabase.from("leads").delete().eq("campaign_id", id);
  await supabase.from("campaign_actions").delete().eq("campaign_id", id);
  await supabase.from("prizes").delete().eq("campaign_id", id);

  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw new Error("Campagne introuvable");
}

export async function recordEventInSupabase(
  campaignId: string,
  eventType: CampaignEvent["eventType"],
  leadId?: string,
  metadata?: CampaignEvent["metadata"],
) {
  const supabase = getSupabaseAdmin();
  const event: EventRow = {
    id: generateId("evt"),
    campaign_id: campaignId,
    lead_id: leadId ?? null,
    event_type: eventType,
    metadata: metadata ?? {},
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("campaign_events").insert(event);
  if (error) throw new Error("Event impossible");
  return toEvent(event);
}

export async function markActionConfirmedInSupabase(leadId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .update({ action_confirmed: true })
    .eq("id", leadId)
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return toLead(data as LeadRow);
}

export async function drawForLeadInSupabase(input: DrawRequest, merchant: Merchant): Promise<DrawResult> {
  const performance = await getSupabaseCampaignPerformance(input.campaignId, merchant);
  if (!performance || !performance.campaign.isActive) throw new Error("Campagne indisponible");
  const { campaign, prizes } = performance;
  const supabase = getSupabaseAdmin();
  const leadId = generateId("lead");
  const { data, error } = await supabase
    .rpc("draw_campaign_prize_and_create_lead", {
      p_campaign_id: campaign.id,
      p_lead_id: leadId,
      p_first_name: input.firstName,
      p_email: input.email,
      p_marketing_consent: input.marketingConsent,
    })
    .single<DrawLeadRpcRow>();

  if (error || !data) {
    throw new Error(
      `Impossible de valider la participation: ${error?.message ?? "réponse vide de la RPC"}`,
    );
  }

  const lead: Lead = {
    id: data.lead_id,
    campaignId: data.campaign_id,
    firstName: data.first_name,
    email: data.email,
    marketingConsent: data.marketing_consent,
    consentTimestamp: data.consent_timestamp,
    prizeId: data.prize_id ?? undefined,
    status: data.status,
    createdAt: data.created_at,
    actionConfirmed: data.action_confirmed,
    redemptionCode: data.redemption_code ?? undefined,
    rewardAvailableAt: data.reward_available_at ?? undefined,
    rewardExpiresAt: data.reward_expires_at ?? undefined,
  };
  const prize = data.prize_id
    ? prizes.find((item) => item.id === data.prize_id) ?? null
    : null;
  const actionForVisit =
    typeof data.action_index === "number" ? campaign.actions[data.action_index] : undefined;

  return {
    lead,
    prize,
    campaign: toPublicCampaign(campaign, merchant, prizes, actionForVisit ? [actionForVisit] : []),
  };
}

export async function redeemLeadPrizeInSupabase(leadId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!data) throw new Error("Lead introuvable");
  const lead = toLead(data as LeadRow);
  if (lead.status === "redeemed") throw new Error("Lot deja retire");
  if (!lead.prizeId) throw new Error("Aucun lot a retirer");
  if (lead.rewardAvailableAt && new Date(lead.rewardAvailableAt).getTime() > Date.now()) throw new Error("Lot pas encore disponible");
  if (lead.rewardExpiresAt && new Date(lead.rewardExpiresAt).getTime() < Date.now()) {
    await supabase.from("leads").update({ status: "expired" }).eq("id", leadId);
    try {
      await recordEventInSupabase(lead.campaignId, "prize_expired", lead.id);
    } catch (error) {
      console.error("Prize expiration event logging failed", error);
    }
    throw new Error("Lot expire");
  }
  await supabase.from("leads").update({ status: "redeemed" }).eq("id", leadId);
  try {
    await recordEventInSupabase(lead.campaignId, "prize_redeemed", lead.id);
  } catch (error) {
    console.error("Prize redeemed event logging failed", error);
  }
  return { ...lead, status: "redeemed" as const };
}

export async function resetLeadPrizeInSupabase(leadId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!data) throw new Error("Lead introuvable");
  const lead = toLead(data as LeadRow);
  if (!lead.prizeId) throw new Error("Aucun lot a reinitialiser");

  const { error } = await supabase.from("leads").update({ status: "claimed" }).eq("id", leadId);
  if (error) throw new Error("Le lot n'a pas pu etre reinitialise");

  try {
    await recordEventInSupabase(lead.campaignId, "prize_reset", lead.id);
  } catch (eventError) {
    console.error("Prize reset event logging failed", eventError);
  }
  return { ...lead, status: "claimed" as const };
}

export async function getSupabaseLeadRewardEmailHistory(leadId: string, merchantId: string) {
  const supabase = getSupabaseAdmin();
  const { data: leadData, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError || !leadData) {
    throw new Error("Lead introuvable");
  }

  const lead = toLead(leadData as LeadRow);
  const { data: campaignData, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,merchant_id,title")
    .eq("id", lead.campaignId)
    .maybeSingle();

  if (campaignError || !campaignData || campaignData.merchant_id !== merchantId) {
    throw new Error("Accès refusé");
  }

  const { data: deliveryData, error: deliveryError } = await supabase
    .from("reward_email_deliveries")
    .select("*")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (deliveryError) {
    throw new Error(`Lecture du suivi e-mail impossible: ${deliveryError.message}`);
  }

  if (!deliveryData) {
    return {
      lead,
      delivery: null,
      events: [] as RewardEmailEvent[],
    };
  }

  const { data: eventsData, error: eventsError } = await supabase
    .from("reward_email_events")
    .select("*")
    .eq("reward_email_delivery_id", deliveryData.id)
    .order("created_at", { ascending: false });

  if (eventsError) {
    throw new Error(`Lecture des événements e-mail impossible: ${eventsError.message}`);
  }

  return {
    lead,
    delivery: toRewardEmailDelivery(deliveryData as RewardEmailDeliveryRow),
    events: ((eventsData as RewardEmailEventRow[] | null) ?? []).map(toRewardEmailEvent),
  };
}

export async function getSupabaseRewardEmailResendPayload(leadId: string, merchant: Merchant) {
  const history = await getSupabaseLeadRewardEmailHistory(leadId, merchant.id);
  const lead = history.lead;

  if (!lead.prizeId || !lead.redemptionCode) {
    throw new Error("Aucun lot gagnant à renvoyer");
  }

  const performance = await getSupabaseCampaignPerformance(lead.campaignId, merchant);

  if (!performance || performance.campaign.merchantId !== merchant.id) {
    throw new Error("Campagne introuvable");
  }

  const prize = performance.prizes.find((item) => item.id === lead.prizeId);

  if (!prize) {
    throw new Error("Lot introuvable");
  }

  const delivery = history.delivery;

  if (delivery?.sentAt) {
    const cooldownMs = 2 * 60 * 1000;
    const sentAtMs = new Date(delivery.sentAt).getTime();

    if (Date.now() - sentAtMs < cooldownMs) {
      throw new Error("Attendez 2 minutes avant de renvoyer un e-mail.");
    }
  }

  if (delivery?.status === "queued") {
    throw new Error("Un e-mail est déjà en cours d'envoi.");
  }

  return {
    lead,
    campaign: performance.campaign,
    merchant: performance.merchant,
    prize,
  };
}

type RewardEmailDeliveryInput = {
  campaignId: string;
  leadId: string;
  recipientEmail: string;
  senderEmail: string;
  replyToEmail?: string;
  subject: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function upsertRewardEmailDeliveryInSupabase(input: RewardEmailDeliveryInput) {
  const supabase = getSupabaseAdmin();
  const payload = {
    campaign_id: input.campaignId,
    lead_id: input.leadId,
    recipient_email: input.recipientEmail,
    sender_email: input.senderEmail,
    reply_to_email: input.replyToEmail ?? null,
    subject: input.subject,
    status: "queued",
    error_message: null,
    metadata: input.metadata ?? {},
    last_event_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("reward_email_deliveries")
    .upsert(payload, { onConflict: "lead_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Enregistrement de l'email impossible: ${error?.message ?? "ligne absente"}`);
  }

  return data as RewardEmailDeliveryRow;
}

export async function markRewardEmailSentInSupabase(
  deliveryId: string,
  resendEmailId: string | null,
) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("reward_email_deliveries")
    .update({
      resend_email_id: resendEmailId,
      status: "sent",
      sent_at: now,
      last_event_at: now,
      error_message: null,
    })
    .eq("id", deliveryId);

  if (error) {
    throw new Error(`Mise à jour de l'email envoyé impossible: ${error.message}`);
  }
}

export async function markRewardEmailFailedInSupabase(deliveryId: string, errorMessage: string) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("reward_email_deliveries")
    .update({
      status: "failed",
      error_message: errorMessage,
      last_event_at: now,
    })
    .eq("id", deliveryId);

  if (error) {
    throw new Error(`Mise à jour de l'email en échec impossible: ${error.message}`);
  }
}

function mapWebhookDeliveryStatus(event: WebhookEventPayload) {
  switch (event.type) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.suppressed":
      return "suppressed";
    case "email.failed":
      return "failed";
    default:
      return null;
  }
}

function isRewardEmailWebhookEvent(
  event: WebhookEventPayload,
): event is Extract<
  WebhookEventPayload,
  {
    data: {
      email_id: string;
    };
  }
> {
  return "data" in event && typeof event.data === "object" && event.data !== null && "email_id" in event.data;
}

export async function syncRewardEmailWebhookInSupabase(event: WebhookEventPayload) {
  const resendEmailId = isRewardEmailWebhookEvent(event) ? event.data.email_id : null;
  const deliveryStatus = mapWebhookDeliveryStatus(event);
  const supabase = getSupabaseAdmin();
  let deliveryId: string | null = null;

  if (resendEmailId) {
    const timestamp = event.created_at ?? new Date().toISOString();
    const deliveryUpdate: Record<string, string | null> = {
      resend_email_id: resendEmailId,
      last_event_at: timestamp,
    };

    if (deliveryStatus) {
      deliveryUpdate.status = deliveryStatus;
    }

    if (event.type === "email.delivered") {
      deliveryUpdate.delivered_at = timestamp;
    }

    if (event.type === "email.bounced") {
      deliveryUpdate.bounced_at = timestamp;
      deliveryUpdate.error_message = event.data.bounce.message;
    }

    if (event.type === "email.complained") {
      deliveryUpdate.complained_at = timestamp;
    }

    if (event.type === "email.failed") {
      deliveryUpdate.error_message = event.data.failed.reason;
    }

    if (event.type === "email.suppressed") {
      deliveryUpdate.error_message = event.data.suppressed.message;
    }

    const { data: deliveryData, error: deliveryError } = await supabase
      .from("reward_email_deliveries")
      .update(deliveryUpdate)
      .eq("resend_email_id", resendEmailId)
      .select("id")
      .maybeSingle();

    if (deliveryError) {
      throw new Error(`Synchronisation email impossible: ${deliveryError.message}`);
    }

    deliveryId =
      deliveryData && typeof deliveryData === "object" && "id" in deliveryData
        ? String(deliveryData.id)
        : null;
  }

  const { error: eventError } = await supabase.from("reward_email_events").insert({
    reward_email_delivery_id: deliveryId,
    resend_email_id: resendEmailId,
    event_type: event.type,
    payload: event,
  });

  if (eventError) {
    throw new Error(`Archivage du webhook email impossible: ${eventError.message}`);
  }
}

export async function getSupabaseMerchantSupportOverview(
  merchant: Merchant,
): Promise<MerchantSupportOverview> {
  const supabase = getSupabaseAdmin();
  const { data: campaignRows, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,title")
    .eq("merchant_id", merchant.id);

  if (campaignError) {
    throw new Error(`Lecture des campagnes support impossible: ${campaignError.message}`);
  }

  const campaigns = (campaignRows ?? []) as Array<{ id: string; title: string }>;
  const campaignIds = campaigns.map((item) => item.id);
  const campaignTitleById = new Map(campaigns.map((item) => [item.id, item.title]));

  if (!campaignIds.length) {
    return {
      failedEmails: [],
      webhooks: [],
      pendingClaims: [],
    };
  }

  const [failedEmailResult, pendingClaimResult, deliveryResult, webhookResult] = await Promise.all([
    supabase
      .from("reward_email_deliveries")
      .select("id,campaign_id,lead_id,recipient_email,status,error_message,last_event_at")
      .in("campaign_id", campaignIds)
      .in("status", ["failed", "bounced", "complained", "suppressed"])
      .order("last_event_at", { ascending: false })
      .limit(20),
    supabase
      .from("leads")
      .select(
        "id,campaign_id,first_name,email,prize_id,status,redemption_code,reward_available_at,reward_expires_at",
      )
      .in("campaign_id", campaignIds)
      .eq("status", "claimed")
      .not("prize_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("reward_email_deliveries")
      .select("id,campaign_id,lead_id,recipient_email,status")
      .in("campaign_id", campaignIds),
    supabase
      .from("reward_email_events")
      .select("id,reward_email_delivery_id,resend_email_id,event_type,payload,created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (failedEmailResult.error) {
    throw new Error(`Lecture des e-mails en échec impossible: ${failedEmailResult.error.message}`);
  }
  if (pendingClaimResult.error) {
    throw new Error(`Lecture des gains en attente impossible: ${pendingClaimResult.error.message}`);
  }
  if (deliveryResult.error) {
    throw new Error(`Lecture des e-mails impossible: ${deliveryResult.error.message}`);
  }
  if (webhookResult.error) {
    throw new Error(`Lecture des webhooks impossible: ${webhookResult.error.message}`);
  }

  const deliveryRows = (deliveryResult.data ?? []) as Array<{
    id: string;
    campaign_id: string;
    lead_id: string;
    recipient_email: string;
    status: RewardEmailDelivery["status"];
  }>;
  const deliveryById = new Map(deliveryRows.map((row) => [row.id, row]));

  const leadIds = new Set<string>();
  for (const row of (failedEmailResult.data ?? []) as Array<{ lead_id: string }>) {
    leadIds.add(row.lead_id);
  }
  for (const row of (pendingClaimResult.data ?? []) as Array<{ id: string }>) {
    leadIds.add(row.id);
  }
  for (const row of deliveryRows) {
    leadIds.add(row.lead_id);
  }

  const { data: leadRows, error: leadError } = await supabase
    .from("leads")
    .select("id,first_name,email,prize_id")
    .in("id", Array.from(leadIds));

  if (leadError) {
    throw new Error(`Lecture des leads support impossible: ${leadError.message}`);
  }

  const prizeIds = new Set<string>();
  for (const row of (leadRows ?? []) as Array<{ prize_id: string | null }>) {
    if (row.prize_id) {
      prizeIds.add(row.prize_id);
    }
  }
  for (const row of (pendingClaimResult.data ?? []) as Array<{ prize_id: string | null }>) {
    if (row.prize_id) {
      prizeIds.add(row.prize_id);
    }
  }

  const { data: prizeRows, error: prizeError } = await supabase
    .from("prizes")
    .select("id,label")
    .in("id", Array.from(prizeIds));

  if (prizeError) {
    throw new Error(`Lecture des dotations support impossible: ${prizeError.message}`);
  }

  const leadById = new Map(
    ((leadRows ?? []) as Array<{ id: string; first_name: string; email: string; prize_id: string | null }>).map(
      (row) => [row.id, row],
    ),
  );
  const prizeLabelById = new Map(
    ((prizeRows ?? []) as Array<{ id: string; label: string }>).map((row) => [row.id, row.label]),
  );

  const failedEmails: MerchantFailedEmailItem[] = (
    (failedEmailResult.data ?? []) as Array<{
      id: string;
      campaign_id: string;
      lead_id: string;
      recipient_email: string;
      status: RewardEmailDelivery["status"];
      error_message: string | null;
      last_event_at: string | null;
    }>
  ).map((row) => {
    const lead = leadById.get(row.lead_id);

    return {
      deliveryId: row.id,
      campaignId: row.campaign_id,
      campaignTitle: campaignTitleById.get(row.campaign_id) ?? "Campagne inconnue",
      leadId: row.lead_id,
      leadFirstName: lead?.first_name ?? "Client inconnu",
      recipientEmail: row.recipient_email,
      status: row.status,
      errorMessage: row.error_message ?? undefined,
      lastEventAt: row.last_event_at ?? new Date().toISOString(),
    };
  });

  const pendingClaims: MerchantPendingClaimItem[] = (
    (pendingClaimResult.data ?? []) as Array<{
      id: string;
      campaign_id: string;
      first_name: string;
      email: string;
      prize_id: string | null;
      status: Lead["status"];
      redemption_code: string | null;
      reward_available_at: string | null;
      reward_expires_at: string | null;
    }>
  )
    .filter((row) => row.prize_id && row.redemption_code)
    .map((row) => ({
      leadId: row.id,
      campaignId: row.campaign_id,
      campaignTitle: campaignTitleById.get(row.campaign_id) ?? "Campagne inconnue",
      firstName: row.first_name,
      email: row.email,
      prizeLabel: prizeLabelById.get(row.prize_id ?? "") ?? "Lot inconnu",
      redemptionCode: row.redemption_code ?? "",
      status: row.status,
      availableAt: row.reward_available_at ?? undefined,
      expiresAt: row.reward_expires_at ?? undefined,
    }));

  const webhookItems = (
    (webhookResult.data ?? []) as Array<{
      id: string;
      reward_email_delivery_id: string | null;
      resend_email_id: string | null;
      event_type: string;
      payload: Record<string, unknown> | null;
      created_at: string;
    }>
  )
    .map((row) => {
      const delivery = row.reward_email_delivery_id
        ? deliveryById.get(row.reward_email_delivery_id)
        : undefined;

      if (!delivery || !campaignTitleById.has(delivery.campaign_id)) {
        return null;
      }

      return {
        id: row.id,
        createdAt: row.created_at,
        eventType: row.event_type,
        resendEmailId: row.resend_email_id ?? undefined,
        campaignTitle: campaignTitleById.get(delivery.campaign_id) ?? undefined,
        recipientEmail: delivery.recipient_email,
        deliveryStatus: delivery.status,
        summary: extractWebhookSummary(row.payload),
      };
    })
    .filter((item) => item !== null);

  const webhooks: MerchantWebhookItem[] = webhookItems;

  return {
    failedEmails,
    webhooks,
    pendingClaims,
  };
}
