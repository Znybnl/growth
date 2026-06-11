import { notFound } from "next/navigation";

import { CampaignEditor } from "@/components/merchant/campaign-editor";
import { getCampaignPerformance, getMerchantDashboard, getMerchantProfile } from "@/lib/store";

type CampaignEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CampaignEditPage({ params }: CampaignEditPageProps) {
  const { id } = await params;
  const merchant = getMerchantProfile();
  const dashboard = getMerchantDashboard();
  const campaign = getCampaignPerformance(id);

  if (!campaign) {
    notFound();
  }

  return (
    <CampaignEditor
      merchant={merchant}
      initialCampaign={campaign}
      campaignLibrary={dashboard.campaigns}
    />
  );
}
