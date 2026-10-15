"use client";

import posthog from "posthog-js";
import {
  ANALYTICS_CONSENT_EVENT, ANALYTICS_CONSENT_VERSION,
  analyticsCookieDomain, hasAnalyticsConsent, readAnalyticsConsent, saveAnalyticsConsent,
  type AnalyticsChoice,
} from "@/lib/analytics-consent";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const isAnalyticsConfigured = Boolean(key) && process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== "false";
let initialized = false;
let started = false;
let active = false;
let previousConsent = "";

function clearAnalyticsStorage() {
  if (!key) return;
  const owned = (name: string) => name.startsWith("ph_" + key + "_") || name === "__ph_opt_in_out_" + key;
  for (const name of document.cookie.split(";").map((part) => part.trim().split("=")[0]).filter(owned)) {
    for (const domain of ["", analyticsCookieDomain(window.location.hostname)]) {
      document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax" + domain
        + (window.location.protocol === "https:" ? "; Secure" : "");
    }
  }
  for (const getStorage of [() => window.localStorage, () => window.sessionStorage]) {
    try {
      const storage = getStorage();
      for (const name of Object.keys(storage).filter(owned)) storage.removeItem(name);
    } catch { /* Storage may be blocked by browser preferences. */ }
  }
}

// URL queries, fragments, page titles and provider-generated person properties
// can contain authentication tokens or personal data. They are not analytics inputs.
const privateProperty = /email|phone|password|token|secret|pin|comment|message|name|address|reason|referrer|referring|url|title|\$set|initial|search|utm_|gclid|fbclid|msclkid/i;
export function safeAnalyticsProperties(properties: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(properties).filter(([name, value]) =>
    (name === "token" || !privateProperty.test(name)) &&
    (value === null || ["string", "number", "boolean"].includes(typeof value)),
  ).map(([name, value]) => [name, typeof value === "string" ? value.slice(0, 120) : value]));
}

export function syncAnalyticsConsent() {
  if (!isAnalyticsConfigured) return;
  if (!hasAnalyticsConsent()) {
    if (initialized && active) {
      posthog.opt_out_capturing();
      posthog.set_config({ disable_persistence: true, persistence: "memory" });
      posthog.reset(true);
      posthog.opt_out_capturing();
    }
    active = false;
    clearAnalyticsStorage();
    return;
  }

  if (!initialized) {
    posthog.init(key!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      capture_pageview: "history_change",
      capture_pageleave: true,
      request_batching: false,
      autocapture: false,
      rageclick: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_performance: false,
      disable_session_recording: true,
      enable_recording_console_log: false,
      disable_surveys: true,
      disable_product_tours: true,
      advanced_disable_flags: true,
      persistence: "cookie",
      cookie_expiration: 180,
      cross_subdomain_cookie: true,
      secure_cookie: window.location.protocol === "https:",
      person_profiles: "identified_only",
      logs: {
        serviceName: "okado-web",
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "local",
      },
      before_send: (event) => {
        if (!event || !hasAnalyticsConsent()) return null;
        const consent = readAnalyticsConsent()!;
        event.properties = {
          ...safeAnalyticsProperties(event.properties),
          source: "client",
          trackingVersion: "v1",
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "local",
          consentVersion: ANALYTICS_CONSENT_VERSION,
          consentDecidedAt: consent.decidedAt,
        };
        return event;
      },
    });
    initialized = true;
  } else if (!active) {
    posthog.set_config({ disable_persistence: false, persistence: "cookie" });
    posthog.opt_in_capturing({ captureEventName: false });
  }
  active = true;
}

export function setAnalyticsChoice(choice: AnalyticsChoice): boolean {
  if (!saveAnalyticsConsent(choice)) return false;
  syncAnalyticsConsent();
  previousConsent = JSON.stringify(readAnalyticsConsent());
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
  return true;
}

export function startConsentManagedAnalytics() {
  if (started) return;
  started = true;
  syncAnalyticsConsent();
  previousConsent = JSON.stringify(readAnalyticsConsent());
  // A shared preference can change in another tab or Okado subdomain.
  const refresh = () => {
    const nextConsent = JSON.stringify(readAnalyticsConsent());
    if (nextConsent === previousConsent) return;
    previousConsent = nextConsent;
    syncAnalyticsConsent();
    window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
  };
  window.setInterval(refresh, 1000);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
}
