import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordRecoveryRequestForm } from "@/components/auth/password-recovery-request-form";

export const metadata = {
  title: "Mot de passe oublié | Okado",
  description: "Demandez un lien pour réinitialiser le mot de passe de votre compte Okado.",
  robots: { index: false, follow: false },
};

export default function PasswordRecoveryRequestPage() {
  return (
    <AuthShell
      eyebrow="Connexion marchand"
      title="Retrouvez votre espace marchand."
      description="Demandez un lien sécurisé pour réinitialiser votre mot de passe."
      asideTitle="Votre activité vous attend"
      asideBody="Retrouvez vos campagnes et vos performances après votre reconnexion."
      asideItems={[
        "Vos campagnes et leurs participations",
        "Vos lots et retraits",
        "Les performances de vos établissements",
      ]}
    >
      <PasswordRecoveryRequestForm />
    </AuthShell>
  );
}
