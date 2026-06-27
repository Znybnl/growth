import { Merchant, MerchantBillingSummary, MerchantSubscriptionStatus } from "@/lib/types";

const ACTIVE_SUBSCRIPTION_STATUSES: MerchantSubscriptionStatus[] = ["active", "trialing"];
const WARNING_SUBSCRIPTION_STATUSES: MerchantSubscriptionStatus[] = ["past_due", "unpaid"];

function startOfToday(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysUntil(endDate: string, now = new Date()) {
  const today = startOfToday(now).getTime();
  const end = startOfToday(new Date(endDate)).getTime();
  return Math.max(0, Math.ceil((end - today) / 86_400_000));
}

export function getMerchantBillingSummary(
  merchant: Pick<
    Merchant,
    | "trialStartDate"
    | "trialEndDate"
    | "stripeCustomerId"
    | "stripeSubscriptionId"
    | "stripeSubscriptionStatus"
    | "subscriptionCurrentPeriodEnd"
    | "subscriptionCancelAtPeriodEnd"
  >,
  now = new Date(),
): MerchantBillingSummary {
  const trialEndDate = merchant.trialEndDate;
  const subscriptionStatus = merchant.stripeSubscriptionStatus;
  const isTrialActive = Boolean(trialEndDate && new Date(trialEndDate).getTime() >= now.getTime());
  const isSubscribed = Boolean(
    subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.includes(subscriptionStatus),
  );
  const isPastDue = Boolean(
    subscriptionStatus && WARNING_SUBSCRIPTION_STATUSES.includes(subscriptionStatus),
  );
  const hasPaymentMethodOnFile = Boolean(merchant.stripeCustomerId && merchant.stripeSubscriptionId);
  const nextBillingDate =
    merchant.subscriptionCurrentPeriodEnd ??
    (isTrialActive ? merchant.trialEndDate : undefined);

  return {
    trialStartDate: merchant.trialStartDate,
    trialEndDate: merchant.trialEndDate,
    subscriptionStatus,
    subscriptionCurrentPeriodEnd: merchant.subscriptionCurrentPeriodEnd,
    subscriptionCancelAtPeriodEnd: merchant.subscriptionCancelAtPeriodEnd ?? false,
    stripeCustomerId: merchant.stripeCustomerId,
    stripeSubscriptionId: merchant.stripeSubscriptionId,
    hasPaymentMethodOnFile,
    isTrialActive,
    isSubscribed,
    isPastDue,
    isBillingLocked: !isTrialActive && !isSubscribed,
    daysLeftInTrial: trialEndDate ? daysUntil(trialEndDate, now) : 0,
    nextBillingDate,
  };
}

export function assertMerchantBillingAccess(
  merchant: Pick<
    Merchant,
    | "trialStartDate"
    | "trialEndDate"
    | "stripeCustomerId"
    | "stripeSubscriptionId"
    | "stripeSubscriptionStatus"
    | "subscriptionCurrentPeriodEnd"
    | "subscriptionCancelAtPeriodEnd"
  >,
  feature: "campaign_public" | "csv_export",
) {
  const summary = getMerchantBillingSummary(merchant);

  if (!summary.isBillingLocked) {
    return summary;
  }

  if (feature === "campaign_public") {
    throw new Error("Votre essai est terminé. Activez votre abonnement pour réouvrir le jeu.");
  }

  throw new Error("Votre essai est terminé. Activez votre abonnement pour exporter vos saisies.");
}
