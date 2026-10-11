import { notFound } from "next/navigation";
import { HandleEmailIncidentButton } from "@/components/merchant/handle-email-incident-button";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  // Synthetic UI only. This fixture grants no session; tests intercept mutations.
  return <main className="mx-auto max-w-xl p-4">
    <h1 className="text-xl font-semibold">Supervision — incident de test</h1>
    <article className="okado-card mt-6 p-4">
      <h2 className="font-semibold">Jeu de démonstration</h2>
      <p className="mt-2 text-sm">Échec d’envoi historique</p>
      <HandleEmailIncidentButton deliveryId="11111111-1111-4111-8111-111111111111"
        eventAt="2026-06-30T09:05:00.123456+00:00" status="failed" />
    </article>
  </main>;
}
