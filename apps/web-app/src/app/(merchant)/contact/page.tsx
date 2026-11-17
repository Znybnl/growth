import { Mail } from "lucide-react";

import { ContactForm } from "@/components/merchant/contact-form";
import { PageHeader } from "@/components/ui/workspace";
import { requireAuthenticatedSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const session = await requireAuthenticatedSession();
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Votre compte"
        title="Aide et contact"
        description="Signalez un problème, proposez une amélioration ou posez une question à l’équipe Okado."
        icon={<Mail className="h-5 w-5" />}
      />
      <ContactForm email={session.user.email} />
    </div>
  );
}
