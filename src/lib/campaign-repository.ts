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
  MerchantLeadRow,
  Prize,
  PublicCampaign,
} from "@/lib/types";
import {
  getCampaignLocalSettings,
  setCampaignLocalSettings,
} from "@/lib/campaign-local-settings";
import { getSupabaseAdmin } from "@/lib/supabase";

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
  city: string | null;
  contact_name: string | null;
  phone: string | null;
  onboarding_completed: boolean | null;
  preferred_goals: string[] | null;
  diffusion_support: string[] | null;
  google_review_url: string | null;
  instagram_url: string | null;
  default_prize_cost: number | null;
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
    city: row.city ?? undefined,
    contactName: row.contact_name ?? undefined,
    phone: row.phone ?? undefined,
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

function toCampaign(
  row: CampaignRow,
  actions: ActionRow[],
  prizes: PrizeRow[],
  localSettings: CampaignLocalSettings = {},
): Campaign {
  void prizes;
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
        textSizePx: localSettings.buttonTextSizePx ?? row.button_text_size_px ?? 18,
      },
      layout: {
        blockSpacingPx: localSettings.blockSpacingPx ?? 28,
      },
      wheel: {
        rimColor: row.wheel_rim_color,
        winColor: row.wheel_win_color,
        alternateWinColor: row.wheel_alternate_win_color,
        loseColor: row.wheel_lose_color,
        alternateLoseColor: row.wheel_alternate_lose_color,
      },
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

