import {
  Campaign,
  CampaignAction,
  CampaignDataView,
  CampaignEvent,
  CampaignLibraryItem,
  CampaignKpi,
  CashierRedemptionContext,
  CampaignPerformance,
  CampaignSetupInput,
  CreateDrawSessionRequest,
  CreateDrawSessionResult,
  DrawSession,
  DrawRequest,
  DrawResult,
  FinalizeDrawSessionRequest,
  Lead,
  Merchant,
  MerchantBusinessLogItem,
  MerchantDashboardData,
  MerchantFailedEmailItem,
  MerchantLeadRow,
  MerchantPendingClaimItem,
  MerchantSupportOverview,
  MerchantWebhookItem,
  Prize,
  PublicCampaign,
  PublicRedemptionContext,
  RewardEmailDelivery,
  RewardEmailEvent,
} from "@/lib/types";
import { assertMerchantBillingAccess } from "@/lib/billing";
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
  consent_timestamp: string | null;
  consent_policy_version?: string | null;
  consent_source?: string | null;
  campaign_configuration_version?: string | null;
  redeemed_at?: string | null;
  redeemed_by_user_id?: string | null;
  purchase_verified?: boolean | null;
  prize_id: string | null;
  status: Lead["status"];
  created_at: string;
  action_confirmed: boolean;
  redemption_code: string | null;
  reward_available_at: string | null;
  reward_expires_at: string | null;
  prize_label_snapshot?: string | null;
  prize_usage_conditions_snapshot?: string | null;
};

const redemptionLeadColumns = [
  "id",
  "campaign_id",
  "first_name",
  "email",
  "redeemed_at",
  "purchase_verified",
  "prize_id",
  "status",
  "redemption_code",
  "reward_available_at",
  "reward_expires_at",
  "prize_label_snapshot",
  "prize_usage_conditions_snapshot",
].join(",");

type DrawSessionRow = {
  id: string;
  campaign_id: string;
  prize_id: string | null;
  status: DrawSession["status"];
  created_at: string;
  expires_at: string;
  configuration_version?: string | null;
  configuration_snapshot?: Record<string, unknown> | null;
};

type DrawLeadRpcRow = {
  lead_id: string;
  campaign_id: string;
  first_name: string;
  email: string;
  marketing_consent: boolean;
  consent_timestamp: string | null;
  prize_id: string | null;
  status: Lead["status"];
  created_at: string;
  action_confirmed: boolean;
  redemption_code: string | null;
  reward_available_at: string | null;
  reward_expires_at: string | null;
  action_index: number;
};

type CreateDrawSessionRpcRow = {
  session_id: string;
  campaign_id: string;
  prize_id: string | null;
  status: DrawSession["status"];
  created_at: string;
  expires_at: string;
};

type FinalizeDrawSessionRpcRow = DrawLeadRpcRow;

type EventRow = {
  id: string;
  campaign_id: string;
  lead_id: string | null;
  event_type: CampaignEvent["eventType"];
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
};

type CashierRedeemRpcRow = {
  id: string;
  campaign_id: string;
  first_name: string;
  email: string;
  prize_id: string | null;
  status: Lead["status"];
  redemption_code: string | null;
  reward_available_at: string | null;
  reward_expires_at: string | null;
  redeemed_at: string | null;
  purchase_verified: boolean | null;
};

type CampaignDataSummaryRpcRow = {
  scans_count: number;
  leads_count: number;
  actions_count: number;
  games_count: number;
  wins_count: number;
  redeemed_count: number;
  estimated_spend: number;
  daily_stats: Array<{ label: string; participations: number; redeemed: number }> | null;
  action_volumes: Array<{ actionIndex: number; value: number }> | null;
};

export type CampaignDataViewOptions = {
  leadLimit?: number;
  leadOffset?: number;
  query?: string;
  emailStatus?: "attention";
};

type CampaignOverviewRpcRow = CampaignRow & {
  scans_count: number;
  leads_count: number;
  actions_count: number;
  games_count: number;
  wins_count: number;
  redeemed_count: number;
  estimated_spend: number;
};

type CampaignOverviewLeadRow = {
  campaign_id: string;
  prize_id: string | null;
  status: Lead["status"];
  marketing_consent: boolean | null;
};

type CampaignOverviewEventRow = {
  campaign_id: string;
  event_type: CampaignEvent["eventType"];
};

type CampaignOverviewPrizeRow = {
  id: string;
  campaign_id: string;
  estimated_unit_cost: number;
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
  facebook_url: string | null;
  tiktok_url: string | null;
  tripadvisor_url: string | null;
  custom_link_url: string | null;
  time_zone: string | null;
  default_prize_cost: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: Merchant["stripeSubscriptionStatus"] | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean | null;
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
  retry_count?: number;
  next_retry_at?: string | null;
  last_retry_at?: string | null;
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

function isMissingAtomicCampaignSaveRpc(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "PGRST202" ||
        error.message?.includes("save_campaign_setup") ||
        error.message?.includes("function public.save_campaign_setup")),
  );
}

