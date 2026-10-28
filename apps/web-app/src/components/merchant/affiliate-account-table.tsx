import { AffiliateAccountSettingsForm } from "@/components/merchant/affiliate-account-settings-form";
import { ResponsiveTable } from "@/components/ui/workspace";
import type { AffiliateAdminAccountItem } from "@/lib/types";

const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value / 100);

export function AffiliateAccountTable({ accounts }: { accounts: AffiliateAdminAccountItem[] }) {
  return <ResponsiveTable><table className="okado-data-table okado-affiliate-table okado-affiliate-account-table w-full text-left text-sm">
    <thead className="okado-table-header"><tr>
      <th className="px-5 py-4">Compte marchand</th><th className="px-5 py-4">Code</th>
      <th data-align="right" className="px-5 py-4">Filleuls</th><th data-align="right" className="px-5 py-4">Commissions</th>
      <th className="px-5 py-4">Réglages du compte</th>
    </tr></thead>
    <tbody>{accounts.map(account => <tr key={account.workspaceId} className="border-t border-border">
      <td className="px-5 py-4"><p className="font-semibold">{account.merchantName}</p>
        <p title={account.merchantEmail} className="mt-1 max-w-[210px] truncate text-xs text-ash">{account.merchantEmail}</p>
        <p className="mt-1 text-xs text-ash">{account.workspaceName} · {account.locationCount} établissement{account.locationCount > 1 ? "s" : ""}</p>
        <p className="mt-1 text-xs text-ash">Inscrit le {new Date(account.createdAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</p>
        <p className="mt-1 text-xs text-ash">{account.status === "active" ? "Programme activé" : "Programme désactivé"}</p>
      </td>
      <td className="px-5 py-4 font-mono text-xs">{account.id.startsWith("workspace:") ? <span className="font-sans text-ash">Après activation</span> : account.code}</td>
      <td data-align="right" className="px-5 py-4">{account.referralCount}</td>
      <td data-align="right" className="px-5 py-4"><p>En attente : {money(account.pendingCommissionCents)}</p>
        <p className="mt-1 text-xs text-ash">Payées : {money(account.paidCommissionCents)}</p></td>
      <td className="px-5 py-4"><AffiliateAccountSettingsForm accountId={account.id} status={account.status}
        commissionRateBps={account.commissionRateBps} commissionDurationMonths={account.commissionDurationMonths} /></td>
    </tr>)}</tbody>
  </table>{!accounts.length ? <p className="px-5 py-8 text-sm text-ash">Aucun compte marchand ne correspond à cette recherche.</p> : null}</ResponsiveTable>;
}
