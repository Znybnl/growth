import { notFound } from "next/navigation";

import { EmailEditor } from "@/components/merchant/email-editor";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getCampaignPerformance } from "@/lib/store";

type CampaignEmailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CampaignEmailPage({ params }: CampaignEmailPageProps) {
  const { id } = await params;
  const session = await requireAuthenticatedSession();
  const performance = await getCampaignPerformance(id, session.merchant);

  if (!performance || performance.campaign.merchantId !== session.merchant.id) {
    notFound();
  }

  return <EmailEditor campaign={performance.campaign} merchant={performance.merchant} />;
}