function isMissingCampaignDataSummaryRpc(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "PGRST202" ||
        error.message?.includes("get_campaign_data_summary") ||
        error.message?.includes("function public.get_campaign_data_summary")),
  );
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
    facebookUrl: row.facebook_url ?? undefined,
    tiktokUrl: row.tiktok_url ?? undefined,
    tripadvisorUrl: row.tripadvisor_url ?? undefined,
    customLinkUrl: row.custom_link_url ?? undefined,
    timeZone: row.time_zone ?? "Europe/Paris",
    defaultPrizeCost: row.default_prize_cost ?? undefined,
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    stripeSubscriptionId: row.stripe_subscription_id ?? undefined,
    stripeSubscriptionStatus: row.stripe_subscription_status ?? undefined,
    trialStartDate: row.trial_start_date ?? undefined,
    trialEndDate: row.trial_end_date ?? undefined,
    subscriptionCurrentPeriodEnd: row.subscription_current_period_end ?? undefined,
    subscriptionCancelAtPeriodEnd: row.subscription_cancel_at_period_end ?? false,
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
    emailCaptureEnabled:
      localSettings.emailCaptureEnabled ??
      (row.goal_type === "lead_capture" || actions.some((action) => action.kind === "crm")),
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
        fontFamily: localSettings.headingFontFamily ?? row.heading_font_family,
        fontWeight: localSettings.headingFontWeight ?? 600,
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
        blockSpacingPx: localSettings.blockSpacingPx ?? 40,
        templateId: localSettings.gamePageTemplateId ?? "classic",
      },
      wheel: {
        ...wheel,
      },
      poster: normalizePosterSettings(
        localSettings.poster,
        createPosterSettingsDefaults({
          logoMode: row.logo_url ? "image" : "text",
          logoText: row.title,
          logoUrl: row.logo_url ?? undefined,
          logoSizePercent: row.logo_size_percent,
          logoBottomMarginPx: row.logo_margin_bottom_px,
          backgroundMode: row.background_mode,
          backgroundColor: row.background_color,
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
        localSettings.emai€Õ¸Ê⁄$z{-ÆÈ‹j◊ù.now() - sentAtMs < cooldownMs) {
      throw new Error("Attendez 2 minutes avant de renvoyer un e-mail.");
    }
  }

  if (delivery?.status === "queued") {
    throw new Error("Un e-mail est d√©j√† en cours d'envoi.");
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
      next_retry_at: null,
      error_message: null,
    })
    .eq("id", deliveryId);

  if (error) {
    throw new Error(`Mise √† jour de l'email envoy√© impossible: ${error.message}`);
  }
}

export async function markRewardEmailFailedInSupabase(deliveryId: string, errorMessage: string) {
  const { error: retryError } = await getSupabaseAdmin().rpc("schedule_reward_email_retry", {
    p_delivery_id: deliveryId,
    p_error_message: errorMessage,
  });
  if (retryError) {
    throw new Error(`Mise √† jour de l'e-mail en √©chec impossible: ${retryError.message}`);
  }
  return;

  /*
  Legacy non-retry implementation.
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
    throw new Error(`Mise √† jour de l'email en √©chec impossible: ${error.message}`);
  } */
}

export async function getSupabaseRetryableRewardEmailCandidates(limit = 20) {
  const { data, error } = await getSupabaseAdmin()
    .from("reward_email_deliveries")
    .select("lead_id,campaign_id")
    .eq("status", "failed")
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 50)));

  if (error) {
    throw new Error(`Lecture des relances e-mail impossible: ${error.message}`);
  }
  return (data ?? []) as Array<{ lead_id: string; campaign_id: string }>;
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

    if (deliveryId && event.type === "email.failed") {
      const retryReason = event.data.failed.reason || "√âchec Resend";
      await markRewardEmailFailedInSupabase(deliveryId, retryReason);
    }
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
  options: { includeAllMerchants?: boolean } = {},
): Promise<MerchantSupportOverview> {
  const supabase = getSupabaseAdmin();
  const campaignQuery = supabase
    .from("campaigns")
    .select("id,title,merchant_id");

  if (!options.includeAllMerchants) {
    campaignQuery.eq("merchant_id", merchant.id);
  }

  const { data: campaignRows, error: campaignError } = await campaignQuery;

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
      businessLogs: [],
    };
  }

  const businessLogQuery = supabase
    .from("business_logs")
    .select("id,level,event,merchant_id,campaign_id,lead_id,email,redemption_code,summary,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!options.includeAllMerchants) {
    businessLogQuery.eq("merchant_id", merchant.id);
  }

  const [failedEmailResult, pendingClaimResult, deliveryResult, webhookResult, businessLogResult] = await Promise.all([
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
    businessLogQuery,
  ]);

  if (failedEmailResult.error) {
    throw new Error(`Lecture des e-mails en √©chec impossible: ${failedEmailResult.error.message}`);
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
  const businessLogsAvailable = !businessLogResult.error;

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
  const businessLogs: MerchantBusinessLogItem[] = businessLogsAvailable
    ? (
        (businessLogResult.data ?? []) as Array<{
          id: string;
          level: MerchantBusinessLogItem["level"];
          event: string;
          merchant_id: string | null;
          campaign_id: string | null;
          lead_id: string | null;
          email: string | null;
          redemption_code: string | null;
          summary: string | null;
          created_at: string;
        }>
      ).map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        level: row.level,
        event: row.event,
        merchantId: row.merchant_id ?? undefined,
        campaignId: row.campaign_id ?? undefined,
        leadId: row.lead_id ?? undefined,
        email: row.email ?? undefined,
        redemptionCode: row.redemption_code ?? undefined,
        summary: row.summary ?? undefined,
      }))
    : [];

  return {
    failedEmails,
    webhooks,
    pendingClaims,
    businessLogs,
  };
}
