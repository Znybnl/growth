"use client";

import { hasAnalyticsConsent } from "@/lib/analytics-consent";
import { captureWithAnalyticsConsent } from "@/lib/consent-managed-analytics";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogEnabled = process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== "false";

export type MarketingAnalyticsProperties = Record<string, string | number | boolean | undefined>;

export function captureMarketingEvent(
  event: "marketing_cta_clicked" | "marketing_demo_started" | "marketing_demo_completed",
  properties?: MarketingAnalyticsProperties,
) {
  if (!posthogKey || !posthogEnabled || !hasAnalyticsConsent()) return;

  const params = new URLSearchParams(window.location.search);
  const page = window.location.pathname;
  void captureWithAnalyticsConsent((posthog) => {
    posthog.capture(event, {
      ...properties,
      page,
      utmSource: safeUtm(params.get("utm_source")),
      utmMedium: safeUtm(params.get("utm_medium")),
      utmCampaign: safeUtm(params.get("utm_campaign")),
      source: "client",
      trackingVersion: "v1",
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "local",
    }, event === "marketing_cta_clicked" ? { transport: "sendBeacon", send_instantly: true } : undefined);
  });
}

function safeUtm(value: string | null) {
  return value && /^[a-z0-9_-]{1,80}$/i.test(value) ? value : undefined;
}
