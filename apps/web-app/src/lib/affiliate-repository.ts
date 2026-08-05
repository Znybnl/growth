import Stripe from "stripe";

import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logSupportEvent } from "@/lib/support-log";
import {
  AffiliateAccount,
  AffiliateAdminAccountItem,
  AffiliateAdminCommissionItem,
  AffiliateAdminOverview,
  AffiliateCommissionStatus,
  AffiliateReferralItem,
  AffiliateReferralStatus,
  AffiliateSummary,
  Merchant,
} from "@/lib/types";

const DEFAULT_COMMISSION_RATE_BPS = 4000;
const DEFAULT_COMMISSION_DURATION_MONTHS = 12;

type AffiliateAccountRow = {
  id: string;
  merchant_id: string;
  code: string;
  status: "active" | "disabled";
  commission_rate_bps: number | null;
  commission_duration_months: number | null;
  payout_details: string | null;
  created_at: string;
  updated_at: string;
};

type AffiliateReferralRow = {
  id: string;
  affiliate_account_id: string;
  affiliate_merchant_id: string;
  referred_merchant_id: string;
  referral_code: string;
  source: string;
  status: AffiliateReferralStatus;
  first_subscription_paid_at: string | null;
  commission_eligible_until: string | null;
  created_at: string;
  updated_at: string;
};

type AffiliateCommissionRow = {
  id: string;
  referral_id: string;
  affiliate_merchant_id: string;
  referred_merchant_id: string;
  stripe_invoice_id: string;
  stripe_subscription_id: string | null;
  invoice_paid_at: string;
  invoice_amount_cents: number;
  commission_rate_bps: number;
  commission_duration_months: number;
  commission_amount_cents: number;
  currency: string;
  status: AffiliateCommissionStatus;
  payout_id: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
};

type MerchantLiteRow = {
  id: string;
  company_name: string;
  restaurant_email: string | null;
};

function normalizeAffiliateCode(value?: string | null) {
  return value?.trim().toUpperCase().replace(/\s+/g, "") ?? "";
}

