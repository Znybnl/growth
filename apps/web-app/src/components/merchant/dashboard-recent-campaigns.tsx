import { CircleStop, Pause, Play } from "lucide-react";
import Link from "next/link";

import { DashboardCampaignActionsMenu } from "@/components/merchant/dashboard-campaign-actions-menu";
import { EmptyState } from "@/components/ui/workspace";
import { formatPercent, gameTypeLabel } from "@/lib/format";
import type { CampaignPerformance } from "@/lib/types";
import styles from "./dashboard-recent-campaigns.module.css";

function CampaignStatusIcon({ item }: { item: CampaignPerformance }) {
  const paused = !item.campaign.isActive;
  const exhausted = item.prizes.length > 0 && item.prizes.every((prize) => prize.remainingQuantity === 0);
  const label = paused ? "Campagne en pause" : exhausted ? "Campagne arrêtée : stock épuisé" : "Campagne active";
  const Icon = paused ? Pause : exhausted ? CircleStop : Play;
  const color = paused ? "text-[var(--okado-text-muted)]" : exhausted
    ? "text-[var(--okado-status-warning-text)]" : "text-[var(--okado-status-success-text)]";

  return <span className={`inline-flex shrink-0 ${color}`} role="img" aria-label={label} title={label}>
    <Icon className="size-[18px]" strokeWidth={2.25} aria-hidden="true" />
  </span>;
}

/** Presentational only: the caller retains the existing sorting, filters and KPI sources. */
export function DashboardRecentCampaigns({ campaigns }: { campaigns: CampaignPerformance[] }) {
  return (
    <section className={`okado-card min-w-0 p-5 md:p-6 ${styles.section}`} aria-labelledby="recent-campaigns-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="okado-label">Toutes les campagnes</p>
          <h2 id="recent-campaigns-title" className="okado-section-title mt-2">Vos dernières campagnes</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-ash">{campaigns.length} {campaigns.length === 1 ? "campagne" : "campagnes"}</span>
          <Link href="/campaigns" prefetch={false} className="okado-link">Voir toutes les campagnes</Link>
        </div>
      </div>
      {campaigns.length ? (
        <div className={`mt-6 ${styles.scrollArea}`} data-testid="recent-campaigns-scroll">
          <table className={styles.table} aria-labelledby="recent-campaigns-title">
            <colgroup><col /><col className={styles.typeColumn} /><col className={styles.scansColumn} />
              <col className={styles.gamesColumn} /><col className={styles.conversionColumn} /><col className={styles.actionsColumn} /></colgroup>
            <thead><tr className="okado-table-header">
              <th scope="col">Campagne</th><th scope="col">Type</th><th scope="col" data-align="right">Scans</th>
              <th scope="col" data-align="right">Participations</th><th scope="col" data-align="right">Conversion</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody>{campaigns.map((item) => (
              <tr key={item.campaign.id}>
                <th scope="row"><div className="flex min-w-0 items-center gap-3">
                  <CampaignStatusIcon item={item} />
                  <span className="truncate font-semibold text-carbon" title={item.campaign.title}>{item.campaign.title}</span>
                </div></th>
                <td className="text-ash">{gameTypeLabel(item.campaign.gameType)}</td>
                <td data-align="right">{item.kpis.scans}</td><td data-align="right">{item.kpis.games}</td>
                <td data-align="right">{formatPercent(item.kpis.conversionRate)}</td>
                <td><DashboardCampaignActionsMenu campaignId={item.campaign.id} /></td>
              </tr>
            ))}</tbody>
          </table>
          <div className={styles.cards} data-testid="recent-campaign-cards">{campaigns.map((item) => (
            <article key={item.campaign.id} className="okado-mobile-table-row">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3"><CampaignStatusIcon item={item} />
                  <div className="min-w-0"><p className="break-words font-semibold text-graphite">{item.campaign.title}</p>
                    <p className="text-sm text-ash">{gameTypeLabel(item.campaign.gameType)}</p></div>
                </div>
                <div className="shrink-0"><DashboardCampaignActionsMenu campaignId={item.campaign.id} /></div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[ ["Conversion", formatPercent(item.kpis.conversionRate)], ["Participations", item.kpis.games], ["Scans", item.kpis.scans] ].map(([label, value]) => (
                  <div key={label} className="okado-mobile-table-stat"><dt className="okado-mobile-table-stat-label">{label}</dt>
                    <dd className="okado-mobile-table-stat-value mt-1">{value}</dd></div>
                ))}
              </dl>
            </article>
          ))}</div>
        </div>
      ) : <EmptyState title="Aucune campagne trouvée" description="Créez une campagne pour suivre ses performances ici." />}
    </section>
  );
}
