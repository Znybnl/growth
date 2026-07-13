import { redirect } from "next/navigation";

import { AffiliateAccountSettingsForm } from "@/components/merchant/affiliate-account-settings-form";
import { AffiliateCommissionActions } from "@/components/merchant/affiliate-commission-actions";
import { getAffiliateAdminOverview } from "@/lib/affiliate-repository";
import { isSaasAdminEmail } from "@/lib/admin";
import { requireAuthenticatedSession } from "@/lib/auth";
import { AffiliateCommissionStatus } from "@/lib/types";

type AffiliatesPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: AffiliateCommissionStatus) {
  switch (status) {
    case "payable":
      return "À payer";
    case "paid":
      return "Payée";
    case "void":
      return "Annulée";
    default:
      return "En attente";
  }
}

function statusTone(status: AffiliateCommissionStatus) {
  if (status === "paid") return "okado-status-active";
  if (status === "void") return "okado-status-muted";
  if (status === "payable") return "okado-status-warning";
  return "okado-status-muted";
}

export default async function AffiliatesPage({ searchParams }: AffiliatesPageProps) {
  const session = await requireAuthenticatedSession();

  if (!isSaasAdminEmail(session.user.email)) {
    redirect("/");
  }

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "all";
  const overview = await getAffiliateAdminOverview({ query, status });
  const exportParams = new URLSearchParams();
  if (query) exportParams.set("q", query);
  if (status !== "all") exportParams.set("status", status);
  exportParams.set("format", "csv");

  return (
    <div className="space-y-6">
      <section className="px-1 py-2">
        <div>
          <p className="okado-label">Affiliation</p>
          <h1 className="okado-page-title mt-3">
            Programme affiliés
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ash">
            Suivez les filleuls, les commissions Stripe générées et les paiements manuels à
            effectuer.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          ["Affiliés actifs", String(overview.totals.activeAffiliates)],
          ["Filleuls", String(overview.totals.referrals)],
          ["En attente", formatMoney(overview.totals.pendingCommissionCents)],
          ["À payer", formatMoney(overview.totals.payableCommissionCents)],
          ["Payées", formatMoney(overview.totals.paidCommissionCents)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="okado-card p-5"
          >
            <p className="okado-label tracking-[0.18em]">{label}</p>
            <p className="mt-4 text-2xl font-semibold text-graphite">{value}</p>
          </div>
        ))}
      </section>

      <section className="okado-card p-5">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto]" action="/affiliates">
          <label className="text-sm">
            <span className="mb-2 block text-ash">Recherche</span>
            <input
              name="q"
              defaultValue={query}
              placeholder="Affilié, filleul, facture Stripe..."
              className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-3 outline-none"
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">Statut</span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-3 outline-none"
            >
              <option value="all">Tous</option>
              <option value="pending">En attente</option>
              <option value="payable">À payer</option>
              <option value="paid">Payées</option>
              <option value="void">Annulées</option>
            </select>
          </label>
          <button className="okado-primary-action self-end px-5 py-3">
            Filtrer
          </button>
          <a
            href={`/api/affiliates/commissions?${exportParams.toString()}`}
            className="okado-secondary-action self-end px-5 py-3"
          >
            Export CSV
          </a>
        </form>
      </section>

      <section className="okado-card overflow-hidden p-0">
        <div className="border-b border-border px-6 py-5">
          <p className="okado-label">Paramétrage</p>
          <h2 className="okado-section-title mt-2">
            Activation des affiliés
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ash">
            Le programme est désactivé par défaut. Activez manuellement les affiliés autorisés,
            puis définissez leur taux et leur durée de commission.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="okado-table-header">
              <tr>
                <th className="px-5 py-4">Marchand</th>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Filleuls</th>
                <th className="px-5 py-4">Commissions</th>
                <th className="px-5 py-4">Réglages</th>
              </tr>
            </thead>
            <tbody>
              {overview.accounts.map((account) => (
                <tr key={account.id} className="border-t border-border">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{account.merchantName}</p>
                    <p className="mt-1 truncate text-xs text-ash">
                      {account.merchantEmail ?? "E-mail non renseigné"}
                    </p>
                    <p className="mt-1 text-xs text-ash">
                      {account.status === "active" ? "Programme activé" : "Programme désactivé"}
                    </p>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">{account.code}</td>
                  <td className="px-5 py-4">{account.referralCount}</td>
                  <td className="px-5 py-4">
                    <p>En attente : {formatMoney(account.pendingCommissionCents)}</p>
                    <p className="mt-1 text-xs text-ash">
                      Payées : {formatMoney(account.paidCommissionCents)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <AffiliateAccountSettingsForm
                      accountId={account.id}
                      status={account.status}
                      commissionRateBps={account.commissionRateBps}
                      commissionDurationMonths={account.commissionDurationMonths}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="okado-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="okado-table-header">
              <tr>
                <th className="px-5 py-4">Affilié</th>
                <th className="px-5 py-4">Filleul</th>
                <th className="px-5 py-4">Facture</th>
                <th className="px-5 py-4">Montant HT</th>
                <th className="px-5 py-4">Commission</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {overview.commissions.length ? (
                overview.commissions.map((commission) => (
                  <tr key={commission.id} className="border-t border-border">
                    <td className="px-5 py-4 font-semibold">{commission.affiliateMerchantName}</td>
                    <td className="px-5 py-4">{commission.referredMerchantName}</td>
                    <td className="px-5 py-4">
                      <p className="font-mono text-xs">{commission.stripeInvoiceId}</p>
                      <p className="mt-1 text-xs text-ash">
                        {formatDate(commission.invoicePaidAt)}
                      </p>
                    </td>
                    <td className="px-5 py-4">{formatMoney(commission.invoiceAmountCents)}</td>
                    <td className="px-5 py-4 font-semibold">
                      {formatMoney(commission.commissionAmountCents)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`okado-status-badge ${statusTone(commission.status)}`}>
                        {statusLabel(commission.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <AffiliateCommissionActions
                        commissionId={commission.id}
                        currentStatus={commission.status}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-ash">
                    Aucune commission affiliée pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
