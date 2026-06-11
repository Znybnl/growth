import { notFound } from "next/navigation";

import { CampaignExperience } from "@/components/public/campaign-experience";
import { getPublicCampaign } from "@/lib/store";

type CampaignPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params;
  const campaign = getPublicCampaign(id);

  if (!campaign) {
    notFound();
  }

  return <CampaignExperience campaignId={id} initialCampaign={campaign} />;
}
