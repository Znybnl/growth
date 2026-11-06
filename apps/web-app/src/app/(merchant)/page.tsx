import { measureServerStage } from "@/lib/server-performance";
import Link from "next/link";
import { ArrowRight, Gift, PackageCheck, PackageX, TriangleAlert } from "lucide-react";

import { DashboardRecentContacts } from "@/components/merchant/dashboard-recent-contacts";
import { DashboardActivityChart } from "@/components/merchant/dashboard-activity-chart";
import tableStyles from "@/components/merchant/dashboard-recent-campaigns.module.css";
import { DashboardRecentCampaigns } from "@/components/merchant/dashboard-recent-campaigns";
import { ConsumptionRateInfo } from "@/components/merchant/consumption-rate-info";
import { DashboardOperationalAlerts } from "@/components/merchant/dashboard-operational-alerts";
import { OnboardingWelcomeDialog } from "@/components/merchant/onboarding-welcome-dialog";
import { EmptyState, MetricCard, PageHeader } from "@/components/ui/workspace";
import { requireAuthenticatedSession } from "@/lib/auth";
import { formatPercent } from "@/lib/format";
import { getMerchantDashboard, getMerchantRecentLeads, getMerchantWorkspaceDashboard } from "@/lib/store";
import { calculateCampaignConsumptionMetrics } from "@/lib/dashboard-metrics";
import { stockState as getStockState } from "@/lib/metric-rules";

export const dynamic = "force-dynamic";

export default async function DashboardPage(props: Parameters<typeof DashboardPageContent>[0]) {
  return measureServerStage("page.home", () => DashboardPageContent(props));
}

