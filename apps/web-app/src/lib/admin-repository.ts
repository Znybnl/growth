import { getSupabaseAdmin } from "@/lib/supabase";
import { updateMerchantBillingFromStripeSubscriptionInSupabase } from "@/lib/merchant-account-repository";
import { getStripeClient } from "@/lib/stripe";
import { logSupportEvent } from "@/lib/support-log";
import {
  canExtendMerchantTrial,
  getTrialExtensionDate,
  MAX_TRIAL_EXTENSION_DAYS,
} from "@/lib/admin-trial";

type MerchantRow = {
  id: string;
  company_name: string;
  onboarding_completed: boolean;
  stripe_subscription_status: string | null;
  stripe_subscription_id: string | null;
  trial_end_date: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean;
  created_at: string;
};

type MerchantUserRow = {
  id: string;
  merchant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

export type SaasAdminUserRow = {
  id: string;
  merchantId: string;
  merchantName: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  onboardingCompleted: boolean;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
  trialEndDate: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  campaignCount: number;
  leadCount: number;
  lowStockCount: number;
  failedEmailCount: number;
};

export type SaasAdminOverview = {
  totals: {
    merchants: number;
    onboardedMerchants: number;
    activeSubscriptions: number;
    activeCampaigns: number;
    leads: number;
    pendingRewards: number;
    lowStockPrizes: number;
    failedRewardEmails: number;
  };
  users: SaasAdminUserRow[];
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const ATTENTION_EMAIL_STATUSES = new Set(["failed", "bounced", "complained", "suppressed"]);

export async function getSaasAdminOverview(query = ""): Promise<SaasAdminOverview> {
  const supabase = getSupabaseAdmin();
  const [merchantResult, userResult, campaignResult, leadResult, prizeResult, deliveryResult] =
    await Promise.all([
      supabase
        .from("merchants")
        .select("id, company_name, onboarding_completed, stripe_subscription_status, stripe_subscription_id, trial_end_date, subscription_current_period_end, subscription_cancel_at_period_end, created_at"),
      supabase.from("merchant_users").select("id, merchant_id, first_name, last_name, email, created_at"),
      supabase.from("campaigns").select("id, merchant_id, is_active"),
      supabase.from("leads").select("campaign_id, status"),
      supabase.from("prizes").select("campaign_id, total_quantity, remaining_quantity"),
      supabase.from("reward_email_deliveries").select("campaign_id, status"),
    ]);

  const error = [
    merchantResult.error,
    userResult.error,
    campaignResult.error,
    leadResult.error,
    prizeResult.error,
    deliveryResult.error,
  ].find(Boolean);
  if (error) throw new Error("Lecture du pilotage impossible.");

  const merchants = (merchantResult.data ?? []) as MerchantRow[];
  const users = (userResult.data ?? []) as MerchantUserRow[];
  const campaigns = campaignResult.data ?? [];
  const leads = leadResult.data ?? [];
  const prizes = prizeResult.data ?? [];
  const deliveries = deliveryResult.data ?? [];

  const campaignsByMerchant = new Map<string, typeof campaigns>();
  const campaignToMerchant = new Map<string, string>();
  for (const campaign of campaigns) {
    campaignToMerchant.set(campaign.id, campaign.merchant_id);
    const current = campaignsByMerchant.get(campaign.merchant_id) ?? [];
    current.push(campaign);
    campaignsByMerchant.set(campaign.merchant_id, current);
  }

  const leadCounts = new Map<string, number>();
  let pendingRewards = 0;
  for (const lead of leads) {
    const merchantId = campaignToMerchant.get(lead.campaign_id);
    if (merchantId) leadCounts.set(merchantId, (leadCounts.get(merchantId) ?? 0) + 1);
    if (lead.status === "claimed") pendingRewards += 1;
  }

  const lowStockCounts = new Map<string, number>();
  let lowStockPrizes = 0;
  for (const prize of prizes) {
    if (prize.total_quantity == null || prize.remaining_quantity == null) continue;
    if (prize.remaining_quantity <= Math.max(1, Math.ceil(prize.total_quantity * 0.2))) {
      const merchantId = campaignToMerchant.get(prize.campaign_id);
      if (merchantId) lowStockCounts.set(merchantId, (lowStockCounts.get(merchantId) ?? 0) + 1);
      lowStockPrizes += 1;
    }
  }

  const failedEmailCounts = new Map<string, number>();
  let failedRewardEmails = 0;
  for (const delivery of deliveries) {
    if (!ATTENTION_EMAIL_STATUSES.has(delivery.status)) continue;
    const merchantId = campaignToMerchant.get(delivery.campaign_id);
    if (merchantId) failedEmailCounts.set(merchantId, (failedEmailCounts.get(merchantId) ?? 0) + 1);
    failedRewardEmails += 1;
  }

  const merchantsById = new Map(merchants.map((merchant) => [merchant.id, merchant]));
  const normalizedQuery = query.trim().toLowerCase();
  const rows = users
    .map((user) => {
      const merchant = merchantsById.get(user.merchant_id);
      const merchantCampaigns = campaignsByMerchant.get(user.merchant_id) ?? [];
      return {
        id: user.id,
        merchantId: user.merchant_id,
        merchantName: merchant?.company_name ?? "Commerce introuvable",
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        createdAt: user.created_at,
        onboardingCompleted: merchant?.onboarding_completed ?? false,
        subscriptionStatus: merchant?.stripe_subscription_status ?? null,
        stripeSubscriptionId: merchant?.stripe_subscription_id ?? null,
        trialEndDate: merchant?.trial_end_date ?? null,
        subscriptionCurrentPeriodEnd: merchant?.subscription_current_period_end ?? null,
        subscriptionCancelAtPeriodEnd: merchant?.subscription_cancel_at_period_end ?? false,
        campaignCount: merchantCampaigns.length,
        leadCount: leadCounts.get(user.merchant_id) ?? 0,
        lowStockCount: lowStockCounts.get(user.merchant_id) ?? 0,
        failedEmailCount: failedEmailCounts.get(user.merchant_id) ?? 0,
      } satisfies SaasAdminUserRow;
    })
    .filter((row) => {
      if (!normalizedQuery) return true;
      return `${row.merchantName} ${row.firstName} ${row.lastName} ${row.email}`
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    totals: {
      merchants: merchants.length,
      onboardedMerchants: merchants.filter((merchant) => merchant.onboarding_completed).length,
      activeSubscriptions: merchants.filter((merchant) =>
        ACTIVE_SUBSCRIPTION_STATUSES.has(merchant.stripe_subscription_status ?? ""),
      ).length,
      activeCampaigns: campaigns.filter((campaign) => campaign.is_active).length,
      leads: leads.length,
      pendingRewards,
      lowStockPrizes,
      failedRewardEmails,
    },
    users: rows,
  };
}

export class AdminTrialExtensionError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409) {
    super(message);
    this.name = "AdminTrialExtensionError";
  }
}

export async function extendMerchantTrial(
  merchantId: string,
  daysToAdd: number,
  now = Date.now(),
) {
  if (
    !Number.isInteger(daysToAdd) ||
    daysToAdd < 1 ||
    daysToAdd > MAX_TRIAL_EXTENSION_DAYS
  ) {
    throw new AdminTrialExtensionError(
      `Saisissez un nombre entier de 1 à ${MAX_TRIAL_EXTENSION_DAYS} jours.`,
      400,
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: merchant, error: readError } = await supabase
    .from("merchants")
    .select("id, trial_end_date, stripe_subscription_status, stripe_subscription_id, subscription_cancel_at_period_end")
    .eq("id", merchantId)
    .maybeSingle();

  if (readError) throw new Error("Lecture de la période d’essai impossible.");
  if (!merchant) throw new AdminTrialExtensionError("Compte marchand introuvable.", 404);
  if (!canExtendMerchantTrial(
    merchant.stripe_subscription_status,
    merchant.trial_end_date,
    merchant.subscription_cancel_at_period_end ?? false,
    merchant.stripe_subscription_id,
    now,
  )) {
    throw new AdminTrialExtensionError(
      "Cette période d’essai ne peut pas être prolongée depuis le pilotage. Vérifiez le statut de l’abonnement et rechargez la page.",
      409,
    );
  }

  const previousTrialEnd = merchant.trial_end_date;
  const nextTrialEnd = getTrialExtensionDate(previousTrialEnd, daysToAdd, now);

  if (merchant.stripe_subscription_id) {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(merchant.stripe_subscription_id);
    const stripeTrialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;

    if (
      merchant.stripe_subscription_status !== "trialing" ||
      subscription.status !== "trialing" ||
      subscription.cancel_at_period_end ||
      !stripeTrialEnd ||
      Math.abs(Date.parse(stripeTrialEnd) - Date.parse(previousTrialEnd)) > 1_000
    ) {
      throw new AdminTrialExtensionError(
        "L’essai Stripe a changé ou n’est plus prolongeable. Rechargez le pilotage avant de réessayer.",
        409,
      );
    }

    const updatedSubscription = await stripe.subscriptions.update(merchant.stripe_subscription_id, {
      trial_end: Math.floor(Date.parse(nextTrialEnd) / 1_000),
      proration_behavior: "none",
    });
    try {
      await updateMerchantBillingFromStripeSubscriptionInSupabase(merchantId, updatedSubscription);
    } catch {
      logSupportEvent("error", "admin-trial-stripe-sync-failed", {
        merchantId,
        stripeSubscriptionId: merchant.stripe_subscription_id,
        trialEndDate: updatedSubscription.trial_end
          ? new Date(updatedSubscription.trial_end * 1_000).toISOString()
          : nextTrialEnd,
      });
      throw new AdminTrialExtensionError(
        "Stripe a accepté la prolongation, mais Okado n’a pas encore synchronisé la nouvelle échéance. Rechargez Pilotage avant toute nouvelle tentative.",
        409,
      );
    }

    return {
      merchantId,
      previousTrialEnd,
      trialEndDate: updatedSubscription.trial_end
        ? new Date(updatedSubscription.trial_end * 1_000).toISOString()
        : nextTrialEnd,
    };
  }

  if (merchant.stripe_subscription_status === "trialing") {
    throw new AdminTrialExtensionError(
      "L’abonnement d’essai Stripe est introuvable. Rechargez le pilotage avant de réessayer.",
      409,
    );
  }

  let update = supabase
    .from("merchants")
    .update({ trial_end_date: nextTrialEnd })
    .eq("id", merchantId)
    .eq("trial_end_date", previousTrialEnd);

  update = merchant.stripe_subscription_status === null
    ? update.is("stripe_subscription_status", null)
    : update.eq("stripe_subscription_status", merchant.stripe_subscription_status);
  update = merchant.stripe_subscription_id === null
    ? update.is("stripe_subscription_id", null)
    : update.eq("stripe_subscription_id", merchant.stripe_subscription_id);

  const { data: updatedMerchant, error: updateError } = await update
    .select("id, trial_end_date")
    .maybeSingle();

  if (updateError) throw new Error("La période d’essai n’a pas pu être prolongée.");
  if (!updatedMerchant) {
    throw new AdminTrialExtensionError(
      "Le statut d’abonnement a changé pendant l’opération. Rechargez la page avant de réessayer.",
      409,
    );
  }

  return {
    merchantId: updatedMerchant.id,
    previousTrialEnd,
    trialEndDate: updatedMerchant.trial_end_date,
  };
}
