import { isSaasAdminEmail } from "@/lib/admin";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
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
  | "okado_game_metrics_updated";

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
  level: "info" | "warn",
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

  if (existing?.status === "sent" || existing?.status === "processing") return "skipped" as const;

  if (existing?.status === "failed") {
    const { data: claimed, error: claimError } = await supabase
      .from("brevo_event_deliveries")
      .update({ status: "processing", attempts: (existing.attempts ?? 1) + 1, last_error_status: null, updated_at: new Date().toISOString() })
      .eq("dedupe_key", input.dedupeKey)
      .eq("status", "failed")
      .select("dedupe_key")
      .maybeSingle();
    if (claimError || !claimed) return "skipped" as const;
  } else {
    const { error: insertError } = await supabase.from("brevo_event_deliveries").insert({
      dedupe_key: input.dedupeKey,
      merchant_id: input.merchant.id,
      event_name: input.eventName,
      event_properties: eventProperties,
      status: "processing",
      attempts: 1,
    });
    if (insertError) return "skipped" as const;
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
      await supabase.from("brevo_event_deliveries").update({
        status: "failed",
        last_error_status: response.status,
        updated_at: new Date().toISOString(),
      }).eq("dedupe_key", input.dedupeKey);
      safelyLogBrevoEvent("warn", "brevo_onboarding_event_failed", {
        merchantId: input.merchant.id,
        eventName: input.eventName,
        provider: "brevo",
        status: response.status,
      });
      return "failed" as const;
    }

    await supabase.from("brevo_event_deliveries").update({
      status: "sent",
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
      await supabase.from("brevo_event_deliveries").update({
        status: "failed",
        last_error_status: null,
        updated_at: new Date().toISOString(),
      }).eq("dedupe_key", input.dedupeKey);
    } catch {
      // A ledger update failure must not escape this best-effort delivery.
    }
    safelyLogBrevoEvent("warn", "brevo_onboarding_event_failed", {
      merchantId: input.merchant.id,
      eventName: input.eventName,
      provider: "brevo",
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
      const responseBody = await response.text().catch(() => "");
      throw new Error(responseBody || `Brevo HTTP ${response.status}`);
    }

    safelyLogBrevoEvent("info", input.context.event, {
      merchantId: input.context.merchantId,
      email,
      provider: "brevo",
    });

    return "synced" as const;
  } catch (error) {
    safelyLogBrevoEvent("warn", "brevo_contact_sync_failed", {
      merchantId: input.context.merchantId,
      email,
      provider: "brevo",
      error: error instanceof Error ? error.message : "Synchronisation Brevo impossible",
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
