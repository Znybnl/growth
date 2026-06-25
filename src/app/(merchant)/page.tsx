import Link from "next/link";

import { DashboardActivityChart } from "@/components/merchant/dashboard-activity-chart";
import { requireAuthenticatedSession } from "@/lib/auth";
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  gameTypeLabel,
  goalLabel,
  leadStatusLabel,
} from "@/lib/format";
import { getCampaignDataView, getMerchantDashboard, getMerchantLeads } from "@/lib/store";

function buildLastDays(referenceDates: string[], days = 30) {
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const [dashboard, merchantLeads] = await Promise.all([
    getMerchantDashboard(session.merchant.id, session.merchant),
    getMerchantLeads(session.merchant.id),
  ]);

  const filteredCampaigns = query
    ? dashboard.campaigns.filter((item) =>
        `${item.campaign.title} ${item.campaign.subtitle}`.toLowerCase().includes(query),
      )
    : dashboard.campaigns;

  const merchantCampaignIds = new Set(filteredCampaigns.map((item) => item.campaign.id));
  const recentLeads = merchantLeads
    .filter((lead) => merchantCampaignIds.has(lead.campaignId))
    .filter((lead) =>
      query
        ? `${lead.firstName} ${lead.email} ${lead.campaignTitle}`.toLowerCase().includes(query)
        : true,
    )
    .slice(0, 5);

  const activeCampaigns = filteredCampaigns.filter((item) => item.campaign.isActive);
  const bestCampaign = [...filteredCampaigns].sort(
    (left, right) => right.kpis.conversionRate - left.kpis.conversionRate,
  )[0];
  const activityViews = await Promise.all(
    filteredCampaigns.map((item) => getCampaignDataView(item.campaign.id, session.merchant)),
  );
  const dashboardDates = activityViews.flatMap((view) =>
    view
      ? [
          ...view.events.map((event) => event.createdAt),
          ...view.leads.map((lead) => lead.createdAt),
        ]
      : [],
  );
  const dayKeys = buildLastDays(dashboardDates, 30);
  const scansSeries = buildDailySeries(
    activityViews.flatMap((view) =>
      view
        ? view.events
            .filter((event) => event.eventType === "scan")
            .map((event) => event.createdAt.slice(0, 10))
        : [],
    ),
    dayKeys,
  );
  const participationsSeries = buildDailySeries(
    activityViews.flatMap((view) =>
      view ? view.leads.map((lead) => lead.createdAt.slice(0, 10)) : []
    ),
    dayKeys,
  );
  const activityPoints = dayKeys.map((label, index) => ({
    label,
    scans: scansSeries[index]?.value ?? 0,
    participations: participationsSeries[index]?.value ?? 0,
  }));

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="overflow-hidden rounded-[34px] border border-[#dbe4f0] bg-white shadow-[0_20px_50px_rgba(122,136,166,0.14)]">
        <div className="grid gap-6 px-6 py-7 xl:grid-cols-[1.2fr_0.8fr] xl:px-8">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
              Vue d&apos;ensemble
            </p>
            <h1 className="mt-3 font-display text-[2.4rem] font-semibold leading-none text-[#0f1728] md:text-5xl">
              Pilotez vos activations
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c6577]">
              Suivez vos campagnes en direct, comparez les mécaniques qui performent et lancez
              rapidement une nouvelle activation.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <Link
              href="/campaigns/new"
              className="inline-flex rounded-[22px] bg-[#2f6df6] px-5 py-4 text-sm font-semibold !text-white shadow-[0_16px_32px_rgba(47,109,246,0.22)]"
            >
              Créer une campagne
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Campagnes actives", String(activeCampaigns.length)],
          [
            "Leads totaux",
            String(filteredCampaigns.reduce((total, item) => total + item.kpis.leads, 0)),
          ],
          [
            "Lots retirés",
            String(filteredCampaigns.reduce((total, item) => total + item.kpis.redeemed, 0)),
          ],
          [
            "Conversion moyenne",
            formatPercent(
              filteredCampaigns.length
                ? Math.round(
                    filteredCampaigns.reduce(
                      (total, item) => total + item.kpis.conversionRate,
                      0,
                    ) / filteredCampaigns.length,
                  )
                : 0,
            ),
          ],
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

      <section className="grid min-w-0 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 space-y-6">
          <DashboardActivityChart
            eyebrow="Activité récente"
            title="Scans et participations par jour"
            points={activityPoints}
          />

          <div className="min-w-0 min-h-[350px] rounded-[32px] border border-[#dbe4f0] bg-white p-5 shadow-[0_18px_44px_rgba(122,136,166,0.1)] md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Campagnes prioritaires
                </p>
                <h2 className="mt-2 text-[1.9rem] font-semibold leading-tight text-[#111827] md:text-2xl">
                  À surveiller aujourd&apos;hui
                </h2>
              </div>
              <Link href="/campaigns" className="text-sm font-semibold text-[#2f6df6]">
                Voir toutes les campagnes
              </Link>
            </div>

            <div className="mt-6 hidden overflow-hidden rounded-[28px] border border-[#e4eaf2] md:block">
              <div className="grid grid-cols-[1.5fr_0.85fr_0.7fr_0.7fr_0.9fr] gap-3 bg-[#f7f9fc] px-5 py-4 text-[11px] uppercase tracking-[0.24em] text-[#7c8597]">
                <span>Campagne</span>
                <span>Mécanique</span>
                <span>Leads</span>
                <span>Actions</span>
                <span>Conversion</span>
              </div>

              {filteredCampaigns.map((item) => (
                <div
                  key={item.campaign.id}
                  className="grid grid-cols-[1.5fr_0.85fr_0.7fr_0.7fr_0.9fr] items-center gap-3 border-t border-[#edf1f6] px-5 py-5 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.campaign.accent.signal }}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#111827]">
                          {item.campaign.title}
                        </p>
                        <p className="truncate text-[#7a8496]">
                          {goalLabel(item.campaign.goalType)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className="text-[#556173]">{gameTypeLabel(item.campaign.gameType)}</span>
                  <span className="font-semibold text-[#111827]">{item.kpis.leads}</span>
                  <span className="font-semibold text-[#111827]">{item.kpis.actions}</span>
                  <span className="font-semibold text-[#111827]">
                    {formatPercent(item.kpis.conversionRate)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 md:hidden">
              {filteredCampaigns.map((item) => (
                <div
                  key={item.campaign.id}
                  className="rounded-[24px] border border-[#e4eaf2] bg-[#f8fafc] p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.campaign.accent.signal }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#111827]">
                        {item.campaign.title}
                      </p>
                      <p className="truncate text-sm text-[#7a8496]">
                        {goalLabel(item.campaign.goalType)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-[18px] bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7c8597]">
                        Mécanique
                      </p>
                      <p className="mt-2 font-medium text-[#111827]">
                        {gameTypeLabel(item.campaign.gameType)}
                      </p>
                    </div>
                    <div className="rounded-[18px] bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7c8597]">
                        Conversion
                      </p>
                      <p className="mt-2 font-semibold text-[#111827]">
                        {formatPercent(item.kpis.conversionRate)}
                      </p>
                    </div>
                    <div className="rounded-[18px] bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7c8597]">
                        Leads
                      </p>
                      <p className="mt-2 font-semibold text-[#111827]">{item.kpis.leads}</p>
                    </div>
                    <div className="rounded-[18px] bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7c8597]">
                        Actions
                      </p>
                      <p className="mt-2 font-semibold text-[#111827]">{item.kpis.actions}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          {bestCampaign ? (
            <div className="rounded-[32px] border border-[#dbe4f0] bg-white p-5 shadow-[0_18px_44px_rgba(122,136,166,0.1)] md:p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                Meilleure campagne
              </p>
              <h2 className="mt-2 text-[1.9rem] font-semibold leading-tight text-[#111827] md:text-2xl">
                {bestCampaign.campaign.title}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] bg-[#f7f9fc] p-4">
                  <p className="text-sm text-[#7b8496]">Conversion scan ? lead</p>
                  <p className="mt-2 text-3xl font-semibold text-[#111827]">
                    {formatPercent(bestCampaign.kpis.conversionRate)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#f7f9fc] p-4">
                  <p className="text-sm text-[#7b8496]">Coût par lead</p>
                  <p className="mt-2 text-3xl font-semibold text-[#111827]">
                    {formatCurrency(bestCampaign.kpis.costPerLead)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="min-w-0 min-h-[350px] rounded-[32px] border border-[#dbe4f0] bg-white p-5 shadow-[0_18px_44px_rgba(122,136,166,0.1)] md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Dernières saisies
                </p>
                <h2 className="mt-2 text-[1.9rem] font-semibold leading-tight text-[#111827] md:text-2xl">
                  Leads récents
                </h2>
              </div>
              <Link href="/data" className="text-sm font-semibold text-[#2f6df6]">
                Ouvrir les données
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-[24px] border border-[#e4eaf2] bg-[#f8fafc] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#111827]">{lead.firstName}</p>
                      <p className="truncate text-sm text-[#7b8496]">{lead.email}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#505b6e]">
                      {leadStatusLabel(lead.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-1 text-sm text-[#7b8496] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="truncate">{lead.campaignTitle}</span>
                    <span>{formatDateTime(lead.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

