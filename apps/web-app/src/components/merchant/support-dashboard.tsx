import { SupportTable, IncidentError } from "@/components/merchant/support-tables";
import { HandleEmailIncidentButton } from "@/components/merchant/handle-email-incident-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, leadStatusLabel, rewardEmailStatusLabel } from "@/lib/format";
import { SUPPORT_SECTIONS, supportHref } from "@/lib/support-monitoring";
import type { SupportFilters, SupportMonitoring, SupportRecord, SupportSection, SupportSlice } from "@/lib/support-monitoring";
import type { RewardEmailDeliveryStatus } from "@/lib/types";

const titles: Record<SupportSection, string> = { emails: "E-mails", webhooks: "Webhooks", claims: "Gains", logs: "Journal" };
const cell = "border-b border-fog px-4 py-4 align-top text-sm leading-5 text-ash [overflow-wrap:anywhere]";
const field = "min-w-0 w-full rounded-xl border border-border bg-white px-3 py-3 text-sm";
const labels: Record<string, string> = { instant: "À chaque gain", daily: "Synthèse quotidienne",
  weekly: "Synthèse hebdomadaire", monthly: "Synthèse mensuelle", pending: "En attente", sending: "En cours",
  sent: "Accepté par Resend", retry: "Échec — reprise prévue", needs_review: "Intervention requise", cancelled: "Annulé" };
const date = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? formatDateTime(value) : "Non observé";

function Status({ row }: { row: SupportRecord }) {
  const danger = ["failed", "bounced", "complained", "suppressed", "needs_review", "retry", "error"].includes(row.status);
  const label = row.kind === "notification" ? labels[row.status] ?? row.status
    : row.kind === "reward" ? row.status === "sent" ? "Accepté par Resend" : rewardEmailStatusLabel(row.status as RewardEmailDeliveryStatus)
    : row.kind === "claim" ? leadStatusLabel(row.status as "claimed" | "redeemed" | "expired") : row.status;
  return <StatusBadge tone={danger ? "danger" : row.status === "warn" ? "warning" : "muted"}>{label}</StatusBadge>;
}

function Pagination({ name, slice, filters, base }: {
  name: SupportSection; slice: SupportSlice; filters: SupportFilters; base: string;
}) {
  if (!slice.available || slice.total === null) return null;
  const pages = Math.max(1, Math.ceil(slice.total / 25));
  return <nav aria-label={`Pagination ${titles[name]}`} className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
    <p>{slice.rows.length} affichés sur {slice.total} résultats · Page {slice.page} / {pages}</p>
    <div className="flex gap-3">
      {slice.page > 1 ? <a className="okado-secondary-action px-3"
        href={supportHref(filters, { [name + "Page"]: slice.page - 1 }, base) + "#monitor-" + name}>Précédent</a> : null}
      {slice.page < pages ? <a className="okado-secondary-action px-3"
        href={supportHref(filters, { [name + "Page"]: slice.page + 1 }, base) + "#monitor-" + name}>Suivant</a> : null}
    </div>
  </nav>;
}

function EmailCells({ row }: { row: SupportRecord }) {
  return <>
    <td className={cell}><p className="font-semibold text-graphite">{row.kind === "notification" ? labels[row.title ?? ""] ?? row.title : row.title ?? "Jeu non associé"}</p>
      <p className="mt-1">{row.merchant ?? "Établissement non associé"}</p><p className="mt-1 text-xs">{row.kind === "notification" ? "Notification établissement" : "E-mail de gain"}</p></td>
    <td className={cell}>{row.participant ? <p className="font-semibold">{row.participant}</p> : null}
      {row.recipient ?? (row.kind === "notification" ? "Adresse expurgée après traitement" : "—")}</td>
    <td className={cell}><Status row={row} /></td>
    <td className={cell}>{row.kind === "notification" ? <>
      <p>{row.attempts ?? 0} tentative(s) · Partie {row.part ?? 1} / {row.parts ?? 1}</p>
      {row.periodStart ? <p className="mt-1">Période : {date(row.periodStart)} → {date(row.periodEnd)} (fin exclusive)</p> : null}
      {["retry", "pending", "sending"].includes(row.status) ? <p className="mt-1">Prochaine éligibilité : {date(row.retryAt)}</p> : null}
    </> : row.detail ? <IncidentError message={row.detail} /> : "—"}</td>
    <td className={cell}>{date(row.at)}</td>
    <td className={cell}>{row.kind === "reward" && row.canHandle
      ? <HandleEmailIncidentButton deliveryId={row.id} eventAt={row.eventAt ?? null}
          status={row.status as RewardEmailDeliveryStatus} />
      : row.handledAt ? `Traité le ${date(row.handledAt)}` : row.status === "needs_review" ? "Vérification support requise ; aucun renvoi automatique." : "—"}</td>
  </>;
}

