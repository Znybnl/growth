import { AccountSettingsForm } from "@/components/merchant/account-settings-form";
import { BillingSubscriptionCard } from "@/components/merchant/billing-subscription-card";
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
  const affiliateSummary = await getAffiliateSummaryForMerchant(merchant).catch((error) => {
    console.error("Affiliate summary unavailable", error);
    return null;
  });

  return (
    <div className="space-y-6">
      <section className="px-1 py-2">
        <div className="flex flex-col gap-5">
          <div>
            <p className="okado-label">
              Compte & facturation
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-none text-midnight-ink">
              Votre espace marchand
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ash">
              Gérez les informations de votre utilisateur, de votre restaurant et de vos
              réseaux marketing, puis pilotez votre abonnement depuis un seul écran.
            </p>
          </div>
        </div>
      </section>

      <BillingSubscriptionCard billing={billing} />
      <AccountSettingsForm
        merchant={merchant}
        user={session.user}
        affiliateSummary={affiliateSummary}
      />
    </div>
  );
}
