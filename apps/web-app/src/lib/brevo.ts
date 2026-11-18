import { isSaasAdminEmail } from "@/lib/admin";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { getBrevoEventFailurePolicy } from "@/lib/brevo-event-retry-policy";
import { isBrevoSequenceStepDue, type BrevoSequenceStep } from "@/lib/brevo-sequence-policy";
import { readAllRows } from "@/lib/paginated-read";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { logSupportEvent } from "@/lib/support-log";
import { Merchant, MerchantUser } from "@/lib/types";

type BrevoContactAttributes = Record<string, string | number | boolean | null>;

type BrevoSyncResult = {
  attempted: number;
  synced: number;
  skipped: number;
  failed: number;
};

const BREVO_CONTACT_ENDPOINT = "https://api.brevo.com/v3/contacts";
const BREVO_EVENT_ENDPOINT = "https://api.brevo.com/v3/events";
const BREVO_TIMEOUT_MS = 2_500;

type BrevoOnboardingEventName =
  | "okado_trial_started"
  | "okado_onboarding_completed"
  | "okado_game_published"
  | "okado_first_participation"
  | "okado_first_redemption"
  | "okado_subscription_updated"
  | "okado_game_metrics_updated"
  | "okado_email_sequence_no_game_day_2"
  | "okado_email_sequence_no_game_day_7"
  | "okado_email_sequence_published_no_play_24h"
  | "okado_email_sequence_published_no_play_72h"
  | "okado_email_sequence_trial_expiry_5d_no_play"
  | "okado_email_sequence_trial_expiry_1d";

type BrevoEventProperty = string | number | boolean | null;

function parseListIds(value?: string) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function getBrevoApiKey() {
  return process.env.BREVO_API_KEY?.trim() || "";
}

function getMerchantListIds() {
  return parseListIds(process.env.BREVO_MERCHANT_LIST_ID || process.env.BREVO_LIST_ID);
}

function safelyLogBrevoEvent(
  level: "info" | "warn" | "error",
  eventName: string,
  properties: Record<string, unknown>,
) {
  try {
    logSupportEvent(level, eventName, properties);
  } catch {
    // Observability must not make an optional Brevo side effect fail.
  }
}

function sanitizeAttributeValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().slice(0, 255) || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return null;
}

function standardAttributes(input: { firstName?: string; lastName?: string }) {
  const attributes: BrevoContactAttributes = {};
  const firstName = sanitizeAttributeValue(input.firstName);
  const lastName = sanitizeAttributeValue(input.lastName);

  if (firstName) attributes.PRENOM = firstName;
  if (lastName) attributes.NOM = lastName;

  return attributes;
}

export function isBrevoConfigured() {
  return Boolean(getBrevoApiKey());
}

function onboardingEventProperties(merchant: Merchant): Record<string, BrevoEventProperty> {
  const status = merchant.stripeSubscriptionStatus ?? "none";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.okado.app").replace(/\/$/, "");

  return {
    merchant_id: merchant.id,
    merchant_name: merchant.companyName,
    industry: merchant.industry ?? null,
    city: merchant.city ?? null,
    time_zone: merchant.timeZone ?? "Europe/Paris",
    trial_start_at: merchant.trialStartDate ?? merchant.createdAt,
    trial_end_at: merchant.trialEndDate ?? null,
    subscription_status: status,
    subscription_active: status === "active",
    onboarding_completed: merchant.onboardingCompleted ?? false,
    app_url: appUrl,
    url_create_game: `${appUrl}/campaigns/new`,
    url_games: `${appUrl}/campaigns`,
    url_account: `${appUrl}/account`,
    url_login: `${appUrl}/connexion`,
    url_pricing: "https://www.okado.app/tarifs",
  };
}

function sanitizeEventProperties(input: Record<string, BrevoEventProperty>) {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, sanitizeAttributeValue(value)] as const)
      .filter(([, value]) => value !== null),
  );
}

