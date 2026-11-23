import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { MerchantAnalyticsIdentity } from "@/components/merchant/merchant-analytics-identity";
import { MerchantSessionGuard } from "@/components/merchant/merchant-session-guard";
import type { Merchant, MerchantUser } from "@/lib/types";

export function OnboardingScreen({ merchant, user }: {
  merchant: Merchant;
  user: Pick<MerchantUser, "id" | "merchantId" | "email">;
}) {
  return (
    <AuthShell
      eyebrow="Onboarding boutique"
      title="Cadrez votre dispositif avant la première campagne."
      description="Un onboarding en 3 étapes pour renseigner le profil, les liens marketing et le code de retrait."
      asideTitle="Ce que l'on prépare"
      asideBody="L'idée est d'arriver sur la création de campagne avec des choix déjà clairs et des actions déjà préconfigurées."
      asideItems={[
        "Renseigner le profil de l’établissement",
        "Ajouter les liens marketing utiles",
        "Sécuriser les retraits avec un code PIN",
      ]}
      flatContent
    >
      <MerchantSessionGuard userId={user.id} />
      <MerchantAnalyticsIdentity
        accountMerchantId={user.merchantId}
        userId={user.id}
        activeMerchantId={merchant.id}
        email={user.email}
      />
      <OnboardingFlow merchant={merchant} />
    </AuthShell>
  );
}
