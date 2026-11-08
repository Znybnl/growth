import Link from "next/link";

export function CampaignListFilters({ query, status = "all", action = "/campaigns", counts }: {
  query: string; status?: string; action?: string;
  counts?: { all: number; active: number; paused: number };
}) {
  const statusHref = (value: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (value !== "all") params.set("status", value);
    const search = params.toString();
    return search ? `${action}?${search}` : action;
  };

  return <form key={JSON.stringify([query, status])} action={action} method="get" role="search" aria-label="Filtrer les campagnes" className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
    {counts ? <nav className="flex min-w-0 gap-2 overflow-x-auto pb-1 sm:hidden" aria-label="Filtre rapide par statut">
      {([
        ["all", "Toutes", counts.all],
        ["active", "Actives", counts.active],
        ["paused", "En pause", counts.paused],
      ] as const).map(([value, label, count]) => <Link key={value} href={statusHref(value)} prefetch={false} aria-current={status === value ? "page" : undefined}
        className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors ${status === value ? "border-aubergine bg-aubergine text-white" : "border-fog bg-white text-carbon hover:border-aubergine/50"}`}>
        {label}<span className={status === value ? "text-white/75" : "text-ash"}>{count}</span>
      </Link>)}
    </nav> : null}
    <label className="min-w-0 flex-1 text-sm font-medium text-carbon">
      Rechercher une campagne
      <input type="search" name="q" defaultValue={query} placeholder="Nom ou texte de la campagne" className="mt-1 min-h-11 w-full rounded-lg border border-fog bg-white px-3 text-base sm:text-sm" />
    </label>
    <div className="flex items-end gap-2">
      <label className="hidden min-w-0 flex-1 text-sm font-medium text-carbon sm:block">Statut
        <select name="status" aria-label="Statut" defaultValue={status} className="mt-1 min-h-11 w-full rounded-lg border border-fog bg-white px-3 text-base sm:text-sm">
          <option value="all">Toutes</option><option value="active">Actives</option><option value="paused">En pause</option>
        </select>
      </label>
      <button type="submit" className="okado-secondary-action min-h-11 px-4">Filtrer</button>
      {query || status !== "all" ? <Link href={action} prefetch={false} className="okado-link flex min-h-11 items-center text-sm">Effacer</Link> : null}
    </div>
  </form>;
}
