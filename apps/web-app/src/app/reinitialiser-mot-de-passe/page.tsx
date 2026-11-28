import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";

export const metadata = {
  title: "Réinitialiser le mot de passe | Okado",
  description: "Définissez un nouveau mot de passe pour votre compte Okado.",
  robots: { index: false, follow: false },
};

export default function PasswordRecoveryPage() {
  return (
    <AuthShell
      eyebrow="Connexion marchand"
      title="Sécurisez votre espace."
      description="Choisissez un nouveau mot de passe pour retrouver l’accès à votre compte."
      asideTitle="Vos campagnes restent à portée de main"
      asideBody="Une fois reconnecté, retrouvez votre activité marchande dans son état actuel."
      asideItems={[
        "Vos établissements et leurs accès",
        "Vos campagnes, lots et résultats",
        "Vos abonnements et périodes d’essai",
      ]}
    >
      <PasswordRecoveryForm />
    </AuthShell>
  );
}
