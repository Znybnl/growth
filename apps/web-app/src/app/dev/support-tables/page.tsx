import { notFound } from "next/navigation";
import { SupportTables } from "@/components/merchant/support-tables";
import type { MerchantSupportOverview } from "@/lib/types";

export default async function Page({ searchParams }: { searchParams: Promise<{ empty?: string; handled?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const showHandled = params.handled === "1";
  // Synthetic presentation only: no database, session or authorisation bypass.
  const rows: MerchantSupportOverview = {
    activeEmailCount: 1, handledEmails: [],
    failedEmails: [{ deliveryId: "11111111-1111-4111-8111-111111111111", campaignId: "demo", campaignTitle: "Jeu de démonstration",
      leadId: "demo-player", leadFirstName: "Camille", recipientEmail: "camille@example.test", status: "failed",
      errorMessage: "Erreur de livraison de démonstration. " + "UnMessageSansEspace".repeat(16),
      lastEventAt: "2026-06-30T09:05:00.123456+00:00", eventAt: "2026-06-30T09:05:00.123456+00:00",
      ...(showHandled ? { handledAt: "2026-10-11T12:00:00Z" } : {}) }],
    webhooks: [{ id: "demo-event", createdAt: "2026-10-11T10:00:00Z", eventType: "email.delivered",
      campaignTitle: "Jeu de démonstration", recipientEmail: "camille@example.test", deliveryStatus: "delivered", summary: "Message accepté par le serveur destinataire." }],
    pendingClaims: [{ leadId: "demo-player", campaignId: "demo", campaignTitle: "Jeu de démonstration", firstName: "Camille",
      email: "camille@example.test", prizeLabel: "Un soin offert", redemptionCode: "DEMO-NON-VALIDE", status: "claimed",
      availableAt: "2026-10-11T10:00:00Z", expiresAt: "2026-11-11T10:00:00Z" }],
    businessLogs: [{ id: "demo-log", createdAt: "2026-10-11T10:00:00Z", event: "demo_event", level: "info",
      campaignId: "demo", leadId: "demo-player", email: "camille@example.test", redemptionCode: "DEMO-NON-VALIDE",
      summary: "Journal synthétique, sans écriture ni e-mail réel." }],
  };
  if (params.empty === "1") { rows.failedEmails = []; rows.webhooks = []; rows.pendingClaims = []; rows.businessLogs = []; }
  return <main className="okado-workspace-shell mx-auto min-w-0 max-w-[1400px] p-4 sm:p-8">
    <h1 className="okado-page-title mb-6">Supervision — tableaux de démonstration</h1>
    <SupportTables rows={rows} showHandled={showHandled} hasFilter={false} />
  </main>;
}
