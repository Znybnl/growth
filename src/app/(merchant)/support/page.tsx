import { requireAuthenticatedSession } from "@/lib/auth";
import { isSaasAdminEmail } from "@/lib/admin";
import { formatDateTime, leadStatusLabel, rewardEmailStatusLabel } from "@/lib/format";
import { getMerchantSupportOverview } from "@/lib/store";
import { redirect } from "next/navigation";

type SupportPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    section?: string;
  }>;
};

function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "danger" | "warning" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-[#fff1f2] text-[#be123c]"
      : tone === "warning"
        ? "bg-[#fff7ed] text-[#c2410c]"
        : tone === "success"
          ? "bg-[#ecfdf3] text-[#047857]"
          : "bg-[#f3f6fb] text-[#475569]";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {label}
    </span>
  );
}

function includesQuery(values: Array<string | undefined>, query: string) {
  if (!query) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(query));
}

function supportLogTone(level: "info" | "warn" | "error") {
  if (level === "error") return "danger";
  if (level === "warn") return "warning";
  return "neutral";
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const session = await requireAuthenticatedSession();
  const params = await searchParams;

  if (!isSaasAdminEmail(session.user.email)) {
    redirect("/");
  }

  const overview = await getMerchantSupportOverview(session.merchant.id, session.merchant, {
    includeAllMerchants: true,
  });
  const query = params.q?.trim().toLowerCase() ?? "";
  const status = params.status?.trim() ?? "all";
  const section = params.section?.trim() ?? "all";
  const filteredOverview = {
    failedEmails:
      section === "all" || section === "emails"
        ? overview.failedEmails.filter(
            (item) =>
              (status === "all" || item.status === status) &&
              includesQuery(
                [
                  item.campaignTitle,
                  item.leadFirstName,
                  item.recipientEmail,
                  item.errorMessage,
                  item.deliveryId,
                  item.leadId,
                ],
                query,
              ),
          )
        : [],
    webhooks:
      section === "all" || section === "webhooks"
        ? overview.webhooks.filter(
            (item) =>
              (status === "all" || item.deliveryStatus === status || item.eventType === status) &&
              includesQuery(
                [
                  item.eventType,
                  item.resendEmailId,
                  item.campaignTitle,
                  item.recipientEmail,
                  item.deliveryStatus,
                  item.summary,
                ],
                query,
              ),
          )
        : [],
    pendingClaims:
      section === "all" || section === "claims"
        ? overview.pendingClaims.filter(
            (item) =>
              (status === "all" || item.status === status) &&
              includesQuery(
                [
                  item.campaignTitle,
                  item.firstName,
                  item.email,
                  item.prizeLabel,
                  item.redemptionCode,
                  item.status,
                ],
                query,
              ),
          )
        : [],
    businessLogs:
      section === "all" || section === "logs"
        ? overview.businessLogs.filter(
            (item) =>
              (status === "all" || item.level === status || item.event === status) &&
              includesQuery(
                [
                  item.event,
                  item.summary,
                  item.merchantId,
                  item.campaignId,
                  item.leadId,
                  item.email,
                  item.redemptionCode,
                ],
                query,
              ),
          )
        : [],
  };
  const hasFilter = Boolean(query || status !== "all" || section !== "all");
  const errorLogsCount = overview.businessLogs.filter((item) => item.level === "error").length;
  const failedEmailCount = overview.failedEmails.length;
  const pendingClaimCount = overview.pendingClaims.length;
  const webhookCount = overview.webhooks.length;
  const healthItems = [
    {
      label: "E-mails en échec",
      value: failedEmailCount,
      tone: failedEmailCount ? "danger" : "success",
      detail: failedEmailCount ? "À traiter avant pilote" : "Aucun blocage récent",
    },
    {
      label: "Webhooks reçus",
      value: webhookCount,
      tone: webhookCount ? "success" : "warning",
      detail: webhookCount ? "Synchronisation active" : "Aucun signal récent",
    },
    {
      label: "Gains sans retrait",
      value: pendingClaimCount,
      tone: pendingClaimCount ? "warning" : "success",
      detail: pendingClaimCount ? "Suivi vendeur requis" : "Aucun gain en attente",
    },
    {
      label: "Erreurs métier",
      value: errorLogsCount,
      tone: errorLogsCount ? "danger" : "success",
      detail: errorLogsCount ? "Investigation support" : "Aucune erreur récente",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-[#dbe4f0] bg-white shadow-[0_20px_50px_rgba(122,136,166,0.14)]">
        <div className="px-6 py-7 xl:px-8">
          <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Supervision</p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-none text-[#0f1728]">
            Centre de supervision
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c6577]">
            Retrouvez les e-mails en échec, les webhooks Resend reçus et les gains encore en
            attente de retrait depuis un seul écran support.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["E-mails en échec", String(filteredOverview.failedEmails.length)],
          ["Webhooks reçus", String(filteredOverview.webhooks.length)],
          ["Gains sans retrait", String(filteredOverview.pendingClaims.length)],
          ["Logs métier", String(filteredOverview.businessLogs.length)],
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

      <section className="rounded-[32px] border border-[#dbe4f0] bg-[#101827] p-6 text-white shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#9fb0d0]">Santé production</p>
            <h2 className="mt-2 text-3xl font-semibold">Signaux support à surveiller</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[#c7d2ea]">
            Synthèse des points qui peuvent bloquer un pilote : délivrabilité e-mail,
            synchronisation webhook, lots non retirés et erreurs métier récentes.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {healthItems.map((item) => (
            <div key={item.label} className="rounded-[24px] bg-white/8 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <StatusBadge
                  label={item.tone === "success" ? "OK" : item.tone === "warning" ? "À suivre" : "Action"}
                  tone={item.tone}
                />
              </div>
              <p className="mt-4 text-3xl font-semibold">{item.value}</p>
              <p className="mt-2 text-sm text-[#c7d2ea]">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_36px_rgba(122,136,166,0.08)]">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]" action="/support">
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Recherche support</span>
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="E-mail, code retrait, campagne, lead..."
              className="w-full rounded-[18px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
            />
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Section</span>
            <select
              name="section"
              defaultValue={section}
              className="w-full rounded-[18px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
            >
              <option value="all">Toutes</option>
              <option value="emails">E-mails</option>
              <option value="webhooks">Webhooks</option>
              <option value="claims">Gains sans retrait</option>
              <option value="logs">Journal métier</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Statut / événement</span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-[18px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
            >
              <option value="all">Tous</option>
              <option value="failed">E-mail en échec</option>
              <option value="bounced">Rebond</option>
              <option value="complained">Plainte</option>
              <option value="suppressed">Supprimé</option>
              <option value="claimed">Gain à retirer</option>
              <option value="redeemed">Gain retiré</option>
              <option value="email.delivered">Webhook livré</option>
              <option value="email.bounced">Webhook rebond</option>
              <option value="info">Log info</option>
              <option value="warn">Log attention</option>
              <option value="error">Log erreur</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-[18px] bg-[#111827] px-5 py-3 text-sm font-semibold !text-white"
            >
              Filtrer
            </button>
            {hasFilter ? (
              <a
                href="/support"
                className="rounded-[18px] border border-[#d7e0ed] px-5 py-3 text-sm font-semibold text-[#182033]"
              >
                Effacer
              </a>
            ) : null}
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <article className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)] xl:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">E-mails</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">En échec</h2>
            </div>
            <StatusBadge label={`${filteredOverview.failedEmails.length} à traiter`} tone="danger" />
          </div>

          <div className="mt-6 space-y-3">
            {filteredOverview.failedEmails.length ? (
              filteredOverview.failedEmails.map((item) => (
                <div
                  key={item.deliveryId}
                  className="rounded-[24px] border border-[#edf1f6] bg-[#fbfcfe] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{item.campaignTitle}</p>
                      <p className="text-sm text-[#5c6577]">
                        {item.leadFirstName} · {item.recipientEmail}
                      </p>
                    </div>
                    <StatusBadge label={rewardEmailStatusLabel(item.status)} tone="danger" />
                  </div>
                  <p className="mt-3 text-sm text-[#7b8496]">
                    {item.errorMessage || "Erreur de délivrabilité non précisée."}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#94a3b8]">
                    Dernier événement {formatDateTime(item.lastEventAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-[24px] border border-dashed border-[#dbe4f0] bg-[#fbfcfe] px-4 py-8 text-sm text-[#64748b]">
                {hasFilter
                  ? "Aucun e-mail ne correspond aux filtres."
                  : "Aucun e-mail en échec sur les dernières campagnes."}
              </p>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)] xl:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Webhooks</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">Reçus récemment</h2>
            </div>
            <StatusBadge label={`${filteredOverview.webhooks.length} événements`} />
          </div>

          <div className="mt-6 space-y-3">
            {filteredOverview.webhooks.length ? (
              filteredOverview.webhooks.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-[#edf1f6] bg-[#fbfcfe] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{item.eventType}</p>
                      <p className="text-sm text-[#5c6577]">
                        {item.campaignTitle || "Campagne inconnue"}
                        {item.recipientEmail ? ` · ${item.recipientEmail}` : ""}
                      </p>
                    </div>
                    <StatusBadge
                      label={
                        item.deliveryStatus
                          ? rewardEmailStatusLabel(item.deliveryStatus)
                          : "Archivé"
                      }
                      tone={
                        item.deliveryStatus === "failed" || item.deliveryStatus === "bounced"
                          ? "danger"
                          : "neutral"
                      }
                    />
                  </div>
                  {item.summary ? (
                    <p className="mt-3 text-sm text-[#7b8496]">{item.summary}</p>
                  ) : null}
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#94a3b8]">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-[24px] border border-dashed border-[#dbe4f0] bg-[#fbfcfe] px-4 py-8 text-sm text-[#64748b]">
                {hasFilter
                  ? "Aucun webhook ne correspond aux filtres."
                  : "Aucun webhook archivé pour le moment."}
              </p>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)] xl:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Gains</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">Sans retrait</h2>
            </div>
            <StatusBadge label={`${filteredOverview.pendingClaims.length} en attente`} tone="warning" />
          </div>

          <div className="mt-6 space-y-3">
            {filteredOverview.pendingClaims.length ? (
              filteredOverview.pendingClaims.map((item) => (
                <div
                  key={item.leadId}
                  className="rounded-[24px] border border-[#edf1f6] bg-[#fbfcfe] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{item.prizeLabel}</p>
                      <p className="text-sm text-[#5c6577]">
                        {item.campaignTitle} · {item.firstName} · {item.email}
                      </p>
                    </div>
                    <StatusBadge label={leadStatusLabel(item.status)} tone="warning" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#64748b]">
                    <span className="rounded-full bg-white px-3 py-1">Code {item.redemptionCode}</span>
                    <span className="rounded-full bg-white px-3 py-1">
                      Disponible {item.availableAt ? formatDateTime(item.availableAt) : "immédiatement"}
                    </span>
                    {item.expiresAt ? (
                      <span className="rounded-full bg-white px-3 py-1">
                        Expire {formatDateTime(item.expiresAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-[24px] border border-dashed border-[#dbe4f0] bg-[#fbfcfe] px-4 py-8 text-sm text-[#64748b]">
                {hasFilter
                  ? "Aucun gain ne correspond aux filtres."
                  : "Aucun gain en attente de retrait."}
              </p>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)] xl:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Journal</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">Logs métier</h2>
            </div>
            <StatusBadge label={`${filteredOverview.businessLogs.length} lignes`} />
          </div>

          <div className="mt-6 space-y-3">
            {filteredOverview.businessLogs.length ? (
              filteredOverview.businessLogs.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-[#edf1f6] bg-[#fbfcfe] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="break-all text-sm font-semibold text-[#111827]">{item.event}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#94a3b8]">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    <StatusBadge label={item.level} tone={supportLogTone(item.level)} />
                  </div>
                  {item.summary ? (
                    <p className="mt-3 text-sm leading-6 text-[#64748b]">{item.summary}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#64748b]">
                    {item.campaignId ? (
                      <span className="rounded-full bg-white px-3 py-1">
                        Campagne {item.campaignId}
                      </span>
                    ) : null}
                    {item.leadId ? (
                      <span className="rounded-full bg-white px-3 py-1">Lead {item.leadId}</span>
                    ) : null}
                    {item.email ? (
                      <span className="rounded-full bg-white px-3 py-1">{item.email}</span>
                    ) : null}
                    {item.redemptionCode ? (
                      <span className="rounded-full bg-white px-3 py-1">
                        Code {item.redemptionCode}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-[24px] border border-dashed border-[#dbe4f0] bg-[#fbfcfe] px-4 py-8 text-sm text-[#64748b]">
                {hasFilter
                  ? "Aucun log ne correspond aux filtres."
                  : "Aucun log métier récent."}
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
