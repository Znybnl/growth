import Link from "next/link";
import { redirect } from "next/navigation";

import { isSaasAdminEmail } from "@/lib/admin";
import { getSaasAdminOverview } from "@/lib/admin-repository";
import { requireAuthenticatedSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { MetricCard, PageHeader, ResponsiveTable } from "@/components/ui/workspace";
import { StatusBadge as SharedStatusBadge } from "@/components/ui/status-badge";

type AdminPageProps = {
  searchParams: Promise<{ q?: string }>;
};

function StatusBadge({ status }: { status: string | null }) {
  if (status === "active") {
    return <SharedStatusBadge tone="active">Actif</SharedStatusBadge>;
  }
  if (status === "trialing") {
    return <SharedStatusBadge tone="info">Essai</SharedStatusBadge>;
  }
  if (status === "past_due" || status === "unpaid") {
    return <SharedStatusBadge tone="warning">Paiement à suivre</SharedStatusBadge>;
  }
  if (status === "canceled") {
    return <SharedStatusBadge tone="muted">Résilié</SharedStatusBadge>;
  }
  return <SharedStatusBadge tone="muted">Inactive</SharedStatusBadge>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await requireAuthenticatedSession();
  if (!isSaasAdminEmail(session.user.email)) redirect("/");

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const overview = await getSaasAdminOverview(query);

  return (
    <div className="w-full space-y-6 px-1 pb-8">
      <PageHeader
        eyebrow="Administration"
        title="Pilotage de la plateforme"
        description="Suivez les comptes marchands, les campagnes produit et les alertes qui demandent une action."
        actions={
          <>
          <Link href="/admin/prize-suggestions" className="okado-secondary-action okado-compact-action px-4 text-sm">
            Gérer les suggestions de lots
          </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Comptes" value={overview.totals.merchants} detail={`${overview.totals.onboardedMerchants} onboarding terminés`} />
        <MetricCard label="Abonnements" value={overview.totals.activeSubscriptions} detail="Essais et abonnements actifs" />
        <MetricCard label="Animations" value={overview.totals.activeCampaigns} detail={`${overview.totals.leads} participations collectées`} />
        <MetricCard label="Gains à suivre" value={overview.totals.pendingRewards} detail="Gains en attente de retrait" />
      </section>

      <section className="okado-card border-[#fecdd3] bg-[#fff7f7] p-5">
        <p className="okado-label text-[#be123c]">E-mails à surveiller</p>
        <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#9f1239]">
          {overview.totals.failedRewardEmails}
        </p>
        <p className="mt-2 text-sm text-[#9f1239]">
          E-mails de gain en échec, bounce ou plainte à analyser depuis la Supervision.
        </p>
      </section>

      <section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="okado-label">Utilisateurs</p>
            <h2 className="okado-section-title mt-2">Comptes marchands</h2>
          </div>
          <form className="flex w-full gap-2 sm:w-auto" action="/admin">
            <input
              name="q"
              defaultValue={query}
              placeholder="Commerce, nom ou e-mail"
              className="h-10 min-w-0 flex-1 px-3 text-sm sm:w-72"
            />
            <button type="submit" className="okado-secondary-action okado-compact-action px-4 text-sm">Rechercher</button>
          </form>
        </div>

        <ResponsiveTable className="mt-5">
          <table className="okado-data-table okado-admin-table w-full text-left text-sm">
            <thead className="okado-table-header">
              <tr>
                <th className="px-3 py-3 font-medium">Utilisateur</th>
                <th className="px-3 py-3 font-medium">Commerce</th>
                <th className="px-3 py-3 font-medium">Inscription</th>
                <th className="px-3 py-3 font-medium">Parcours</th>
                <th className="px-3 py-3 font-medium">Abonnement</th>
                <th className="px-3 py-3 font-medium">Activite</th>
                <th className="px-3 py-3 font-medium">Alertes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {overview.users.map((user) => (
                <tr key={user.id} className="text-graphite">
                  <td className="px-3 py-4">
                    <p className="font-medium">{`${user.firstName} ${user.lastName}`.trim()}</p>
                    <p className="mt-1 text-xs text-ash">{user.email}</p>
                  </td>
                  <td className="px-3 py-4 font-medium">{user.merchantName}</td>
                  <td className="px-3 py-4 text-ash">{formatDateTime(user.createdAt)}</td>
                  <td className="px-3 py-4">
                    <span className={`okado-status-badge ${user.onboardingCompleted ? "okado-status-active" : "okado-status-muted"}`}>
                      {user.onboardingCompleted ? "Termine" : "A finaliser"}
                    </span>
                  </td>
                  <td className="px-3 py-4"><StatusBadge status={user.subscriptionStatus} /></td>
                  <td className="px-3 py-4 text-ash">{user.campaignCount} animation(s) · {user.leadCount} participation(s)</td>
                  <td className="px-3 py-4">
                    {user.lowStockCount || user.failedEmailCount ? (
                      <span className="text-xs font-medium text-[#a15c00]">
                        {user.lowStockCount ? `${user.lowStockCount} stock` : ""}
                        {user.lowStockCount && user.failedEmailCount ? " · " : ""}
                        {user.failedEmailCount ? `${user.failedEmailCount} e-mail(s)` : ""}
                      </span>
                    ) : <span className="text-xs text-ash">Aucune</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!overview.users.length ? <p className="px-3 py-8 text-sm text-ash">Aucun utilisateur ne correspond a votre recherche.</p> : null}
        </ResponsiveTable>
      </section>
    </div>
  );
}
