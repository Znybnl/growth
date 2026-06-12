import { CampaignEditor } from "@/components/merchant/campaign-editor";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getMerchantDashboard } from "@/lib/store";

export default async function NewCampaignPage() {
  const session = await requireAuthenticatedSession();
  const dashboard = await getMerchantDashboard(session.merchant.id, session.merchant);

  return <CampaignEditor merchant={session.merchant} campaignLibrary={dashboard.campaigns} />;
}