export function SupportDashboard({ data, filters, base = "/support" }: {
  data: SupportMonitoring; filters: SupportFilters; base?: string;
}) {
  const email = data.sections.emails, log = data.sections.logs, webhook = data.sections.webhooks;
  const stats = email.stats;
  const number = (value?: number) => email.available && value !== undefined ? String(value) : "Indisponible";
  const unavailable = SUPPORT_SECTIONS.filter(key => !data.sections[key].available);
  const lastRun = log.stats.lastRun;
  return <div className="min-w-0 space-y-6">
    <section aria-label="Synthèse opérationnelle" className="okado-card min-w-0 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="okado-section-title">Synthèse opérationnelle</h2>
        <a href={supportHref(filters, {}, base)} className="okado-secondary-action px-4">Actualiser</a>
      </header>
      <p className="mt-2 text-xs text-ash">Lecture actualisée le {date(data.updatedAt)} · Horaires affichés en heure de France.</p>
      <p className="mt-3 text-sm text-ash">Files d’attente actuelles de l’établissement sélectionné, indépendantes de la période et de la recherche.</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Incidents d’e-mail à traiter", number(stats.incidents)],
          ["E-mails de gain en attente / en cours", number(stats.queued)],
          ["Notifications en attente / en cours", number(stats.jobsWaiting)],
          ["Notifications à vérifier", number(stats.jobsReview)],
        ].map(([label, value]) => <div key={label} className="rounded-lg border border-border bg-purple-haze/30 p-4">
          <dt className="text-sm text-ash">{label}</dt><dd className="mt-2 text-2xl font-semibold text-graphite">{value}</dd>
        </div>)}
      </dl>
      {email.available ? <p className="mt-4 text-sm text-ash">
        {stats.jobsRetry ?? 0} notification(s) en reprise après échec. {stats.eventsWaiting ?? 0} événement(s) en attente de préparation.
        {stats.oldestEvent ? ` Le plus ancien date du ${date(stats.oldestEvent)}.` : ""}
        {" "}Une synthèse attend normalement la clôture de sa période ; cette attente n’est pas une panne.
      </p> : null}
      <div className="mt-4 grid gap-3 text-sm text-ash md:grid-cols-2">
        <p>Dernier webhook reçu : {webhook.available ? date(webhook.stats.latestWebhook) : "Indisponible"}.
          {" "}Un événement reçu ne garantit pas la santé de Resend ; aucun événement ne prouve pas une panne.</p>
        <p>Dernier passage planifié observé (plateforme) : {!log.available ? "Indisponible" : !lastRun ? "Non observé"
          : `${date(lastRun.at)} — ${lastRun.event === "gain_notification_recovery_run" ? "reprise" : "synthèses"} — ${lastRun.status === "error" ? "échec ou limite atteinte" : lastRun.status === "warn" ? "non exécuté" : "terminé"}`}.
          {lastRun?.detail ? ` ${lastRun.detail}` : ""}
          {" "}Cette observation n’est ni une garantie de ponctualité, ni une preuve de réception des e-mails.</p>
      </div>
      <p className="mt-3 text-sm text-ash">Erreurs journalisées sur la période (hors recherche) :
        {" "}{log.available && log.stats.errorLogs !== undefined ? log.stats.errorLogs : "Indisponible"}.
        Ce chiffre ne couvre que les événements enregistrés dans le journal.</p>
      {unavailable.length ? <p role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-graphite">
        Données indisponibles : {unavailable.map(key => titles[key]).join(", ")}. Actualisez pour réessayer.
        Si toutes les sources sont indisponibles après une livraison, vérifiez aussi la migration de Supervision.
      </p> : null}
    </section>

    <section className="okado-card p-5" aria-label="Filtres de supervision">
      <form action={base} className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="min-w-0 text-sm"><span className="mb-2 block text-ash">Recherche support</span>
          <input name="q" defaultValue={filters.q} maxLength={200} placeholder="Jeu, participant, e-mail, code…" className={field} /></label>
        <label className="min-w-0 text-sm"><span className="mb-2 block text-ash">Établissement</span>
          <select name="merchant" defaultValue={filters.merchant} className={field} disabled={!data.locationsAvailable}>
            <option value="">Tous les établissements</option>
            {filters.merchant && !data.locations.some(item => item.id === filters.merchant)
              ? <option value={filters.merchant}>Établissement non disponible</option> : null}
            {data.locations.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
          </select>
          {!data.locationsAvailable ? <span className="mt-1 block text-xs">Liste indisponible.</span> : null}
          {!data.locationsAvailable && filters.merchant ? <input type="hidden" name="merchant" value={filters.merchant} /> : null}
        </label>
        <label className="min-w-0 text-sm"><span className="mb-2 block text-ash">Du (jour UTC)</span>
          <input type="date" name="from" defaultValue={filters.from} className={field} /></label>
        <label className="min-w-0 text-sm"><span className="mb-2 block text-ash">Au (jour UTC inclus)</span>
          <input type="date" name="to" defaultValue={filters.to} className={field} /></label>
        <label className="min-w-0 text-sm"><span className="mb-2 block text-ash">Section</span>
          <select name="section" defaultValue={filters.section} className={field}>
            <option value="all">Toutes</option>{SUPPORT_SECTIONS.map(key => <option key={key} value={key}>{titles[key]}</option>)}
          </select></label>
        <label className="min-w-0 text-sm"><span className="mb-2 block text-ash">Statut / événement</span>
          <select name="status" defaultValue={filters.status} className={field}>
            <option value="all">Tous</option>
            {[
              ["queued", "Gain : en attente"], ["sending", "En cours"], ["sent", "Accepté par Resend"],
              ["delivered", "Gain : distribué"], ["failed", "Gain : échec"], ["bounced", "Rebond"],
              ["complained", "Plainte"], ["suppressed", "Suppression"], ["pending", "Notification : en attente"],
              ["retry", "Notification : reprise"], ["needs_review", "Notification : intervention"],
              ["cancelled", "Notification : annulée"], ["claimed", "Gain : à retirer"], ["redeemed", "Gain : retiré"],
              ["expired", "Gain : expiré"], ["email.delivered", "Webhook : distribué"], ["email.bounced", "Webhook : rebond"],
              ["info", "Journal : information"], ["warn", "Journal : attention"], ["error", "Journal : erreur"],
            ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        <label className="min-w-0 text-sm"><span className="mb-2 block text-ash">E-mails : traitement des incidents</span>
          <select name="incidents" defaultValue={filters.incidents} className={field}>
            <option value="all">Tous les envois</option><option value="active">Incidents à traiter</option>
            <option value="handled">Incidents traités</option>
          </select></label>
        <div className="flex flex-wrap items-end gap-2">
          <button type="submit" className="okado-primary-action px-4">Filtrer</button>
          <a href={base} className="okado-secondary-action px-4">Effacer</a>
        </div>
      </form>
      <p className="mt-3 text-xs text-ash">Sans dates : tout l’historique. E-mails : dernier événement ou création ; notifications : acceptation ou création ; autres tableaux : date de création.
        La recherche et les compteurs portent sur tous les résultats en base, pas seulement cette page.</p>
      {filters.error ? <p role="alert" className="mt-3 text-sm text-red-700">{filters.error}</p> : null}
    </section>

    {SUPPORT_SECTIONS.filter(key => filters.section === "all" || filters.section === key).map(key => {
      const slice = data.sections[key];
      const headers = key === "emails" ? ["Jeu / notification", "Destinataire", "Statut", "Détail", "Dernier événement / création", "Traitement"]
        : key === "webhooks" ? ["Date", "Événement", "Jeu / établissement", "Destinataire", "Envoi associé", "Identifiant Resend"]
        : key === "claims" ? ["Lot / jeu", "Participant", "Statut", "Code de retrait", "Disponible", "Expiration"]
        : ["Date", "Événement", "Niveau", "Contexte", "Détail"];
      const subtitle = key === "emails" ? "E-mails de gain et notifications aux établissements. « Accepté par Resend » ne signifie pas réception en boîte mail. Aucun renvoi automatique depuis cet écran."
        : key === "webhooks" ? "Événements effectivement archivés, y compris sans e-mail de gain associé. Ce tableau ne constitue pas l’historique complet de tous les envois Resend."
        : key === "claims" ? "Suivi commercial des gains, y compris retirés ou expirés. Un gain non retiré n’est pas un incident technique."
        : "Événements effectivement journalisés. Une source vide ne garantit pas l’absence d’incident sur la plateforme.";
      return <div key={key} id={"monitor-" + key} className="min-w-0">
        <SupportTable id={"monitor-table-" + key} title={titles[key]} subtitle={subtitle}
          count={slice.available ? `${slice.total} résultats` : "Indisponible"}
          headers={headers} empty={slice.available ? "Aucun résultat ne correspond aux filtres." : "Lecture indisponible. Actualisez pour réessayer."}
          hasRows={slice.available && slice.rows.length > 0}>
          {slice.rows.map(row => <tr key={row.kind + row.id} className="hover:bg-purple-haze/40">
            {key === "emails" ? <EmailCells row={row} /> : key === "webhooks" ? <>
              <td className={cell}>{date(row.at)}</td><td className={cell}>{row.status}</td>
              <td className={cell}>{row.title ?? "Non associé à un gain"}<p className="mt-1">{row.merchant ?? "—"}</p></td>
              <td className={cell}>{row.recipient ?? "—"}</td><td className={cell}>{row.detail ?? "Non associé"}</td>
              <td className={cell}>{row.providerId ?? "—"}</td>
            </> : key === "claims" ? <>
              <td className={cell}><p className="font-semibold text-graphite">{row.detail}</p><p>{row.title}</p><p>{row.merchant}</p></td>
              <td className={cell}>{row.participant}<p>{row.recipient}</p></td><td className={cell}><Status row={row} /></td>
              <td className={cell}>{row.code ?? "—"}</td><td className={cell}>{row.availableAt ? date(row.availableAt) : "Immédiatement"}</td>
              <td className={cell}>{row.status === "redeemed" ? "Retiré" : row.expiresAt ? date(row.expiresAt) : "Sans date d’expiration"}</td>
            </> : <>
              <td className={cell}>{date(row.at)}</td><td className={cell}>{row.title}</td><td className={cell}><Status row={row} /></td>
              <td className={cell}>{[row.merchant, row.campaignId && `Jeu ${row.campaignId}`, row.leadId && `Participation ${row.leadId}`].filter(Boolean).join(" · ") || "Plateforme"}</td>
              <td className={cell}>{row.detail ? <IncidentError message={row.detail} /> : "—"}</td>
            </>}
          </tr>)}
        </SupportTable>
        <Pagination name={key} slice={slice} filters={filters} base={base} />
      </div>;
    })}
  </div>;
}
