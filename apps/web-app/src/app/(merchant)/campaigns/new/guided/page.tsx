import { CampaignWizard } from "@/components/merchant/campaign-wizard";
import { requireAuthenticatedSession } from "@/lib/auth";

export default async function GuidedNewCampaignPage() {
  const session = await requireAuthenticatedSession();

  return <CampaignWizard merchant={session.merchant} />;
}

