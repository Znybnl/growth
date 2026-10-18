"use client";

import posthog from "posthog-js";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";
import { syncAnalyticsConsent } from "@/lib/consent-managed-analytics";
import { merchantAnalyticsDistinctId } from "@/lib/analytics-identity";

import {
  analyticsEnvironment,
  PRODUCT_ANALYTICS_VERSION,
  sanitizeAnalyticsProperties,
  type ProductAnalyticsEvent,
  type ProductAnalyticsProperties,
} from "@/lib/product-analytics-events";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogEnabled = process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== "false";
let lastProfile: { distinctId: string; email: string } | undefined;

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
  }, event === "signup_started" || event === "login_completed" ? { transport: "sendBeacon", send_instantly: true } : undefined);
}

export function identifyMerchantForAnalytics(accountMerchantId: string, userId: string, activeMerchantId = accountMerchantId, email?: string) {
  if (!posthogKey || !posthogEnabled || !hasAnalyticsConsent() || !accountMerchantId || !userId) {
    return;
  }

  // identify() calls the public capture method synchronously but exposes no
  // delivery options. Scope this adapter to that call so its single $identify
  // packet uses the SDK's immediate unload-safe transport. Keep native merging,
  // compression, consent filtering and all other capture options unchanged.
  let capture: typeof posthog.capture | undefined;
  try {
    syncAnalyticsConsent();
    const distinctId = merchantAnalyticsDistinctId(accountMerchantId, userId);
    const currentId = posthog.get_distinct_id();
    // An identified account/legacy location must never become the anonymous
    // side of another account's identify. Existing histories remain separate.
    if (currentId !== distinctId && (posthog.get_property("$user_id") || /^merchant-[^:]+:user-[^:]+$/.test(currentId))) {
      posthog.reset();
      lastProfile = undefined;
    }
    const context = { merchantId: activeMerchantId, accountMerchantId, merchantUserId: userId };
    if (Object.entries(context).some(([key, value]) => posthog.get_property(key) !== value)) {
      posthog.register(context);
    }
    // Refresh the authenticated profile once per SDK lifecycle/email change,
    // not on every route/focus. The location remains event context.
    const profileEmail = email?.trim().toLowerCase() ?? "";
    const hasProfileEmail = profileEmail && profileEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail);
    const updateProfile = hasProfileEmail && (currentId !== distinctId || lastProfile?.distinctId !== distinctId || lastProfile.email !== profileEmail);
    capture = posthog.capture;
    const nativeCapture = capture;
    posthog.capture = (event, properties, options) => nativeCapture.call(
      posthog, event, properties,
      event === "$identify" ? { ...options, transport: "sendBeacon", send_instantly: true } : options,
    );
    if (updateProfile) {
      posthog.identify(distinctId, { email: profileEmail });
      lastProfile = { distinctId, email: profileEmail };
    } else {
      posthog.identify(distinctId);
    }
  } catch {
    // Measurement must not interrupt a successful signup or login.
  } finally {
    if (capture) posthog.capture = capture;
  }
}

export function resetProductAnalytics() {
  lastProfile = undefined;
  if (posthogKey && posthogEnabled && hasAnalyticsConsent()) {
    try { posthog.reset(); } catch { /* Logout must still complete if the SDK fails. */ }
  }
}
