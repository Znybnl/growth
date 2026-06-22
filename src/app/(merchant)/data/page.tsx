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
  gameTypeLabel,
  goalLabel,
  leadStatusLabel,
} from "@/lib/format";
import {
  getCampaignDataView,
  getMerchantDashboard,
  getMerchantLeads,
  getPrimaryCampaignId,
} from "@/lib/store";
import { CampaignAction, CampaignEvent, MerchantLeadRow } from "@/lib/types";

type DataPageProps = {
  searchParams: Promise<{
    campaign?: string;
    q?: string;
    code?: string;
  }>;
};

function buildDailySeries(values: string[], labels: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return labels.map((label) => ({
    label,
    value: counts.get(label) ?? 0,
  }));
}

function buildLastDays(referenceDates: string[], days = 7) {
  const latest = referenceDates.length
    ? new Date(
        referenceDates.sort((a, b) => a.localeCompare(b)).at(-1) ?? new Date().toISOString(),
      )
    : new Date();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(
      Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth(), latest.getUTCDate()),
    );
    date.setUTCDate(latest.getUTCDate() - (days - index - 1));
    return date.toISOString().slice(0, 10);
  });
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
    <div className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
      <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-[#111827]">{title}</h2>
      <div className="mt-6 grid h-[240px] grid-cols-7 gap-3">
        {bars.map((bar) => (
          <div key={bar.label} className="flex min-w-0 flex-col items-center justify-end gap-3">
            <span className="text-sm font-semibold text-[#111827]">{bar.value}</span>
            <div className="flex h-full w-full items-end rounded-[18px] bg-[#f3f6fb] p-1">
              <div
                className="w-full rounded-[14px]"
                style={{
                  height: `${Math.max((bar.value / max) * 100, bar.value > 0 ? 10 : 0)}%`,
                  backgroundColor: color,
                  minHeight: bar.value > 0 ? "10px" : "0px",
                }}
              />
            </div>
            <span className="text-center text-xs text-[#7b8496]">
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

function buildActionVolumes(leads: MerchantLeadRow[], actions: CampaignAction[]) {
  if (!actions.length) {
    return [];
  }

  const volumes = new Map(
    actions.map((action, index) => [
      action.id,
      {
        id: action.id,
        label: `Action ${index + 1}`,
        kind: action.kind,
        value: 0,
      },
    ]),
  );

  const byEmail = new Map<string, number>();
  const chronologicalLeads = [...leads].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const lead of chronologicalLeads) {
    const key = lead.email.trim().toLowerCase();
    const actionIndex = byEmail.get(key) ?? 0;
    const action = actions[actionIndex];

    if (action) {
      const current = volumes.get(action.id);
      if (current) {
        current.value += 1;
      }
    }

    byEmail.set(key, actionIndex + 1);
  }

  return Array.from(volumes.values());
}

export default async function DataPage({ searchParams }: DataPageProps) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;
  const query = params.q?.trim() ?? params.code?.trim() ?? "";
  const normalizedQuery = query.toLowerCase();
  const initialSelectedCampaignId = params.campaign ?? undefined;
  const [dashboard, allLeads, initialDataView] = await Promise.all([
    getMerchantDashboard(session.merchant.id, session.merchant),
    query ? getMerchantLeads(session.merchant.id) : Promise.resolve([]),
    initialSelectedCampaignId
      ? getCampaignDataView(initialSelectedCampaignId, session.merchant)
      : Promise.resolve(null),
  ]);
  const matchedLead =
    query.length > 0
      ? allLeads.find((lead) =>
          [lead.redemptionCode ?? "", lead.email, lead.firstName]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery),
        ) ?? null
      : null;
  const selectedCampaignId =
    matchedLead?.campaignId ??
    initialSelectedCampaignId ??
    dashboard.campaigns[0]?.campaign.id ??
    getPrimaryCampaignId();
  const dataView =
    (initialDataView && initialSelectedCampaignId === selectedCampaignId ? initialDataView : null) ??
    (selectedCampaignId
      ? await getCampaignDataView(selectedCampaignId, session.merchant)
      : null);

  if (!dataView || dataView.performance.campaign.merchantId !== session.merchant.id) {
    return (
      <div className="rounded-[32px] border border-[#dbe4f0] bg-white p-8 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
        <h1 className="text-3xl font-semibold text-[#111827]">Aucune campagne sélectionnée</h1>
      </div>
    );
  }

  const sortedLeads = [...dataView.leads].sort((a, b) =>
    b.consentTimestamp.localeCompare(a.consentTimestamp),
  );
  const filteredLeads = query
    ? sortedLeads.filter((lead) =>
        [lead.redemptionCode ?? "", lead.email, lead.firstName, lead.prizeLabel]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : sortedLeads;
  const allDates = [
    ...dataView.leads.map((lead) => lead.createdAt),
    ...dataView.events.map((event) => event.createdAt),
  ];
  const dayKeys = buildLastDays(allDates);
  const performanceMax = Math.max(
    dataView.performance.kpis.scans,
    dataView.performance.kpis.leads,
    dataView.performance.kpis.actions,
    dataView.performance.kpis.redeemed,
    1,
  );
  const performanceWidth = (value: number) =>
    value > 0 ? Math.max((value / performanceMax) * 100, 10) : 0;
  const participationsPerDay = buildDailySeries(
    dataView.leads.map((lead) => lead.createdAt.slice(0, 10)),
    dayKeys,
  );
  const redeemedPerDay = buildDailySeries(
    dataView.events
      .filter((event) => event.eventType === "prize_redeemed")
      .map((event) => event.createdAt.slice(0, 10)),
    dayKeys,
  );
  const actionVolumes = buildActionVolumes(
    dataView.leads,
    dataView.performance.campaign.actions,
  );
  const actionVolumeMax = Math.max(...actionVolumes.map((item) => item.value), 1);
  const leadById = new Map(dataView.leads.map((lead) => [lead.id, lead]));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-[#dbe4f0] bg-white shadow-[0_20px_50px_rgba(122,136,166,0.14)]">
        <div className="px-6 py-7 xl:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                Données campagne
              </p>
              <h1 className="mt-3 font-display text-5xl font-semibold leading-none text-[#0f1728]">
                {dataView.performance.campaign.title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c6577]">
                Visualisez les indicateurs clés, le stock de dotation et les données de saisie
                exportables pour chaque activation.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-[22px] bg-[#f7f9fc] px-5 py-4 text-sm text-[#4f5b70]">
                {goalLabel(dataView.performance.campaign.goalType)} ·{" "}
                {gameTypeLabel(dataView.performance.campaign.gameType)}
              </div>
              <Link
                href={`/campaigns/${dataView.performance.campaign.id}/edit`}
                className="inline-flex rounded-[22px] bg-[#2f6df6] px-5 py-4 text-sm font-semibold !text-white shadow-[0_16px_32px_rgba(47,109,246,0.22)]"
                style={{ color: "#ffffff" }}
              >
                Modifier la campagne
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <DataSearchForm
              campaignId={dataView.performance.campaign.id}
              initialValue={query}
            />
            {dashboard.campaigns.map((item) => (
              <Link
                key={item.campaign.id}
                href={`/data?campaign=${item.campaign.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                className={`cursor-pointer rounded-[18px] px-4 py-3 text-sm font-semibold ${
                  item.campaign.id === dataView.performance.campaign.id
                    ? "bg-[#111827] !text-white"
                    : "border border-[#d7e0ed] bg-[#f8fafc] text-[#182033]"
                }`}
                style={
                  item.campaign.id === dataView.performance.campaign.id
                    ? { color: "#ffffff" }
                    : undefined
                }
              >
                {item.campaign.title}
              </Link>
            ))}
          </div>
          {query && !filteredLeads.length ? (
            <p className="mt-4 text-sm font-semibold text-[#c2410c]">
              Aucun résultat pour « {query} ».
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Scans", String(dataView.performance.kpis.scans)],
          ["Leads", String(dataView.performance.kpis.leads)],
          ["Actions", String(dataView.performance.kpis.actions)],
          ["Conversion", formatPercent(dataView.performance.kpis.conversionRate)],
          ["Lots retirés", String(dataView.performance.kpis.redeemed)],
          ["Coût / lead", formatCurrency(dataView.performance.kpis.costPerLead)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[28px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_36px_rgba(122,136,166,0.08)]"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-[#7b8496]">{label}</p>
            <p className="mt-4 text-3xl font-semibold text-[#111827]">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Histogram
          eyebrow="Participations"
          title="Évolution du nombre de participations par jour"
          bars={participationsPerDay}
          color={dataView.performance.campaign.accent.signal}
        />
        <Histogram
          eyebrow="Lots récupérés"
          title="Évolution du nombre de lots récupérés par jour"
          bars={redeemedPerDay}
          color="#111827"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Performance</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">Tunnel et engagement</h2>

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
                  label: "Actions marketing",
                  value: dataView.performance.kpis.actions,
                  width: performanceWidth(dataView.performance.kpis.actions),
                },
                {
                  label: "Lots retirés",
                  value: dataView.performance.kpis.redeemed,
                  width: performanceWidth(dataView.performance.kpis.redeemed),
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-[#556173]">
                    <span>{row.label}</span>
                    <span className="font-semibold text-[#111827]">{row.value}</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#eef2f7]">
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

          <div className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Dotation</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                  Stock et probabilités
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {dataView.performance.prizes.map((prize) => (
                <div
                  key={prize.id}
                  className="rounded-[24px] border border-[#e4eaf2] bg-[#f8fafc] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#111827]">{prize.label}</p>
                      <p className="mt-1 text-sm text-[#7b8496]">
                        Probabilité {prize.probability}% · coût{" "}
                        {formatCurrency(prize.estimatedUnitCost)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#7b8496]">Restant</p>
                      <p className="mt-1 text-xl font-semibold text-[#111827]">
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
            <div className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                Actions marketing
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
                Volume par action
              </h2>

              <div className="mt-6 space-y-4">
                {actionVolumes.map((item) => (
                  <div key={item.id}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#111827]">{item.label}</p>
                        <p className="truncate text-[#7b8496]">{item.kind}</p>
                      </div>
                      <span className="font-semibold text-[#111827]">{item.value}</span>
                    </div>
                    <div className="h-3 rounded-full bg-[#eef2f7]">
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

          <div className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Chronologie</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">Derniers événements</h2>

            <div className="mt-5 space-y-2">
              {dataView.events.slice(0, 8).map((event) => {
                const lead = event.leadId ? leadById.get(event.leadId) : undefined;

                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 rounded-[18px] border border-[#e4eaf2] bg-[#f8fafc] px-4 py-3"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: dataView.performance.campaign.accent.signal }}
                    />
                    <p className="min-w-0 flex-1 truncate text-sm text-[#556173]">
                      <span className="font-semibold text-[#111827]">{eventLabel(event.eventType)}</span>
                      {lead ? ` · ${lead.firstName}` : ""}
                    </p>
                    <span className="shrink-0 text-xs text-[#7b8496]">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
              Saisies et export
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111827]">
              Contacts, statuts et consentements
            </h2>
          </div>
          <Link
            href={`/api/merchant/leads?format=csv&campaign=${dataView.performance.campaign.id}`}
            className="inline-flex cursor-pointer rounded-[18px] border border-[#d7e0ed] px-4 py-3 text-sm font-semibold text-[#182033]"
          >
            Export CSV
          </Link>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-[#7b8496]">
              <tr>
                <th className="border-b border-[#e4eaf2] px-3 py-3">Lead</th>
                <th className="border-b border-[#e4eaf2] px-3 py-3">Statut</th>
                <th className="border-b border-[#e4eaf2] px-3 py-3">Lot</th>
                <th className="border-b border-[#e4eaf2] px-3 py-3">Email gain</th>
                <th className="border-b border-[#e4eaf2] px-3 py-3">Retrait</th>
                <th className="border-b border-[#e4eaf2] px-3 py-3">Consentement</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id}>
                  <td className="border-b border-[#eef2f7] px-3 py-4">
                    <div className="font-semibold text-[#111827]">{lead.firstName}</div>
                    <div className="text-[#7b8496]">{lead.email}</div>
                  </td>
                  <td className="border-b border-[#eef2f7] px-3 py-4 text-[#556173]">
                    {leadStatusLabel(lead.status)}
                  </td>
                  <td className="border-b border-[#eef2f7] px-3 py-4 text-[#556173]">
                    {lead.prizeLabel}
                    {lead.redemptionCode ? (
                      <div className="mt-1 font-mono text-xs text-[#7b8496]">
                        {lead.redemptionCode}
                      </div>
                    ) : null}
                  </td>
                  <td className="border-b border-[#eef2f7] px-3 py-4 text-[#556173]">
                    <div className="font-semibold text-[#111827]">
                      {rewardEmailStatusLabel(lead.emailDeliveryStatus)}
                    </div>
                    {lead.emailDeliveredAt ? (
                      <div className="mt-1 text-xs text-[#7b8496]">
                        Distribué le {formatDateTime(lead.emailDeliveredAt)}
                      </div>
                    ) : lead.emailSentAt ? (
                      <div className="mt-1 text-xs text-[#7b8496]">
                        Envoyé le {formatDateTime(lead.emailSentAt)}
                      </div>
                    ) : null}
                    {lead.emailErrorMessage ? (
                      <div className="mt-1 text-xs font-semibold text-[#c2410c]">
                        {lead.emailErrorMessage}
                      </div>
                    ) : null}
                  </td>
                  <td className="border-b border-[#eef2f7] px-3 py-4 text-[#556173]">
                    <LeadPrizeActions
                      leadId={lead.id}
                      status={lead.status}
                      hasPrize={Boolean(lead.prizeId)}
                      emailDeliveryStatus={lead.emailDeliveryStatus}
                      emailSentAt={lead.emailSentAt}
                    />
                  </td>
                  <td className="border-b border-[#eef2f7] px-3 py-4 text-[#556173]">
                    {formatDateTime(lead.consentTimestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
