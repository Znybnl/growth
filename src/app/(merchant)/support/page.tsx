import { requireAuthenticatedSession } from "@/lib/auth";
import { formatDateTime, leadStatusLabel, rewardEmailStatusLabel } from "@/lib/format";
import { getMerchantSupportOverview } from "@/lib/store";

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

export default async function SupportPage() {
  const session = await requireAuthenticatedSession();
  const overview = await getMerchantSupportOverview(session.merchant.id, session.merchant);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-[#dbe4f0] bg-white shadow-[0_20px_50px_rgba(122,136,166,0.14)]">
        <div className="px-6 py-7 xl:px-8">
          <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Support</p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-none text-[#0f1728]">
            Centre de supervision
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c6577]">
            Retrouvez les e-mails en échec, les webhooks Resend reçus et les gains encore en
            attente de retrait depuis un seul écran support.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["E-mails en échec", String(overview.failedEmails.length)],
          ["Webhooks reçus", String(overview.webhooks.length)],
          ["Gains sans retrait", String(overview.pendingClaims.length)],
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

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)] xl:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">E-mails</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111827]">En échec</h2>
            </div>
            <StatusBadge label={`${overview.failedEmails.length} à traiter`} tone="danger" />
          </div>

          <div className="mt-6 space-y-3">
            {overview.failedEmails.length ? (
              overview.failedEmails.map((item) => (
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
                Aucun e-mail en échec sur les dernières campagnes.
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
            <StatusBadge label={`${overview.webhooks.length} événements`} />
          </div>

          <div className="mt-6 space-y-3">
            {overview.webhooks.length ? (
              overview.webhooks.map((item) => (
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
                Aucun webhook archivé pour le moment.
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
            <StatusBadge label={`${overview.pendingClaims.length} en attente`} tone="warning" />
          </div>

          <div className="mt-6 space-y-3">
            {overview.pendingClaims.length ? (
              overview.pendingClaims.map((item) => (
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
                Aucun gain en attente de retrait.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
