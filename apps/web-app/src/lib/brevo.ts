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
const BREVO_TIMEOUT_MS = 2_500;

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

function shouldSyncCustomAttributes() {
  return process.env.BREVO_SYNC_CUSTOM_ATTRIBUTES === "true";
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

  if (firstName) attributes.FIRSTNAME = firstName;
  if (lastName) attributes.LASTNAME = lastName;

  return attributes;
}

function customAttributes(input: Record<string, unknown>) {
  if (!shouldSyncCustomAttributes()) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, sanitizeAttributeValue(value)] as const)
      .filter(([, value]) => value !== null),
  );
}

export function isBrevoConfigured() {
  return Boolean(getBrevoApiKey());
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

    logSupportEvent("info", input.context.event, {
      merchantId: input.context.merchantId,
      email,
      provider: "brevo",
    });

    return "synced" as const;
  } catch (error) {
    logSupportEvent("warn", "brevo_contact_sync_failed", {
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
  const result = await upsertBrevoContact({
    email: input.user.email,
    listIds: getMerchantListIds(),
    attributes: {
      ...standardAttributes({
        firstName: input.user.firstName,
        lastName: input.user.lastName,
      }),
      ...customAttributes({
        OKADO_TYPE: "merchant",
        OKADO_SOURCE: input.source,
        MERCHANT_ID: input.merchant.id,
        MERCHANT_NAME: input.merchant.companyName,
        INDUSTRY: input.merchant.industry,
        CITY: input.merchant.city,
        SUBSCRIPTION_STATUS: input.merchant.stripeSubscriptionStatus,
      }),
    },
    context: {
      event: "brevo_merchant_contact_synced",
      merchantId: input.merchant.id,
    },
  });

  if (result === "synced") {
    await captureProductEvent(
      "brevo_merchant_contact_synced",
      merchantDistinctId(input.merchant.id, input.user.id),
      {
        merchantId: input.merchant.id,
        merchantUserId: input.user.id,
        source: input.source,
      },
    );
  }

  return result;
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
