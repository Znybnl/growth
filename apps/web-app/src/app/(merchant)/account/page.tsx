import { AccountSettingsForm } from "@/components/merchant/account-settings-form";
import { BillingSubscriptionCard } from "@/components/merchant/billing-subscription-card";
import { Settings2 } from "lucide-react";
import { getAffiliateSummaryForMerchant } from "@/lib/affiliate-repository";
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

  // The affiliate panel does not depend on the Stripe synchronization. Start
  // both requests together so the account page is not blocked by a sequential
  // network waterfall.
  const affiliateSummaryPromise = getAffiliateSummaryForMerchant(merchant).catch((error) => {
    console.error("Affiliate summary unavailable", error);
    return null;
  });

  if (shouldAttemptStripeSync && merchant.stripeCustomerId) {
    try {
      const syncedMerchant = await syncMerchantBillingFromStripeCustomerIdInSupabase(
        merchant.stripeCustomerId,
      );

      if (syncedMerchant) {
        merchant = syncedMerchant;
      }
    } catch (error) {
      console.error("Stripe billing sync failed on account page", error);
    }
  }

  const billing = getMerchantBillingSummary(merchant);
  const affiliateSummary = await affiliateSummaryPromise;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[24px] border border-border bg-white p-5 shadow-[0_16px_42px_rgba(122,136,166,0.08)] md:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#dbe6ff] blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#edf3ff] text-[#145aff]"><Settings2 className="h-6 w-6" aria-hidden="true" /></span>
            <div>
              <p className="okado-label">Compte marchand</p>
              <h1 className="okado-page-title mt-2">Mon compte</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-ash">
                Gérez votre profil, votre abonnement et les réglages de l’établissement actuellement sélectionné.
              </p>
            </div>
          </div>
          <button type="submit" form="account-settings-form" className="okado-filled-action w-full px-5 xl:w-auto">
            Enregistrer les modifications
          </button>
        </div>
      </section>

      <BillingSubscriptionCard billing={billing} />
      <AccountSettingsForm
        merchant={merchant}
        user={session.user}
        locations={session.locations}
        affiliateSummary={affiliateSummary}
      />
    </div>
  );
}
