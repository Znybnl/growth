import { notFound } from "next/navigation";
import { CampaignActionsMenu } from "@/components/merchant/campaign-actions-menu";

export default function AdminDuplicationProof() {
  if (process.env.NODE_ENV !== "development") notFound();
  // Synthetic UI only. Tests intercept every duplication request; this page
  // does not grant an admin session or bypass the real server permissions.
  return <main className="space-y-5 p-6">
    <h1 className="text-xl font-semibold">Fixture de duplication administrative</h1>
    <section aria-label="Administrateur" className="okado-card flex items-center justify-between gap-4 p-5">
      <span>Modèle E2E — Administrateur</span><CampaignActionsMenu campaignId="admin-copy-fixture" campaignTitle="Modèle E2E" allowAdminDuplicate />
    </section>
    <section aria-label="Marchand" className="okado-card flex items-center justify-between gap-4 p-5">
      <span>Jeu E2E — Marchand</span><CampaignActionsMenu campaignId="merchant-copy-fixture" campaignTitle="Jeu E2E" />
    </section>
  </main>;
}