function toPublicCampaign(campaign: Campaign, merchant: Merchant, prizes: Prize[]): PublicCampaign {
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
    prizes: prizes.map((prize) => ({ id: prize.id, label: prize.label })),
    presentation: campaign.presentation,
    actions: campaign.actions,
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
    supabase.from("campaign_actions").select("*").in("campaign_id", campaignIds),
    supabase.from("prizes").select("*").in("campaign_id", campaignIds),
    supabase.from("leads").select("*").in("campaign_id", campaignIds),
    supabase.from("campaign_events").select("*").in("campaign_id", campaignIds),
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
  const merchant =
    fallbackMerchant && fallbackMerchant.id === row.merchant_id
      ? fallbackMerchant
      : await (async () => {
          const merchantResult = await supabase
            .from("merchants")
            .select("*")
            .eq("id", row.merchant_id)
            .maybeSingle();
          return merchantResult.data ? toMerchant(merchantResult.data as MerchantRow) : null;
        })();
  if (!merchant) return null;
  const { actions, prizes, leads, events } = await fetchCampaignDependencies([campaignId]);
  const localSettings = await getCampaignLocalSettings(campaignId);
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
  const [{ data: leadsData }, { data: prizesData }] = await Promise.all([
    supabase.from("leads").select("*").in("campaign_id", campaignIds),
    supabase.from("prizes").select("id,label,campaign_id,total_quantity,remaining_quantity,probability,estimated_unit_cost,created_at").in("campaign_id", campaignIds),
  ]);
  const prizes = ((prizesData as PrizeRow[] | null) ?? []).map(toPrize);
  const campaignMap = new Map(campaigns.map((item) => [item.id, item]));
  return ((leadsData as LeadRow[] | null) ?? [])
    .map(toLead)
    .map((lead) => ({
      ...lead,
      campaignTitle: campaignMap.get(lead.campaignId)?.title ?? "Campagne",
      goalType: campaignMap.get(lead.campaignId)?.goal_type ?? "lead_capture",
      prizeLabel: prizes.find((item) => item.id === lead.prizeId)?.label ?? "Aucun lot",
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSupabaseCampaignDataView(
  campaignId: string,
  merchant?: Merchant,
): Promise<CampaignDataView | null> {
  const performance = await getSupabaseCampaignPerformance(campaignId, merchant);
  if (!performance) return null;
  const supabase = getSupabaseAdmin();
  const [{ data: leadsData }, { data: eventsData }] = await Promise.all([
    supabase.from("leads").select("*").eq("campaign_id", campaignId),
    supabase.from("campaign_events").select("*").eq("campaign_id", campaignId),
  ]);
  const prizes = performance.prizes;
  const leads = ((leadsData as LeadRow[] | null) ?? []).map(toLead).map((lead) => ({
    ...lead,
    campaignTitle: performance.campaign.title,
    goalType: performance.campaign.goalType,
    prizeLabel: prizes.find((item) => item.id === lead.prizeId)?.label ?? "Aucun lot",
  }));
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

  const { data: existingPrizesData } = await supabase.from("prizes").select("*").eq("campaign_id", campaignId);
  const existingPrizes = (existingPrizesData as PrizeRow[] | null) ?? [];
  const remainingMap = new Map(existingPrizes.map((item) => [item.id, item.remaining_quantity]));

  const upsert = await supabase.from("campaigns").upsert(payload).select("*").single();
  if (upsert.error || !upsert.data) throw new Error("La campagne n'a pas pu etre enregistree.");

  await supabase.from("campaign_actions").delete().eq("campaign_id", campaignId);
  await supabase.from("prizes").delete().eq("campaign_id", campaignId);

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
    if (actionsResult.error) throw new Error("Les actions n'ont pas pu etre enregistrees.");
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
    if (prizeResult.error) throw new Error("Les lots n'ont pas pu etre enregistres.");
  }

  await setCampaignLocalSettings(campaignId, {
    buttonTextSizePx: input.presentation.button.textSizePx,
    blockSpacingPx: input.presentation.layout.blockSpacingPx,
  });

  return campaignId;
}

export async function toggleCampaignInSupabase(id: string, isActive: boolean) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("campaigns").update({ is_active: isActive }).eq("id", id);
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

function choosePrize(prizes: Prize[], isWinningEveryTime: boolean) {
  const available = prizes.filter((prize) => prize.remainingQuantity === null || prize.remainingQuantity > 0);
  if (!available.length) return null;
  const roll = Math.random() * 100;
  let cursor = 0;

  if (isWinningEveryTime) {
    for (const prize of available) {
      cursor += Math.max(1, prize.probability);
      if (roll <= cursor) return prize;
    }
    return available[0];
  }

  for (const prize of available) {
    cursor += prize.probability;
    if (roll <= cursor) return prize;
  }
  return null;
}

export async function drawForLeadInSupabase(input: DrawRequest, merchant: Merchant): Promise<DrawResult> {
  const performance = await getSupabaseCampaignPerformance(input.campaignId, merchant);
  if (!performance || !performance.campaign.isActive) throw new Error("Campagne indisponible");
  const { campaign, prizes } = performance;
  const prize = choosePrize(prizes, campaign.rewardRules.isWinningEveryTime);
  const leadId = generateId("lead");
  const lead: Lead = {
    id: leadId,
    campaignId: campaign.id,
    firstName: input.firstName.trim(),
    email: input.email.trim().toLowerCase(),
    marketingConsent: input.marketingConsent,
    consentTimestamp: new Date().toISOString(),
    status: "lost",
    createdAt: new Date().toISOString(),
    actionConfirmed: false,
  };

  if (prize) {
    const now = Date.now();
    const availableAt = new Date(now + campaign.rewardRules.availableAfterHours * 60 * 60 * 1000);
    const expiresAt =
      campaign.rewardRules.availabilityDurationDays > 0
        ? new Date(availableAt.getTime() + campaign.rewardRules.availabilityDurationDays * 24 * 60 * 60 * 1000)
        : new Date(now + campaign.rewardRules.rewardExpiryMinutes * 60 * 1000);
    lead.prizeId = prize.id;
    lead.status = "claimed";
    lead.redemptionCode = `SORA-${Math.floor(1000 + Math.random() * 9000)}`;
    lead.rewardAvailableAt = availableAt.toISOString();
    lead.rewardExpiresAt = expiresAt.toISOString();
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("leads").insert({
    id: lead.id,
    campaign_id: lead.campaignId,
    first_name: lead.firstName,
    email: lead.email,
    phone: null,
    marketing_consent: lead.marketingConsent,
    consent_timestamp: lead.consentTimestamp,
    prize_id: lead.prizeId ?? null,
    status: lead.status,
    created_at: lead.createdAt,
    action_confirmed: lead.actionConfirmed,
    redemption_code: lead.redemptionCode ?? null,
    reward_available_at: lead.rewardAvailableAt ?? null,
    reward_expires_at: lead.rewardExpiresAt ?? null,
  });
  if (error) throw new Error("Impossible de valider la participation.");

  if (prize && prize.remainingQuantity !== null) {
    await supabase
      .from("prizes")
      .update({ remaining_quantity: Math.max((prize.remainingQuantity ?? 1) - 1, 0) })
      .eq("id", prize.id);
  }

  await recordEventInSupabase(campaign.id, "lead_created", lead.id);
  await recordEventInSupabase(campaign.id, "game_played", lead.id);
  if (prize) {
    await recordEventInSupabase(campaign.id, "prize_won", lead.id, { prizeId: prize.id });
  }

  return {
    lead,
    prize,
    campaign: toPublicCampaign(campaign, merchant, prizes),
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
    await recordEventInSupabase(lead.campaignId, "prize_expired", lead.id);
    throw new Error("Lot expire");
  }
  await supabase.from("leads").update({ status: "redeemed" }).eq("id", leadId);
  await recordEventInSupabase(lead.campaignId, "prize_redeemed", lead.id);
  return { ...lead, status: "redeemed" as const };
}
