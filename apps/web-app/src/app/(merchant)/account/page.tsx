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
      <section className="relative overflow-hidden rounded-[16px] border border-aubergine/30 bg-deep-plum p-5 text-white shadow-[0_16px_42px_rgba(72,26,84,0.18)] md:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-aubergine/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[4px] bg-white/10 text-white"><Settings2 className="h-6 w-6" aria-hidden="true" /></span>
            <div>
              <p className="okado-label !text-white/60">Compte marchand</p>
              <h1 className="okado-page-title mt-2 !text-white">Mon compte</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">
                Gérez votre profil, votre abonnement et les réglages de l’établissement actuellement sélectionné.
              </p>
            </div>
          </div>
          <button type="submit" form="account-settings-form" className="okado-secondary-action w-full !border-white/20 !bg-white !text-deep-plum px-5 xl:w-auto">
            Enregistrer les modifications
          </button>
        </div>
      </section>

      <BillingSubscriptionCard billing={billing} />
      <AccountSettingsForm
        merchant={merchant}
        user={session.user}
        locations={session.locations}
      />
    </div>
  );
}
