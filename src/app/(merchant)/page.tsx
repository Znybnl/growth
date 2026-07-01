import Link from "next/link";

import { DashboardActivityChart } from "@/components/merchant/dashboard-activity-chart";
import { DashboardCampaignActionsMenu } from "@/components/merchant/dashboard-campaign-actions-menu";
import { requireAuthenticatedSession } from "@/lib/auth";
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  gameTypeLabel,
  goalLabel,
  leadStatusLabel,
} from "@/lib/format";
import { getMerchantDashboard, getMerchantRecentLeads } from "@/lib/store";

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
    getMerchantRecentLeads(session.merchant.id, 5, query),
  ]);

  const filteredCampaigns = query
    ? dashboard.campaigns.filter((item) =>
        `${item.campaign.title} ${item.campaign.subtitle}`.toLowerCase().includes(query),
      )
    : dashboard.campaigns;

  const merchantCampaignIds = new Set(filteredCampaigns.map((item) => item.campaign.id));
  const recentLeads = merchantLeads.filter((lead) => merchantCampaignIds.has(lead.campaignId));

  const activeCampaigns = filteredCampaigns.filter((item) => item.campaign.isActive);
  const bestCampaign = [...filteredCampaigns].sort(
    (left, right) => right.kpis.conversionRate - left.kpis.conversionRate,
  )[0];
  const activityPoints = dashboard.activityPoints;
  const getCampaignStatus = (item: (typeof filteredCampaigns)[number]) => {
    if (!item.campaign.isActive) {
      return { label: "Désactivée", color: "#98a2b3" };
    }

    if (item.prizes.some((prize) => prize.remainingQuantity === 0)) {
      return { label: "Stock épuisé", color: "#f59e0b" };
    }

    return { label: "Active", color: "#12b76a" };
  };
  const leadStatusTone = (status: (typeof recentLeads)[number]["status"]) => {
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
        return "bg-white text-[#505b6e]";
    }
  };

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <section className="grid gap-5 px-1 py-2 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <p className="okado-label">
              Vue d&apos;ensemble
            </p>
            <h1 className="mt-3 font-display text-[2.4rem] font-semibold leading-[1.03] text-midnight-ink md:text-[56px]">
              Pilotez vos activations
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-ash">
              Suivez vos campagnes en direct, comparez les mécaniques qui performent et lancez
              rapidement une nouvelle activation.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <Link
              href="/campaigns/new"
              prefetch={false}
              className="inline-flex h-11 items-center rounded-[12px] bg-[linear-gradient(rgb(59,130,246)_0%,rgb(20,90,255)_100%)] px-5 text-sm font-semibold !text-white"
            >
              Créer une campagne
            </Link>
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
            className="okado-card p-4"
          >
            <p className="okado-label">{label}</p>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#111827] md:text-4xl">
              {value}
            </p>
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

          <div className="okado-card min-h-[350px] min-w-0 p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="okado-label">
                  Campagnes prioritaires
                </p>
                <h2 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.22px] text-graphite">
                  À surveiller aujourd&apos;hui
                </h2>
              </div>
              <Link href="/campaigns" prefetch={false} className="text-sm font-semibold text-[#2f6df6]">
                Voir toutes les campagnes
              </Link>
            </div>

            <div className="mt-6 hidden overflow-hidden rounded-[8px] border border-border md:block">
              <div className="grid grid-cols-[1.5fr_0.85fr_0.7fr_0.7fr_0.9fr_44px] gap-3 bg-[#f7f9fc] px-5 py-4 text-[11px] uppercase tracking-[0.24em] text-[#7c8597]">
                <span>Campagne</span>
                <span>Mécanique</span>
                <span>Scans</span>
                <span>Lead</span>
                <span>Conversion</span>
                <span className="sr-only">Actions</span>
              </div>

              {filteredCampaigns.map((item) => (
                <div
                  key={item.campaign.id}
                  className="grid grid-cols-[1.5fr_0.85fr_0.7fr_0.7fr_0.9fr_44px] items-center gap-3 border-t border-[#edf1f6] px-5 py-5 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        title={getCampaignStatus(item).label}
                        style={{ backgroundColor: getCampaignStatus(item).color }}
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
                  <span className="font-semibold text-[#111827]">{item.kpis.scans}</span>
                  <span className="font-semibold text-[#111827]">{item.kpis.leads}</span>
                  <span className="font-semibold text-[#111827]">
                    {formatPercent(item.kpis.conversionRate)}
                  </span>
                  <div className="flex justify-end">
                    <DashboardCampaignActionsMenu campaignId={item.campaign.id} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 md:hidden">
              {filteredCampaigns.map((item) => (
                <div
                  key={item.campaign.id}
                  className="rounded-[8px] border border-border bg-linen-canvas p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="mt-1 h-3 w-3 shrink-0 rounded-full"
                        title={getCampaignStatus(item).label}
                        style={{ backgroundColor: getCampaignStatus(item).color }}
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
                    <DashboardCampaignActionsMenu campaignId={item.campaign.id} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-[8px] bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7c8597]">
                        Mécanique
                      </p>
                      <p className="mt-2 font-medium text-[#111827]">
                        {gameTypeLabel(item.campaign.gameType)}
                      </p>
                    </div>
                    <div className="rounded-[8px] bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7c8597]">
                        Conversion
                      </p>
                      <p className="mt-2 font-semibold text-[#111827]">
                        {formatPercent(item.kpis.conversionRate)}
                      </p>
                    </div>
                    <div className="rounded-[8px] bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7c8597]">
                        Leads
                      </p>
                      <p className="mt-2 font-semibold text-[#111827]">{item.kpis.leads}</p>
                    </div>
                    <div className="rounded-[8px] bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7c8597]">
                        Scans
                      </p>
                      <p className="mt-2 font-semibold text-[#111827]">{item.kpis.scans}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          {bestCampaign ? (
            <div className="okado-card p-5 md:p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                Meilleure campagne
              </p>
              <h2 className="mt-2 text-[1.9rem] font-semibold leading-tight text-[#111827] md:text-2xl">
                {bestCampaign.campaign.title}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[8px] bg-linen-canvas p-4">
                  <p className="text-sm text-[#7b8496]">Conversion scan → lead</p>
                  <p className="mt-2 text-3xl font-semibold text-[#111827]">
                    {formatPercent(bestCampaign.kpis.conversionRate)}
                  </p>
                </div>
                <div className="rounded-[8px] bg-linen-canvas p-4">
                  <p className="text-sm text-[#7b8496]">Coût par lead</p>
                  <p className="mt-2 text-3xl font-semibold text-[#111827]">
                    {formatCurrency(bestCampaign.kpis.costPerLead)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="okado-card min-h-[350px] min-w-0 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">
                  Dernières saisies
                </p>
                <h2 className="mt-2 text-[1.9rem] font-semibold leading-tight text-[#111827] md:text-2xl">
                  Leads récents
                </h2>
              </div>
              <Link href="/data" prefetch={false} className="text-sm font-semibold text-[#2f6df6]">
                Ouvrir les données
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-[8px] border border-border bg-linen-canvas p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#111827]">{lead.firstName}</p>
                      <p className="truncate text-sm text-[#7b8496]">{lead.email}</p>
                    </div>
                    <span className={`rounded-full px-3 py-2 text-xs font-semibold ${leadStatusTone(lead.status)}`}>
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

