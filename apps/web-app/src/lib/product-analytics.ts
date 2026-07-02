type ProductAnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const POSTHOG_CAPTURE_ENDPOINT = "/capture/";

function getPostHogConfig() {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

  if (!apiKey) {
    return null;
  }

  return { apiKey, host };
}

function sanitizeProperties(properties?: ProductAnalyticsProperties) {
  if (!properties) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  );
}

export async function captureProductEvent(
  event: string,
  distinctId: string,
  properties?: ProductAnalyticsProperties,
) {
  const config = getPostHogConfig();

  if (!config || !distinctId) {
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_500);

    try {
      await fetch(new URL(POSTHOG_CAPTURE_ENDPOINT, config.host), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: config.apiKey,
          event,
          distinct_id: distinctId,
          properties: {
            ...sanitizeProperties(properties),
            analyticsSource: "server",
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Analytics must never block a business-critical flow.
  }
}

export function merchantDistinctId(merchantId: string, merchantUserId?: string) {
  return merchantUserId ? `${merchantId}:${merchantUserId}` : merchantId;
}
