export const PRODUCT_ANALYTICS_VERSION = "v1";

export type ProductAnalyticsValue = string | number | boolean | null | undefined;
export type ProductAnalyticsProperties = Record<string, ProductAnalyticsValue>;

/**
 * Keep this list deliberately explicit. It prevents event names from drifting
 * between the browser and server implementations while preserving the legacy
 * names that are already used in PostHog.
 */
export type ProductAnalyticsEvent =
  | "account_tab_viewed"
  | "editor_settings_saved"
  | "editor_settings_save_failed"
  | "prize_library_step_viewed"
  | "campaign_wizard_step_viewed"
  | "campaign_wizard_step_completed"
  | "campaign_wizard_validation_failed"
  | "campaign_save_failed"
  | "game_stage_viewed"
  | "game_request_failed"
  | "file_preparation_started"
  | "file_preparation_completed"
  | "file_preparation_failed"
  | "file_preparation_canceled"
  | "notification_preferences_saved"
  | "notification_preferences_save_failed"
  | "merchant_image_upload_started"
  | "merchant_image_upload_completed"
  | "merchant_image_upload_failed"
  | "account_settings_save_failed"
  | "account_settings_saved"
  | "affiliate_commission_created"
  | "affiliate_payout_marked_paid"
  | "affiliate_referral_created"
  | "billing_webhook_received"
  | "brevo_merchant_contact_synced"
  | "campaign_created"
  | "campaign_creation_started"
  | "campaign_deleted"
  | "campaign_draft_saved"
  | "campaign_published"
  | "campaign_qr_downloaded"
  | "campaign_saved"
  | "campaign_preview_opened"
  | "campaign_template_selected"
  | "checkout_completed"
  | "checkout_failed"
  | "draw_finalized"
  | "draw_started"
  | "express_redemption_completed"
  | "google_place_search_completed"
  | "google_place_selected"
  | "game_start_clicked"
  | "lead_redeemed"
  | "login_completed"
  | "login_failed"
  | "logout_completed"
  | "marketing_cta_clicked"
  | "marketing_action_clicked"
  | "marketing_demo_completed"
  | "marketing_demo_started"
  | "marketing_link_saved"
  | "onboarding_completed"
  | "onboarding_failed"
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_step_viewed"
  | "poster_downloaded"
  | "prize_redeemed"
  | "results_campaign_selected"
  | "reward_email_failed"
  | "reward_email_sent"
  | "signup_completed"
  | "signup_failed"
  | "signup_started"
  | "stripe_checkout_started"
  | "subscription_active"
  | "subscription_activated"
  | "subscription_canceled"
  | "campaign_draft_save_failed"
  | "cashier_redemption_completed";

const SENSITIVE_PROPERTY_KEY =
  /(?:email|phone|password|token|secret|pin|comment|message|companyname|username|full_name|address|force_reason)/i;

export function sanitizeAnalyticsProperties(properties?: ProductAnalyticsProperties) {
  if (!properties) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key, value]) => value !== undefined && !SENSITIVE_PROPERTY_KEY.test(key))
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value.slice(0, 120) : value,
      ]),
  );
}

export function analyticsEnvironment(): "local" | "preview" | "production" {
  const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;

  if (environment === "production") return "production";
  if (environment === "preview") return "preview";
  return "local";
}
