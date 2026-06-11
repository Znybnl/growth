import { CampaignEditor } from "@/components/merchant/campaign-editor";
import { getMerchantDashboard, getMerchantProfile } from "@/lib/store";

export default function NewCampaignPage() {
  const merchant = getMerchantProfile();
  const dashboard = getMerchantDashboard();

  return <CampaignEditor merchant={merchant} campaignLibrary={dashboard.campaigns} />;
}
