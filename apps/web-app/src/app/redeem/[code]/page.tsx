import Link from "next/link";

import { LeadPrizeActions } from "@/components/merchant/lead-prize-actions";
import { requireAuthenticatedSession } from "@/lib/auth";
import { formatDateTime, leadStatusLabel } from "@/lib/format";
import { getMerchantLeads } from "@/lib/store";

type RedeemPageProps = {
  params: Promise<{
    code: string;
  }>;
};

function isRewardExpired(status: string, rewardExpiresAt?: string) {
  return (
    status === "expired" ||
    (rewardExpiresAt ? new Date(rewardExpiresAt).getTime() < Date.now() : false)
  );
}

export default async function RedeemPage({ params }: RedeemPageProps) {
  const session = await requireAuthenticatedSession();
  const { code } = await params;
  const decodedCode = decodeURIComponent(code);
  const leads = await getMerchantLeads(session.merchant.id);
  const lead = leads.find((item) => item.redemptionCode === decodedCode);

  if (!lead) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f1f5fb] px-5 py-10">
        <section className="w-full max-w-xl rounded-[32px] border border-[#dbe4f0] bg-white p-8 shadow-[0_24px_70px_rgba(122,136,166,0.16)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Retrait lot</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#111827]">QR code introuvable</h1>
          <p className="mt-4 text-sm leading-7 text-[#5c6577]">
            Ce code ne correspond à aucun gain de votre restaurant.
          </p>
          <Link
            href="/data"
            className="mt-6 inline-flex rounded-[18px] bg-[#111827] px-5 py-3 text-sm font-semibold text-white"
          >
            Retour aux données
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f5fb] px-5 py-10">
      <section className="w-full max-w-2xl rounded-[32px] border border-[#dbe4f0] bg-white p-8 shadow-[0_24px_70px_rgba(122,136,166,0.16)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Retrait lot</p>
            <h1 className="mt-3 text-4xl font-semibold text-[#111827]">{lead.prizeLabel}</h1>
            <p className="mt-3 text-sm leading-7 text-[#5c6577]">
              {lead.firstName} · {lead.email}
            </p>
          </div>
          <span className="rounded-[18px] bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-[#111827]">
            {leadStatusLabel(lead.status)}
          </span>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-[#e4eaf2] bg-[#f8fafc] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[#7b8496]">Code</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-[#111827]">
              {lead.redemptionCode}
            </p>
          </div>
          <div className="rounded-[22px] border border-[#e4eaf2] bg-[#f8fafc] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[#7b8496]">Campagne</p>
            <p className="mt-2 text-lg font-semibold text-[#111827]">{lead.campaignTitle}</p>
          </div>
        </div>

        {lead.rewardAvailableAt || lead.rewardExpiresAt ? (
          <div className="mt-5 rounded-[22px] border border-[#e4eaf2] bg-[#f8fafc] p-4 text-sm leading-7 text-[#556173]">
            {lead.rewardAvailableAt ? (
              <p>Disponible à partir du {formatDateTime(lead.rewardAvailableAt)}</p>
            ) : null}
            {lead.rewardExpiresAt ? (
              <p>Valable jusqu&apos;au {formatDateTime(lead.rewardExpiresAt)}</p>
            ) : null}
          </div>
        ) : null}

        {lead.prizeUsageConditions ? (
          <div className="mt-5 rounded-[22px] border border-[#f2ddb0] bg-[#fff8e8] p-4 text-sm leading-7 text-[#6c5313]">
            <p className="text-xs uppercase tracking-[0.24em] text-[#8a6a18]">
              Conditions d&apos;utilisation
            </p>
            <p className="mt-2 whitespace-pre-line">{lead.prizeUsageConditions}</p>
          </div>
        ) : null}

        <div className="mt-7 flex flex-col gap-4 border-t border-[#e4eaf2] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <LeadPrizeActions
            leadId={lead.id}
            status={lead.status}
            hasPrize={Boolean(lead.prizeId)}
            usageConditions={lead.prizeUsageConditions}
            isExpired={isRewardExpired(lead.status, lead.rewardExpiresAt)}
            compact
          />
          <Link href="/data" className="text-sm font-semibold text-[#2f6df6]">
            Voir les données campagne
          </Link>
        </div>
      </section>
    </main>
  );
}
