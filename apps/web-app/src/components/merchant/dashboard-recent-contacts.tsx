import Link from "next/link";
import { Suspense } from "react";

import { EmptyState, StatusNotice } from "@/components/ui/workspace";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, leadStatusLabel } from "@/lib/format";
import type { MerchantRecentContact } from "@/lib/types";

type Props = {
  contacts: Promise<MerchantRecentContact[] | null>;
  campaignIds: ReadonlySet<string>;
};

export function DashboardRecentContacts(props: Props) {
  return (
    <section className="okado-card min-w-0 p-5 md:p-6" aria-labelledby="recent-contacts-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="okado-label">Dernières saisies</p>
          <h2 className="okado-section-title mt-2" id="recent-contacts-title">Contacts récents</h2>
        </div>
        <Link href="/data" prefetch={false} className="okado-link text-sm">Ouvrir les données</Link>
      </div>
      <div className="mt-6 min-h-28">
        <Suspense fallback={
          <p role="status" className="rounded-lg border border-fog px-4 py-6 text-sm text-ash">
            Chargement des contacts récents…
          </p>
        }>
          <RecentContactRows {...props} />
        </Suspense>
      </div>
    </section>
  );
}

function leadStatusTone(status: MerchantRecentContact["status"]) {
  switch (status) {
    case "redeemed": return "active";
    case "claimed": return "info";
    case "expired": return "warning";
    default: return "muted";
  }
}

async function RecentContactRows({ contacts, campaignIds }: Props) {
  const rows = await contacts;
  if (rows === null) {
    return (
      <StatusNotice tone="warning">
        Les contacts récents sont temporairement indisponibles.
      </StatusNotice>
    );
  }

  const recentLeads = rows.filter((lead) => campaignIds.has(lead.campaignId));
  if (!recentLeads.length) {
    return <EmptyState title="Aucun contact récent" description="Les derniers contacts de vos campagnes apparaîtront ici." />;
  }

  const grid = "grid grid-cols-[minmax(140px,1fr)_minmax(160px,1.15fr)_minmax(150px,1fr)_120px_150px] items-center gap-4 px-4";

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[760px]">
          <div className={`okado-table-header ${grid} py-3`}>
            <span>Participant</span>
            <span>Campagne</span>
            <span>Lot remporté</span>
            <span>Statut</span>
            <span>Date</span>
          </div>
          {recentLeads.map((lead) => (
            <div key={lead.id} className={`okado-table-row ${grid} py-4 text-sm`}>
              <div className="min-w-0">
                <p className="truncate font-semibold text-carbon">{lead.firstName}</p>
                <p className="truncate text-ash">{lead.email}</p>
              </div>
              <span className="truncate text-ash">{lead.campaignTitle}</span>
              <span className="truncate text-graphite">{lead.prizeLabel}</span>
              <StatusBadge tone={leadStatusTone(lead.status)}>{leadStatusLabel(lead.status)}</StatusBadge>
              <span className="text-ash">{formatDateTime(lead.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-0 md:hidden">
        {recentLeads.map((lead) => (
          <article key={lead.id} className="okado-mobile-table-row">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-carbon">{lead.firstName}</p>
                <p className="truncate text-sm text-ash">{lead.email}</p>
              </div>
              <StatusBadge tone={leadStatusTone(lead.status)}>{leadStatusLabel(lead.status)}</StatusBadge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="okado-mobile-table-stat-label">Campagne</dt>
                <dd className="mt-1 truncate text-graphite">{lead.campaignTitle}</dd>
              </div>
              <div>
                <dt className="okado-mobile-table-stat-label">Lot remporté</dt>
                <dd className="mt-1 truncate text-graphite">{lead.prizeLabel}</dd>
              </div>
              <div>
                <dt className="okado-mobile-table-stat-label">Date</dt>
                <dd className="mt-1 text-graphite">{formatDateTime(lead.createdAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
