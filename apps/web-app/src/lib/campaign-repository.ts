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
        localSettings.email,
        createCampaignEmailDefaults(merchant),
      ),
    },
    actions: actions
      .sort((a, b) => a.position - b.position)
      .map((action) => ({
        id: action.id,
        kind: aÛ®·ÚÚ$z{-®éÜj×÷r‚’Ò6VçDD×2Â6ööÆF÷vä×2’°¢F‡&÷ræWrW'&÷"‚$GFVæFW¢"Ö–çWFW2fçBFR&Vçf÷–W"VâRÖÖ–Ââ"“°¢Ğ¢Ğ ¢–b†FVÆ—fW'“òç7FGW2ÓÓÒ'VWVVB"’°¢F‡&÷ræWrW'&÷"‚%VâRÖÖ–ÂW7BL:–¬:Vâ6÷W'2BvVçfö’â"“°¢Ğ ¢&WGW&â°¢ÆVBÀ¢6×–vã¢W&f÷&Öæ6Ræ6×–vâÀ¢ÖW&6†çC¢W&f÷&Öæ6RæÖW&6†çBÀ¢&—¦RÀ¢Ó°§Ğ §G—R&Wv&DVÖ–ÄFVÆ—fW'”–çWBÒ°¢6×–vä–C¢7G&–æs°¢ÆVD–C¢7G&–æs°¢&V6—–VçDVÖ–Ã¢7G&–æs°¢6VæFW$VÖ–Ã¢7G&–æs°¢&WÇ•FôVÖ–Ãó¢7G&–æs°¢7V&¦V7C¢7G&–æs°¢ÖWFFFó¢&V6÷&CÇ7G&–ærÂ7G&–ærÂçVÖ&W"Â&ööÆVâÂçVÆÃã°§Ó° ¦W‡÷'B7–æ2gVæ7F–öâW6W'E&Wv&DVÖ–ÄFVÆ—fW'”–å7W&6R†–çWC¢&Wv&DVÖ–ÄFVÆ—fW'”–çWB’°¢6öç7B7W&6RÒvWE7W&6TFÖ–â‚“°¢6öç7B–ÆöBÒ°¢6×–våö–C¢–çWBæ6×–vä–BÀ¢ÆVEö–C¢–çWBæÆVD–BÀ¢&V6—–VçEöVÖ–Ã¢–çWBç&V6—–VçDVÖ–ÂÀ¢6VæFW%öVÖ–Ã¢–çWBç6VæFW$VÖ–ÂÀ¢&WÇ•÷FõöVÖ–Ã¢–çWBç&WÇ•FôVÖ–ÂóòçVÆÂÀ¢7V&¦V7C¢–çWBç7V&¦V7BÀ¢7FGW3¢'VWVVB"À¢W'&÷%öÖW76vS¢çVÆÂÀ¢ÖWFFF¢–çWBæÖWFFFóò·ÒÀ¢Æ7EöWfVçEöC¢æWrFFR‚’çFô•4õ7G&–ær‚’À¢Ó° ¢6öç7B²FFÂW'&÷"ÒÒv—B7W&6P¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"¢çW6W'B‡–ÆöBÂ²öä6öæfÆ–7C¢&ÆVEö–B"Ò¢ç6VÆV7B‚"¢"¢ç6–ævÆR‚“° ¢–b†W'&÷"ÇÂFF’°¢F‡&÷ræWrW'&÷"†Vç&Vv—7G&VÖVçBFRÂvVÖ–Â–×÷76–&ÆS¢G¶W'&÷#òæÖW76vRóò&Æ–væR'6VçFR'Ö“°¢Ğ ¢&WGW&âFF2&Wv&DVÖ–ÄFVÆ—fW'•&÷s°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâÖ&µ&Wv&DVÖ–Å6VçD–å7W&6R€¢FVÆ—fW'”–C¢7G&–ærÀ¢&W6VæDVÖ–Ä–C¢7G&–ærÂçVÆÂÀ¢’°¢6öç7B7W&6RÒvWE7W&6TFÖ–â‚“°¢6öç7Bæ÷rÒæWrFFR‚’çFô•4õ7G&–ær‚“°¢6öç7B²W'&÷"ÒÒv—B7W&6P¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"¢çWFFR‡°¢&W6VæEöVÖ–Åö–C¢&W6VæDVÖ–Ä–BÀ¢7FGW3¢'6VçB"À¢6VçEöC¢æ÷rÀ¢Æ7EöWfVçEöC¢æ÷rÀ¢æW‡E÷&WG'•öC¢çVÆÂÀ¢W'&÷%öÖW76vS¢çVÆÂÀ¢Ò¢æW‚&–B"ÂFVÆ—fW'”–B“° ¢–b†W'&÷"’°¢F‡&÷ræWrW'&÷"†Ö—6R:¦÷W"FRÂvVÖ–ÂVçf÷œ:’–×÷76–&ÆS¢G¶W'&÷"æÖW76vWÖ“°¢Ğ§Ğ ¦W‡÷'B7–æ2gVæ7F–öâÖ&µ&Wv&DVÖ–Äf–ÆVD–å7W&6R†FVÆ—fW'”–C¢7G&–ærÂW'&÷$ÖW76vS¢7G&–ær’°¢6öç7B²W'&÷#¢&WG'”W'&÷"ÒÒv—BvWE7W&6TFÖ–â‚’ç'2‚'66†VGVÆU÷&Wv&EöVÖ–Å÷&WG'’"Â°¢öFVÆ—fW'•ö–C¢FVÆ—fW'”–BÀ¢öW'&÷%öÖW76vS¢W'&÷$ÖW76vRÀ¢Ò“°¢–b‡&WG'”W'&÷"’°¢F‡&÷ræWrW'&÷"†Ö—6R:¦÷W"FRÂvRÖÖ–ÂVâ:–6†V2–×÷76–&ÆS¢G·&WG'”W'&÷"æÖW76vWÖ“°¢Ğ¢&WGW&ã° ¢ò ¢ÆVv7’æöâ×&WG'’–×ÆVÖVçFF–öâà¢6öç7B7W&6RÒvWE7W&6TFÖ–â‚“°¢6öç7Bæ÷rÒæWrFFR‚’çFô•4õ7G&–ær‚“°¢6öç7B²W'&÷"ÒÒv—B7W&6P¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"¢çWFFR‡°¢7FGW3¢&f–ÆVB"À¢W'&÷%öÖW76vS¢W'&÷$ÖW76vRÀ¢Æ7EöWfVçEöC¢æ÷rÀ¢Ò¢æW‚&–B"ÂFVÆ—fW'”–B“° ¢–b†W'&÷"’°¢F‡&÷ræWrW'&÷"†Ö—6R:¦÷W"FRÂvVÖ–ÂVâ:–6†V2–×÷76–&ÆS¢G¶W'&÷"æÖW76vWÖ“°¢Ò¢ğ§Ğ ¦W‡÷'B7–æ2gVæ7F–öâvWE7W&6U&WG'–&ÆU&Wv&DVÖ–Ä6æF–FFW2†Æ–Ö—BÒ#’°¢6öç7B²FFÂW'&÷"ÒÒv—BvWE7W&6TFÖ–â‚¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"¢ç6VÆV7B‚&ÆVEö–BÆ6×–våö–B"¢æW‚'7FGW2"Â&f–ÆVB"¢ææ÷B‚&æW‡E÷&WG'•öB"Â&—2"ÂçVÆÂ¢æÇFR‚&æW‡E÷&WG'•öB"ÂæWrFFR‚’çFô•4õ7G&–ær‚’¢æ÷&FW"‚&æW‡E÷&WG'•öB"Â²66VæF–æs¢G'VRÒ¢æÆ–Ö—B„ÖF‚æÖ‚ƒÂÖF‚æÖ–â†Æ–Ö—BÂS’’“° ¢–b†W'&÷"’°¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2&VÆæ6W2RÖÖ–Â–×÷76–&ÆS¢G¶W'&÷"æÖW76vWÖ“°¢Ğ¢&WGW&â†FFóòµÒ’2'&“Ç²ÆVEö–C¢7G&–æs²6×–våö–C¢7G&–ærÓã°§Ğ ¦gVæ7F–öâÖvV&†öö´FVÆ—fW'•7FGW2†WfVçC¢vV&†öö´WfVçE–ÆöB’°¢7v—F6‚†WfVçBçG—R’°¢66R&VÖ–Âç6VçB# ¢&WGW&â'6VçB#°¢66R&VÖ–ÂæFVÆ—fW&VB# ¢&WGW&â&FVÆ—fW&VB#°¢66R&VÖ–Âæ&÷Væ6VB# ¢&WGW&â&&÷Væ6VB#°¢66R&VÖ–Âæ6ö×Æ–æVB# ¢&WGW&â&6ö×Æ–æVB#°¢66R&VÖ–Âç7W&W76VB# ¢&WGW&â'7W&W76VB#°¢66R&VÖ–Âæf–ÆVB# ¢&WGW&â&f–ÆVB#°¢FVfVÇC ¢&WGW&âçVÆÃ°¢Ğ§Ğ ¦gVæ7F–öâ—5&Wv&DVÖ–ÅvV&†öö´WfVçB€¢WfVçC¢vV&†öö´WfVçE–ÆöBÀ¢“¢WfVçB—2W‡G&7CÀ¢vV&†öö´WfVçE–ÆöBÀ¢°¢FF¢°¢VÖ–Åö–C¢7G&–æs°¢Ó°¢Ğ£â°¢&WGW&â&FF"–âWfVçBbbG—VöbWfVçBæFFÓÓÒ&ö&¦V7B"bbWfVçBæFFÓÒçVÆÂbb&VÖ–Åö–B"–âWfVçBæFF°§Ğ ¦W‡÷'B7–æ2gVæ7F–öâ7–æ5&Wv&DVÖ–ÅvV&†öö´–å7W&6R†WfVçC¢vV&†öö´WfVçE–ÆöB’°¢6öç7B&W6VæDVÖ–Ä–BÒ—5&Wv&DVÖ–ÅvV&†öö´WfVçB†WfVçB’òWfVçBæFFæVÖ–Åö–B¢çVÆÃ°¢6öç7BFVÆ—fW'•7FGW2ÒÖvV&†öö´FVÆ—fW'•7FGW2†WfVçB“°¢6öç7B7W&6RÒvWE7W&6TFÖ–â‚“°¢ÆWBFVÆ—fW'”–C¢7G&–ærÂçVÆÂÒçVÆÃ° ¢–b‡&W6VæDVÖ–Ä–B’°¢6öç7BF–ÖW7F×ÒWfVçBæ7&VFVEöBóòæWrFFR‚’çFô•4õ7G&–ær‚“°¢6öç7BFVÆ—fW'•WFFS¢&V6÷&CÇ7G&–ærÂ7G&–ærÂçVÆÃâÒ°¢&W6VæEöVÖ–Åö–C¢&W6VæDVÖ–Ä–BÀ¢Æ7EöWfVçEöC¢F–ÖW7F×À¢Ó° ¢–b†FVÆ—fW'•7FGW2’°¢FVÆ—fW'•WFFRç7FGW2ÒFVÆ—fW'•7FGW3°¢Ğ ¢–b†WfVçBçG—RÓÓÒ&VÖ–ÂæFVÆ—fW&VB"’°¢FVÆ—fW'•WFFRæFVÆ—fW&VEöBÒF–ÖW7F×°¢Ğ ¢–b†WfVçBçG—RÓÓÒ&VÖ–Âæ&÷Væ6VB"’°¢FVÆ—fW'•WFFRæ&÷Væ6VEöBÒF–ÖW7F×°¢FVÆ—fW'•WFFRæW'&÷%öÖW76vRÒWfVçBæFFæ&÷Væ6RæÖW76vS°¢Ğ ¢–b†WfVçBçG—RÓÓÒ&VÖ–Âæ6ö×Æ–æVB"’°¢FVÆ—fW'•WFFRæ6ö×Æ–æVEöBÒF–ÖW7F×°¢Ğ ¢–b†WfVçBçG—RÓÓÒ&VÖ–Âæf–ÆVB"’°¢FVÆ—fW'•WFFRæW'&÷%öÖW76vRÒWfVçBæFFæf–ÆVBç&V6öã°¢Ğ ¢–b†WfVçBçG—RÓÓÒ&VÖ–Âç7W&W76VB"’°¢FVÆ—fW'•WFFRæW'&÷%öÖW76vRÒWfVçBæFFç7W&W76VBæÖW76vS°¢Ğ ¢6öç7B²FF¢FVÆ—fW'”FFÂW'&÷#¢FVÆ—fW'”W'&÷"ÒÒv—B7W&6P¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"¢çWFFR†FVÆ—fW'•WFFR¢æW‚'&W6VæEöVÖ–Åö–B"Â&W6VæDVÖ–Ä–B¢ç6VÆV7B‚&–B"¢æÖ–&U6–ævÆR‚“° ¢–b†FVÆ—fW'”W'&÷"’°¢F‡&÷ræWrW'&÷"†7–æ6‡&öæ—6F–öâVÖ–Â–×÷76–&ÆS¢G¶FVÆ—fW'”W'&÷"æÖW76vWÖ“°¢Ğ ¢FVÆ—fW'”–BĞ¢FVÆ—fW'”FFbbG—VöbFVÆ—fW'”FFÓÓÒ&ö&¦V7B"bb&–B"–âFVÆ—fW'”FF¢ò7G&–ær†FVÆ—fW'”FFæ–B¢¢çVÆÃ° ¢–b†FVÆ—fW'”–BbbWfVçBçG—RÓÓÒ&VÖ–Âæf–ÆVB"’°¢6öç7B&WG'•&V6öâÒWfVçBæFFæf–ÆVBç&V6öâÇÂ,8–6†V2&W6VæB#°¢v—BÖ&µ&Wv&DVÖ–Äf–ÆVD–å7W&6R†FVÆ—fW'”–BÂ&WG'•&V6öâ“°¢Ğ¢Ğ ¢6öç7B²W'&÷#¢WfVçDW'&÷"ÒÒv—B7W&6Ræg&öÒ‚'&Wv&EöVÖ–ÅöWfVçG2"’æ–ç6W'B‡°¢&Wv&EöVÖ–ÅöFVÆ—fW'•ö–C¢FVÆ—fW'”–BÀ¢&W6VæEöVÖ–Åö–C¢&W6VæDVÖ–Ä–BÀ¢WfVçE÷G—S¢WfVçBçG—RÀ¢–ÆöC¢WfVçBÀ¢Ò“° ¢–b†WfVçDW'&÷"’°¢F‡&÷ræWrW'&÷"†&6†—fvRGRvV&†öö²VÖ–Â–×÷76–&ÆS¢G¶WfVçDW'&÷"æÖW76vWÖ“°¢Ğ§Ğ ¦W‡÷'B7–æ2gVæ7F–öâvWE7W&6TÖW&6†çE7W÷'D÷fW'f–Wr€¢ÖW&6†çC¢ÖW&6†çBÀ¢÷F–öç3¢²–æ6ÇVFTÆÄÖW&6†çG3ó¢&ööÆVâÒÒ·ÒÀ¢“¢&öÖ—6SÄÖW&6†çE7W÷'D÷fW'f–Wsâ°¢6öç7B7W&6RÒvWE7W&6TFÖ–â‚“°¢6öç7B6×–våVW'’Ò7W&6P¢æg&öÒ‚&6×–vç2"¢ç6VÆV7B‚&–BÇF—FÆRÆÖW&6†çEö–B"“° ¢–b‚÷F–öç2æ–æ6ÇVFTÆÄÖW&6†çG2’°¢6×–våVW'’æW‚&ÖW&6†çEö–B"ÂÖW&6†çBæ–B“°¢Ğ ¢6öç7B²FF¢6×–vå&÷w2ÂW'&÷#¢6×–väW'&÷"ÒÒv—B6×–våVW'“° ¢–b†6×–väW'&÷"’°¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW26×væW27W÷'B–×÷76–&ÆS¢G¶6×–väW'&÷"æÖW76vWÖ“°¢Ğ ¢6öç7B6×–vç2Ò†6×–vå&÷w2óòµÒ’2'&“Ç²–C¢7G&–æs²F—FÆS¢7G&–ærÓã°¢6öç7B6×–vä–G2Ò6×–vç2æÖ‚†—FVÒ’Óâ—FVÒæ–B“°¢6öç7B6×–våF—FÆT'”–BÒæWrÖ†6×–vç2æÖ‚†—FVÒ’Óâ¶—FVÒæ–BÂ—FVÒçF—FÆUÒ’“° ¢–b‚6×–vä–G2æÆVæwF‚’°¢&WGW&â°¢f–ÆVDVÖ–Ç3¢µÒÀ¢vV&†öö·3¢µÒÀ¢VæF–æt6Æ–×3¢µÒÀ¢'W6–æW74Æöw3¢µÒÀ¢Ó°¢Ğ ¢6öç7B'W6–æW74ÆöuVW'’Ò7W&6P¢æg&öÒ‚&'W6–æW75öÆöw2"¢ç6VÆV7B‚&–BÆÆWfVÂÆWfVçBÆÖW&6†çEö–BÆ6×–våö–BÆÆVEö–BÆVÖ–ÂÇ&VFV×F–öåö6öFRÇ7VÖÖ'’Æ7&VFVEöB"¢æ÷&FW"‚&7&VFVEöB"Â²66VæF–æs¢fÇ6RÒ¢æÆ–Ö—BƒS“° ¢–b‚÷F–öç2æ–æ6ÇVFTÆÄÖW&6†çG2’°¢'W6–æW74ÆöuVW'’æW‚&ÖW&6†çEö–B"ÂÖW&6†çBæ–B“°¢Ğ ¢6öç7B¶f–ÆVDVÖ–Å&W7VÇBÂVæF–æt6Æ–Õ&W7VÇBÂFVÆ—fW'•&W7VÇBÂvV&†ööµ&W7VÇBÂ'W6–æW74Æöu&W7VÇEÒÒv—B&öÖ—6RæÆÂ…°¢7W&6P¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"¢ç6VÆV7B‚&–BÆ6×–våö–BÆÆVEö–BÇ&V6—–VçEöVÖ–ÂÇ7FGW2ÆW'&÷%öÖW76vRÆÆ7EöWfVçEöB"¢æ–â‚&6×–våö–B"Â6×–vä–G2¢æ–â‚'7FGW2"Â²&f–ÆVB"Â&&÷Væ6VB"Â&6ö×Æ–æVB"Â'7W&W76VB%Ò¢æ÷&FW"‚&Æ7EöWfVçEöB"Â²66VæF–æs¢fÇ6RÒ¢æÆ–Ö—Bƒ#’À¢7W&6P¢æg&öÒ‚&ÆVG2"¢ç6VÆV7B€¢&–BÆ6×–våö–BÆf—'7EöæÖRÆVÖ–ÂÇ&—¦Uö–BÇ7FGW2Ç&VFV×F–öåö6öFRÇ&Wv&Eöf–Æ&ÆUöBÇ&Wv&EöW‡—&W5öB"À¢¢æ–â‚&6×–våö–B"Â6×–vä–G2¢æW‚'7FGW2"Â&6Æ–ÖVB"¢ææ÷B‚'&—¦Uö–B"Â&—2"ÂçVÆÂ¢æ÷&FW"‚&7&VFVEöB"Â²66VæF–æs¢fÇ6RÒ¢æÆ–Ö—Bƒ3’À¢7W&6P¢æg&öÒ‚'&Wv&EöVÖ–ÅöFVÆ—fW&–W2"¢ç6VÆV7B‚&–BÆ6×–våö–BÆÆVEö–BÇ&V6—–VçEöVÖ–ÂÇ7FGW2"¢æ–â‚&6×–våö–B"Â6×–vä–G2’À¢7W&6P¢æg&öÒ‚'&Wv&EöVÖ–ÅöWfVçG2"¢ç6VÆV7B‚&–BÇ&Wv&EöVÖ–ÅöFVÆ—fW'•ö–BÇ&W6VæEöVÖ–Åö–BÆWfVçE÷G—RÇ–ÆöBÆ7&VFVEöB"¢æ÷&FW"‚&7&VFVEöB"Â²66VæF–æs¢fÇ6RÒ¢æÆ–Ö—Bƒ3’À¢'W6–æW74ÆöuVW'’À¢Ò“° ¢–b†f–ÆVDVÖ–Å&W7VÇBæW'&÷"’°¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2RÖÖ–Ç2Vâ:–6†V2–×÷76–&ÆS¢G¶f–ÆVDVÖ–Å&W7VÇBæW'&÷"æÖW76vWÖ“°¢Ğ¢–b‡VæF–æt6Æ–Õ&W7VÇBæW'&÷"’°¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2v–ç2VâGFVçFR–×÷76–&ÆS¢G·VæF–æt6Æ–Õ&W7VÇBæW'&÷"æÖW76vWÖ“°¢Ğ¢–b†FVÆ—fW'•&W7VÇBæW'&÷"’°¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2RÖÖ–Ç2–×÷76–&ÆS¢G¶FVÆ—fW'•&W7VÇBæW'&÷"æÖW76vWÖ“°¢Ğ¢–b‡vV&†ööµ&W7VÇBæW'&÷"’°¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2vV&†öö·2–×÷76–&ÆS¢G·vV&†ööµ&W7VÇBæW'&÷"æÖW76vWÖ“°¢Ğ¢6öç7B'W6–æW74Æöw4f–Æ&ÆRÒ'W6–æW74Æöu&W7VÇBæW'&÷#° ¢6öç7BFVÆ—fW'•&÷w2Ò†FVÆ—fW'•&W7VÇBæFFóòµÒ’2'&“Ç°¢–C¢7G&–æs°¢6×–våö–C¢7G&–æs°¢ÆVEö–C¢7G&–æs°¢&V6—–VçEöVÖ–Ã¢7G&–æs°¢7FGW3¢&Wv&DVÖ–ÄFVÆ—fW'•²'7FGW2%Ó°¢Óã°¢6öç7BFVÆ—fW'”'”–BÒæWrÖ†FVÆ—fW'•&÷w2æÖ‚‡&÷r’Óâ·&÷ræ–BÂ&÷uÒ’“° ¢6öç7BÆVD–G2ÒæWr6WCÇ7G&–æsâ‚“°¢f÷"†6öç7B&÷röb†f–ÆVDVÖ–Å&W7VÇBæFFóòµÒ’2'&“Ç²ÆVEö–C¢7G&–ærÓâ’°¢ÆVD–G2æFB‡&÷ræÆVEö–B“°¢Ğ¢f÷"†6öç7B&÷röb‡VæF–æt6Æ–Õ&W7VÇBæFFóòµÒ’2'&“Ç²–C¢7G&–ærÓâ’°¢ÆVD–G2æFB‡&÷ræ–B“°¢Ğ¢f÷"†6öç7B&÷röbFVÆ—fW'•&÷w2’°¢ÆVD–G2æFB‡&÷ræÆVEö–B“°¢Ğ ¢6öç7B²FF¢ÆVE&÷w2ÂW'&÷#¢ÆVDW'&÷"ÒÒv—B7W&6P¢æg&öÒ‚&ÆVG2"¢ç6VÆV7B‚&–BÆf—'7EöæÖRÆVÖ–ÂÇ&—¦Uö–B"¢æ–â‚&–B"Â'&’æg&öÒ†ÆVD–G2’“° ¢–b†ÆVDW'&÷"’°¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2ÆVG27W÷'B–×÷76–&ÆS¢G¶ÆVDW'&÷"æÖW76vWÖ“°¢Ğ ¢6öç7B&—¦T–G2ÒæWr6WCÇ7G&–æsâ‚“°¢f÷"†6öç7B&÷röb†ÆVE&÷w2óòµÒ’2'&“Ç²&—¦Uö–C¢7G&–ærÂçVÆÂÓâ’°¢–b‡&÷rç&—¦Uö–B’°¢&—¦T–G2æFB‡&÷rç&—¦Uö–B“°¢Ğ¢Ğ¢f÷"†6öç7B&÷röb‡VæF–æt6Æ–Õ&W7VÇBæFFóòµÒ’2'&“Ç²&—¦Uö–C¢7G&–ærÂçVÆÂÓâ’°¢–b‡&÷rç&—¦Uö–B’°¢&—¦T–G2æFB‡&÷rç&—¦Uö–B“°¢Ğ¢Ğ ¢6öç7B²FF¢&—¦U&÷w2ÂW'&÷#¢&—¦TW'&÷"ÒÒv—B7W&6P¢æg&öÒ‚'&—¦W2"¢ç6VÆV7B‚&–BÆÆ&VÂ"¢æ–â‚&–B"Â'&’æg&öÒ‡&—¦T–G2’“° ¢–b‡&—¦TW'&÷"’°¢F‡&÷ræWrW'&÷"†ÆV7GW&RFW2F÷FF–öç27W÷'B–×÷76–&ÆS¢G·&—¦TW'&÷"æÖW76vWÖ“°¢Ğ ¢6öç7BÆVD'”–BÒæWrÖ€¢‚†ÆVE&÷w2óòµÒ’2'&“Ç²–C¢7G&–æs²f—'7EöæÖS¢7G&–æs²VÖ–Ã¢7G&–æs²&—¦Uö–C¢7G&–ærÂçVÆÂÓâ’æÖ€¢‡&÷r’Óâ·&÷ræ–BÂ&÷uÒÀ¢’À¢“°¢6öç7B&—¦TÆ&VÄ'”–BÒæWrÖ€¢‚‡&—¦U&÷w2óòµÒ’2'&“Ç²–C¢7G&–æs²Æ&VÃ¢7G&–ærÓâ’æÖ‚‡&÷r’Óâ·&÷ræ–BÂ&÷ræÆ&VÅÒ’À¢“° ¢6öç7Bf–ÆVDVÖ–Ç3¢ÖW&6†çDf–ÆVDVÖ–Ä—FVÕµÒÒ€¢†f–ÆVDVÖ–Å&W7VÇBæFFóòµÒ’2'&“Ç°¢–C¢7G&–æs°¢6×–våö–C¢7G&–æs°¢ÆVEö–C¢7G&–æs°¢&V6—–VçEöVÖ–Ã¢7G&–æs°¢7FGW3¢&Wv&DVÖ–ÄFVÆ—fW'•²'7FGW2%Ó°¢W'&÷%öÖW76vS¢7G&–ærÂçVÆÃ°¢Æ7EöWfVçEöC¢7G&–ærÂçVÆÃ°¢Óà¢’æÖ‚‡&÷r’Óâ°¢6öç7BÆVBÒÆVD'”–BævWB‡&÷ræÆVEö–B“° ¢&WGW&â°¢FVÆ—fW'”–C¢&÷ræ–BÀ¢6×–vä–C¢&÷ræ6×–våö–BÀ¢6×–våF—FÆS¢6×–våF—FÆT'”–BævWB‡&÷ræ6×–våö–B’óò$6×væR–æ6öæçVR"À¢ÆVD–C¢&÷ræÆVEö–BÀ¢ÆVDf—'7DæÖS¢ÆVCòæf—'7EöæÖRóò$6Æ–VçB–æ6öæçR"À¢&V6—–VçDVÖ–Ã¢&÷rç&V6—–VçEöVÖ–ÂÀ¢7FGW3¢&÷rç7FGW2À¢W'&÷$ÖW76vS¢&÷ræW'&÷%öÖW76vRóòVæFVf–æVBÀ¢Æ7DWfVçDC¢&÷ræÆ7EöWfVçEöBóòæWrFFR‚’çFô•4õ7G&–ær‚’À¢Ó°¢Ò“° ¢6öç7BVæF–æt6Æ–×3¢ÖW&6†çEVæF–æt6Æ–Ô—FVÕµÒÒ€¢‡VæF–æt6Æ–Õ&W7VÇBæFFóòµÒ’2'&“Ç°¢–C¢7G&–æs°¢6×–våö–C¢7G&–æs°¢f—'7EöæÖS¢7G&–æs°¢VÖ–Ã¢7G&–æs°¢&—¦Uö–C¢7G&–ærÂçVÆÃ°¢7FGW3¢ÆVE²'7FGW2%Ó°¢&VFV×F–öåö6öFS¢7G&–ærÂçVÆÃ°¢&Wv&Eöf–Æ&ÆUöC¢7G&–ærÂçVÆÃ°¢&Wv&EöW‡—&W5öC¢7G&–ærÂçVÆÃ°¢Óà¢¢æf–ÇFW"‚‡&÷r’Óâ&÷rç&—¦Uö–Bbb&÷rç&VFV×F–öåö6öFR¢æÖ‚‡&÷r’Óâ‡°¢ÆVD–C¢&÷ræ–BÀ¢6×–vä–C¢&÷ræ6×–våö–BÀ¢6×–våF—FÆS¢6×–våF—FÆT'”–BævWB‡&÷ræ6×–våö–B’óò$6×væR–æ6öæçVR"À¢f—'7DæÖS¢&÷ræf—'7EöæÖRÀ¢VÖ–Ã¢&÷ræVÖ–ÂÀ¢&—¦TÆ&VÃ¢&—¦TÆ&VÄ'”–BævWB‡&÷rç&—¦Uö–Bóò""’óò$Æ÷B–æ6öæçR"À¢&VFV×F–öä6öFS¢&÷rç&VFV×F–öåö6öFRóò""À¢7FGW3¢&÷rç7FGW2À¢f–Æ&ÆTC¢&÷rç&Wv&Eöf–Æ&ÆUöBóòVæFVf–æVBÀ¢W‡—&W4C¢&÷rç&Wv&EöW‡—&W5öBóòVæFVf–æVBÀ¢Ò’“° ¢6öç7BvV&†öö´—FV×2Ò€¢‡vV&†ööµ&W7VÇBæFFóòµÒ’2'&“Ç°¢–C¢7G&–æs°¢&Wv&EöVÖ–ÅöFVÆ—fW'•ö–C¢7G&–ærÂçVÆÃ°¢&W6VæEöVÖ–Åö–C¢7G&–ærÂçVÆÃ°¢WfVçE÷G—S¢7G&–æs°¢–ÆöC¢&V6÷&CÇ7G&–ærÂVæ¶æ÷vãâÂçVÆÃ°¢7&VFVEöC¢7G&–æs°¢Óà¢¢æÖ‚‡&÷r’Óâ°¢6öç7BFVÆ—fW'’Ò&÷rç&Wv&EöVÖ–ÅöFVÆ—fW'•ö–@¢òFVÆ—fW'”'”–BævWB‡&÷rç&Wv&EöVÖ–ÅöFVÆ—fW'•ö–B¢¢VæFVf–æVC° ¢–b‚FVÆ—fW'’ÇÂ6×–våF—FÆT'”–Bæ†2†FVÆ—fW'’æ6×–våö–B’’°¢&WGW&âçVÆÃ°¢Ğ ¢&WGW&â°¢–C¢&÷ræ–BÀ¢7&VFVDC¢&÷ræ7&VFVEöBÀ¢WfVçEG—S¢&÷ræWfVçE÷G—RÀ¢&W6VæDVÖ–Ä–C¢&÷rç&W6VæEöVÖ–Åö–BóòVæFVf–æVBÀ¢6×–våF—FÆS¢6×–våF—FÆT'”–BævWB†FVÆ—fW'’æ6×–våö–B’óòVæFVf–æVBÀ¢&V6—–VçDVÖ–Ã¢FVÆ—fW'’ç&V6—–VçEöVÖ–ÂÀ¢FVÆ—fW'•7FGW3¢FVÆ—fW'’ç7FGW2À¢7VÖÖ'“¢W‡G&7EvV&†ööµ7VÖÖ'’‡&÷rç–ÆöB’À¢Ó°¢Ò¢æf–ÇFW"‚†—FVÒ’Óâ—FVÒÓÒçVÆÂ“° ¢6öç7BvV&†öö·3¢ÖW&6†çEvV&†öö´—FVÕµÒÒvV&†öö´—FV×3°¢6öç7B'W6–æW74Æöw3¢ÖW&6†çD'W6–æW74Æöt—FVÕµÒÒ'W6–æW74Æöw4f–Æ&ÆP¢ò€¢†'W6–æW74Æöu&W7VÇBæFFóòµÒ’2'&“Ç°¢–C¢7G&–æs°¢ÆWfVÃ¢ÖW&6†çD'W6–æW74Æöt—FVÕ²&ÆWfVÂ%Ó°¢WfVçC¢7G&–æs°¢ÖW&6†çEö–C¢7G&–ærÂçVÆÃ°¢6×–våö–C¢7G&–ærÂçVÆÃ°¢ÆVEö–C¢7G&–ærÂçVÆÃ°¢VÖ–Ã¢7G&–ærÂçVÆÃ°¢&VFV×F–öåö6öFS¢7G&–ærÂçVÆÃ°¢7VÖÖ'“¢7G&–ærÂçVÆÃ°¢7&VFVEöC¢7G&–æs°¢Óà¢’æÖ‚‡&÷r’Óâ‡°¢–C¢&÷ræ–BÀ¢7&VFVDC¢&÷ræ7&VFVEöBÀ¢ÆWfVÃ¢&÷ræÆWfVÂÀ¢WfVçC¢&÷ræWfVçBÀ¢ÖW&6†çD–C¢&÷ræÖW&6†çEö–BóòVæFVf–æVBÀ¢6×–vä–C¢&÷ræ6×–våö–BóòVæFVf–æVBÀ¢ÆVD–C¢&÷ræÆVEö–BóòVæFVf–æVBÀ¢VÖ–Ã¢&÷ræVÖ–ÂóòVæFVf–æVBÀ¢&VFV×F–öä6öFS¢&÷rç&VFV×F–öåö6öFRóòVæFVf–æVBÀ¢7VÖÖ'“¢&÷rç7VÖÖ'’óòVæFVf–æVBÀ¢Ò’¢¢µÓ° ¢&WGW&â°¢f–ÆVDVÖ–Ç2À¢vV&†öö·2À¢VæF–æt6Æ–×2À¢'W6–æW74Æöw2À¢Ó°§Ğ