export const PRODUCT_ANALYTICS_VERSION = "v1";

export type ProductAnalyticsValue = string | number | boolean | null | undefined;
export type ProductAnalyticsProperties = Record<string, ProductAnalyticsValue>;

/**
 * Keep this list deliberately explicit. It prevents event names from drifting
 * between the browser and server implementations while preserving the legacy
 * names that are already used in PostHog.
 */
export type ProductAnalyticsEvent =
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
  | "lead_redeemed"
  | "login_completed"
  | "login_failed"
  | "logout_completed"
  | "marketing_link_saved"
  | "onboarding_completed"
  | "onboarding_started"
  | "onboarding_step_completed"
  | "poster_downloaded"
  | "prize_redeemed"
  | "results_campaign_selected"
  | "reward_email_failed"
  | "reward_email_sent"
  | "signup_completed"
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
