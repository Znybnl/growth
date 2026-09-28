import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader, ResponsiveTable } from "@/components/ui/workspace";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCreatedCampaigns } from "@/lib/admin-campaign-repository";
import { requireAuthenticatedSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

type AdminCampaignsPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminCampaignsPage({ searchParams }: AdminCampaignsPageProps) {
  const session = await requireAuthenticatedSession();
  if (!isSaasAdminEmail(session.user.email)) redirect("/");

  const { q = "" } = await searchParams;
  const campaigns = await getAdminCreatedCampaigns(session.user.id, q);

  return (
    <div className="w-full space-y-6 px-1 pb-8">
      <PageHeader
        eyebrow="Administration · jeux créés"
        title="Jeux créés pour les marchands"
        description="Retrouvez les jeux créés depuis Pilotage et reprenez leur configuration ou leur affiche."
        actions={<Link href="/admin" className="okado-secondary-action px-4 text-sm">Retour au pilotage</Link>}
      />

      <section className="okado-card p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="okado-label">Jeux administrés</p>
            <h2 className="okado-section-title mt-2">{campaigns.length} jeu(x)</h2>
          </div>
          <form action="/admin/campaigns" className="flex w-full gap-2 sm:w-auto">
            <input
              name="q"
              defaultValue={q}
              placeholder="Jeu, compte ou établissement"
              aria-label="Rechercher un jeu créé par l’administration"
              className="h-10 min-w-0 flex-1 px-3 text-sm sm:w-72"
            />
            <button type="submit" className="okado-secondary-action okado-compact-action px-4 text-sm">
              Rechercher
            </button>
          </form>
        </div>

        <ResponsiveTable className="mt-5">
          <table className="okado-data-table w-full text-left text-sm">
            <thead className="okado-table-header">
              <tr>
                <th className="px-3 py-3 font-medium">Jeu</th>
                <th className="px-3 py-3 font-medium">Compte marchand</th>
                <th className="px-3 py-3 font-medium">Établissement</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-3 py-3 font-medium">Créé le</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="text-graphite">
                  <td className="px-3 py-4 font-semibold">{campaign.title}</td>
                  <td className="px-3 py-4">{campaign.accountMerchantName}</td>
                  <td className="px-3 py-4">{campaign.merchantName}</td>
                  <td className="px-3 py-4">
                    <span className={`okado-status-badge ${campaign.isActive ? "okado-status-active" : "okado-status-muted"}`}>
                      {campaign.isActive ? "Publié" : "Brouillon"}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-ash">{formatDateTime(campaign.createdAt)}</td>
                  <td className="px-3 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/campaigns/${encodeURIComponent(campaign.id)}/edit`}
                        className="okado-primary-action okado-compact-action whitespace-nowrap px-3 text-xs"
                      >
                        Configuration
                      </Link>
                      <Link
                        href={`/admin/campaigns/${encodeURIComponent(campaign.id)}/poster`}
                        className="okado-secondary-action okado-compact-action whitespace-nowrap px-3 text-xs"
                      >
                        Affiche
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!campaigns.length ? (
            <p className="px-3 py-8 text-sm text-ash">
              {q.trim() ? "Aucun jeu ne correspond à cette recherche." : "Aucun jeu créé par l’administration pour le moment."}
            </p>
          ) : null}
        </ResponsiveTable>
      </section>
    </div>
  );
}