async function postBrevoEventUnsafe(input: {
  user: MerchantUser;
  merchant: Merchant;
  eventName: BrevoOnboardingEventName;
  dedupeKey: string;
  properties?: Record<string, BrevoEventProperty>;
}) {
  const apiKey = getBrevoApiKey();
  if (!apiKey || !input.user.email || !isSupabaseConfigured()) return "skipped" as const;

  const supabase = getSupabaseAdmin();
  const eventProperties = sanitizeEventProperties({
    ...onboardingEventProperties(input.merchant),
    ...input.properties,
  });
  const { data: existing, error: existingError } = await supabase
    .from("brevo_event_deliveries")
    .select("status,attempts")
    .eq("dedupe_key", input.dedupeKey)
    .maybeSingle<{ status: string; attempts: number }>();

  if (existingError) {
    safelyLogBrevoEvent("warn", "brevo_event_ledger_read_failed", {
      merchantId: input.merchant.id,
      eventName: input.eventName,
    });
    return "failed" as const;
  }

  if (existing) return "skipped" as const;

  const attemptedAt = new Date().toISOString();
  const { error: insertError } = await supabase.from("brevo_event_deliveries").insert({
    dedupe_key: input.dedupeKey,
    merchant_id: input.merchant.id,
    merchant_user_id: input.user.id,
    event_name: input.eventName,
    event_properties: eventProperties,
    status: "processing",
    attempts: 1,
    last_attempt_at: attemptedAt,
  });
  if (insertError) {
    safelyLogBrevoEvent("error", "brevo_event_ledger_insert_failed", {
      merchantId: input.merchant.id,
      eventName: input.eventName,
      errorCode: "ledger_insert_failed",
    });
    return "failed" as const;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS);
  try {
    const response = await fetch(BREVO_EVENT_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        event_name: input.eventName,
        identifiers: { email_id: input.user.email.trim().toLowerCase() },
        event_date: new Date().toISOString(),
        event_properties: eventProperties,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const policy = getBrevoEventFailurePolicy(response.status, 1);
      await supabase.from("brevo_event_deliveries").update({
        status: policy.status,
        next_attempt_at: policy.nextAttemptAt === null
          ? null
          : new Date(Date.now() + policy.nextAttemptAt).toISOString(),
        last_error_code: policy.errorCode,
        last_error_status: response.status,
        updated_at: new Date().toISOString(),
      }).eq("dedupe_key", input.dedupeKey);
      safelyLogBrevoEvent(policy.status === "retry" ? "warn" : "error", "brevo_onboarding_event_failed", {
        merchantId: input.merchant.id,
        eventName: input.eventName,
        provider: "brevo",
        status: response.status,
        errorCode: policy.errorCode,
      });
      return "failed" as const;
    }

    await supabase.from("brevo_event_deliveries").update({
      status: "sent",
      next_attempt_at: null,
      last_error_code: null,
      last_error_status: null,
      updated_at: new Date().toISOString(),
    }).eq("dedupe_key", input.dedupeKey);
    safelyLogBrevoEvent("info", "brevo_onboarding_event_sent", {
      merchantId: input.merchant.id,
      eventName: input.eventName,
      provider: "brevo",
    });
    return "sent" as const;
  } catch {
    try {
      const policy = getBrevoEventFailurePolicy(null, 1);
      await supabase.from("brevo_event_deliveries").update({
        status: policy.status,
        next_attempt_at: null,
        last_error_code: policy.errorCode,
        updated_at: new Date().toISOString(),
      }).eq("dedupe_key", input.dedupeKey);
    } catch {
      // A ledger update failure must not escape this best-effort delivery.
    }
    safelyLogBrevoEvent("error", "brevo_onboarding_event_failed", {
      merchantId: input.merchant.id,
      eventName: input.eventName,
      provider: "brevo",
      errorCode: "network_outcome_ambiguous",
    });
    return "failed" as const;
  } finally {
    clearTimeout(timeout);
  }
}

async function postBrevoEvent(input: Parameters<typeof postBrevoEventUnsafe>[0]) {
  try {
    return await postBrevoEventUnsafe(input);
  } catch {
    safelyLogBrevoEvent("warn", "brevo_onboarding_event_failed", {
      merchantId: input.merchant.id,
      eventName: input.eventName,
      provider: "brevo",
    });
    return "failed" as const;
  }
}

const BREVO_SEQUENCE_EVENT_NAMES: Record<BrevoSequenceStep, BrevoOnboardingEventName> = {
  no_game_day_2: "okado_email_sequence_no_game_day_2",
  no_game_day_7: "okado_email_sequence_no_game_day_7",
  published_no_play_24h: "okado_email_sequence_published_no_play_24h",
  published_no_play_72h: "okado_email_sequence_published_no_play_72h",
  trial_expiry_5d_no_play: "okado_email_sequence_trial_expiry_5d_no_play",
  trial_expiry_1d: "okado_email_sequence_trial_expiry_1d",
};

