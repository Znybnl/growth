"use client";

import posthog from "posthog-js";

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
  if (!posthogKey || !posthogEnabled) {
    return;
  }

  posthog.capture(event, {
    ...sanitizeAnalyticsProperties(properties),
    source: "client",
    trackingVersion: PRODUCT_ANALYTICS_VERSION,
    environment: analyticsEnvironment(),
  });
}

export function identifyMerchantForAnalytics(merchantId: string, userId: string) {
  if (!posthogKey || !posthogEnabled || !merchantId || !userId) {
    return;
  }

  posthog.identify(`${merchantId}:${userId}`, {
    merchantId,
    merchantUserId: userId,
    trackingVersion: PRODUCT_ANALYTICS_VERSION,
    environment: analyticsEnvironment(),
  });
}

export function resetProductAnalytics() {
  if (posthogKey && posthogEnabled) {
    posthog.reset();
  }
}
