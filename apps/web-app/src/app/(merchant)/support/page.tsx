import { BrevoSyncButton } from "@/components/merchant/brevo-sync-button";
import { SupportTables } from "@/components/merchant/support-tables";
import { requireAuthenticatedSession } from "@/lib/auth";
import { isSaasAdminEmail } from "@/lib/admin";
import { getMerchantSupportOverview } from "@/lib/store";
import { MetricCard, PageHeader } from "@/components/ui/workspace";
import { StatusBadge as SharedStatusBadge } from "@/components/ui/status-badge";
import { redirect } from "next/navigation";

type SupportPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    section?: string;
    incidents?: string;
  }>;
};

function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "danger" | "warning" | "success";
}) {
  return <SharedStatusBadge tone={tone === "neutral" ? "muted" : tone === "success" ? "active" : tone}>{label}</SharedStatusBadge>;
}

function includesQuery(values: Array<string | undefined>, query: string) {
  if (!query) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(query));
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;

  if (!isSaasAdminEmail(session.user.email)) {
    redirect("/");
  }

  const overview = await getMerchantSupportOverview(session.merchant.id, session.merchant, {
    includeAllMerchants: true,
  });
  const query = params.q?.trim().toLowerCase() ?? "";
  const status = params.status?.trim() ?? "all";
  const section = params.section?.trim() ?? "all";
  const showHandled = params.incidents === "handled";
  const filteredOverview = {
    failedEmails:
      section === "all" || section === "emails"
        ? (showHandled ? overview.handledEmails : overview.failedEmails).filter(
            (item) =>
              (status === "all" || item.status === status) &&
              includesQuery(
                [
                  item.campaignTitle,
                  item.leadFirstName,
                  item.recipientEmail,
                  item.errorMessage,
                  item.deliveryId,
                  item.leadId,
                ],
                query,
              ),
          )
        : [],
    webhooks:
      section === "all" || section === "webhooks"
        ? overview.webhooks.filter(
            (item) =>
              (status === "all" || item.deliveryStatus === status || item.eventType === status) &&
              includesQuery(
                [
                  item.eventType,
                  item.resendEmailId,
                  item.campaignTitle,
                  item.recipientEmail,
                  item.deliveryStatus,
                  item.summary,
                ],
                query,
              ),
          )
        : [],
    pendingClaims:
      section === "all" || section === "claims"
        ? overview.pendingClaims.filter(
            (item) =>
              (status === "all" || item.status === status) &&
              includesQuery(
                [
                  item.campaignTitle,
                  item.firstName,
                  item.email,
                  item.prizeLabel,
                  item.redemptionCode,
                  item.status,
                ],
                query,
              ),
          )
        : [],
    businessLogs:
      section === "all" || section === "logs"
        ? overview.businessLogs.filter(
            (item) =>
              (status === "all" || item.level === status || item.event === status) &&
              includesQuery(
                [
                  item.event,
                  item.summary,
                  item.merchantId,
                  item.campaignId,
                  item.leadId,
                  item.email,
                  item.redemptionCode,
                ],
                query,
              ),
          )
        : [],
  };
  const hasFilter = Boolean(query || status !== "all" || section !== "all" || showHandled);
  const errorLogsCount = overview.businessLogs.filter((item) => item.level === "error").length;
  const failedEmailCount = overview.activeEmailCount;
  const pendingClaimCount = overview.pendingClaims.length;
  const webhookCount = overview.webhooks.length;
  const healthItems = [
    {
      label: "E-mails en échec",
      value: failedEmailCount,
      tone: failedEmailCount ? "danger" : "success",
      detail: failedEmailCount ? "À traiter avant pilote" : "Aucun blocage récent",
    },
    {
      label: "Webhooks reçus",
      value: webhookCount,
      tone: webhookCount ? "success" : "warning",
      detail: webhookCount ? "Synchronisation active" : "Aucun signal récent",
    },
    {
      label: "Gains sans retrait",
      value: pendingClaimCount,
      tone: pendingClaimCount ? "warning" : "success",
      detail: pendingClaimCount ? "Suivi vendeur requis" : "Aucun gain en attente",
    },
    {
      label: "Erreurs métier",
      value: errorLogsCount,
      tone: errorLogsCount ? "danger" : "success",
      detail: errorLogsCount ? "Investigation support" : "Aucune erreur récente",
    },
  ] as const;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Supervision"
        title="Centre de supervision"
        description="Retrouvez les e-mails en échec, les webhooks Resend reçus et les gains encore en attente de retrait depuis un seul écran support."
      />

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["E-mails à traiter", String(failedEmailCount)],
          ["Webhooks reçus", String(filteredOverview.webhooks.length)],
          ["Gains sans retrait", String(filteredOverview.pendingClaims.length)],
          ["Logs métier", String(filteredOverview.businessLogs.length)],
        ].map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}
      </section>

      <section className="rounded-[8px] border border-border bg-primary-action-accent p-6 text-white shadow-product-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="okado-label text-[#9fb0d0]">Santé production</p>
            <h2 className="mt-2 text-3xl font-semibold">Signaux support à surveiller</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[#c7d2ea]">
            Synthèse des points qui peuvent bloquer un pilote : délivrabilité e-mail,
            synchronisation webhook, lots non retirés et erreurs métier récentes.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {healthItems.map((item) => (
            <div key={item.label} className="rounded-[8px] bg-white/8 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <StatusBadge
                  label={item.tone === "success" ? "OK" : item.tone === "warning" ? "À suivre" : "Action"}
                  tone={item.tone}
                />
              </div>
              <p className="mt-4 text-3xl font-semibold">{item.value}</p>
              <p className="mt-2 text-sm text-[#c7d2ea]">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <BrevoSyncButton />

      <section className="okado-card p-5">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_150px_180px_160px_auto]" action="/support">
          <label className="text-sm">
            <span className="mb-2 block text-ash">Recherche support</span>
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="E-mail, code retrait, campagne, participant..."
              className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-3 outline-none"
            />
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-ash">Section</span>
            <select
              name="section"
              defaultValue={section}
              className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-3 outline-none"
            >
              <option value="all">Toutes</option>
              <option value="emails">E-mails</option>
              <option value="webhooks">Webhooks</option>
              <option value="claims">Gains sans retrait</option>
              <option value="logs">Journal métier</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-ash">Statut / événement</span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-3 outline-none"
            >
              <option value="all">Tous</option>
              <option value="failed">E-mail en échec</option>
              <option value="bounced">Rebond</option>
              <option value="complained">Plainte</option>
              <option value="suppressed">Supprimé</option>
              <option value="claimed">Gain à retirer</option>
              <option value="redeemed">Gain retiré</option>
              <option value="email.delivered">Webhook livré</option>
              <option value="email.bounced">Webhook rebond</option>
              <option value="info">Log info</option>
              <option value="warn">Log attention</option>
              <option value="error">Log erreur</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-ash">Incidents d’e-mail</span>
            <select name="incidents" defaultValue={showHandled ? "handled" : "active"}
              className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-3 outline-none">
              <option value="active">À traiter</option>
              <option value="handled">Traités</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="okado-primary-action px-5"
            >
              Filtrer
            </button>
            {hasFilter ? (
              <a
                href="/support"
                className="okado-secondary-action px-5"
              >
                Effacer
              </a>
            ) : null}
          </div>
        </form>
      </section>

      <SupportTables rows={filteredOverview} showHandled={showHandled} hasFilter={hasFilter} />
    </div>
  );
}