function toAffiliateAccount(row: AffiliateAccountRow): AffiliateAccount {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    code: row.code,
    status: row.status,
    commissionRateBps: row.commission_rate_bps ?? DEFAULT_COMMISSION_RATE_BPS,
    commissionDurationMonths:
      row.commission_duration_months ?? DEFAULT_COMMISSION_DURATION_MONTHS,
    payoutDetails: row.payout_details ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatAffiliateCode(merchantId: string) {
  const suffix = merchantId.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return `OKADO-${suffix || crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getInvoiceAmountExcludingTaxCents(invoice: Stripe.Invoice) {
  const invoiceWithTaxFields = invoice as Stripe.Invoice & {
    total_excluding_tax?: number | null;
    subtotal_excluding_tax?: number | null;
  };

  return (
    invoiceWithTaxFields.total_excluding_tax ??
    invoiceWithTaxFields.subtotal_excluding_tax ??
    invoice.amount_paid ??
    0
  );
}

function getInvoicePaidAt(invoice: Stripe.Invoice) {
  const paidAt =
    typeof invoice.status_transitions?.paid_at === "number"
      ? invoice.status_transitions.paid_at
      : typeof invoice.created === "number"
        ? invoice.created
        : Math.floor(Date.now() / 1000);

  return new Date(paidAt * 1000);
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const parentSubscription =
    invoice.parent?.subscription_details?.subscription &&
    typeof invoice.parent.subscription_details.subscription === "string"
      ? invoice.parent.subscription_details.subscription
      : undefined;

  return parentSubscription;
}

async function fetchMerchantMap(merchantIds: string[]) {
  const uniqueMerchantIds = [...new Set(merchantIds.filter(Boolean))];

  if (!uniqueMerchantIds.length) {
    return new Map<string, MerchantLiteRow>();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("merchants")
    .select("id, company_name, restaurant_email")
    .in("id", uniqueMerchantIds)
    .returns<MerchantLiteRow[]>();

  if (error) {
    throw new Error(`Lecture des marchands affiliés impossible: ${error.message}`);
  }

  return new Map((data ?? []).map((merchant) => [merchant.id, merchant]));
}

export async function ensureAffiliateAccountForMerchant(merchantId: string) {
  const supabase = getSupabaseAdmin();
  const existing = await supabase
    .from("affiliate_accounts")
    .select("*")
    .eq("merchant_id", merchantId)
    .maybeSingle<AffiliateAccountRow>();

  if (existing.error) {
    throw new Error(`Lecture du compte affilié impossible: ${existing.error.message}`);
  }

  if (existing.data) {
    return toAffiliateAccount(existing.data);
  }

  const baseCode = formatAffiliateCode(merchantId);
  const insert = await supabase
    .from("affiliate_accounts")
    .insert({
      merchant_id: merchantId,
      code: baseCode,
      status: "disabled",
      commission_rate_bps: DEFAULT_COMMISSION_RATE_BPS,
      commission_duration_months: DEFAULT_COMMISSION_DURATION_MONTHS,
    })
    .select("*")
    .single<AffiliateAccountRow>();

  if (insert.error || !insert.data) {
    throw new Error(`Création du compte affilié impossible: ${insert.error?.message ?? "réponse vide"}`);
  }

  return toAffiliateAccount(insert.data);
}

export async function createAffiliateReferralForMerchant(input: {
  referredMerchantId: string;
  referralCode?: string | null;
  source: "signup" | "google_signup";
}) {
  const referralCode = normalizeAffiliateCode(input.referralCode);

  if (!referralCode) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const existingReferral = await supabase
    .from("affiliate_referrals")
    .select("id")
    .eq("referred_merchant_id", input.referredMerchantId)
    .maybeSingle<{ id: string }>();

  if (existingReferral.error) {
    throw new Error(`Lecture de l'attribution affiliée impossible: ${existingReferral.error.message}`);
  }

  if (existingReferral.data) {
    return null;
  }

  const account = await supabase
    .from("affiliate_accounts")
    .select("*")
    .eq("code", referralCode)
    .eq("status", "active")
    .maybeSingle<AffiliateAccountRow>();

  if (account.error) {
    throw new Error(`Lecture du code affilié impossible: ${account.error.message}`);
  }

  if (!account.data || account.data.merchant_id === input.referredMerchantId) {
    return null;
  }

  const insert = await supabase
    .from("affiliate_referrals")
    .insert({
      affiliate_account_id: account.data.id,
      affiliate_merchant_id: account.data.merchant_id,
      referred_merchant_id: input.referredMerchantId,
      referral_code: account.data.code,
      source: input.source,
      status: "registered",
    })
    .select("id")
    .single<{ id: string }>();

  if (insert.error || !insert.data) {
    throw new Error(`Création de l'attribution affiliée impossible: ${insert.error?.message ?? "réponse vide"}`);
  }

  logSupportEvent("info", "affiliate_referral_created", {
    merchantId: account.data.merchant_id,
    referredMerchantId: input.referredMerchantId,
    referralCode: account.data.code,
  });
  await captureProductEvent("affiliate_referral_created", account.data.merchant_id, {
    merchantId: account.data.merchant_id,
    referredMerchantId: input.referredMerchantId,
    referralCode: account.data.code,
    source: input.source,
  });

  return insert.data.id;
}

