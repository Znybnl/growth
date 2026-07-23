import Link from "next/link";

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
            <h1 className="okado-page-title mt-3">
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
      <section id="communication" className="okado-card p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="okado-label">Communication</p>
            <h2 className="okado-section-title mt-2">E-mails de gain</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ash">
              Le modèle recommandé est utilisé automatiquement pour chaque campagne. Le nom de votre
              commerce et son adresse de contact servent de valeurs par défaut.
            </p>
          </div>
          <Link href="/campaigns" className="okado-primary-action shrink-0 px-4 py-3">
            Gérer depuis une campagne
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[8px] border border-border bg-linen-canvas px-4 py-3">
            <p className="okado-label">Expéditeur</p>
            <p className="mt-1 text-sm font-semibold text-graphite">{merchant.companyName}</p>
          </div>
          <div className="rounded-[8px] border border-border bg-linen-canvas px-4 py-3">
            <p className="okado-label">Adresse de réponse</p>
            <p className="mt-1 text-sm font-semibold text-graphite">
              {merchant.restaurantEmail || "À renseigner dans les informations du commerce"}
            </p>
          </div>
        </div>
      </section>
      <AccountSettingsForm
        merchant={merchant}
        user={session.user}
        affiliateSummary={affiliateSummary}
      />
    </div>
  );
}

