import Link from "next/link";

const numberFormatter = new Intl.NumberFormat("fr-FR");

export const CAMPAIGN_LIST_PAGE_SIZE = 10;

export function CampaignListPagination({
  page,
  total,
  query,
  status,
  action = "/campaigns",
}: {
  page: number;
  total: number;
  query: string;
  status: string;
  action?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / CAMPAIGN_LIST_PAGE_SIZE));
  if (pageCount <= 1) return null;

  const hrefForPage = (target: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status !== "all") params.set("status", status);
    params.set("page", String(target));
    return `${action}?${params.toString()}`;
  };
  const first = (page - 1) * CAMPAIGN_LIST_PAGE_SIZE + 1;
  const last = Math.min(page * CAMPAIGN_LIST_PAGE_SIZE, total);

  return <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-fog pt-4" aria-label="Pagination des campagnes">
    <p className="text-sm text-ash" aria-live="polite">
      {numberFormatter.format(first)}–{numberFormatter.format(last)} sur {numberFormatter.format(total)} campagnes · page {page} sur {pageCount}
    </p>
    <div className="flex items-center gap-2">
      {page > 1 ? <Link href={hrefForPage(page - 1)} prefetch={false} className="okado-secondary-action min-h-11 px-3">Précédent</Link> : null}
      {page < pageCount ? <Link href={hrefForPage(page + 1)} prefetch={false} className="okado-primary-action min-h-11 px-3">Voir les {numberFormatter.format(Math.min(CAMPAIGN_LIST_PAGE_SIZE, total - page * CAMPAIGN_LIST_PAGE_SIZE))} suivantes</Link> : null}
    </div>
  </nav>;
}
