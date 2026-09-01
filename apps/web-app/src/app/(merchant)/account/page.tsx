import { AccountSettingsForm } from "@/components/merchant/account-settings-form";
import { BillingSubscriptionCard } from "@/components/merchant/billing-subscription-card";
import { Settings2 } from "lucide-react";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getMerchantBillingSummary } from "@/lib/billing";
import { syncMerchantBillingFromStripeCustomerIdInSupabase } from "@/lib/merchant-account-repository";

type AccountPageProps = {
  searchParams?: Promise<{
    billing?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = await requireAuthenticatedSession();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  let merchant = session.merchant;

  const shouldAttemptStripeSync = Boolean(
    merchant.stripeCustomerId &&
      (resolvedSearchParams?.billing === "success" ||
        (!merchant.stripeSubscriptionId && !merchant.stripeSubscriptionStatus)),
  );

  if (shouldAttemptStripeSync && merchant.stripeCustomerId) {
    try {
      const syncedMerchant = await syncMerchantBillingFromStripeCustomerIdInSupabase(
        merchant.stripeCustomerId,
      );

      if (syncedMerchant) {
        // Stripe billing belongs to the workspace owner, while the account
        // page edits the currently selected establishment. Merge only the
        // billing fields so a sync can never replace establishment-specific
        // settings such as the Google review URL.
        merchant = {
          ...merchant,
          stripeCustomerId: syncedMerchant.stripeCustomerId ?? merchant.stripeCustomerId,
          stripeSubscriptionId: syncedMerchant.stripeSubscriptionId ?? merchant.stripeSubscriptionId,
          stripeSubscriptionStatus:
            syncedMerchant.stripeSubscriptionStatus ?? merchant.stripeSubscriptionStatus,
          trialStartDate: syncedMerchant.trialStartDate ?? merchant.trialStartDate,
          trialEndDate: syncedMerchant.trialEndDate ?? merchant.trialEndDate,
          subscriptionCurrentPeriodEnd:
            syncedMerchant.subscriptionCurrentPeriodEnd ?? merchant.subscriptionCurrentPeriodEnd,
          subscriptionCancelAtPeriodEnd:
            syncedMerchant.subscriptionCancelAtPeriodEnd ?? merchant.subscriptionCancelAtPeriodEnd,
        };
      }
    } catch (error) {
      console.error("Stripe billing sync failed on account page", error);
    }
  }

  const billing = getMerchantBillingSummary(merchant);
  return (
    <div className="space-y-4">
      <header className="okado-account-header">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="okado-account-header__icon"><Settings2 className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="okado-label">Compte marchand</p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-carbon md:text-3xl">Mon compte</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ash">Profil, abonnement et réglages de l’établissement sélectionné.</p>
          </div>
        </div>
        <button type="submit" form="account-settings-form" className="okado-filled-action w-full px-5 xl:w-auto">
          Enregistrer les modifications
        </button>
      </header>
      <BillingSubscriptionCard billing={billing} />
      <AccountSettingsForm
        merchant={merchant}
        user={session.user}
        locations={session.locations}
      />
    </div>
  );
}
