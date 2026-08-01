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
          bacÛŞvŞÚ$z{-®éÜj×–Ãó¢7G&–æs°Ğ¢7V&¦V7C¢7G&–æs°Ğ¢ÖWFFFó¢&V6÷&CÇ7G&–ærÂ7G&–ærÂçVÖ&W"Â&ööÆVâÂçVÆÃã°Ğ§Ó°Ğ Ğ¦W‡÷'B7–æ2gVæ7F–öâW6W'E&Wv&DVÖ–ÄFVÆ—fW'”–å7W&6R†–çWC¢&Wv&DVÖ–ÄFVÆ—fW'”–çWB’°Ğ¢6öç7B7W&6RÒvWE7W&6TFÖ–â‚“°Ğ¢6öç7B–ÆöBÒ°Ğ¢6×–våö–C¢–çWBæ6×–vä–BÀĞ¢ÆVEö–C¢–çWBæÆVD–BÀĞ¢&V6—–VçEöVÖ–Ã¢–çWBç&V6—–VçDVÖ–ÂÀĞ¢6VæFW%öVÖ–Ã¢–çWBç6VæFW$VÖ–ÂÀĞ¢&WÇ•÷FõöVÖ–Ã¢–çWBç&WÇ•FôVÖ–ÂóòçVÆÂÀĞ¢7V&¦V7C¢–çWBç7V&¦V7BÀĞ¢7FGW3¢'VWVVB"ÀĞ¢W'&÷%öÖW76vS¢çVÆÂÀĞ¢ÖWFFF¢–çWBæÖWFFFóò·ÒÀĞ¢Æ7EöWfVçEöC¢æWrFFR‚’çFô•4õ7G&–ær‚’ÀĞ¢Ó°Ğ Ğ¢6öç7B²FFÂW'&÷"ÒÒv—B7W&6PĞ¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"Ğ¢çW6W'B‡–ÆöBÂ²öä6öæfÆ–7C¢&ÆVEö–B"ÒĞ¢ç6VÆV7B‚"¢"Ğ¢ç6–ævÆR‚“°Ğ Ğ¢–b†W'&÷"ÇÂFF’°Ğ¢F‡&÷ræWrW'&÷"†Vç&Vv—7G&VÖVçBFRÂvVÖ–Â–×÷76–&ÆS¢G¶W'&÷#òæÖW76vRóò&Æ–væR'6VçFR'Ö“°Ğ¢ĞĞ Ğ¢&WGW&âFF2&Wv&DVÖ–ÄFVÆ—fW'•&÷s°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâÖ&µ&Wv&DVÖ–Å6VçD–å7W&6R€Ğ¢FVÆ—fW'”–C¢7G&–ærÀĞ¢&W6VæDVÖ–Ä–C¢7G&–ærÂçVÆÂÀĞ¢’°Ğ¢6öç7B7W&6RÒvWE7W&6TFÖ–â‚“°Ğ¢6öç7Bæ÷rÒæWrFFR‚’çFô•4õ7G&–ær‚“°Ğ¢6öç7B²W'&÷"ÒÒv—B7W&6PĞ¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"Ğ¢çWFFR‡°Ğ¢&W6VæEöVÖ–Åö–C¢&W6VæDVÖ–Ä–BÀĞ¢7FGW3¢'6VçB"ÀĞ¢6VçEöC¢æ÷rÀĞ¢Æ7EöWfVçEöC¢æ÷rÀĞ¢æW‡E÷&WG'•öC¢çVÆÂÀĞ¢W'&÷%öÖW76vS¢çVÆÂÀĞ¢ÒĞ¢æW‚&–B"ÂFVÆ—fW'”–B“°Ğ Ğ¢–b†W'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†Ö—6R:¦÷W"FRÂvVÖ–ÂVçf÷œ:’–×÷76–&ÆS¢G¶W'&÷"æÖW76vWÖ“°Ğ¢ĞĞ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâÖ&µ&Wv&DVÖ–Äf–ÆVD–å7W&6R†FVÆ—fW'”–C¢7G&–ærÂW'&÷$ÖW76vS¢7G&–ær’°Ğ¢6öç7B²W'&÷#¢&WG'”W'&÷"ÒÒv—BvWE7W&6TFÖ–â‚’ç'2‚'66†VGVÆU÷&Wv&EöVÖ–Å÷&WG'’"Â°Ğ¢öFVÆ—fW'•ö–C¢FVÆ—fW'”–BÀĞ¢öW'&÷%öÖW76vS¢W'&÷$ÖW76vRÀĞ¢Ò“°Ğ¢–b‡&WG'”W'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†Ö—6R:¦÷W"FRÂvRÖÖ–ÂVâ:–6†V2–×÷76–&ÆS¢G·&WG'”W'&÷"æÖW76vWÖ“°Ğ¢ĞĞ¢&WGW&ã°Ğ Ğ¢ò Ğ¢ÆVv7’æöâ×&WG'’–×ÆVÖVçFF–öâàĞ¢6öç7B7W&6RÒvWE7W&6TFÖ–â‚“°Ğ¢6öç7Bæ÷rÒæWrFFR‚’çFô•4õ7G&–ær‚“°Ğ¢6öç7B²W'&÷"ÒÒv—B7W&6PĞ¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"Ğ¢çWFFR‡°Ğ¢7FGW3¢&f–ÆVB"ÀĞ¢W'&÷%öÖW76vS¢W'&÷$ÖW76vRÀĞ¢Æ7EöWfVçEöC¢æ÷rÀĞ¢ÒĞ¢æW‚&–B"ÂFVÆ—fW'”–B“°Ğ Ğ¢–b†W'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†Ö—6R:¦÷W"FRÂvVÖ–ÂVâ:–6†V2–×÷76–&ÆS¢G¶W'&÷"æÖW76vWÖ“°Ğ¢Ò¢ğĞ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâvWE7W&6U&WG'–&ÆU&Wv&DVÖ–Ä6æF–FFW2†Æ–Ö—BÒ#’°Ğ¢6öç7B²FFÂW'&÷"ÒÒv—BvWE7W&6TFÖ–â‚Ğ¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"Ğ¢ç6VÆV7B‚&ÆVEö–BÆ6×–våö–B"Ğ¢æW‚'7FGW2"Â&f–ÆVB"Ğ¢ææ÷B‚&æW‡E÷&WG'•öB"Â&—2"ÂçVÆÂĞ¢æÇFR‚&æW‡E÷&WG'•öB"ÂæWrFFR‚’çFô•4õ7G&–ær‚’Ğ¢æ÷&FW"‚&æW‡E÷&WG'•öB"Â²66VæF–æs¢G'VRÒĞ¢æÆ–Ö—B„ÖF‚æÖ‚ƒÂÖF‚æÖ–â†Æ–Ö—BÂS’’“°Ğ Ğ¢–b†W'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2&VÆæ6W2RÖÖ–Â–×÷76–&ÆS¢G¶W'&÷"æÖW76vWÖ“°Ğ¢ĞĞ¢&WGW&â†FFóòµÒ’2'&“Ç²ÆVEö–C¢7G&–æs²6×–våö–C¢7G&–ærÓã°Ğ§ĞĞ Ğ¦gVæ7F–öâÖvV&†öö´FVÆ—fW'•7FGW2†WfVçC¢vV&†öö´WfVçE–ÆöB’°Ğ¢7v—F6‚†WfVçBçG—R’°Ğ¢66R&VÖ–Âç6VçB# Ğ¢&WGW&â'6VçB#°Ğ¢66R&VÖ–ÂæFVÆ—fW&VB# Ğ¢&WGW&â&FVÆ—fW&VB#°Ğ¢66R&VÖ–Âæ&÷Væ6VB# Ğ¢&WGW&â&&÷Væ6VB#°Ğ¢66R&VÖ–Âæ6ö×Æ–æVB# Ğ¢&WGW&â&6ö×Æ–æVB#°Ğ¢66R&VÖ–Âç7W&W76VB# Ğ¢&WGW&â'7W&W76VB#°Ğ¢66R&VÖ–Âæf–ÆVB# Ğ¢&WGW&â&f–ÆVB#°Ğ¢FVfVÇC Ğ¢&WGW&âçVÆÃ°Ğ¢ĞĞ§ĞĞ Ğ¦gVæ7F–öâ—5&Wv&DVÖ–ÅvV&†öö´WfVçB€Ğ¢WfVçC¢vV&†öö´WfVçE–ÆöBÀĞ¢“¢WfVçB—2W‡G&7CÀĞ¢vV&†öö´WfVçE–ÆöBÀĞ¢°Ğ¢FF¢°Ğ¢VÖ–Åö–C¢7G&–æs°Ğ¢Ó°Ğ¢ĞĞ£â°Ğ¢&WGW&â&FF"–âWfVçBbbG—VöbWfVçBæFFÓÓÒ&ö&¦V7B"bbWfVçBæFFÓÒçVÆÂbb&VÖ–Åö–B"–âWfVçBæFF°Ğ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâ7–æ5&Wv&DVÖ–ÅvV&†öö´–å7W&6R†WfVçC¢vV&†öö´WfVçE–ÆöB’°Ğ¢6öç7B&W6VæDVÖ–Ä–BÒ—5&Wv&DVÖ–ÅvV&†öö´WfVçB†WfVçB’òWfVçBæFFæVÖ–Åö–B¢çVÆÃ°Ğ¢6öç7BFVÆ—fW'•7FGW2ÒÖvV&†öö´FVÆ—fW'•7FGW2†WfVçB“°Ğ¢6öç7B7W&6RÒvWE7W&6TFÖ–â‚“°Ğ¢ÆWBFVÆ—fW'”–C¢7G&–ærÂçVÆÂÒçVÆÃ°Ğ Ğ¢–b‡&W6VæDVÖ–Ä–B’°Ğ¢6öç7BF–ÖW7F×ÒWfVçBæ7&VFVEöBóòæWrFFR‚’çFô•4õ7G&–ær‚“°Ğ¢6öç7BFVÆ—fW'•WFFS¢&V6÷&CÇ7G&–ærÂ7G&–ærÂçVÆÃâÒ°Ğ¢&W6VæEöVÖ–Åö–C¢&W6VæDVÖ–Ä–BÀĞ¢Æ7EöWfVçEöC¢F–ÖW7F×ÀĞ¢Ó°Ğ Ğ¢–b†FVÆ—fW'•7FGW2’°Ğ¢FVÆ—fW'•WFFRç7FGW2ÒFVÆ—fW'•7FGW3°Ğ¢ĞĞ Ğ¢–b†WfVçBçG—RÓÓÒ&VÖ–ÂæFVÆ—fW&VB"’°Ğ¢FVÆ—fW'•WFFRæFVÆ—fW&VEöBÒF–ÖW7F×°Ğ¢ĞĞ Ğ¢–b†WfVçBçG—RÓÓÒ&VÖ–Âæ&÷Væ6VB"’°Ğ¢FVÆ—fW'•WFFRæ&÷Væ6VEöBÒF–ÖW7F×°Ğ¢FVÆ—fW'•WFFRæW'&÷%öÖW76vRÒWfVçBæFFæ&÷Væ6RæÖW76vS°Ğ¢ĞĞ Ğ¢–b†WfVçBçG—RÓÓÒ&VÖ–Âæ6ö×Æ–æVB"’°Ğ¢FVÆ—fW'•WFFRæ6ö×Æ–æVEöBÒF–ÖW7F×°Ğ¢ĞĞ Ğ¢–b†WfVçBçG—RÓÓÒ&VÖ–Âæf–ÆVB"’°Ğ¢FVÆ—fW'•WFFRæW'&÷%öÖW76vRÒWfVçBæFFæf–ÆVBç&V6öã°Ğ¢ĞĞ Ğ¢–b†WfVçBçG—RÓÓÒ&VÖ–Âç7W&W76VB"’°Ğ¢FVÆ—fW'•WFFRæW'&÷%öÖW76vRÒWfVçBæFFç7W&W76VBæÖW76vS°Ğ¢ĞĞ Ğ¢6öç7B²FF¢FVÆ—fW'”FFÂW'&÷#¢FVÆ—fW'”W'&÷"ÒÒv—B7W&6PĞ¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"Ğ¢çWFFR†FVÆ—fW'•WFFRĞ¢æW‚'&W6VæEöVÖ–Åö–B"Â&W6VæDVÖ–Ä–BĞ¢ç6VÆV7B‚&–B"Ğ¢æÖ–&U6–ævÆR‚“°Ğ Ğ¢–b†FVÆ—fW'”W'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†7–æ6‡&öæ—6F–öâVÖ–Â–×÷76–&ÆS¢G¶FVÆ—fW'”W'&÷"æÖW76vWÖ“°Ğ¢ĞĞ Ğ¢FVÆ—fW'”–BĞĞ¢FVÆ—fW'”FFbbG—VöbFVÆ—fW'”FFÓÓÒ&ö&¦V7B"bb&–B"–âFVÆ—fW'”FFĞ¢ò7G&–ær†FVÆ—fW'”FFæ–BĞ¢¢çVÆÃ°Ğ Ğ¢–b†FVÆ—fW'”–BbbWfVçBçG—RÓÓÒ&VÖ–Âæf–ÆVB"’°Ğ¢6öç7B&WG'•&V6öâÒWfVçBæFFæf–ÆVBç&V6öâÇÂ,8–6†V2&W6VæB#°Ğ¢v—BÖ&µ&Wv&DVÖ–Äf–ÆVD–å7W&6R†FVÆ—fW'”–BÂ&WG'•&V6öâ“°Ğ¢ĞĞ¢ĞĞ Ğ¢6öç7B²W'&÷#¢WfVçDW'&÷"ÒÒv—B7W&6Ræg&öÒ‚'&Wv&EöVÖ–ÅöWfVçG2"’æ–ç6W'B‡°Ğ¢&Wv&EöVÖ–ÅöFVÆ—fW'•ö–C¢FVÆ—fW'”–BÀĞ¢&W6VæEöVÖ–Åö–C¢&W6VæDVÖ–Ä–BÀĞ¢WfVçE÷G—S¢WfVçBçG—RÀĞ¢–ÆöC¢WfVçBÀĞ¢Ò“°Ğ Ğ¢–b†WfVçDW'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†&6†—fvRGRvV&†öö²VÖ–Â–×÷76–&ÆS¢G¶WfVçDW'&÷"æÖW76vWÖ“°Ğ¢ĞĞ§ĞĞ Ğ¦W‡÷'B7–æ2gVæ7F–öâvWE7W&6TÖW&6†çE7W÷'D÷fW'f–Wr€Ğ¢ÖW&6†çC¢ÖW&6†çBÀĞ¢÷F–öç3¢²–æ6ÇVFTÆÄÖW&6†çG3ó¢&ööÆVâÒÒ·ÒÀĞ¢“¢&öÖ—6SÄÖW&6†çE7W÷'D÷fW'f–Wsâ°Ğ¢6öç7B7W&6RÒvWE7W&6TFÖ–â‚“°Ğ¢6öç7B6×–våVW'’Ò7W&6PĞ¢æg&öÒ‚&6×–vç2"Ğ¢ç6VÆV7B‚&–BÇF—FÆRÆÖW&6†çEö–B"“°Ğ Ğ¢–b‚÷F–öç2æ–æ6ÇVFTÆÄÖW&6†çG2’°Ğ¢6×–våVW'’æW‚&ÖW&6†çEö–B"ÂÖW&6†çBæ–B“°Ğ¢ĞĞ Ğ¢6öç7B²FF¢6×–vå&÷w2ÂW'&÷#¢6×–väW'&÷"ÒÒv—B6×–våVW'“°Ğ Ğ¢–b†6×–väW'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW26×væW27W÷'B–×÷76–&ÆS¢G¶6×–väW'&÷"æÖW76vWÖ“°Ğ¢ĞĞ Ğ¢6öç7B6×–vç2Ò†6×–vå&÷w2óòµÒ’2'&“Ç²–C¢7G&–æs²F—FÆS¢7G&–ærÓã°Ğ¢6öç7B6×–vä–G2Ò6×–vç2æÖ‚†—FVÒ’Óâ—FVÒæ–B“°Ğ¢6öç7B6×–våF—FÆT'”–BÒæWrÖ†6×–vç2æÖ‚†—FVÒ’Óâ¶—FVÒæ–BÂ—FVÒçF—FÆUÒ’“°Ğ Ğ¢–b‚6×–vä–G2æÆVæwF‚’°Ğ¢&WGW&â°Ğ¢f–ÆVDVÖ–Ç3¢µÒÀĞ¢vV&†öö·3¢µÒÀĞ¢VæF–æt6Æ–×3¢µÒÀĞ¢'W6–æW74Æöw3¢µÒÀĞ¢Ó°Ğ¢ĞĞ Ğ¢6öç7B'W6–æW74ÆöuVW'’Ò7W&6PĞ¢æg&öÒ‚&'W6–æW75öÆöw2"Ğ¢ç6VÆV7B‚&–BÆÆWfVÂÆWfVçBÆÖW&6†çEö–BÆ6×–våö–BÆÆVEö–BÆVÖ–ÂÇ&VFV×F–öåö6öFRÇ7VÖÖ'’Æ7&VFVEöB"Ğ¢æ÷&FW"‚&7&VFVEöB"Â²66VæF–æs¢fÇ6RÒĞ¢æÆ–Ö—BƒS“°Ğ Ğ¢–b‚÷F–öç2æ–æ6ÇVFTÆÄÖW&6†çG2’°Ğ¢'W6–æW74ÆöuVW'’æW‚&ÖW&6†çEö–B"ÂÖW&6†çBæ–B“°Ğ¢ĞĞ Ğ¢6öç7B¶f–ÆVDVÖ–Å&W7VÇBÂVæF–æt6Æ–Õ&W7VÇBÂFVÆ—fW'•&W7VÇBÂvV&†ööµ&W7VÇBÂ'W6–æW74Æöu&W7VÇEÒÒv—B&öÖ—6RæÆÂ…°Ğ¢7W&6PĞ¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"Ğ¢ç6VÆV7B‚&–BÆ6×–våö–BÆÆVEö–BÇ&V6—–VçEöVÖ–ÂÇ7FGW2ÆW'&÷%öÖW76vRÆÆ7EöWfVçEöB"Ğ¢æ–â‚&6×–våö–B"Â6×–vä–G2Ğ¢æ–â‚'7FGW2"Â²&f–ÆVB"Â&&÷Væ6VB"Â&6ö×Æ–æVB"Â'7W&W76VB%ÒĞ¢æ÷&FW"‚&Æ7EöWfVçEöB"Â²66VæF–æs¢fÇ6RÒĞ¢æÆ–Ö—Bƒ#’ÀĞ¢7W&6PĞ¢æg&öÒ‚&ÆVG2"Ğ¢ç6VÆV7B€Ğ¢&–BÆ6×–våö–BÆf—'7EöæÖRÆVÖ–ÂÇ&—¦Uö–BÇ7FGW2Ç&VFV×F–öåö6öFRÇ&Wv&Eöf–Æ&ÆUöBÇ&Wv&EöW‡—&W5öB"ÀĞ¢Ğ¢æ–â‚&6×–våö–B"Â6×–vä–G2Ğ¢æW‚'7FGW2"Â&6Æ–ÖVB"Ğ¢ææ÷B‚'&—¦Uö–B"Â&—2"ÂçVÆÂĞ¢æ÷&FW"‚&7&VFVEöB"Â²66VæF–æs¢fÇ6RÒĞ¢æÆ–Ö—Bƒ3’ÀĞ¢7W&6PĞ¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"Ğ¢ç6VÆV7B‚&–BÆ6×–våö–BÆÆVEö–BÇ&V6—–VçEöVÖ–ÂÇ7FGW2"Ğ¢æ–â‚&6×–våö–B"Â6×–vä–G2’ÀĞ¢7W&6PĞ¢æg&öÒ‚'&Wv&EöVÖ–ÅöWfVçG2"Ğ¢ç6VÆV7B‚&–BÇ&Wv&EöVÖ–ÅöFVÆ—fW'•ö–BÇ&W6VæEöVÖ–Åö–BÆWfVçE÷G—RÇ–ÆöBÆ7&VFVEöB"Ğ¢æ÷&FW"‚&7&VFVEöB"Â²66VæF–æs¢fÇ6RÒĞ¢æÆ–Ö—Bƒ3’ÀĞ¢'W6–æW74ÆöuVW'’ÀĞ¢Ò“°Ğ Ğ¢–b†f–ÆVDVÖ–Å&W7VÇBæW'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2RÖÖ–Ç2Vâ:–6†V2–×÷76–&ÆS¢G¶f–ÆVDVÖ–Å&W7VÇBæW'&÷"æÖW76vWÖ“°Ğ¢ĞĞ¢–b‡VæF–æt6Æ–Õ&W7VÇBæW'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2v–ç2VâGFVçFR–×÷76–&ÆS¢G·VæF–æt6Æ–Õ&W7VÇBæW'&÷"æÖW76vWÖ“°Ğ¢ĞĞ¢–b†FVÆ—fW'•&W7VÇBæW'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2RÖÖ–Ç2–×÷76–&ÆS¢G¶FVÆ—fW'•&W7VÇBæW'&÷"æÖW76vWÖ“°Ğ¢ĞĞ¢–b‡vV&†ööµ&W7VÇBæW'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2vV&†öö·2–×÷76–&ÆS¢G·vV&†ööµ&W7VÇBæW'&÷"æÖW76vWÖ“°Ğ¢ĞĞ¢6öç7B'W6–æW74Æöw4f–Æ&ÆRÒ'W6–æW74Æöu&W7VÇBæW'&÷#°Ğ Ğ¢6öç7BFVÆ—fW'•&÷w2Ò†FVÆ—fW'•&W7VÇBæFFóòµÒ’2'&“Ç°Ğ¢–C¢7G&–æs°Ğ¢6×–våö–C¢7G&–æs°Ğ¢ÆVEö–C¢7G&–æs°Ğ¢&V6—–VçEöVÖ–Ã¢7G&–æs°Ğ¢7FGW3¢&Wv&DVÖ–ÄFVÆ—fW'•²'7FGW2%Ó°Ğ¢Óã°Ğ¢6öç7BFVÆ—fW'”'”–BÒæWrÖ†FVÆ—fW'•&÷w2æÖ‚‡&÷r’Óâ·&÷ræ–BÂ&÷uÒ’“°Ğ Ğ¢6öç7BÆVD–G2ÒæWr6WCÇ7G&–æsâ‚“°Ğ¢f÷"†6öç7B&÷röb†f–ÆVDVÖ–Å&W7VÇBæFFóòµÒ’2'&“Ç²ÆVEö–C¢7G&–ærÓâ’°Ğ¢ÆVD–G2æFB‡&÷ræÆVEö–B“°Ğ¢ĞĞ¢f÷"†6öç7B&÷röb‡VæF–æt6Æ–Õ&W7VÇBæFFóòµÒ’2'&“Ç²–C¢7G&–ærÓâ’°Ğ¢ÆVD–G2æFB‡&÷ræ–B“°Ğ¢ĞĞ¢f÷"†6öç7B&÷röbFVÆ—fW'•&÷w2’°Ğ¢ÆVD–G2æFB‡&÷ræÆVEö–B“°Ğ¢ĞĞ Ğ¢6öç7B²FF¢ÆVE&÷w2ÂW'&÷#¢ÆVDW'&÷"ÒÒv—B7W&6PĞ¢æg&öÒ‚&ÆVG2"Ğ¢ç6VÆV7B‚&–BÆf—'7EöæÖRÆVÖ–ÂÇ&—¦Uö–B"Ğ¢æ–â‚&–B"Â'&’æg&öÒ†ÆVD–G2’“°Ğ Ğ¢–b†ÆVDW'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2ÆVG27W÷'B–×÷76–&ÆS¢G¶ÆVDW'&÷"æÖW76vWÖ“°Ğ¢ĞĞ Ğ¢6öç7B&—¦T–G2ÒæWr6WCÇ7G&–æsâ‚“°Ğ¢f÷"†6öç7B&÷röb†ÆVE&÷w2óòµÒ’2'&“Ç²&—¦Uö–C¢7G&–ærÂçVÆÂÓâ’°Ğ¢–b‡&÷rç&—¦Uö–B’°Ğ¢&—¦T–G2æFB‡&÷rç&—¦Uö–B“°Ğ¢ĞĞ¢ĞĞ¢f÷"†6öç7B&÷röb‡VæF–æt6Æ–Õ&W7VÇBæFFóòµÒ’2'&“Ç²&—¦Uö–C¢7G&–ærÂçVÆÂÓâ’°Ğ¢–b‡&÷rç&—¦Uö–B’°Ğ¢&—¦T–G2æFB‡&÷rç&—¦Uö–B“°Ğ¢ĞĞ¢ĞĞ Ğ¢6öç7B²FF¢&—¦U&÷w2ÂW'&÷#¢&—¦TW'&÷"ÒÒv—B7W&6PĞ¢æg&öÒ‚'&—¦W2"Ğ¢ç6VÆV7B‚&–BÆÆ&VÂ"Ğ¢æ–â‚&–B"Â'&’æg&öÒ‡&—¦T–G2’“°Ğ Ğ¢–b‡&—¦TW'&÷"’°Ğ¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2F÷FF–öç27W÷'B–×÷76–&ÆS¢G·&—¦TW'&÷"æÖW76vWÖ“°Ğ¢ĞĞ Ğ¢6öç7BÆVD'”–BÒæWrÖ€Ğ¢‚†ÆVE&÷w2óòµÒ’2'&“Ç²–C¢7G&–æs²f—'7EöæÖS¢7G&–æs²VÖ–Ã¢7G&–æs²&—¦Uö–C¢7G&–ærÂçVÆÂÓâ’æÖ€Ğ¢‡&÷r’Óâ·&÷ræ–BÂ&÷uÒÀĞ¢’ÀĞ¢“°Ğ¢6öç7B&—¦TÆ&VÄ'”–BÒæWrÖ€Ğ¢‚‡&—¦U&÷w2óòµÒ’2'&“Ç²–C¢7G&–æs²Æ&VÃ¢7G&–ærÓâ’æÖ‚‡&÷r’Óâ·&÷ræ–BÂ&÷ræÆ&VÅÒ’ÀĞ¢“°Ğ Ğ¢6öç7Bf–ÆVDVÖ–Ç3¢ÖW&6†çDf–ÆVDVÖ–Ä—FVÕµÒÒ€Ğ¢†f–ÆVDVÖ–Å&W7VÇBæFFóòµÒ’2'&“Ç°Ğ¢–C¢7G&–æs°Ğ¢6×–våö–C¢7G&–æs°Ğ¢ÆVEö–C¢7G&–æs°Ğ¢&V6—–VçEöVÖ–Ã¢7G&–æs°Ğ¢7FGW3¢&Wv&DVÖ–ÄFVÆ—fW'•²'7FGW2%Ó°Ğ¢W'&÷%öÖW76vS¢7G&–ærÂçVÆÃ°Ğ¢Æ7EöWfVçEöC¢7G&–ærÂçVÆÃ°Ğ¢ÓàĞ¢’æÖ‚‡&÷r’Óâ°Ğ¢6öç7BÆVBÒÆVD'”–BævWB‡&÷ræÆVEö–B“°Ğ Ğ¢&WGW&â°Ğ¢FVÆ—fW'”–C¢&÷ræ–BÀĞ¢6×–vä–C¢&÷ræ6×–våö–BÀĞ¢6×–våF—FÆS¢6×–våF—FÆT'”–BævWB‡&÷ræ6×–våö–B’óò$6×væR–æ6öæçVR"ÀĞ¢ÆVD–C¢&÷ræÆVEö–BÀĞ¢ÆVDf—'7DæÖS¢ÆVCòæf—'7EöæÖRóò$6Æ–VçB–æ6öæçR"ÀĞ¢&V6—–VçDVÖ–Ã¢&÷rç&V6—–VçEöVÖ–ÂÀĞ¢7FGW3¢&÷rç7FGW2ÀĞ¢W'&÷$ÖW76vS¢&÷ræW'&÷%öÖW76vRóòVæFVf–æVBÀĞ¢Æ7DWfVçDC¢&÷ræÆ7EöWfVçEöBóòæWrFFR‚’çFô•4õ7G&–ær‚’ÀĞ¢Ó°Ğ¢Ò“°Ğ Ğ¢6öç7BVæF–æt6Æ–×3¢ÖW&6†çEVæF–æt6Æ–Ô—FVÕµÒÒ€Ğ¢‡VæF–æt6Æ–Õ&W7VÇBæFFóòµÒ’2'&“Ç°Ğ¢–C¢7G&–æs°Ğ¢6×–våö–C¢7G&–æs°Ğ¢f—'7EöæÖS¢7G&–æs°Ğ¢VÖ–Ã¢7G&–æs°Ğ¢&—¦Uö–C¢7G&–ærÂçVÆÃ°Ğ¢7FGW3¢ÆVE²'7FGW2%Ó°Ğ¢&VFV×F–öåö6öFS¢7G&–ærÂçVÆÃ°Ğ¢&Wv&Eöf–Æ&ÆUöC¢7G&–ærÂçVÆÃ°Ğ¢&Wv&EöW‡—&W5öC¢7G&–ærÂçVÆÃ°Ğ¢ÓàĞ¢Ğ¢æf–ÇFW"‚‡&÷r’Óâ&÷rç&—¦Uö–Bbb&÷rç&VFV×F–öåö6öFRĞ¢æÖ‚‡&÷r’Óâ‡°Ğ¢ÆVD–C¢&÷ræ–BÀĞ¢6×–vä–C¢&÷ræ6×–våö–BÀĞ¢6×–våF—FÆS¢6×–våF—FÆT'”–BævWB‡&÷ræ6×–våö–B’óò$6×væR–æ6öæçVR"ÀĞ¢f—'7DæÖS¢&÷ræf—'7EöæÖRÀĞ¢VÖ–Ã¢&÷ræVÖ–ÂÀĞ¢&—¦TÆ&VÃ¢&—¦TÆ&VÄ'”–BævWB‡&÷rç&—¦Uö–Bóò""’óò$Æ÷B–æ6öæçR"ÀĞ¢&VFV×F–öä6öFS¢&÷rç&VFV×F–öåö6öFRóò""ÀĞ¢7FGW3¢&÷rç7FGW2ÀĞ¢f–Æ&ÆTC¢&÷rç&Wv&Eöf–Æ&ÆUöBóòVæFVf–æVBÀĞ¢W‡—&W4C¢&÷rç&Wv&EöW‡—&W5öBóòVæFVf–æVBÀĞ¢Ò’“°Ğ Ğ¢6öç7BvV&†öö´—FV×2Ò€Ğ¢‡vV&†ööµ&W7VÇBæFFóòµÒ’2'&“Ç°Ğ¢–C¢7G&–æs°Ğ¢&Wv&EöVÖ–ÅöFVÆ—fW'•ö–C¢7G&–ærÂçVÆÃ°Ğ¢&W6VæEöVÖ–Åö–C¢7G&–ærÂçVÆÃ°Ğ¢WfVçE÷G—S¢7G&–æs°Ğ¢–ÆöC¢&V6÷&CÇ7G&–ærÂVæ¶æ÷vãâÂçVÆÃ°Ğ¢7&VFVEöC¢7G&–æs°Ğ¢ÓàĞ¢Ğ¢æÖ‚‡&÷r’Óâ°Ğ¢6öç7BFVÆ—fW'’Ò&÷rç&Wv&EöVÖ–ÅöFVÆ—fW'•ö–@Ğ¢òFVÆ—fW'”'”–BævWB‡&÷rç&Wv&EöVÖ–ÅöFVÆ—fW'•ö–BĞ¢¢VæFVf–æVC°Ğ Ğ¢–b‚FVÆ—fW'’ÇÂ6×–våF—FÆT'”–Bæ†2†FVÆ—fW'’æ6×–våö–B’’°Ğ¢&WGW&âçVÆÃ°Ğ¢ĞĞ Ğ¢&WGW&â°Ğ¢–C¢&÷ræ–BÀĞ¢7&VFVDC¢&÷ræ7&VFVEöBÀĞ¢WfVçEG—S¢&÷ræWfVçE÷G—RÀĞ¢&W6VæDVÖ–Ä–C¢&÷rç&W6VæEöVÖ–Åö–BóòVæFVf–æVBÀĞ¢6×–våF—FÆS¢6×–våF—FÆT'”–BævWB†FVÆ—fW'’æ6×–våö–B’óòVæFVf–æVBÀĞ¢&V6—–VçDVÖ–Ã¢FVÆ—fW'’ç&V6—–VçEöVÖ–ÂÀĞ¢FVÆ—fW'•7FGW3¢FVÆ—fW'’ç7FGW2ÀĞ¢7VÖÖ'“¢W‡G&7EvV&†ööµ7VÖÖ'’‡&÷rç–ÆöB’ÀĞ¢Ó°Ğ¢ÒĞ¢æf–ÇFW"‚†—FVÒ’Óâ—FVÒÓÒçVÆÂ“°Ğ Ğ¢6öç7BvV&†öö·3¢ÖW&6†çEvV&†öö´—FVÕµÒÒvV&†öö´—FV×3°Ğ¢6öç7B'W6–æW74Æöw3¢ÖW&6†çD'W6–æW74Æöt—FVÕµÒÒ'W6–æW74Æöw4f–Æ&ÆPĞ¢ò€Ğ¢†'W6–æW74Æöu&W7VÇBæFFóòµÒ’2'&“Ç°Ğ¢–C¢7G&–æs°Ğ¢ÆWfVÃ¢ÖW&6†çD'W6–æW74Æöt—FVÕ²&ÆWfVÂ%Ó°Ğ¢WfVçC¢7G&–æs°Ğ¢ÖW&6†çEö–C¢7G&–ærÂçVÆÃ°Ğ¢6×–våö–C¢7G&–ærÂçVÆÃ°Ğ¢ÆVEö–C¢7G&–ærÂçVÆÃ°Ğ¢VÖ–Ã¢7G&–ærÂçVÆÃ°Ğ¢&VFV×F–öåö6öFS¢7G&–ærÂçVÆÃ°Ğ¢7VÖÖ'“¢7G&–ærÂçVÆÃ°Ğ¢7&VFVEöC¢7G&–æs°Ğ¢ÓàĞ¢’æÖ‚‡&÷r’Óâ‡°Ğ¢–C¢&÷ræ–BÀĞ¢7&VFVDC¢&÷ræ7&VFVEöBÀĞ¢ÆWfVÃ¢&÷ræÆWfVÂÀĞ¢WfVçC¢&÷ræWfVçBÀĞ¢ÖW&6†çD–C¢&÷ræÖW&6†çEö–BóòVæFVf–æVBÀĞ¢6×–vä–C¢&÷ræ6×–våö–BóòVæFVf–æVBÀĞ¢ÆVD–C¢&÷ræÆVEö–BóòVæFVf–æVBÀĞ¢VÖ–Ã¢&÷ræVÖ–ÂóòVæFVf–æVBÀĞ¢&VFV×F–öä6öFS¢&÷rç&VFV×F–öåö6öFRóòVæFVf–æVBÀĞ¢7VÖÖ'“¢&÷rç7VÖÖ'’óòVæFVf–æVBÀĞ¢Ò’Ğ¢¢µÓ°Ğ Ğ¢&WGW&â°Ğ¢f–ÆVDVÖ–Ç2ÀĞ¢vV&†öö·2ÀĞ¢VæF–æt6Æ–×2ÀĞ¢'W6–æW74Æöw2ÀĞ¢Ó°Ğ§ĞĞ