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
import {
  assertSupabaseResult,
  getSupabaseAdmin,
  unwrapSupabaseResult,
} from "@/lib/supabase";
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
  purchase_required: boolean;
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
  is_preview?: boolean | null;
};

type PreviewParticipationRow = {
  id: string;
  campaign_id: string;
  session_id: string;
  first_name: string;
  email: string;
  marketing_consent: boolean;
  prize_id: string | null;
  status: Lead["status"];
  created_at: string;
  redemption_code: string | null;
  reward_available_at: string | null;
  reward_expires_at: string | null;
  redeemed_at: string | null;
  purchase_verified: boolean;
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
  stat