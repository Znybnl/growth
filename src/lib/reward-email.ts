import { Resend } from "resend";

import {
  markRewardEmailFailedInSupabase,
  markRewardEmailSentInSupabase,
  upsertRewardEmailDeliveryInSupabase,
} from "@/lib/campaign-repository";
import {
  renderEmailTemplate,
  renderRewardEmailHtml,
  renderRewardEmailText,
  resolveRewardEmailVariables,
} from "@/lib/email-settings";
import { formatDateTime } from "@/lib/format";
import { logSupportEvent } from "@/lib/support-log";
import { allowLocalTlsBypass } from "@/lib/supabase";
import { CampaignEmailSettings } from "@/lib/types";

type SendRewardEmailInput = {
  origin: string;
  campaignId: string;
  leadId: string;
  merchantName: string;
  campaignTitle: string;
  leadFirstName: string;
  leadEmail: string;
  prizeLabel: string;
  redemptionCode: string;
  rewardAvailableAt?: string;
  rewardExpiresAt?: string;
  purchaseRequired?: boolean;
  usageConditions?: string;
  emailSettings: CampaignEmailSettings;
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

function buildAvailabilityMessage(input: SendRewardEmailInput) {
  if (input.rewardAvailableAt) {
    return `Disponible à partir du ${formatDateTime(input.rewardAvailableAt)}.`;
  }

  return "Disponible dès maintenant au comptoir.";
}

export async function sendRewardEmail(input: SendRewardEmailInput) {
  allowLocalTlsBypass();

  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resend || !from) {
    return {
      sent: false,
      reason: "missing_config",
    } as const;
  }

  const redeemUrl = `${input.origin}/redeem/${encodeURIComponent(input.redemptionCode)}`;
  const qrUrl = `${input.origin}/api/public/redeem/${encodeURIComponent(input.redemptionCode)}/qr`;
  const availabilityMessage = buildAvailabilityMessage(input);
  const expiryMessage = input.rewardExpiresAt
    ? `Valable jusqu'au ${formatDateTime(input.rewardExpiresAt)}.`
    : "";
  const purchaseMessage = input.purchaseRequired
    ? "Retrait du lot soumis à une condition d'achat."
    : "";
  const usageConditionsMessage = input.usageConditions?.trim() ?? "";
  const variables = resolveRewardEmailVariables({
    firstName: input.leadFirstName,
    merchantName: input.merchantName,
    campaignTitle: input.campaignTitle,
    prizeLabel: input.prizeLabel,
    redemptionCode: input.redemptionCode,
    redeemUrl,
    qrUrl,
    rewardAvailability: availabilityMessage,
    rewardExpiry: expiryMessage,
    purchaseCondition: purchaseMessage,
    usageConditions: usageConditionsMessage,
  });
  const subject = renderEmailTemplate(input.emailSettings.subject, variables);
  const delivery = await upsertRewardEmailDeliveryInSupabase({
    campaignId: input.campaignId,
    leadId: input.leadId,
    recipientEmail: input.leadEmail,
    senderEmail: from,
    replyToEmail: input.emailSettings.replyTo,
    subject,
    metadata: {
      redemptionCode: input.redemptionCode,
      prizeLabel: input.prizeLabel,
      campaignTitle: input.campaignTitle,
    },
  });

  try {
    const result = await resend.emails.send({
      from,
      to: input.leadEmail,
      subject,
      replyTo: input.emailSettings.replyTo || undefined,
      text: renderRewardEmailText(input.emailSettings, variables),
      html: renderRewardEmailHtml(input.emailSettings, variables),
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    await markRewardEmailSentInSupabase(delivery.id, result.data?.id ?? null);
    logSupportEvent("info", "reward-email-sent", {
      campaignId: input.campaignId,
      leadId: input.leadId,
      deliveryId: delivery.id,
      resendEmailId: result.data?.id ?? null,
      recipientEmail: input.leadEmail,
    });

    return {
      sent: true,
      id: result.data?.id ?? null,
    } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Envoi Resend impossible";
    await markRewardEmailFailedInSupabase(delivery.id, message);
    logSupportEvent("error", "reward-email-failed", {
      campaignId: input.campaignId,
      leadId: input.leadId,
      deliveryId: delivery.id,
      recipientEmail: input.leadEmail,
      error: message,
    });
    throw error;
  }
}
