import type Stripe from "stripe";
import { getAffiliateAccountDirectory, getAffiliateWorkspaceId } from "@/lib/affiliate-account-directory";
import { readAllRows } from "@/lib/paginated-read";

import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
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
  workspace_id: string;
  canonical_account_id: string | null;
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
  affiliate_workspace_id: string;
  referred_workspace_id: string;
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
    workspaceId: row.workspace_id,
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

  const result = new Map<string, MerchantLiteRow>();
  for (let offset = 0; offset < uniqueMerchantIds.length; offset += 200) {
    const batch = await readAllRows((start, end) => getSupabaseAdmin().from("merchants")
      .select("id, company_name, restaurant_email", { count: "exact" }).in("id", uniqueMerchantIds.slice(offset, offset + 200)).order("id").range(start, end));
    if (batch.error) throw new Error("Lecture des marchands affiliés impossible.");
    for (const merchant of batch.data as MerchantLiteRow[]) result.set(merchant.id, merchant);
  }
  return result;
}

export async function ensureAffiliateAccountForMerchant(merchantId: string) {
  const supabase = getSupabaseAdmin();
  const workspaceId = await getAffiliateWorkspaceId(merchantId);
  async function existing() {
    const result = await supabase.from("affiliate_accounts").select("*")
      .eq("workspace_id", workspaceId).is("canonical_account_id", null).maybeSingle<AffiliateAccountRow>();
    if (result.error) throw new Error("Lecture du programme d’affiliation impossible.");
    return result.data;
  }
  const account = await existing();
  if (account) return toAffiliateAccount(account);
  for (let attempt = 0; attempt < 3; attempt++) {
    const insert = await supabase.from("affiliate_accounts").insert({
      merchant_id: merchantId, workspace_id: workspaceId,
      code: attempt ? `OKADO-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : formatAffiliateCode(merchantId),
      status: "disabled", commission_rate_bps: DEFAULT_COMMISSION_RATE_BPS,
      commission_duration_months: DEFAULT_COMMISSION_DURATION_MONTHS,
    }).select("*").single<AffiliateAccountRow>();
    if (!insert.error && insert.data) return toAffiliateAccount(insert.data);
    if (insert.error?.code !== "23505") throw new Error("Création du programme d’affiliation impossible.");
    const concurrent = await existing();
    if (concurrent) return toAffiliateAccount(concurrent);
  }
  throw new Error("Création du code d’affiliation impossible.");
}

export async function createAffiliateReferralForMerchant(input: {
  referredMerchantId: string; referralCode?: string | null; source: "signup" | "google_signup";
}) {
  const referralCode = normalizeAffiliateCode(input.referralCode);
  if (!referralCode) return null;
  const supabase = getSupabaseAdmin();
  const referredWorkspaceId = await getAffiliateWorkspaceId(input.referredMerchantId);
  const code = await supabase.from("affiliate_accounts").select("workspace_id").eq("code", referralCode)
    .maybeSingle<{ workspace_id: string }>();
  if (code.error) throw new Error("Lecture du code affilié impossible.");
  if (!code.data || code.data.workspace_id === referredWorkspaceId) return null;
  const account = await supabase.from("affiliate_accounts").select("*")
    .eq("workspace_id", code.data.workspace_id).is("canonical_account_id", null).eq("status", "active")
    .maybeSingle<AffiliateAccountRow>();
  if (account.error) throw new Error("Lecture du programme d’affiliation impossible.");
  if (!account.data) return null;
  const insert = await supabase.from("affiliate_referrals").insert({
    affiliate_account_id: account.data.id, affiliate_merchant_id: account.data.merchant_id,
    affiliate_workspace_id: account.data.workspace_id, referred_workspace_id: referredWorkspaceId,
    referred_merchant_id: input.referredMerchantId, referral_code: referralCode, source: input.source, status: "registered",
  }).select("id").single<{ id: string }>();
  if (insert.error?.code === "23505") return null;
  if (insert.error || !insert.data) throw new Error("Création de l’attribution affiliée impossible.");
  logSupportEvent("info", "affiliate_referral_created", { merchantId: account.data.merchant_id, referredMerchantId: input.referredMerchantId });
  await captureProductEvent("affiliate_referral_created", merchantDistinctId(account.data.merchant_id), {
    merchantId: account.data.merchant_id, referredMerchantId: input.referredMerchantId, source: input.source,
  });
  return insert.data.id;
}

async function readAffiliateRows<T>(table: string, order = "id") {
  const result = await readAllRows((start, end) => getSupabaseAdmin().from(table)
    .select("*", { count: "exact" }).order(order).range(start, end));
  if (result.error) throw new Error("Lecture de l’affiliation impossible.");
  return (result.data ?? []) as T[];
}

export async function getAffiliateSummaryForMerchant(
  merchant: Merchant,
): Promise<AffiliateSummary | null> {
  if (!isSupabaseConfigured()) return null;
  const workspaceId = merchant.workspaceId ?? await getAffiliateWorkspaceId(merchant.id);
  const found = await getSupabaseAdmin().from("affiliate_accounts").select("*")
    .eq("workspace_id", workspaceId).is("canonical_account_id", null).eq("status", "active").maybeSingle<AffiliateAccountRow>();
  if (found.error) throw new Error("Lecture de l’affiliation impossible.");
  if (!found.data) return null;
  const account = toAffiliateAccount(found.data);
  const supabase = getSupabaseAdmin();
  const result = await readAllRows((start, end) => supabase.from("affiliate_referrals").select("*", { count: "exact" })
    .eq("affiliate_workspace_id", workspaceId).order("created_at", { ascending: false }).range(start, end));
  if (result.error) throw new Error("Lecture des filleuls impossible.");
  const referrals = (result.data ?? []) as AffiliateReferralRow[];
  const commissions: AffiliateCommissionRow[] = [];
  for (let offset = 0; offset < referrals.length; offset += 200) {
    const rows = await readAllRows((start, end) => supabase.from("affiliate_commissions").select("*", { count: "exact" })
      .in("referral_id", referrals.slice(offset, offset + 200).map(ref => ref.id)).order("id").range(start, end));
    if (rows.error) throw new Error("Lecture des commissions impossible.");
    commissions.push(...rows.data as AffiliateCommissionRow[]);
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

export async function createAffiliateCommissionFromPaidInvoice(invoice: Stripe.Invoice, referredMerchantId?: string) {
  if (!referredMerchantId || !invoice.id || invoice.status !== "paid") return null;
  const amountCents = getInvoiceAmountExcludingTaxCents(invoice);
  if (amountCents <= 0) return null;
  const { data, error } = await getSupabaseAdmin().rpc("record_affiliate_paid_invoice_677", {
    p_merchant_id: referredMerchantId, p_invoice_id: invoice.id, p_paid_at: getInvoicePaidAt(invoice).toISOString(),
    p_amount_cents: amountCents, p_currency: invoice.currency ?? "eur", p_subscription_id: getInvoiceSubscriptionId(invoice) ?? null,
  });
  if (error) throw new Error("Enregistrement de la commission affiliée impossible.");
  if (data) {
    const created = await getSupabaseAdmin().from("affiliate_commissions")
      .select("affiliate_merchant_id, commission_amount_cents").eq("id", data)
      .maybeSingle<{ affiliate_merchant_id: string; commission_amount_cents: number }>();
    if (created.data) {
      const payload = { merchantId: created.data.affiliate_merchant_id, referredMerchantId,
        stripeInvoiceId: invoice.id, commissionAmountCents: created.data.commission_amount_cents };
      logSupportEvent("info", "affiliate_commission_created", payload);
      await captureProductEvent("affiliate_commission_created", merchantDistinctId(created.data.affiliate_merchant_id), payload);
    }
  }
  return data as string | null;
}

export async function markAffiliateReferralCanceled(referredMerchantId?: string) {
  if (!referredMerchantId) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("affiliate_referrals")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("referred_workspace_id", await getAffiliateWorkspaceId(referredMerchantId));

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
  const [allAccounts, referrals, commissions, directory] = await Promise.all([
    readAffiliateRows<AffiliateAccountRow>("affiliate_accounts"), readAffiliateRows<AffiliateReferralRow>("affiliate_referrals"),
    readAffiliateRows<AffiliateCommissionRow>("affiliate_commissions", "invoice_paid_at"), getAffiliateAccountDirectory(),
  ]);
  const accounts = allAccounts.filter(account => !account.canonical_account_id);
  const merchantIds = [
    ...(accounts ?? []).map((item) => item.merchant_id),
    ...(referrals ?? []).flatMap((item) => [item.affiliate_merchant_id, item.referred_merchant_id]),
    ...(commissions ?? []).flatMap((item) => [item.affiliate_merchant_id, item.referred_merchant_id]),
  ];
  const merchantMap = await fetchMerchantMap(merchantIds);
  const query = input?.query?.trim().toLowerCase() ?? "";
  const status = input?.status?.trim() ?? "all";

  const directoryByWorkspace = new Map(directory.map(owner => [owner.workspaceId, owner]));
  const referralById = new Map(referrals.map(ref => [ref.id, ref]));
  const commissionItems: AffiliateAdminCommissionItem[] = (commissions ?? [])
    .map((commission) => {
      const referral = referralById.get(commission.referral_id);
      const affiliateOwner = directoryByWorkspace.get(referral?.affiliate_workspace_id ?? "");
      const referredOwner = directoryByWorkspace.get(referral?.referred_workspace_id ?? "");
      const affiliate = merchantMap.get(commission.affiliate_merchant_id);
      const referred = merchantMap.get(commission.referred_merchant_id);

      return {
        id: commission.id,
        affiliateMerchantId: commission.affiliate_merchant_id,
        affiliateMerchantName: affiliateOwner?.merchantName ?? affiliate?.company_name ?? "Affilié",
        referredMerchantId: commission.referred_merchant_id,
        referredMerchantName: referredOwner?.merchantName ?? referred?.company_name ?? "Filleul",
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
  const accountItems: AffiliateAdminAccountItem[] = directory.map(owner => {
    const account = accounts.find(row => row.workspace_id === owner.workspaceId);
    const accountReferrals = referrals.filter(ref => ref.affiliate_workspace_id === owner.workspaceId);
    const ids = new Set(accountReferrals.map(ref => ref.id));
    const accountCommissions = commissions.filter(item => ids.has(item.referral_id));
    return {
      ...owner, id: account?.id ?? `workspace:${owner.workspaceId}`, code: account?.code ?? "À générer à l’activation",
      status: account?.status ?? "disabled", commissionRateBps: account?.commission_rate_bps ?? DEFAULT_COMMISSION_RATE_BPS,
      commissionDurationMonths: account?.commission_duration_months ?? DEFAULT_COMMISSION_DURATION_MONTHS,
      referralCount: accountReferrals.length,
      pendingCommissionCents: accountCommissions.filter(item => ["pending", "payable"].includes(item.status)).reduce((sum, item) => sum + item.commission_amount_cents, 0),
      paidCommissionCents: accountCommissions.filter(item => item.status === "paid").reduce((sum, item) => sum + item.commission_amount_cents, 0),
    };
  }).filter(account => !query || [account.merchantName, account.merchantEmail, account.workspaceName, account.code, account.status].some(value => value?.toLowerCase().includes(query)));

  return {
    totals: {
      affiliates: directory.length,
      activeAffiliates: directory.filter(owner => accounts.some(account => account.workspace_id === owner.workspaceId && account.status === "active")).length,
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
  let accountId = input.accountId;
  if (accountId.startsWith("workspace:")) {
    const workspaceId = accountId.slice("workspace:".length);
    const owner = (await getAffiliateAccountDirectory()).find(account => account.workspaceId === workspaceId);
    if (!owner) throw new Error("Compte marchand introuvable.");
    accountId = (await ensureAffiliateAccountForMerchant(owner.merchantId)).id;
  }
  const { data, error } = await supabase
    .from("affiliate_accounts")
    .update({
      status: input.status,
      commission_rate_bps: Math.round(commissionRatePercent * 100),
      commission_duration_months: commissionDurationMonths,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId).is("canonical_account_id", null).select("id").maybeSingle();

  if (error || !data) throw new Error("Mise à jour du compte affilié impossible.");

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
