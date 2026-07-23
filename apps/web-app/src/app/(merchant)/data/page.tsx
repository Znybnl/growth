import Link from "next/link";

import { DataSearchForm } from "@/components/merchant/data-search-form";
import { LeadPrizeActions } from "@/components/merchant/lead-prize-actions";
import { PrizeStockActions } from "@/components/merchant/prize-stock-actions";
import { requireAuthenticatedSession } from "@/lib/auth";
import {
  rewardEmailStatusLabel,
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatShortDate,
  leadStatusLabel,
} from "@/lib/format";
import {
  findMerchantLeadCampaign,
  getCampaignDataView,
  getMerchantCampaignLibrary,
  getPrimaryCampaignId,
} from "@/lib/store";
import { CampaignAction, CampaignEvent, MerchantLeadRow, RewardEmailDeliveryStatus } from "@/lib/types";

type DataPageProps = {
  searchParams: Promise<{
    campaign?: string;
    q?: string;
    code?: string;
    page?: string;
    emailStatus?: string;
  }>;
};

function isRewardExpired(status: string, rewardExpiresAt?: string) {
  return (
    status === "expired" ||
    (rewardExpiresAt ? new Date(rewardExpiresAt).getTime() < Date.now() : false)
  );
}

function Histogram({
  title,
  eyebrow,
  bars,
  color,
}: {
  title: string;
  eyebrow: string;
  bars: Array<{ label: string; value: number }>;
  color: string;
}) {
  const max = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <div className="okado-card p-6">
      <p className="okado-label">{eyebrow}</p>
      <h2 className="okado-section-title mt-2">{title}</h2>
      <div className="mt-6 grid h-[240px] grid-cols-7 gap-3">
        {bars.map((bar) => (
          <div key={bar.label} className="flex min-w-0 flex-col items-center justify-end gap-3">
            <span className="text-sm font-semibold text-graphite">{bar.value}</span>
            <div className="flex h-full w-full items-end rounded-[8px] bg-sky-wash p-1">
              <div
                className="w-full rounded-[14px]"
                style={{
                  height: `${Math.max((bar.value / max) * 100, bar.value > 0 ? 10 : 0)}%`,
                  backgroundColor: color,
                  minHeight: bar.value > 0 ? "10px" : "0px",
                }}
              />
            </div>
            <span className="text-center text-xs text-ash">
              {formatShortDate(`${bar.label}T00:00:00.000Z`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function eventLabel(eventType: CampaignEvent["eventType"]) {
  switch (eventType) {
    case "scan":
      return "Scan";
    case "form_started":
      return "Formulaire démarré";
    case "lead_created":
      return "Lead créé";
    case "review_clicked":
      return "Avis Google ouvert";
    case "review_confirmed":
      return "Avis confirmé";
    case "social_clicked":
      return "Action marketing ouverte";
    case "game_played":
      return "Partie lancée";
    case "prize_won":
      return "Lot gagné";
    case "prize_redeemed":
      return "Lot récupéré";
    case "prize_expired":
      return "Lot expiré";
    case "prize_reset":
      return "Lot réinitialisé";
    default:
      return String(eventType).replaceAll("_", " ");
  }
}

function buildActionVolumes(
  volumes: Array<{ actionIndex: number; value: number }>,
  actions: CampaignAction[],
) {
  if (!actions.length) {
    return [];
  }

  const byIndex = new Map(volumes.map((item) => [item.actionIndex, item.value]));

  return actions.map((action, index) => ({
    id: action.id,
    label: `Action ${index + 1}`,
    kind: action.kind,
    value: byIndex.get(index) ?? 0,
  }));
}

function leadStatusTone(status: MerchantLeadRow["status"]) {
  switch (status) {
    case "redeemed":
      return "bg-[#ecfdf3] text-[#047857]";
    case "claimed":
      return "bg-[#eff6ff] text-[#1d4ed8]";
    case "lost":
      return "bg-[#f3f4f6] text-[#4b5563]";
    case "expired":
      return "bg-[#fff7ed] text-[#c2410c]";
    default:
      return "bg-[#f8fafc] text-[#505b6e]";
  }
}

function LeadsExportSection({
  campaignId,
  leads,
  total,
  offset,
  limit,
  query,
  emailStatus,
}: {
  campaignId: string;
  leads: MerchantLeadRow[];
  total: number;
  offset: number;
  limit: number;
  query: string;
  emailStatus?: "attention";
}) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageHref = (page: number) => {
    const params = new URLSearchParams({ campaign: campaignId, page: String(page) });
    if (query) params.set("q", query);
    if (emailStatus) params.set("emailStatus", emailStatus);
    return `/data?${params.toString()}`;
  };

  return (
    <section className="okado-card p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="okado-label">Saisies et export</p>
          <h2 className="okado-section-title mt-2">
            Contacts, statuts et consentements
          </h2>
        </div>
        <Link
          href={`/api/merchant/leads?format=csv&campaign=${campaignId}`}
          prefetch={false}
          className="okado-primary-action cursor-pointer px-4 py-3"
        >
          Export CSV
        </Link>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="okado-table-header">
            <tr>
              <th className="px-3 py-3">Lead</th>
              <th className="px-3 py-3">Statut</th>
              <th className="px-3 py-3">Lot</th>
              <th className="w-[150px] max-w-[150px] px-3 py-3">Email gain</th>
              <th className="px-3 py-3">Retrait</th>
              <th className="px-3 py-3">Consentement</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="border-b border-[#eef2f7] px-3 py-4">
                  <div className="font-semibold text-graphite">{lead.firstName}</div>
                  <div className="text-ash">{lead.email}</div>
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-4 text-slate">
                  <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${leadStatusTone(lead.status)}`}>
                    {leadStatusLabel(lead.status)}
                  </span>
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-4 text-slate">
                  {lead.prizeLabel}
                  {lead.redemptionCode ? (
                    <div className="mt-1 font-mono text-xs text-ash">
                      {lead.redemptionCode}
                    </div>
                  ) : null}
                  {lead.prizeUsageConditions ? (
                    <div className="mt-2 max-w-[280px] whitespace-pre-line rounded-[12px] bg-[#fff8e8] px-3 py-2 text-xs leading-5 text-[#6c5313]">
                      {lead.prizeUsageConditions}
                    </div>
                  ) : null}
                </td>
                <td className="w-[150px] max-w-[150px] border-b border-[#eef2f7] px-3 py-4 align-top text-slate">
                  <div className="w-[140px] max-w-[140px] overflow-hidden">
                    <span
                      className={`inline-flex max-w-full truncate rounded-full px-3 py-1.5 text-xs font-semibold ${rewardEmailTone(lead.emailDeliveryStatus)}`}
                      title={rewardEmailStatusLabel(lead.emailDeliveryStatus)}
                    >
                      {rewardEmailStatusLabel(lead.emailDeliveryStatus)}
                    </span>
                  </div>
                  {lead.emailDeliveredAt ? (
                    <div className="mt-1 truncate text-xs text-ash">
                      Distribué le {formatDateTime(lead.emailDeliveredAt)}
                    </div>
                  ) : lead.emailSentAt ? (
                    <div className="mt-1 truncate text-xs text-ash">
                      Envoyé le {formatDateTime(lead.emailSentAt)}
                    </div>
                  ) : null}
                  {lead.emailErrorMessage ? (
                    <div className="mt-1 max-w-[140px] truncate text-xs font-semibold text-[#c2410c]" title={lead.emailErrorMessage}>
                      {lead.emailErrorMessage}
                    </div>
                  ) : null}
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-4 text-slate">
                  <LeadPrizeActions
                    leadId={lead.id}
                    status={lead.status}
                    hasPrize={Boolean(lead.prizeId)}
                    usageConditions={lead.prizeUsageConditions}
                    isExpired={isRewardExpired(lead.status, lead.rewardExpiresAt)}
                    emailDeliveryStatus={lead.emailDeliveryStatus}
                    emailSentAt={lead.emailSentAt}
                  />
                </td>
                <td className="border-b border-[#eef2f7] px-3 py-4 text-slate">
                  {lead.marketingConsent && lead.consentTimestamp
                    ? formatDateTime(lead.consentTimestamp)
                    : "Non"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > limit ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-sm">
          <p className="text-ash">
            {offset + 1}-{Math.min(offset + leads.length, total)} sur {total} saisies
          </p>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link href={pageHref(currentPage - 1)} prefetch={false} className="okado-secondary-action px-3 py-2">
                Précédent
              </Link>
            ) : null}
            <span className="rounded-[8px] bg-linen-canvas px-3 py-2 font-semibold text-graphite">
              Page {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link href={pageHref(currentPage + 1)} prefetch={false} className="okado-secondary-action px-3 py-2">
                Suivant
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function rewardEmailTone(status?: RewardEmailDeliveryStatus) {
  switch (status) {
    case "delivered":
      return "bg-[#ecfdf3] text-[#047857]";
    case "sent":
      return "bg-[#eff6ff] text-[#1d4ed8]";
    case "queued":
      return "bg-[#fff7ed] text-[#c2410c]";
    case "failed":
    case "bounced":
    case "complained":
    case "suppressed":
      return "bg-[#fff1f2] text-[#be123c]";
    default:
      return "bg-[#f3f4f6] text-[#4b5563]";
  }
}

export default async function DataPage({ searchParams }: DataPageProps) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;
  const query = params.q?.trim() ?? params.code?.trim() ?? "";
  const emailStatus = params.emailStatus === "attention" ? "attention" : undefined;
  const initialSelectedCampaignId = params.campaign ?? undefined;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
  const leadLimit = 50;
  const [campaignOptions, matchedCampaignId] = await Promise.all([
    getMerchantCampaignLibrary(session.merchant.id, session.merchant),
    query ? findMerchantLeadCampaign(session.merchant.id, query) : Promise.resolve(null),
  ]);
  const selectedCampaignId =
    matchedCampaignId ??
    initialSelectedCampaignId ??
    campaignOptions[0]?.id ??
    getPrimaryCampaignId();
  const dataView = selectedCampaignId
    ? await getCampaignDataView(selectedCampaignId, session.merchant, {
        leadLimit,
        leadOffset: (currentPage - 1) * leadLimit,
        query,
        emailStatus,
      })
    : null;

  if (!dataView || dataView.performance.campaign.merchantId !== session.merchant.id) {
    return (
      <div className="okado-card p-8">
        <h1 className="okado-section-title">Aucune campagne sélectionnée</h1>
      </div>
    );
  }

  const performanceMax = Math.max(
    dataView.performance.kpis.scans,
    dataView.performance.kpis.leads,
    dataView.performance.kpis.redeemed,
    1,
  );
  const performanceWidth = (value: number) =>
    value > 0 ? Math.max((value / performanceMax) * 100, 10) : 0;
  const participationsPerDay = dataView.dailyStats.map((item) => ({
    label: item.label,
    value: item.participations,
  }));
  const redeemedPerDay = dataView.dailyStats.map((item) => ({
    label: item.label,
    value: item.redeemed,
  }));
  const actionVolumes = buildActionVolumes(
    dataView.actionVolumes,
    dataView.performance.campaign.actions,
  );
  const actionVolumeMax = Math.max(...actionVolumes.map((item) => item.value), 1);
  const leadById = new Map(dataView.leads.map((lead) => [lead.id, lead]));

  return (
    <div className="space-y-6">
      <section className="px-1 py-2">
        <div>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="okado-label">Données de campagne</p>
              <h1 className="okado-page-title mt-3">
                {dataView.performance.campaign.title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-ash">
                Visualisez les indicateurs clés, le stock de dotation et les données de saisie
                exportables pour chaque activation.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/campaigns/${dataView.performance.campaign.id}/edit`}
                prefetch={false}
                className="okado-filled-action px-5 py-4"
              >
                Modifier la campagne
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <div>
              <DataSearchForm
                campaignId={dataView.performance.campaign.id}
                initialValue={query}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {campaignOptions.map((item) => (
                <Link
                  key={item.id}
                  href={`/data?campaign=${item.id}${query ? `&q=${encodeURIComponent(query)}` : ""}${emailStatus ? `&emailStatus=${emailStatus}` : ""}`}
                  prefetch={false}
                  className={`cursor-pointer rounded-[12px] px-4 py-3 text-sm font-semibold ${
                    item.id === dataView.performance.campaign.id
                      ? "bg-primary-action-accent !text-white"
                      : "okado-secondary-action"
                  }`}
                  style={
                    item.id === dataView.performance.campaign.id
                      ? { color: "#ffffff" }
                      : undefined
                  }
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
          {emailStatus === "attention" ? (
            <div className="mt-4 rounded-[14px] border border-[#f0dfaa] bg-[#fff9e8] px-4 py-3 text-sm text-[#74570b]">
              Cette vue affiche uniquement les e-mails en échec pour un gain attribué et encore à retirer. Renvoyez l’e-mail ou consultez son historique pour résoudre l’alerte.
            </div>
          ) : null}
          {emailStatus === "attention" && dataView.leadTotal === 0 ? (
            <p className="mt-4 text-sm font-semibold text-[#18864b]">
              Aucun e-mail à traiter pour cette campagne.
            </p>
          ) : query && dataView.leadTotal === 0 ? (
            <p className="mt-4 text-sm font-semibold text-[#c2410c]">
              Aucun résultat pour « {query} ».
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {[
          ["Scans", String(dataView.performance.kpis.scans)],
          ["Leads", String(dataView.performance.kpis.leads)],
          ["Conversion", formatPercent(dataView.performance.kpis.conversionRate)],
          ["Lots retirés", String(dataView.performance.kpis.redeemed)],
          ["Coût / lead", formatCurrency(dataView.performance.kpis.costPerLead)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="okado-card p-5"
          >
            <p className="okado-label tracking-[0.18em]">{label}</p>
            <p className="mt-4 text-3xl font-semibold text-graphite">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Histogram
          eyebrow="Participations"
          title="Évolution des participations par jour"
          bars={participationsPerDay}
          color={dataView.performance.campaign.accent.signal}
        />
        <Histogram
          eyebrow="Lots récupérés"
          title="Évolution des lots récupérés par jour"
          bars={redeemedPerDay}
          color="#111827"
        />
      </section>

      <LeadsExportSection
        campaignId={dataView.performance.campaign.id}
        leads={dataView.leads}
        total={dataView.leadTotal}
        offset={dataView.leadOffset}
        limit={dataView.leadLimit}
        query={query}
        emailStatus={emailStatus}
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="okado-card p-6">
            <p className="okado-label">Performance</p>
            <h2 className="okado-section-title mt-2">Tunnel et engagement</h2>

            <div className="mt-6 space-y-4">
              {[
                {
                  label: "Scans",
                  value: dataView.performance.kpis.scans,
                  width: performanceWidth(dataView.performance.kpis.scans),
                },
                {
                  label: "Leads créés",
                  value: dataView.performance.kpis.leads,
                  width: performanceWidth(dataView.performance.kpis.leads),
                },
                {
                  label: "Lots retirés",
                  value: dataView.performance.kpis.redeemed,
                  width: performanceWidth(dataView.performance.kpis.redeemed),
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate">
                    <span>{row.label}</span>
                    <span className="font-semibold text-graphite">{row.value}</span>
                  </div>
                  <div className="h-3 rounded-full bg-sky-wash">
                    <div
                      className="h-3 rounded-full"
                      style={{
                        width: `${row.width}%`,
                        backgroundColor: dataView.performance.campaign.accent.signal,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="okado-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="okado-label">Dotation</p>
                <h2 className="okado-section-title mt-2">
                  Stock et probabilités
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {dataView.performance.prizes.map((prize) => (
                <div
                  key={prize.id}
                  className="rounded-[8px] border border-border bg-linen-canvas px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-graphite">{prize.label}</p>
                      <p className="mt-1 text-sm text-ash">
                        Probabilité {prize.probability}% · coût{" "}
                        {formatCurrency(prize.estimatedUnitCost)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-ash">Restant</p>
                      <p className="mt-1 text-xl font-semibold text-graphite">
                        {prize.remainingQuantity ?? "Illimité"}
                      </p>
                    </div>
                  </div>
                  <PrizeStockActions
                    prizeId={prize.id}
                    remainingQuantity={prize.remainingQuantity}
                    totalQuantity={prize.totalQuantity}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {actionVolumes.length > 1 ? (
            <div className="okado-card p-6">
              <p className="okado-label">
                Actions marketing
              </p>
              <h2 className="okado-section-title mt-2">
                Volume par action
              </h2>

              <div className="mt-6 space-y-4">
                {actionVolumes.map((item) => (
                  <div key={item.id}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-graphite">{item.label}</p>
                        <p className="truncate text-ash">{item.kind}</p>
                      </div>
                      <span className="font-semibold text-graphite">{item.value}</span>
                    </div>
                    <div className="h-3 rounded-full bg-sky-wash">
                      <div
                        className="h-3 rounded-full"
                        style={{
                          width: `${item.value > 0 ? Math.max((item.value / actionVolumeMax) * 100, 10) : 0}%`,
                          backgroundColor: dataView.performance.campaign.accent.signal,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="okado-card p-6">
            <p className="okado-label">Chronologie</p>
            <h2 className="okado-section-title mt-2">Derniers événements</h2>

            <div className="mt-5 space-y-2">
              {dataView.events.slice(0, 8).map((event) => {
                const lead = event.leadId ? leadById.get(event.leadId) : undefined;

                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 rounded-[8px] border border-border bg-linen-canvas px-4 py-3"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: dataView.performance.campaign.accent.signal }}
                    />
                    <p className="min-w-0 flex-1 truncate text-sm text-slate">
                      <span className="font-semibold text-graphite">
                        {eventLabel(event.eventType)}
                      </span>
                      {lead ? ` · ${lead.firstName}` : ""}
                    </p>
                    <span className="shrink-0 text-xs text-ash">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

