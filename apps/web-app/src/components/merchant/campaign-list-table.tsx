import Link from "next/link";
import { CampaignActionsMenu } from "@/components/merchant/campaign-actions-menu";
import { ConsumptionRateInfo } from "@/components/merchant/consumption-rate-info";
import { EmptyState } from "@/components/ui/workspace";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatPercent, gameTypeLabel } from "@/lib/format";
import { calculateCampaignConsumptionMetrics } from "@/lib/dashboard-metrics";
import type { CampaignListItem } from "@/lib/types";
import styles from "./campaign-list.module.css";

const countFormatter = new Intl.NumberFormat("fr-FR");

export function CampaignListTable({ campaigns, allowAdminDuplicate = false }: {
  campaigns: CampaignListItem[];
  allowAdminDuplicate?: boolean;
}) {
  return (
  <section className={styles.section} aria-label="Liste des campagnes">
    {campaigns.length ? (
      <div role="table" aria-label="Campagnes et indicateurs">
        <div role="rowgroup" className={styles.header}>
          <div role="row" className={`okado-table-header ${styles.row}`}>
            <span role="columnheader">Campagne</span>
            <span role="columnheader">Jeu</span>
            <span role="columnheader">Participations</span>
            <span role="columnheader">Gagnants</span>
            <span role="columnheader">Lots utilisés</span>
            <span role="columnheader" className={styles.consumption}>
              Taux de consommation <ConsumptionRateInfo id="campaign-consumption-help" />
            </span>
            <span role="columnheader" className="sr-only">Actions</span>
          </div>
        </div>
        <div role="rowgroup">
          {campaigns.map((item) => {
            const { lotsUsed, consumptionRate } = calculateCampaignConsumptionMetrics(item.wins, item.redeemed);
            const metrics = [
              ["Jeu", gameTypeLabel(item.gameType)],
              ["Participations", item.games],
              ["Gagnants", item.wins],
              ["Lots utilisés", countFormatter.format(lotsUsed)],
              ["Taux de consommation", formatPercent(consumptionRate)],
            ] as const;
            return (
              <div key={item.id} role="row" className={`okado-table-row ${styles.row}`}>
                <div role="rowheader" className={styles.identity}>
                  <StatusBadge tone={item.isActive ? "active" : "muted"}>{item.isActive ? "Active" : "En pause"}</StatusBadge>
                  <div className="min-w-0">
                    <p className={`${styles.title} font-semibold text-graphite`} title={item.title}>{item.title}</p>
                    <p className={`${styles.subtitle} truncate text-sm text-ash`} title={item.subtitle}>{item.subtitle}</p>
                  </div>
                </div>
                {metrics.map(([label, value]) => (
                  <div role="cell" key={label} className={`${styles.metric} ${label === "Taux de consommation" ? styles.consumption : ""} ${label === "Lots utilisés" ? styles.secondaryMetric : ""}`}>
                    <span className={styles.mobileLabel} aria-hidden={label === "Taux de consommation" ? undefined : true}>
                      {label}
                      {label === "Taux de consommation" ? <ConsumptionRateInfo id={`consumption-help-${item.id}`} /> : null}
                    </span>
                    <span className={label === "Jeu" ? "text-ash" : "tabular-nums font-semibold text-graphite"}>{value}</span>
                  </div>
                ))}
                <div role="cell" className={styles.actions}>
                  <Link href={`/campaigns/${item.id}/edit/guided`} prefetch={false} className="okado-primary-action okado-compact-action px-3">
                    Modifier
                  </Link>
                  <CampaignActionsMenu campaignId={item.id} campaignTitle={item.title} isActive={item.isActive} allowAdminDuplicate={allowAdminDuplicate} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      <EmptyState title="Aucune campagne trouvée" description="Modifiez votre recherche ou créez une nouvelle campagne." />
    )}
  </section>
  );
}
