import { readAllRows } from "@/lib/paginated-read";
import { buildAffiliateAccountDirectory } from "@/lib/affiliate-account-directory";
import { readAdminLastSignIns, type AdminLastSignIn } from "@/lib/admin-last-sign-in";
import { activeSubscriptionOrTrial } from "@/lib/metric-rules";
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
  workspace_id: string;
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

type WorkspaceRow = { id: string; name: string; created_at: string };
type MembershipRow = { workspace_id: string; merchant_user_id: string; role: string; status: string };

export type SaasAdminUserRow = {
  id: string;
  merchantId: string;
  merchantName: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  lastSignIn: AdminLastSignIn;
  onboardingCompleted: boolean;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
  trialEndDate: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  campaignCount: number;
  leadCount: number;
  lowStockCount: number;
  exhaustedStockCount: number;
  failedEmailCount: number;
};

export type SaasAdminOverview = {
  totals: {
    accounts: number;
    /** Historical name: rows in merchants represent establishments. */
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


export async function getSaasAdminOverview(query = ""): Promise<SaasAdminOverview> {
  const supabase = getSupabaseAdmin();
  const userRead = readAllRows((offset,end) => supabase.from("merchant_users").select("id, merchant_id, first_name, last_name, email, created_at", { count: "exact" }).order("id").range(offset,end));
  const lastSignInRead = userRead.then((result) => result.error
    ? new Map<string, AdminLastSignIn>()
    : readAdminLastSignIns(supabase, (result.data as MerchantUserRow[] ?? []).map((user) => user.id)));
  const [merchantResult, userResult, campaignResult, metricResult, lastSignIns, membershipResult, workspaceResult] =
    await Promise.all([
      readAllRows((offset,end) => supabase.from("merchants").select("id, workspace_id, company_name, onboarding_completed, stripe_subscription_status, stripe_subscription_id, trial_end_date, subscription_current_period_end, subscription_cancel_at_period_end, created_at", { count: "exact" }).order("id").range(offset,end)),
      userRead,
      readAllRows((offset,end) => supabase.from("campaigns").select("id, merchant_id, is_active", { count: "exact" }).order("id").range(offset,end)),
      readAllRows((offset,end) => supabase.rpc("get_platform_operational_metrics", {}, { count: "exact" }).order("merchant_id").range(offset,end)),
      lastSignInRead,
      readAllRows((offset,end) => supabase.from("merchant_workspace_memberships").select("id, workspace_id, merchant_user_id, role, status", { count: "exact" }).order("id").range(offset,end)),
      readAllRows((offset,end) => supabase.from("merchant_workspaces").select("id, name, created_at", { count: "exact" }).order("id").range(offset,end)),
    ]);

  const error = [
    merchantResult.error,
    userResult.error,
    campaignResult.error,
    metricResult.error,
    membershipResult.error,
    workspaceResult.error,
  ].find(Boolean);
  if (error) throw new Error("Lecture du pilotage impossible.");

  const merchants = (merchantResult.data ?? []) as MerchantRow[];
  const users = (userResult.data ?? []) as MerchantUserRow[];
  const accounts = buildAffiliateAccountDirectory(merchants, users,
    (membershipResult.data ?? []) as MembershipRow[], (workspaceResult.data ?? []) as WorkspaceRow[]);
  const campaigns = campaignResult.data ?? [];
  const metrics = (metricResult.data ?? []) as Array<{ merchant_id: string; contacts: number; pending_rewards: number; low_stock: number; exhausted_stock: number; failed_emails: number }>;

  const campaignsByMerchant = new Map<string, typeof campaigns>();
  const campaignToMerchant = new Map<string, string>();
  for (const campaign of campaigns) {
    campaignToMerchant.set(campaign.id, campaign.merchant_id);
    const current = campaignsByMerchant.get(campaign.merchant_id) ?? [];
    current.push(campaign);
    campaignsByMerchant.set(campaign.merchant_id, current);
  }

  const leadCounts = new Map(metrics.map(m => [m.merchant_id, Number(m.contacts)]));
  const lowStockCounts = new Map(metrics.map(m => [m.merchant_id, Number(m.low_stock)]));
  const exhaustedStockCounts = new Map(metrics.map(m => [m.merchant_id, Number(m.exhausted_stock)]));
  const failedEmailCounts = new Map(metrics.map(m => [m.merchant_id, Number(m.failed_emails)]));
  const pendingRewards = metrics.reduce((n,m) => n + Number(m.pending_rewards), 0);
  const lowStockPrizes = metrics.reduce((n,m) => n + Number(m.low_stock), 0);
  const failedRewardEmails = metrics.reduce((n,m) => n + Number(m.failed_emails), 0);
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
        lastSignIn: lastSignIns.get(user.id) ?? { status: "unavailable" },
        onboardingCompleted: merchant?.onboarding_completed ?? false,
        subscriptionStatus: merchant?.stripe_subscription_status ?? null,
        stripeSubscriptionId: merchant?.stripe_subscription_id ?? null,
        trialEndDate: merchant?.trial_end_date ?? null,
        subscriptionCurrentPeriodEnd: merchant?.subscription_current_period_end ?? null,
        subscriptionCancelAtPeriodEnd: merchant?.subscription_cancel_at_period_end ?? false,
        campaignCount: merchantCampaigns.length,
        leadCount: leadCounts.get(user.merchant_id) ?? 0,
        lowStockCount: lowStockCounts.get(user.merchant_id) ?? 0,
        exhaustedStockCount: exhaustedStockCounts.get(user.merchant_id) ?? 0,
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
      accounts: accounts.length,
      merchants: merchants.length,
      onboardedMerchants: merchants.filter((merchant) => merchant.onboarding_completed).length,
      activeSubscriptions: merchants.filter((merchant) =>
        activeSubscriptionOrTrial(merchant.stripe_subscription_status, merchant.trial_end_date),
      ).length,
      activeCampaigns: campaigns.filter((campaign) => campaign.is_active).length,
      leads: metrics.reduce((n,m) => n + Number(m.contacts), 0),
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
