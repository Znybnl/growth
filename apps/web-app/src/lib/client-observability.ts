"use client";

import posthog from "posthog-js";

type ClientTelemetryAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

function classifyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("campaign_actions_pkey")) {
    return "campaign_actions_duplicate";
  }
  if (normalized.includes("duplicate key")) {
    return "duplicate_key";
  }
  return "unclassified";
}

export function captureClientError(
  event: string,
  error: unknown,
  attributes: ClientTelemetryAttributes = {},
) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  try {
    posthog.captureLog({
      body: event,
      level: "error",
      attributes: {
        event_name: event,
        error_code: classifyError(error),
        error_type: error instanceof Error ? error.name : "UnknownError",
        ...attributes,
      },
    });
  } catch {
    // Analytics and observability must never interrupt the user flow.
  }
}
