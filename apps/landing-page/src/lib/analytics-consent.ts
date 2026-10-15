// Keep synchronized with the other Okado application's analytics-consent.ts.
export const ANALYTICS_CONSENT_COOKIE = "okado_analytics_consent";
export const ANALYTICS_CONSENT_VERSION = "2026-10-15";
export const ANALYTICS_CONSENT_MAX_AGE = 180 * 24 * 60 * 60;
export const ANALYTICS_CONSENT_EVENT = "okado:analytics-consent";

export type AnalyticsChoice = "accepted" | "rejected";
export type AnalyticsConsent = {
  version: string;
  choice: AnalyticsChoice;
  decidedAt: number;
};

export function parseAnalyticsConsent(value?: string, now = Date.now()): AnalyticsConsent | null {
  try {
    const record = JSON.parse(decodeURIComponent(value ?? "")) as AnalyticsConsent;
    if (
      record.version !== ANALYTICS_CONSENT_VERSION ||
      !["accepted", "rejected"].includes(record.choice) ||
      !Number.isSafeInteger(record.decidedAt) ||
      record.decidedAt > now ||
      now - record.decidedAt >= ANALYTICS_CONSENT_MAX_AGE * 1000
    ) return null;
    return { version: record.version, choice: record.choice, decidedAt: record.decidedAt };
  } catch {
    return null;
  }
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(ANALYTICS_CONSENT_COOKIE + "="))
    ?.slice(ANALYTICS_CONSENT_COOKIE.length + 1);
  return parseAnalyticsConsent(value);
}

export function hasAnalyticsConsent(): boolean {
  return readAnalyticsConsent()?.choice === "accepted";
}

export function analyticsCookieDomain(hostname: string): string {
  return hostname === "okado.app" || hostname.endsWith(".okado.app") ? "; Domain=okado.app" : "";
}

export function saveAnalyticsConsent(choice: AnalyticsChoice): boolean {
  const record: AnalyticsConsent = {
    version: ANALYTICS_CONSENT_VERSION, choice, decidedAt: Date.now(),
  };
  try {
    document.cookie = ANALYTICS_CONSENT_COOKIE + "=" + encodeURIComponent(JSON.stringify(record))
      + "; Path=/; SameSite=Lax; Max-Age=" + ANALYTICS_CONSENT_MAX_AGE
      + analyticsCookieDomain(window.location.hostname)
      + (window.location.protocol === "https:" ? "; Secure" : "");
    return readAnalyticsConsent()?.choice === choice;
  } catch {
    return false;
  }
}
