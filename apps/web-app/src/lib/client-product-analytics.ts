"use client";

import posthog from "posthog-js";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";
import { syncAnalyticsConsent } from "@/lib/consent-managed-analytics";

import {
  analyticsEnvironment,
  PRODUCT_ANALYTICS_VERSION,
  sanitizeAnalyticsProperties,
  type ProductAnalyticsEvent,
  type ProductAnalyticsProperties,
} from "@/lib/product-analytics-events";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogEnabled = process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== "false";

export function captureClientProductEvent(
  event: ProductAnalyticsEvent,
  properties?: ProductAnalyticsProperties,
) {
  if (!posthogKey || !posthogEnabled || !hasAnalyticsConsent()) {
    return;
  }

  syncAnalyticsConsent();
  posthog.capture(event, {
    ...sanitizeAnalyticsProperties(properties),
    source: "client",
    trackingVersion: PRODUCT_ANALYTICS_VERSION,
    environment: analyticsEnvironment(),
  }, event === "signup_started" ? { transport: "sendBeacon", send_instantly: true } : undefined);
}

export function identifyMerchantForAnalytics(merchantId: string, userId: string) {
  if (!posthogKey || !posthogEnabled || !hasAnalyticsConsent() || !merchantId || !userId) {
    return;
  }

  syncAnalyticsConsent();
  // identify() calls the public capture method synchronously but exposes no
  // delivery options. Scope this adapter to that call so its single $identify
  // packet uses the SDK's immediate unload-safe transport. Keep native merging,
  // compression, consent filtering and all other capture options unchanged.
  const capture = posthog.capture;
  posthog.capture = (event, properties, options) => capture.call(
    posthog, event, properties,
    event === "$identify" ? { ...options, transport: "sendBeacon", send_instantly: true } : options,
  );
  try {
    posthog.identify(`${merchantId}:${userId}`, {
      merchantId,
      merchantUserId: userId,
      trackingVersion: PRODUCT_ANALYTICS_VERSION,
      environment: analyticsEnvironment(),
    });
  } catch {
    // Measurement must not interrupt a successful signup or login.
  } finally {
    posthog.capture = capture;
  }
}

export function resetProductAnalytics() {
  if (posthogKey && posthogEnabled && hasAnalyticsConsent()) {
    posthog.reset();
  }
}