/** Emits one short-lived eligibility event immediately before Brevo's email automation. */
export async function dispatchBrevoEmailDecisionEvents(limit = 50) {
  if (process.env.BREVO_EMAIL_DECISION_EVENTS_ENABLED !== "true" || !isBrevoConfigured() || !isSupabaseConfigured()) {
    return { skipped: true, processed: 0, emitted: 0, failed: 0 };
  }
  const enabledAfter = Date.parse(process.env.BREVO_EMAIL_DECISION_EVENTS_ENABLED_AFTER || "");
  if (!Number.isFinite(enabledAfter)) return { skipped: true, processed: 0, emitted: 0, failed: 0 };

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const merchantsResult = await readAllRows((offset, end) => supabase.from("merchants")
    .select("id,workspace_id,company_name,logo_text,industry,city,time_zone,onboarding_completed,trial_start_date,trial_end_date,stripe_subscription_status,created_at", { count: "exact" })
    .gte("trial_start_date", new Date(enabledAfter).toISOString())
    .gt("trial_end_date", now.toISOString())
    .order("id").range(offset, end));
  if (merchantsResult.error) throw new Error("Lecture des essais actifs impossible.");
  let processed = 0;
  let emitted = 0;
  let failed = 0;
  const stepOrder: BrevoSequenceStep[] = [
    "trial_expiry_1d", "trial_expiry_5d_no_play", "no_game_day_7", "published_no_play_72h",
    "no_game_day_2", "published_no_play_24h",
  ];

  const merchantRows = merchantsResult.data ?? [];
  const startIndex = merchantRows.length ? (Math.floor(now.getTime() / (5 * 60 * 1000)) * limit) % merchantRows.length : 0;
  const orderedMerchants = merchantRows.length
    ? [...merchantRows.slice(startIndex), ...merchantRows.slice(0, startIndex)]
    : [];
  for (const merchantRow of orderedMerchants) {
    if (processed >= limit) break;
    processed += 1;
    if (!merchantRow.trial_start_date || !merchantRow.trial_end_date || merchantRow.stripe_subscription_status === "active") continue;

    const { data: userRow, error: userError } = await supabase.from("merchant_users")
      .select("id,merchant_id,first_name,last_name,email,created_at")
      .eq("merchant_id", merchantRow.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (userError || !userRow?.email) continue;
    const { data: workspaceMerchants, error: workspaceError } = await supabase.from("merchants")
      .select("id").eq("workspace_id", merchantRow.workspace_id);
    if (workspaceError || !workspaceMerchants?.length) continue;
    const accountMerchantIds = workspaceMerchants.map((merchant) => merchant.id);
    const { data: workspace, error: workspaceBillingError } = await supabase.from("merchant_workspaces")
      .select("stripe_subscription_status").eq("id", merchantRow.workspace_id).maybeSingle();
    if (workspaceBillingError) continue;
    const subscriptionStatus = workspace?.stripe_subscription_status ?? merchantRow.stripe_subscription_status;
    if (subscriptionStatus === "active") continue;
    const { data: campaigns, error: campaignsError } = await supabase.from("campaigns")
      .select("id,is_active").in("merchant_id", accountMerchantIds);
    if (campaignsError) continue;
    const activeCampaigns = (campaigns ?? []).filter((campaign) => campaign.is_active);
    const draftCampaignCount = (campaigns ?? []).filter((campaign) => !campaign.is_active).length;
    let participationCount = 0;
    if (activeCampaigns.length) {
      const { count, error } = await supabase.from("campaign_participations")
        .select("participation_id", { count: "exact", head: true })
        .in("campaign_id", activeCampaigns.map((campaign) => campaign.id));
      if (error || count === null) continue;
      participationCount = count ?? 0;
    }

    const { data: ledger, error: ledgerError } = await supabase.from("brevo_event_deliveries")
      .select("merchant_id,event_name,event_properties,status,created_at")
      .in("merchant_id", accountMerchantIds)
      .in("event_name", ["okado_trial_started", "okado_game_published", ...Object.values(BREVO_SEQUENCE_EVENT_NAMES)])
      .order("created_at", { ascending: true });
    if (ledgerError) continue;
    const sentEvents = (ledger ?? []).filter((event) => event.status === "sent");
    const trialEvent = sentEvents.find((event) => event.event_name === "okado_trial_started" &&
      event.event_properties?.is_backfill !== true && Date.parse(event.created_at) >= enabledAfter);
    // Use the original signup merchant as the account's canonical billing/trial record.
    if (!trialEvent || trialEvent.merchant_id !== merchantRow.id) continue;
    const firstPublication = sentEvents.find((event) => event.event_name === "okado_game_published" &&
      event.event_properties?.is_backfill !== true && Date.parse(event.created_at) >= enabledAfter);
    const lastDecision = sentEvents.filter((event) => event.event_name.startsWith("okado_email_sequence_"))
      .reduce<number | null>((latest, event) => Math.max(latest ?? 0, Date.parse(event.created_at)), null);

    const merchant: Merchant = {
      id: merchantRow.id, companyName: merchantRow.company_name, logoText: merchantRow.logo_text,
      industry: merchantRow.industry ?? undefined, city: merchantRow.city ?? undefined,
      timeZone: merchantRow.time_zone ?? undefined, onboardingCompleted: merchantRow.onboarding_completed ?? false,
      trialStartDate: merchantRow.trial_start_date, trialEndDate: merchantRow.trial_end_date,
      stripeSubscriptionStatus: subscriptionStatus ?? undefined, createdAt: merchantRow.created_at,
    };
    const user: MerchantUser = {
      id: userRow.id, merchantId: userRow.merchant_id, firstName: userRow.first_name,
      lastName: userRow.last_name, email: userRow.email, password: "", createdAt: userRow.created_at,
    };

    for (const step of stepOrder) {
      const firstPublishedAt = firstPublication?.created_at ?? null;
      if (!isBrevoSequenceStepDue({
        step, trialStartedAt: merchantRow.trial_start_date, trialEndsAt: merchantRow.trial_end_date,
        subscriptionStatus, publishedGameCount: activeCampaigns.length,
        participationCount, firstPublishedAt, timeZone: merchantRow.time_zone || "Europe/Paris", now,
        previousSequenceEmailAt: lastDecision === null ? null : new Date(lastDecision).toISOString(),
      })) continue;

      const dedupeKey = `email-sequence:${merchantRow.workspace_id}:${step}`;
      const { data: existingDecision, error: decisionReadError } = await supabase.from("brevo_event_deliveries")
        .select("status").eq("dedupe_key", dedupeKey).maybeSingle();
      // Do not fall through to a lower-priority email if this decision is already pending/reviewable.
      if (decisionReadError || existingDecision) break;

      const result = await postBrevoEvent({
        merchant, user, eventName: BREVO_SEQUENCE_EVENT_NAMES[step],
        dedupeKey,
        properties: {
          email_sequence_step: step, email_sequence_eligible: true,
          decision_valid_until: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
          is_backfill: false, published_game_count: activeCampaigns.length,
          draft_game_count: draftCampaignCount, participation_count: participationCount,
        },
      });
      if (result === "sent") emitted += 1;
      else if (result === "failed") failed += 1;
      // A single message is eligible per account and worker pass; expiry reminders win.
      if (result === "sent" || result === "failed") break;
    }
  }
  return { skipped: false, processed, emitted, failed };
}

type BrevoRetryRow = {
  dedupe_key: string;
  merchant_id: string;
  merchant_user_id: string;
  event_name: BrevoOnboardingEventName;
  event_properties: Record<string, BrevoEventProperty>;
  attempts: number;
  created_at: string;
};

export async function dispatchBrevoEventRetries(limit = 50) {
  if (!isBrevoConfigured() || !isSupabaseConfigured()) {
    return { skipped: true, processed: 0, sent: 0, retrying: 0, needsReview: 0, limitReached: false };
  }

  const supabase = getSupabaseAdmin();
  const boundedLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
  let processed = 0;
  let sent = 0;
  let retrying = 0;
  let needsReview = 0;

  while (processed < boundedLimit) {
    const claimedResult = await supabase.rpc("claim_brevo_event_retry", {
      p_now: new Date().toISOString(),
    });
    if (claimedResult.error) throw new Error("Lecture de la file Brevo impossible.");
    const row = (Array.isArray(claimedResult.data) ? claimedResult.data[0] : claimedResult.data) as BrevoRetryRow | null;
    if (!row) break;
    processed += 1;

    let email: string | null = null;
    try {
      const { data, error } = await supabase.from("merchant_users")
        .select("email")
        .eq("id", row.merchant_user_id)
        .maybeSingle<{ email: string }>();
      if (error) throw new Error("Lecture du contact Brevo impossible.");
      email = data?.email?.trim().toLowerCase() || null;
    } catch {
      const policy = getBrevoEventFailurePolicy(503, row.attempts);
      await supabase.from("brevo_event_deliveries").update({
        status: policy.status,
        next_attempt_at: policy.nextAttemptAt === null ? null : new Date(Date.now() + policy.nextAttemptAt).toISOString(),
        last_error_code: "contact_lookup_failed",
        last_error_status: null,
        updated_at: new Date().toISOString(),
      }).eq("dedupe_key", row.dedupe_key).eq("status", "processing");
      if (policy.status === "retry") retrying += 1;
      else needsReview += 1;
      safelyLogBrevoEvent("error", "brevo_event_retry_failed", {
        merchantId: row.merchant_id,
        eventName: row.event_name,
        errorCode: "contact_lookup_failed",
      });
      continue;
    }

    if (!email) {
      await supabase.from("brevo_event_deliveries").update({
        status: "needs_review",
        next_attempt_at: null,
        last_error_code: "contact_missing",
        last_error_status: null,
        updated_at: new Date().toISOString(),
      }).eq("dedupe_key", row.dedupe_key).eq("status", "processing");
      needsReview += 1;
      continue;
    }

    const decisionValidUntil = Date.parse(String(row.event_properties?.decision_valid_until ?? ""));
    if (row.event_name.startsWith("okado_email_sequence_") &&
      (!Number.isFinite(decisionValidUntil) || decisionValidUntil <= Date.now())) {
      await supabase.from("brevo_event_deliveries").update({
        status: "needs_review", next_attempt_at: null,
        last_error_code: "email_decision_expired", last_error_status: null,
        updated_at: new Date().toISOString(),
      }).eq("dedupe_key", row.dedupe_key).eq("status", "processing");
      needsReview += 1;
      continue;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS);
    try {
      const response = await fetch(BREVO_EVENT_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", "api-key": getBrevoApiKey() },
        body: JSON.stringify({
          event_name: row.event_name,
          identifiers: { email_id: email },
          event_date: row.created_at,
          event_properties: row.event_properties,
        }),
        signal: controller.signal,
      });
      if (response.ok) {
        const { error } = await supabase.from("brevo_event_deliveries").update({
          status: "sent", next_attempt_at: null, last_error_code: null, last_error_status: null,
          updated_at: new Date().toISOString(),
        }).eq("dedupe_key", row.dedupe_key).eq("status", "processing");
        if (error) throw new Error("Mise à jour du ledger Brevo impossible.");
        sent += 1;
        safelyLogBrevoEvent("info", "brevo_event_retry_sent", {
          merchantId: row.merchant_id, eventName: row.event_name, attempt: row.attempts,
        });
        continue;
      }

      const policy = getBrevoEventFailurePolicy(response.status, row.attempts);
      const { error } = await supabase.from("brevo_event_deliveries").update({
        status: policy.status,
        next_attempt_at: policy.nextAttemptAt === null ? null : new Date(Date.now() + policy.nextAttemptAt).toISOString(),
        last_error_code: policy.errorCode,
        last_error_status: response.status,
        updated_at: new Date().toISOString(),
      }).eq("dedupe_key", row.dedupe_key).eq("status", "processing");
      if (error) throw new Error("Mise à jour du ledger Brevo impossible.");
      if (policy.status === "retry") retrying += 1;
      else needsReview += 1;
      safelyLogBrevoEvent(policy.status === "retry" ? "warn" : "error", "brevo_event_retry_failed", {
        merchantId: row.merchant_id, eventName: row.event_name, status: response.status,
        errorCode: policy.errorCode, attempt: row.attempts,
      });
    } catch {
      // The request may have reached Brevo. Keep it out of automatic retries to avoid duplicate triggers.
      try {
        await supabase.from("brevo_event_deliveries").update({
          status: "needs_review", next_attempt_at: null,
          last_error_code: "network_outcome_ambiguous", last_error_status: null,
          updated_at: new Date().toISOString(),
        }).eq("dedupe_key", row.dedupe_key).eq("status", "processing");
      } catch { /* The stale-processing sweep will mark this row for review. */ }
      needsReview += 1;
      safelyLogBrevoEvent("error", "brevo_event_retry_ambiguous", {
        merchantId: row.merchant_id, eventName: row.event_name, errorCode: "network_outcome_ambiguous",
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return { skipped: false, processed, sent, retrying, needsReview, limitReached: processed === boundedLimit };
}

export async function syncAndStartBrevoOnboardingSequence(input: {
  merchant: Merchant;
  user: MerchantUser;
  source: "signup" | "google";
}) {
  try {
    const syncResult = await syncMerchantContactToBrevo(input);
    if (syncResult !== "synced") return syncResult;

    await postBrevoEvent({
      ...input,
      eventName: "okado_trial_started",
      dedupeKey: `trial_started:${input.merchant.id}`,
    });
    return syncResult;
  } catch {
    safelyLogBrevoEvent("warn", "brevo_onboarding_sequence_start_failed", {
      merchantId: input.merchant.id,
      provider: "brevo",
    });
    return "failed" as const;
  }
}

export async function emitBrevoOnboardingMilestone(input: {
  merchant: Merchant;
  user: MerchantUser;
  eventName: Exclude<BrevoOnboardingEventName, "okado_trial_started" | "okado_subscription_updated" | "okado_game_metrics_updated">;
  dedupeKey: string;
  properties?: Record<string, BrevoEventProperty>;
}) {
  return postBrevoEvent(input);
}

async function emitBrevoCampaignMilestoneUnsafe(input: {
  campaignId: string;
  eventName: "okado_game_published" | "okado_first_participation" | "okado_first_redemption" | "okado_game_metrics_updated";
  dedupeKey: string;
  properties?: Record<string, BrevoEventProperty>;
}) {
  if (!isBrevoConfigured() || !isSupabaseConfigured()) return "skipped" as const;
  const supabase = getSupabaseAdmin();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,merchant_id,is_active")
    .eq("id", input.campaignId)
    .maybeSingle<{ id: string; merchant_id: string; is_active: boolean }>();
  if (campaignError || !campaign) return "skipped" as const;

  if (input.eventName === "okado_game_published" && !campaign.is_active) return "skipped" as const;
  if (input.eventName === "okado_first_redemption") {
    const { count, error } = await supabase.from("leads")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .not("redeemed_at", "is", null);
    if (error || !count) return "skipped" as const;
  }

  const { data: merchantRow, error: merchantError } = await supabase
    .from("merchants")
    .select("id,company_name,logo_text,industry,city,time_zone,onboarding_completed,trial_start_date,trial_end_date,stripe_subscription_status,created_at")
    .eq("id", campaign.merchant_id)
    .maybeSingle();
  const { data: userRow, error: userError } = await supabase
    .from("merchant_users")
    .select("id,merchant_id,first_name,last_name,email,created_at")
    .eq("merchant_id", campaign.merchant_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (merchantError || userError || !merchantRow || !userRow) return "skipped" as const;

  const merchant: Merchant = {
    id: merchantRow.id,
    companyName: merchantRow.company_name,
    logoText: merchantRow.logo_text,
    industry: merchantRow.industry ?? undefined,
    city: merchantRow.city ?? undefined,
    timeZone: merchantRow.time_zone ?? undefined,
    onboardingCompleted: merchantRow.onboarding_completed ?? false,
    trialStartDate: merchantRow.trial_start_date ?? undefined,
    trialEndDate: merchantRow.trial_end_date ?? undefined,
    stripeSubscriptionStatus: merchantRow.stripe_subscription_status ?? undefined,
    createdAt: merchantRow.created_at,
  };
  const user: MerchantUser = {
    id: userRow.id,
    merchantId: userRow.merchant_id,
    firstName: userRow.first_name,
    lastName: userRow.last_name,
    email: userRow.email,
    password: "",
    createdAt: userRow.created_at,
  };

  const metricProperties: Record<string, BrevoEventProperty> = {};
  if (input.eventName === "okado_first_participation" || input.eventName === "okado_game_metrics_updated") {
    const { count, error } = await supabase.from("campaign_participations")
      .select("participation_id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id);
    if (!error && typeof count === "number") metricProperties.participations_count = count;
  }
  if (input.eventName === "okado_first_redemption" || input.eventName === "okado_game_metrics_updated") {
    const { count, error } = await supabase.from("leads")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .not("redeemed_at", "is", null);
    if (!error && typeof count === "number") metricProperties.redemptions_count = count;
  }

  const dedupeKey = input.dedupeKey.replace("{merchantId}", campaign.merchant_id);
  return postBrevoEvent({
    user,
    merchant,
    eventName: input.eventName,
    dedupeKey,
    properties: {
      campaign_id: campaign.id,
      campaign_is_published: campaign.is_active,
      ...((input.eventName === "okado_first_participation" || input.eventName === "okado_first_redemption" || input.eventName === "okado_game_metrics_updated")
        ? { metrics_scope: "persisted_non_preview_records" }
        : {}),
      ...(input.eventName === "okado_first_participation"
        ? { participation_evidence_scope: "outside_explicit_preview" }
        : {}),
      ...(input.eventName === "okado_first_redemption"
        ? { redemption_evidence_scope: "outside_explicit_preview" }
        : {}),
      ...metricProperties,
      ...input.properties,
    },
  });
}

export async function emitBrevoCampaignMilestone(input: Parameters<typeof emitBrevoCampaignMilestoneUnsafe>[0]) {
  try {
    return await emitBrevoCampaignMilestoneUnsafe(input);
  } catch {
    safelyLogBrevoEvent("warn", "brevo_campaign_milestone_failed", {
      campaignId: input.campaignId,
      eventName: input.eventName,
      provider: "brevo",
    });
    return "failed" as const;
  }
}

async function emitBrevoSubscriptionMilestoneUnsafe(input: {
  merchantId: string;
  dedupeKey: string;
  stripeEventType: string;
}) {
  if (!isBrevoConfigured() || !isSupabaseConfigured()) return "skipped" as const;
  const supabase = getSupabaseAdmin();
  const { data: merchantRow, error: merchantError } = await supabase
    .from("merchants")
    .select("id,company_name,logo_text,industry,city,time_zone,onboarding_completed,trial_start_date,trial_end_date,stripe_subscription_status,created_at")
    .eq("id", input.merchantId)
    .maybeSingle();
  const { data: userRow, error: userError } = await supabase
    .from("merchant_users")
    .select("id,merchant_id,first_name,last_name,email,created_at")
    .eq("merchant_id", input.merchantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (merchantError || userError || !merchantRow || !userRow) return "skipped" as const;

  const merchant: Merchant = {
    id: merchantRow.id,
    companyName: merchantRow.company_name,
    logoText: merchantRow.logo_text,
    industry: merchantRow.industry ?? undefined,
    city: merchantRow.city ?? undefined,
    timeZone: merchantRow.time_zone ?? undefined,
    onboardingCompleted: merchantRow.onboarding_completed ?? false,
    trialStartDate: merchantRow.trial_start_date ?? undefined,
    trialEndDate: merchantRow.trial_end_date ?? undefined,
    stripeSubscriptionStatus: merchantRow.stripe_subscription_status ?? undefined,
    createdAt: merchantRow.created_at,
  };
  const user: MerchantUser = {
    id: userRow.id,
    merchantId: userRow.merchant_id,
    firstName: userRow.first_name,
    lastName: userRow.last_name,
    email: userRow.email,
    password: "",
    createdAt: userRow.created_at,
  };

  return postBrevoEvent({
    merchant,
    user,
    eventName: "okado_subscription_updated",
    dedupeKey: input.dedupeKey,
    properties: { stripe_event_type: input.stripeEventType },
  });
}

export async function emitBrevoSubscriptionMilestone(input: Parameters<typeof emitBrevoSubscriptionMilestoneUnsafe>[0]) {
  try {
    return await emitBrevoSubscriptionMilestoneUnsafe(input);
  } catch {
    safelyLogBrevoEvent("warn", "brevo_subscription_milestone_failed", {
      merchantId: input.merchantId,
      provider: "brevo",
    });
    return "failed" as const;
  }
}

async function upsertBrevoContact(input: {
  email: string;
  listIds: number[];
  attributes: BrevoContactAttributes;
  context: {
    event: string;
    merchantId?: string;
  };
}) {
  const apiKey = getBrevoApiKey();
  const email = input.email.trim().toLowerCase();

  if (!apiKey || !email || input.listIds.length === 0) {
    return "skipped" as const;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS);

  try {
    const response = await fetch(BREVO_CONTACT_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email,
        attributes: input.attributes,
        listIds: input.listIds,
        updateEnabled: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Brevo HTTP ${response.status}`);
    }

    safelyLogBrevoEvent("info", input.context.event, {
      merchantId: input.context.merchantId,
      provider: "brevo",
    });

    return "synced" as const;
  } catch (error) {
    safelyLogBrevoEvent("warn", "brevo_contact_sync_failed", {
      merchantId: input.context.merchantId,
      provider: "brevo",
      errorCode: error instanceof Error && /^Brevo HTTP \d+$/.test(error.message)
        ? `brevo_contact_http_${error.message.slice(-3)}`
        : "contact_sync_failed",
    });

    return "failed" as const;
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncMerchantContactToBrevo(input: {
  merchant: Merchant;
  user: MerchantUser;
  source: "signup" | "google" | "onboarding" | "account" | "manual";
}) {
  try {
    const result = await upsertBrevoContact({
      email: input.user.email,
      listIds: getMerchantListIds(),
      attributes: {
        ...standardAttributes({
          firstName: input.user.firstName,
          lastName: input.user.lastName,
        }),
        ...Object.fromEntries(
          Object.entries({ CONTACT_TIMEZONE: input.merchant.timeZone ?? "Europe/Paris" })
            .map(([key, value]) => [key, sanitizeAttributeValue(value)] as const)
            .filter(([, value]) => value !== null),
        ),
      },
      context: {
        event: "brevo_merchant_contact_synced",
        merchantId: input.merchant.id,
      },
    });

    if (result === "synced") {
      await captureProductEvent(
        "brevo_merchant_contact_synced",
        merchantDistinctId(input.user.merchantId, input.user.id),
        {
          merchantId: input.merchant.id,
          merchantUserId: input.user.id,
          source: input.source,
        },
      );
    }

    return result;
  } catch {
    safelyLogBrevoEvent("warn", "brevo_contact_sync_failed", {
      merchantId: input.merchant.id,
      provider: "brevo",
    });
    return "failed" as const;
  }
}

function countResult(summary: BrevoSyncResult, result: "synced" | "skipped" | "failed") {
  summary.attempted += 1;
  summary[result] += 1;
}

export async function syncExistingContactsToBrevo(adminEmail: string): Promise<BrevoSyncResult> {
  if (!isSaasAdminEmail(adminEmail)) {
    throw new Error("Accès réservé à l'administration.");
  }

  const summary: BrevoSyncResult = {
    attempted: 0,
    synced: 0,
    skipped: 0,
    failed: 0,
  };

  if (!isSupabaseConfigured() || !isBrevoConfigured()) {
    return summary;
  }

  const supabase = getSupabaseAdmin();
  const { data: userRows, error: userError } = await supabase
    .from("merchant_users")
    .select("id, merchant_id, first_name, last_name, email, created_at")
    .limit(1_000);

  if (userError) {
    throw new Error(`Lecture des utilisateurs impossible: ${userError.message}`);
  }

  const merchantIds = Array.from(new Set((userRows ?? []).map((user) => user.merchant_id)));
  const { data: merchantRows, error: merchantError } = await supabase
    .from("merchants")
    .select("id, company_name, logo_text, industry, city, stripe_subscription_status, created_at")
    .in("id", merchantIds.length ? merchantIds : ["__none__"]);

  if (merchantError) {
    throw new Error(`Lecture des marchands impossible: ${merchantError.message}`);
  }

  const merchantsById = new Map((merchantRows ?? []).map((merchant) => [merchant.id, merchant]));

  for (const user of userRows ?? []) {
    const merchant = merchantsById.get(user.merchant_id);
    if (!merchant) {
      countResult(summary, "skipped");
      continue;
    }

    const result = await syncMerchantContactToBrevo({
      source: "manual",
      user: {
        id: user.id,
        merchantId: user.merchant_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        password: "",
        createdAt: user.created_at,
      },
      merchant: {
        id: merchant.id,
        companyName: merchant.company_name,
        logoText: merchant.logo_text ?? "OK",
        industry: merchant.industry ?? undefined,
        city: merchant.city ?? undefined,
        stripeSubscriptionStatus: merchant.stripe_subscription_status ?? undefined,
        createdAt: merchant.created_at,
      },
    });
    countResult(summary, result);
  }

  return summary;
}
