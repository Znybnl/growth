import { createHash } from "crypto";

import {
  assertDailyParticipationDeviceLock,
  assertPublicRateLimit,
  createDailyParticipationError,
  createPublicRateLimitError,
  getPublicClientFingerprint,
} from "@/lib/public-api";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

type PersistentRateLimitRow = {
  allowed: boolean;
  retry_after_seconds: number;
};

function hashFingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeRetryAfter(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.ceil(numeric) : 1;
}

export async function assertPersistentPublicRateLimit(
  request: Request,
  options: {
    key: string;
    limit: number;
    windowMs: number;
  },
) {
  if (!isSupabaseConfigured()) {
    assertPublicRateLimit(request, options);
    return;
  }

  const supabase = getSupabaseAdmin();
  const client = hashFingerprint(getPublicClientFingerprint(request));
  const { data, error } = await supabase.rpc("consume_public_rate_limit", {
    p_key: `${options.key}:${client}`,
    p_limit: options.limit,
    p_window_seconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
  });

  if (error) {
    throw new Error("Rate limit indisponible.");
  }

  const result = (Array.isArray(data) ? data[0] : data) as PersistentRateLimitRow | undefined;

  if (!result?.allowed) {
    throw createPublicRateLimitError(normalizeRetryAfter(result?.retry_after_seconds));
  }
}

export async function assertPersistentDailyParticipationLock(
  request: Request,
  campaignId: string,
) {
  if (!isSupabaseConfigured()) {
    assertDailyParticipationDeviceLock(request, campaignId);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("claim_daily_participation_lock", {
    p_campaign_id: campaignId.trim(),
    p_fingerprint_hash: hashFingerprint(getPublicClientFingerprint(request)),
  });

  if (error) {
    throw new Error("Contrôle de participation indisponible.");
  }

  const result = (Array.isArray(data) ? data[0] : data) as PersistentRateLimitRow | undefined;

  if (!result?.allowed) {
    const dailyError = createDailyParticipationError();
    (dailyError as Error & { retryAfterSeconds?: number }).retryAfterSeconds =
      normalizeRetryAfter(result?.retry_after_seconds);
    throw dailyError;
  }
}
