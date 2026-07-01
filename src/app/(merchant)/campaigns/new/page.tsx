import { CampaignEditor } from "@/components/merchant/campaign-editor";
import { requireAuthenticatedSession } from "@/lib/auth";

export default async function NewCampaignPage() {
  const session = await requireAuthenticatedSession();

  return <CampaignEditor merchant={session.merchant} />;
}