export async function getAffiliateSummaryForMerchant(
  merchant: Merchant,
): Promise<AffiliateSummary> {
  const account = await ensureAffiliateAccountForMerchant(merchant.id);
  const supabase = getSupabaseAdmin();
  const [{ data: referrals, error: referralsError }, { data: commissions, error: commissionsError }] =
    await Promise.all([
      supabase
        .from("affiliate_referrals")
        .select("*")
        .eq("affiliate_merchant_id", merchant.id)
        .order("created_at", { ascending: false })
        .returns<AffiliateReferralRow[]>(),
      supabase
        .from("affiliate_commissions")
        .select("*")
        .eq("affiliate_merchant_id", merchant.id)
        .returns<AffiliateCommissionRow[]>(),
    ]);

  if (referralsError) {
    throw new Error(`Lecture des filleuls impossible: ${referralsError.message}`);
  }

  if (commissionsError) {
    throw new Error(`Lecture des commissions impossible: ${commissionsError.message}`);
  }

  const merchantMap = await fetchMerchantMap((referrals ?? []).map((item) => item.referred_merchant_id));
  const commissionsByReferredMerchant = new Map<string, AffiliateCommissionRow[]>();

  for (const commission of commissions ?? []) {
    const existing = commissionsByReferredMerchant.get(commission.referred_merchant_id) ?? [];
    existing.push(commission);
    commissionsByReferredMerchant.set(commission.referred_merchant_id, existing);
  }

  const referralItems: AffiliateReferralItem[] = (referrals ?? []).map((referral) => {
    const referredMerchant = merchantMap.get(referral.referred_merchant_id);
    const referralCommissions = commissionsByReferredMerchant.get(referral.referred_merchant_id) ?? [];
    const totalCommissionCents = referralCommissions
      .filter((commission) => commission.status !== "void")
      .reduce((sum, commission) => sum + commission.commission_amount_cents, 0);
    const paidCommissionCents = referralCommissions
      .filter((commission) => commission.status === "paid")
      .reduce((sum, commission) => sum + commission.commission_amount_cents, 0);
    const pendingCommissionCents = referralCommissions
      .filter((commission) => ["pending", "payable"].includes(commission.status))
      .reduce((sum, commission) => sum + commission.commission_amount_cents, 0);

    return {
      id: referral.id,
      affiliateMerchantId: referral.affiliate_merchant_id,
      referredMerchantId: referral.referred_merchant_id,
      referredMerchantName: referredMerchant?.company_name ?? "Filleul",
      referredMerchantEmail: referredMerchant?.restaurant_email ?? undefined,
      status: referral.status,
      firstSubscriptionPaidAt: referral.first_subscription_paid_at ?? undefined,
      commissionEligibleUntil: referral.commission_eligible_until ?? undefined,
      createdAt: referral.created_at,
      totalCommissionCents,
      paidCommissionCents,
      pendingCommissionCents,
    };
  });

  const pendingCommissionCents = (commissions ?? [])
    .filter((commission) => ["pending", "payable"].includes(commission.status))
    .reduce((sum, commission) => sum + commission.commission_amount_cents, 0);
  const paidCommissionCents = (commissions ?? [])
    .filter((commission) => commission.status === "paid")
    .reduce((sum, commission) => sum + commission.commission_amount_cents, 0);
  const totalCommissionCents = (commissions ?? [])
    .filter((commission) => commission.status !== "void")
    .reduce((sum, commission) => sum + commission.commission_amount_cents, 0);

  return {
    account,
    referralLinkPath: `/inscription?ref=${encodeURIComponent(account.code)}`,
    totals: {
      referrals: referralItems.length,
      activeReferrals: referralItems.filter((item) => item.status === "active").length,
      pendingCommissionCents,
      paidCommissionCents,
      totalCommissionCents,
    },
    referrals: referralItems,
  };
}

