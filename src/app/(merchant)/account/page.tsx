import { AccountSettingsForm } from "@/components/merchant/account-settings-form";
import { BillingSubscriptionCard } from "@/components/merchant/billing-subscription-card";
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

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-[#dbe4f0] bg-white shadow-[0_20px_50px_rgba(122,136,166,0.14)]">
        <div className="flex flex-col gap-5 px-6 py-7 xl:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
              Compte & facturation
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-none text-[#0f1728]">
              Votre espace marchand
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c6577]">
              Gérez les informations de votre utilisateur, de votre restaurant et de vos
              réseaux marketing, puis pilotez votre abonnement depuis un seul écran.
            </p>
          </div>
        </div>
      </section>

      <BillingSubscriptionCard billing={billing} />
      <AccountSettingsForm merchant={merchant} user={session.user} />
    </div>
  );
}
