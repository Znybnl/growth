import { notFound } from "next/navigation";
import { DashboardRecentContacts } from "@/components/merchant/dashboard-recent-contacts";
import { MetricCard } from "@/components/ui/workspace";
import type { MerchantRecentContact } from "@/lib/types";
import { PerformanceProof } from "../proof";

const contact: MerchantRecentContact = {
  id: "contact", campaignId: "demo", campaignTitle: "Jeu de démonstration",
  firstName: "Camille", email: "camille@example.test", prizeLabel: "Soin offert",
  status: "claimed", createdAt: "2026-11-06T09:00:00Z",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { state } = await searchParams;
  const contacts = new Promise<MerchantRecentContact[] | null>((resolve) => {
    setTimeout(() => resolve(
      state === "error" ? null : state === "empty" ? [] : [
        contact,
        { ...contact, id: "hidden", campaignId: "other", firstName: "Hors périmètre" },
      ],
    ), state === "ready" ? 2200 : 0);
  });
  return (
    <PerformanceProof>
      <div className="min-w-0 space-y-5">
        <h1 className="okado-section-title">Pilotez vos campagnes</h1>
        <MetricCard label="Campagnes actives" value="1" />
        <DashboardRecentContacts contacts={contacts} campaignIds={new Set(["demo"])} />
      </div>
    </PerformanceProof>
  );
}