export async function createAffiliateCommissionFromPaidInvoice(
  invoice: Stripe.Invoice,
  referredMerchantId?: string,
) {
  if (!referredMerchantId || !invoice.id) {
    return null;
  }

  const amountCents = getInvoiceAmountExcludingTaxCents(invoice);

  if (amountCents <= 0) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const referralQuery = await supabase
    .from("affiliate_referrals")
    .select("*")
    .eq("referred_merchant_id", referredMerchantId)
    .maybeSingle<AffiliateReferralRow>();

  if (referralQuery.error) {
    throw new Error(`Lecture du filleul affilié impossible: ${referralQuery.error.message}`);
  }

  if (!referralQuery.data || referralQuery.data.status === "canceled") {
    return null;
  }

  const accountQuery = await supabase
    .from("affiliate_accounts")
    .select("*")
    .eq("id", referralQuery.data.affiliate_account_id)
    .eq("status", "active")
    .maybeSingle<AffiliateAccountRow>();

  if (accountQuery.error) {
    throw new Error(`Lecture du compte affilié impossible: ${accountQuery.error.message}`);
  }

  if (!accountQuery.data) {
    return null;
  }

  const commissionRateBps =
    accountQuery.data.commission_rate_bps ?? DEFAULT_COMMISSION_RATE_BPS;
  const commissionDurationMonths =
    accountQuery.data.commission_duration_months ?? DEFAULT_COMMISSION_DURATION_MONTHS;

  const paidAt = getInvoicePaidAt(invoice);
  const eligibleUntil = referralQuery.data.commission_eligible_until
    ? new Date(referralQuery.data.commission_eligible_until)
    : addMonths(paidAt, commissionDurationMonths);

  if (paidAt > eligibleUntil) {
    return null;
  }

  const firstPaidAt = referralQuery.data.first_subscription_paid_at
    ? new Date(referralQuery.data.first_subscription_paid_at)
    : paidAt;
  const nextEligibleUntil =
    referralQuery.data.commission_eligible_until ??
    addMonths(firstPaidAt, commissionDurationMonths).toISOString();
  const commissionAmountCents = Math.round((amountCents * commissionRateBps) / 10000);
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  const insert = await supabase
    .from("affiliate_commissions")
    .insert({
      referral_id: referralQuery.data.id,
      affiliate_merchant_id: referralQuery.data.affiliate_merchant_id,
      referred_merchant_id: referredMerchantId,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: subscriptionId ?? null,
      invoice_paid_at: paidAt.toISOString(),
      invoice_amount_cents: amountCents,
      commission_rate_bps: commissionRateBps,
      commission_duration_months: commissionDurationMonths,
      commission_amount_cents: commissionAmountCents,
      currency: invoice.currency ?? "eur",
      status: "pending",
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (insert.error) {
    if (insert.error.message.toLowerCase().includes("duplicate")) {
      return null;
    }

    throw new Error(`Création de la commission affiliée impossible: ${insert.error.message}`);
  }

  await supabase
    .from("affiliate_referrals")
    .update({
      status: "active",
      first_subscription_paid_at: referralQuery.data.first_subscription_paid_at ?? paidAt.toISOString(),
      commission_eligible_until: nextEligibleUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("id", referralQuery.data.id);

  logSupportEvent("info", "affiliate_commission_created", {
    merchantId: referralQuery.data.affiliate_merchant_id,
    referredMerchantId,
    stripeInvoiceId: invoice.id,
    commissionAmountCents,
  });
  await captureProductEvent(
    "affiliate_commission_created",
    merchantDistinctId(referralQuery.data.affiliate_merchant_id),
    {
      merchantId: referralQuery.data.affiliate_merchant_id,
      referredMerchantId,
      stripeInvoiceId: invoice.id,
      commissionAmountCents,
    },
  );

  return insert.data?.id ?? null;
}

export async function markAffiliateReferralCanceled(referredMerchantId?: string) {
  if (!referredMerchantId) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("affiliate_referrals")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("referred_merchant_id", referredMerchantId);

  if (error) {
    throw new Error(`Annulation du filleul affilié impossible: ${error.message}`);
  }
}

export async function voidAffiliateCommissionByInvoice(
  stripeInvoiceId?: string,
  reason = "refund_or_credit",
) {
  if (!stripeInvoiceId) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("affiliate_commissions")
    .update({ status: "void", void_reason: reason, updated_at: new Date().toISOString() })
    .eq("stripe_invoice_id", stripeInvoiceId)
    .neq("status", "paid")
    .select("affiliate_merchant_id, referred_merchant_id")
    .maybeSingle<{ affiliate_merchant_id: string; referred_merchant_id: string }>();

  if (error) {
    throw new Error(`Annulation de la commission affiliée impossible: ${error.message}`);
  }

  if (data) {
    logSupportEvent("info", "affiliate_commission_voided", {
      merchantId: data.affiliate_merchant_id,
      referredMerchantId: data.referred_merchant_id,
      stripeInvoiceId,
      reason,
    });
  }
}

export async function getAffiliateAdminOverview(input?: {
  query?: string;
  status?: string;
}): Promise<AffiliateAdminOverview> {
  const supabase = getSupabaseAdmin();
  const [{ data: accounts, error: accountsError }, { data: referrals, error: referralsError }, { data: commissions, error: commissionsError }] =
    await Promise.all([
      supabase.from("affiliate_accounts").select("*").returns<AffiliateAccountRow[]>(),
      supabase.from("affiliate_referrals").select("*").returns<AffiliateReferralRow[]>(),
      supabase
        .from("affiliate_commissions")
        .select("*")
        .order("invoice_paid_at", { ascending: false })
        .limit(300)
        .returns<AffiliateCommissionRow[]>(),
    ]);

  if (accountsError) throw new Error(`Lecture des affiliés impossible: ${accountsError.message}`);
  if (referralsError) throw new Error(`Lecture des filleuls impossible: ${referralsError.message}`);
  if (commissionsError) throw new Error(`Lecture des commissions impossible: ${commissionsError.message}`);

  const merchantIds = [
    ...(accounts ?? []).map((item) => item.merchant_id),
    ...(referrals ?? []).flatMap((item) => [item.affiliate_merchant_id, item.referred_merchant_id]),
    ...(commissions ?? []).flatMap((item) => [item.affiliate_merchant_id, item.referred_merchant_id]),
  ];
  const merchantMap = await fetchMerchantMap(merchantIds);
  const query = input?.query?.trim().toLowerCase() ?? "";
  const status = input?.status?.trim() ?? "all";

  const commissionItems: AffiliateAdminCommissionItem[] = (commissions ?? [])
    .map((commission) => {
      const affiliate = merchantMap.get(commission.affiliate_merchant_id);
      const referred = merchantMap.get(commission.referred_merchant_id);

      return {
        id: commission.id,
        affiliateMerchantId: commission.affiliate_merchant_id,
        affiliateMerchantName: affiliate?.company_name ?? "Affilié",
        referredMerchantId: commission.referred_merchant_id,
        referredMerchantName: referred?.company_name ?? "Filleul",
        stripeInvoiceId: commission.stripe_invoice_id,
        stripeSubscriptionId: commission.stripe_subscription_id ?? undefined,
        invoicePaidAt: commission.invoice_paid_at,
        invoiceAmountCents: commission.invoice_amount_cents,
        commissionAmountCents: commission.commission_amount_cents,
        currency: commission.currency,
        status: commission.status,
        createdAt: commission.created_at,
      };
    })
    .filter((commission) => status === "all" || commission.status === status)
    .filter((commission) => {
      if (!query) return true;
      return [
        commission.affiliateMerchantName,
        commission.referredMerchantName,
        commission.stripeInvoiceId,
        commission.status,
      ].some((value) => value.toLowerCase().includes(query));
    });

  const pendingCommissionCents = (commissions ?? [])
    .filter((commission) => commission.status === "pending")
    .reduce((sum, commission) => sum + commission.commission_amount_cents, 0);
  const payableCommissionCents = (commissions ?? [])
    .filter((commission) => commission.status === "payable")
    .reduce((sum, commission) => sum + commission.commission_amount_cents, 0);
  const paidCommissionCents = (commissions ?? [])
    .filter((commission) => commission.status === "paid")
    .reduce((sum, commission) => sum + commission.commission_amount_cents, 0);
  const accountItems: AffiliateAdminAccountItem[] = (accounts ?? [])
    .map((account) => {
      const merchant = merchantMap.get(account.merchant_id);
      const accountReferrals = (referrals ?? []).filter(
        (referral) => referral.affiliate_account_id === account.id,
      );
      const accountCommissions = (commissions ?? []).filter(
        (commission) => commission.affiliate_merchant_id === account.merchant_id,
      );

      return {
        id: account.id,
        merchantId: account.merchant_id,
        merchantName: merchant?.company_name ?? "Marchand",
        merchantEmail: merchant?.restaurant_email ?? undefined,
        code: account.code,
        status: account.status,
        commissionRateBps: account.commission_rate_bps ?? DEFAULT_COMMISSION_RATE_BPS,
        commissionDurationMonths:
          account.commission_duration_months ?? DEFAULT_COMMISSION_DURATION_MONTHS,
        referralCount: accountReferrals.length,
        pendingCommissionCents: accountCommissions
          .filter((commission) => ["pending", "payable"].includes(commission.status))
          .reduce((sum, commission) => sum + commission.commission_amount_cents, 0),
        paidCommissionCents: accountCommissions
          .filter((commission) => commission.status === "paid")
          .reduce((sum, commission) => sum + commission.commission_amount_cents, 0),
      };
    })
    .filter((account) => {
      if (!query) return true;
      return [account.merchantName, account.code, account.status].some((value) =>
        value.toLowerCase().includes(query),
      );
    });

  return {
    totals: {
      affiliates: accounts?.length ?? 0,
      activeAffiliates: (accounts ?? []).filter((account) => account.status === "active").length,
      referrals: referrals?.length ?? 0,
      pendingCommissionCents,
      payableCommissionCents,
      paidCommissionCents,
    },
    accounts: accountItems,
    commissions: commissionItems,
  };
}

export async function updateAffiliateAccountSettings(input: {
  accountId: string;
  status: "active" | "disabled";
  commissionRatePercent: number;
  commissionDurationMonths: number;
}) {
  const commissionRatePercent = Number(input.commissionRatePercent);
  const commissionDurationMonths = Math.round(Number(input.commissionDurationMonths));

  if (!["active", "disabled"].includes(input.status)) {
    throw new Error("Statut affilié invalide.");
  }

  if (!Number.isFinite(commissionRatePercent) || commissionRatePercent < 0 || commissionRatePercent > 100) {
    throw new Error("Le taux doit être compris entre 0 et 100%.");
  }

  if (
    !Number.isFinite(commissionDurationMonths) ||
    commissionDurationMonths <= 0 ||
    commissionDurationMonths > 120
  ) {
    throw new Error("La durée doit être comprise entre 1 et 120 mois.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("affiliate_accounts")
    .update({
      status: input.status,
      commission_rate_bps: Math.round(commissionRatePercent * 100),
      commission_duration_months: commissionDurationMonths,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.accountId);

  if (error) {
    throw new Error(`Mise à jour du compte affilié impossible: ${error.message}`);
  }

  logSupportEvent("info", "affiliate_account_updated", {
    affiliateAccountId: input.accountId,
    status: input.status,
    commissionRatePercent,
    commissionDurationMonths,
  });
}

export async function updateAffiliateCommissionStatus(input: {
  commissionId: string;
  status: AffiliateCommissionStatus;
}) {
  if (!["pending", "payable", "paid", "void"].includes(input.status)) {
    throw new Error("Statut de commission invalide.");
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const existing = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("id", input.commissionId)
    .single<AffiliateCommissionRow>();

  if (existing.error || !existing.data) {
    throw new Error("Commission introuvable.");
  }

  let payoutId: string | null = existing.data.payout_id;

  if (input.status === "paid" && !payoutId) {
    const payout = await supabase
      .from("affiliate_payouts")
      .insert({
        affiliate_merchant_id: existing.data.affiliate_merchant_id,
        amount_cents: existing.data.commission_amount_cents,
        currency: existing.data.currency,
        status: "paid",
        paid_at: now,
        notes: `Paiement manuel commission ${existing.data.id}`,
      })
      .select("id")
      .single<{ id: string }>();

    if (payout.error || !payout.data) {
      throw new Error(`Création du paiement affilié impossible: ${payout.error?.message ?? "réponse vide"}`);
    }

    payoutId = payout.data.id;
  }

  const { error } = await supabase
    .from("affiliate_commissions")
    .update({
      status: input.status,
      payout_id: payoutId,
      updated_at: now,
    })
    .eq("id", input.commissionId);

  if (error) {
    throw new Error(`Mise à jour de la commission impossible: ${error.message}`);
  }

  if (input.status === "paid") {
    logSupportEvent("info", "affiliate_payout_marked_paid", {
      merchantId: existing.data.affiliate_merchant_id,
      referredMerchantId: existing.data.referred_merchant_id,
      commissionId: existing.data.id,
      amountCents: existing.data.commission_amount_cents,
    });
    await captureProductEvent("affiliate_payout_marked_paid", existing.data.affiliate_merchant_id, {
      merchantId: existing.data.affiliate_merchant_id,
      commissionId: existing.data.id,
      amountCents: existing.data.commission_amount_cents,
    });
  }
}
