import Link from "next/link";

export function CampaignListFilters({ query, status = "all", action = "/campaigns" }: {
  query: string; status?: string; action?: string;
}) {
  return <form key={JSON.stringify([query, status])} action={action} method="get" role="search" aria-label="Filtrer les campagnes" className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
    <label className="min-w-0 flex-1 text-sm font-medium text-carbon">
      Rechercher une campagne
      <input type="search" name="q" defaultValue={query} placeholder="Nom ou texte de la campagne" className="mt-1 min-h-11 w-full rounded-lg border border-fog bg-white px-3 text-base sm:text-sm" />
    </label>
    <div className="flex items-end gap-2">
      <label className="min-w-0 flex-1 text-sm font-medium text-carbon">Statut
        <select name="status" aria-label="Statut" defaultValue={status} className="mt-1 min-h-11 w-full rounded-lg border border-fog bg-white px-3 text-base sm:text-sm">
          <option value="all">Toutes</option><option value="active">Actives</option><option value="paused">En pause</option>
        </select>
      </label>
      <button type="submit" className="okado-secondary-action min-h-11 px-4">Filtrer</button>
      {query || status !== "all" ? <Link href={action} prefetch={false} className="okado-link flex min-h-11 items-center text-sm">Effacer</Link> : null}
    </div>
  </form>;
}
