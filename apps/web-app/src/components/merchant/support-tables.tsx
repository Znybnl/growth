import type { ReactNode } from "react";
import { HandleEmailIncidentButton } from "@/components/merchant/handle-email-incident-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, leadStatusLabel, rewardEmailStatusLabel } from "@/lib/format";
import type { MerchantSupportOverview } from "@/lib/types";

type SupportRows = Pick<MerchantSupportOverview, "failedEmails" | "webhooks" | "pendingClaims" | "businessLogs">;

const cell = "border-b border-fog px-4 py-4 align-top text-sm leading-5 text-ash [overflow-wrap:anywhere]";
const strong = "font-semibold text-graphite";

function IncidentError({ message }: { message?: string }) {
  const text = message || "Erreur de délivrabilité non précisée.";
  if (text.length <= 200) return <>{text}</>;
  return <details>
    <summary className="cursor-pointer font-medium text-primary-action-accent focus-visible:outline-2">
      Voir l’erreur complète
    </summary>
    <p className="mt-2">{text}</p>
  </details>;
}

function SupportTable({ id, title, subtitle, count, headers, empty, children, hasRows }: {
  id: string; title: string; subtitle: string; count: string; headers: string[];
  empty: string; children: ReactNode; hasRows: boolean;
}) {
  return <section aria-labelledby={`${id}-heading`} className="okado-card min-w-0 p-4 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={`${id}-heading`} className="okado-section-title">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-5 text-ash">{subtitle}</p>
      </div>
      <StatusBadge tone="muted">{count}</StatusBadge>
    </header>
    <p className="mt-4 text-xs text-ash lg:hidden">Faites défiler le tableau horizontalement pour voir toutes les colonnes.</p>
    <div role="region" aria-label={`Tableau ${title}`} tabIndex={0}
      className="mt-4 max-w-full overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-primary-action">
      <table className="w-full min-w-[980px] table-fixed border-collapse text-left">
        <caption className="sr-only">{title} — {subtitle}</caption>
        <thead className="okado-table-header">
          <tr>{headers.map(header => <th key={header} scope="col"
            className="border-b border-border px-4 py-3 text-xs font-semibold text-graphite">{header}</th>)}</tr>
        </thead>
        <tbody>{hasRows ? children : <tr><td colSpan={headers.length} className="px-4 py-8 text-sm text-ash">{empty}</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}

export function SupportTables({ rows, showHandled, hasFilter }: {
  rows: SupportRows; showHandled: boolean; hasFilter: boolean;
}) {
  return <div className="min-w-0 space-y-6" data-support-tables>
    <SupportTable id="support-emails" title="E-mails"
      subtitle={showHandled
        ? "Incidents traités : le statut réel d’envoi et les événements fournisseur sont conservés. Les 20 plus récents sont affichés."
        : "Incidents à traiter : l’action retire l’alerte sans renvoyer l’e-mail ni changer son statut. Les 20 plus récents sont affichés."}
      count={`${rows.failedEmails.length} affichés`}
      headers={["Jeu", "Participant / destinataire", "Statut d’envoi", "Erreur", "Dernier événement", "Traitement"]}
      hasRows={rows.failedEmails.length > 0}
      empty={hasFilter ? "Aucun e-mail ne correspond aux filtres." : "Aucun e-mail en échec sur les dernières campagnes."}>
      {rows.failedEmails.map(item => <tr key={item.deliveryId} className="hover:bg-purple-haze/40">
        <td className={`${cell} ${strong}`}>{item.campaignTitle}</td>
        <td className={cell}><p className={strong}>{item.leadFirstName}</p><p className="mt-1">{item.recipientEmail}</p></td>
        <td className={cell}><StatusBadge tone="danger">{rewardEmailStatusLabel(item.status)}</StatusBadge></td>
        <td className={cell}><IncidentError message={item.errorMessage} /></td>
        <td className={cell}>{formatDateTime(item.lastEventAt)}</td>
        <td className={cell}>{showHandled && item.handledAt
          ? <span>Traité le {formatDateTime(item.handledAt)}</span>
          : <HandleEmailIncidentButton key={`${item.deliveryId}:${item.eventAt}:${item.status}`}
            deliveryId={item.deliveryId} eventAt={item.eventAt} status={item.status} />}</td>
      </tr>)}
    </SupportTable>

    <SupportTable id="support-webhooks" title="Webhooks" subtitle="Événements Resend reçus récemment et rattachés aux e-mails de gain."
      count={`${rows.webhooks.length} événements`} headers={["Date", "Événement", "Jeu", "Destinataire", "Statut d’envoi", "Détail"]}
      hasRows={rows.webhooks.length > 0}
      empty={hasFilter ? "Aucun webhook ne correspond aux filtres." : "Aucun webhook archivé pour le moment."}>
      {rows.webhooks.map(item => <tr key={item.id} className="hover:bg-purple-haze/40">
        <td className={cell}>{formatDateTime(item.createdAt)}</td>
        <td className={`${cell} ${strong}`}>{item.eventType}</td>
        <td className={cell}>{item.campaignTitle || "Campagne inconnue"}</td>
        <td className={cell}>{item.recipientEmail || "—"}</td>
        <td className={cell}><StatusBadge tone={item.deliveryStatus === "failed" || item.deliveryStatus === "bounced" ? "danger" : "muted"}>
          {item.deliveryStatus ? rewardEmailStatusLabel(item.deliveryStatus) : "Archivé"}
        </StatusBadge></td>
        <td className={cell}>{item.summary || "—"}</td>
      </tr>)}
    </SupportTable>

    <SupportTable id="support-claims" title="Gains" subtitle="Gains en attente de retrait."
      count={`${rows.pendingClaims.length} en attente`}
      headers={["Lot / jeu", "Participant", "Statut", "Code de retrait", "Disponible", "Expiration"]}
      hasRows={rows.pendingClaims.length > 0}
      empty={hasFilter ? "Aucun gain ne correspond aux filtres." : "Aucun gain en attente de retrait."}>
      {rows.pendingClaims.map(item => <tr key={item.leadId} className="hover:bg-purple-haze/40">
        <td className={cell}><p className={strong}>{item.prizeLabel}</p><p className="mt-1">{item.campaignTitle}</p></td>
        <td className={cell}><p className={strong}>{item.firstName}</p><p className="mt-1">{item.email}</p></td>
        <td className={cell}><StatusBadge tone="warning">{leadStatusLabel(item.status)}</StatusBadge></td>
        <td className={`${cell} font-mono`}>{item.redemptionCode}</td>
        <td className={cell}>{item.availableAt ? formatDateTime(item.availableAt) : "Immédiatement"}</td>
        <td className={cell}>{item.expiresAt ? formatDateTime(item.expiresAt) : "Sans date d’expiration"}</td>
      </tr>)}
    </SupportTable>

    <SupportTable id="support-journal" title="Journal" subtitle="Logs métier récents."
      count={`${rows.businessLogs.length} lignes`} headers={["Date", "Événement", "Niveau", "Contexte", "Détail"]}
      hasRows={rows.businessLogs.length > 0}
      empty={hasFilter ? "Aucun log ne correspond aux filtres." : "Aucun log métier récent."}>
      {rows.businessLogs.map(item => <tr key={item.id} className="hover:bg-purple-haze/40">
        <td className={cell}>{formatDateTime(item.createdAt)}</td>
        <td className={`${cell} ${strong}`}>{item.event}</td>
        <td className={cell}><StatusBadge tone={item.level === "error" ? "danger" : item.level === "warn" ? "warning" : "muted"}>{item.level}</StatusBadge></td>
        <td className={cell}>{[item.campaignId && `Campagne ${item.campaignId}`, item.leadId && `Participant ${item.leadId}`, item.email, item.redemptionCode && `Code ${item.redemptionCode}`]
          .filter(Boolean).join(" · ") || "—"}</td>
        <td className={cell}>{item.summary || "—"}</td>
      </tr>)}
    </SupportTable>
  </div>;
}
