import { notFound } from "next/navigation";
import { PerformanceProof } from "../page-performance/proof";
import { EmailErrorDetail } from "@/components/merchant/email-error-detail";
import { RewardEmailActions } from "@/components/merchant/reward-email-actions";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  const message = "The recipient's email provider sent a hard bounce message, but didn't specify the reason for the hard bounce. We recommend removing the recipient's email address from your mailing list. Sending messages to addresses that produce hard bounces can have a negative impact on your reputation as a sender.";
  return <PerformanceProof><main className="p-4"><h1>Vérification des e-mails</h1>
    <EmailErrorDetail message={message} />
    <RewardEmailActions leadId="demo-permanent" status="claimed" deliveryStatus="bounced" permanentBounce />
    <RewardEmailActions leadId="demo-temporaire" status="claimed" deliveryStatus="bounced" permanentBounce={false} />
  </main></PerformanceProof>;
}
