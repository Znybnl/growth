import { notFound } from "next/navigation";

import { PosterEditor } from "@/components/merchant/poster-editor";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getCampaignPerformance } from "@/lib/store";

type CampaignPosterPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CampaignPosterPage({ params }: CampaignPosterPageProps) {
  const { id } = await params;
  const session = await requireAuthenticatedSession();
  const performance = await getCampaignPerformance(id, session.merchant);

  if (!performance || performance.campaign.merchantId !== session.merchant.id) {
    notFound();
  }

  return (
    <PosterEditor
      campaign={performance.campaign}
      merchant={performance.merchant}
      prizes={performance.prizes}
    />
  );
}
