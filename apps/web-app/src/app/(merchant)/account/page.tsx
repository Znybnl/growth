import { measureServerStage } from "@/lib/server-performance";
import { AccountSettingsForm } from "@/components/merchant/account-settings-form";
import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/ui/workspace";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getMerchantBillingSummary } from "@/lib/billing";
import { getMerchantRedemptionPinStates } from "@/lib/store";

type AccountPageProps = {
  searchParams?: Promise<{
    billing?: string;
  }>;
};

export default async function AccountPage(props: Parameters<typeof AccountPageContent>[0]) {
  return measureServerStage("page.account", () => AccountPageContent(props));
}

async function AccountPageContent({ searchParams }: AccountPageProps) {
  const session = await requireAuthenticatedSession();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const merchant = session.merchant;
  const paymentReturn = resolvedSearchParams?.billing === "success";
  const billing = getMerchantBillingSummary(merchant);
  const redemptionPinStates = await getMerchantRedemptionPinStates([merchant.id]).catch(() => ({}));
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Compte marchand"
        title="Mon compte"
        description="Profil, abonnement et réglages de l’établissement sélectionné."
        icon={<Settings2 className="h-5 w-5" />}
      />
      <AccountSettingsForm
        merchant={merchant}
        user={session.user}
        locations={session.locations}
        redemptionPinStates={redemptionPinStates}
        billing={billing}
        paymentReturn={paymentReturn}
      />
    </div>
  );
}