async function DashboardPageContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string; welcome?: string }>;
}) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const isWorkspaceView = params.scope === "all" && session.locations.length > 1;
  // Start contacts independently. Handle errors immediately while dashboard data is pending.
  const contacts = isWorkspaceView
    ? Promise.resolve([])
    : getMerchantRecentLeads(session.merchant.id, 5, query).catch(() => null);
  const dashboard = isWorkspaceView
    ? await getMerchantWorkspaceDashboard(session.locations, session.merchant)
    : await getMerchantDashboard(session.merchant.id, session.merchant);

  const filteredCampaigns = query
    ? dashboard.campaigns.filter((item) =>
        `${item.campaign.title} ${item.campaign.subtitle}`.toLowerCase().includes(query),
      )
    : dashboard.campaigns;

  const merchantCampaignIds = new Set(filteredCampaigns.map((item) => item.campaign.id));

  const activeCampaigns = filteredCampaigns.filter((item) => item.campaign.isActive);
  const activeCampaignIds = new Set(activeCampaigns.map((item) => item.campaign.id));
  const campaignWins = filteredCampaigns.reduce((total, item) => total + item.kpis.wins, 0);
  const redeemedLots = filteredCampaigns.reduce((total, item) => total + item.kpis.redeemed, 0);
  const consumption = calculateCampaignConsumptionMetrics(campaignWins, redeemedLots);
  const participationCount = filteredCampaigns.reduce(
    (total, item) => total + item.kpis.games,
    0,
  );
  const activePrizeInventory = dashboard.prizeInventory.filter((item) =>
    activeCampaignIds.has(item.campaignId),
  );
  const campaignsForTable = [...filteredCampaigns].sort((a, b) =>
    b.campaign.createdAt.localeCompare(a.campaign.createdAt),
  );
  const stockState = (item: (typeof dashboard.prizeInventory)[number]) => {
    if (item.remainingQuantity === 0) {
      return { label: "Épuisé", tone: "danger", icon: PackageX } as const;
    }

    if (
      getStockState(item.remainingQuantity, item.totalQuantity) === "low"
    ) {
      return { label: "Stock faible", tone: "warning", icon: TriangleAlert } as const;
    }

    return { label: "Disponible", tone: "success", icon: PackageCheck } as const;
  };
  const activityPoints = dashboard.activityPoints;
  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <OnboardingWelcomeDialog open={params.welcome === "1"} />
      <PageHeader
        eyebrow="Vue d'ensemble"
        title="Pilotez vos campagnes"
        description="Suivez vos campagnes en direct, comparez les mécaniques qui performent et lancez rapidement une nouvelle campagne."
        actions={
          <Link
            href="/campaigns/new/guided"
            prefetch={false}
            className="okado-filled-action px-5"
          >
            Créer une campagne
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Campagnes actives" value={String(activeCampaigns.length)} />
        <MetricCard label="Participations" value={String(participationCount)} />
        <MetricCard
          label="Lots consommés"
          value={String(consumption.lotsUsed)}
        />
        <MetricCard
          label={
            <span className="inline-flex items-center gap-1">
              Taux de consommation
              <ConsumptionRateInfo id="dashboard-consumption-help" />
            </span>
          }
          value={formatPercent(consumption.consumptionRate)}
        />
      </section>

      <DashboardOperationalAlerts />

      <section className="min-w-0 space-y-6">
        <DashboardActivityChart
          eyebrow="Activité récente"
          title="Scans et participations par jour"
          points={activityPoints}
        />

        <DashboardRecentCampaigns campaigns={campaignsForTable} />
      </section>

      <DashboardRecentContacts contacts={contacts} campaignIds={merchantCampaignIds} />

      <section className={`okado-card min-w-0 p-5 md:p-6 ${tableStyles.section}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="okado-label">Stocks et retraits</p>
            <h2 id="dashboard-stock-title" className="okado-section-title mt-2">Lots à remettre et stock disponible</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ash">
              Retrouvez les gains qui attendent un retrait et le stock restant pour chaque lot.
            </p>
          </div>
          <Link href="/caisse" prefetch={false} className="okado-link inline-flex items-center gap-2 text-sm">
            Voir les retraits <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {activePrizeInventory.length ? (
          <div className="mt-6">
            <table role="table" className={tableStyles.table} aria-labelledby="dashboard-stock-title">
              <colgroup>
                <col /><col className={tableStyles.stockCampaignColumn} />
                <col className={tableStyles.stockCountColumn} /><col className={tableStyles.stockRemainingColumn} />
                <col className={tableStyles.stockStatusColumn} />
              </colgroup>
              <thead role="rowgroup">
                <tr role="row" className="okado-table-header">
                  <th role="columnheader" scope="col">Lot</th>
                  <th role="columnheader" scope="col">Campagne</th>
                  <th role="columnheader" scope="col" data-align="right">À retirer</th>
                  <th role="columnheader" scope="col" data-align="right">Stock restant</th>
                  <th role="columnheader" scope="col">État</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {activePrizeInventory.map((item) => {
                  const state = stockState(item);
                  const StateIcon = state.icon;
                  return (
                    <tr role="row" key={item.prizeId}>
                      <th role="rowheader" scope="row" className={tableStyles.name}>
                        <div className="flex min-w-0 items-center gap-3">
                          <Gift className="size-4 shrink-0 text-aubergine" aria-hidden="true" />
                          <span className="truncate font-semibold text-carbon" title={item.prizeLabel}>{item.prizeLabel}</span>
                        </div>
                      </th>
                      <td role="cell" className={tableStyles.detail}>
                        <span className="block truncate" title={item.campaignTitle}>{item.campaignTitle}</span>
                      </td>
                      <td role="cell" data-align="right">
                        <span className={tableStyles.mobileLabel} aria-hidden="true">À retirer</span>
                        {item.pendingRedemptions}
                      </td>
                      <td role="cell" data-align="right">
                        <span className={tableStyles.mobileLabel} aria-hidden="true">Stock restant</span>
                        {item.remainingQuantity === null ? "Illimité" : `${item.remainingQuantity}${item.totalQuantity === null ? "" : ` / ${item.totalQuantity}`}`}
                      </td>
                      <td role="cell" className={tableStyles.stockStatus}>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${state.tone === "danger" ? "text-coral-alert" : state.tone === "warning" ? "text-amber-700" : "text-emerald-700"}`}>
                          <StateIcon className="size-4 shrink-0" aria-hidden="true" />{state.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6"><EmptyState title="Aucun lot de campagne active" description="Les lots des campagnes actives apparaîtront ici dès qu’une campagne en contient." /></div>
        )}
      </section>
    </div>
  );
}

