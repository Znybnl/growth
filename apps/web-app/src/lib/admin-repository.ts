import { getSupabaseAdmin } from "@/lib/supabase";

type MerchantRow = {
  id: string;
  company_name: string;
  onboarding_completed: boolean;
  stripe_subscription_status: string | null;
  trial_end_date: string | null;
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
        .select("id, company_name, onboarding_completed, stripe_subscription_status, trial_end_date, created_at"),
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
