import { requireAuthenticatedSession } from "@/lib/auth";
import { isSaasAdminEmail } from "@/lib/admin";
import { getSupportMonitoring, parseSupportFilters } from "@/lib/support-monitoring";
import type { SupportParams } from "@/lib/support-monitoring";
import { SupportDashboard } from "@/components/merchant/support-dashboard";
import { BrevoSyncButton } from "@/components/merchant/brevo-sync-button";
import { PageHeader } from "@/components/ui/workspace";
import { redirect } from "next/navigation";

export default async function SupportPage({ searchParams }: { searchParams: Promise<SupportParams> }) {
  const session = await requireAuthenticatedSession();
  if (!isSaasAdminEmail(session.user.email)) redirect("/");
  const filters = parseSupportFilters(await searchParams);
  const data = await getSupportMonitoring(session.user.email, filters);
  return <div className="min-w-0 space-y-6">
    <PageHeader eyebrow="Supervision" title="Centre de supervision"
      description="Incidents, files d’attente et historique des jeux. Les observations techniques restent distinctes du suivi des gains." />
    <SupportDashboard data={data} filters={filters} />
    <BrevoSyncButton />
  </div>;
}
