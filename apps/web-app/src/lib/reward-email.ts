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
  upgradeLegacyRewardEmailSettings,
} from "@/lib/email-settings";
import { formatDateTime } from "@/lib/format";
import { captureProductEvent } from "@/lib/product-analytics";
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
  rewardWonAt?: string;
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

function formatSenderName(name: string, email: string) {
  const safeName = name.replace(/[<>"]/g, "").trim() || "Okado";
  return `${safeName} <${email}>`;
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
  const rewardDate = formatDateTime(input.rewardWonAt ?? new Date().toISOString());
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
    rewardDate,
    purchaseCondition: purchaseMessage,
    usageConditions: usageConditionsMessage,
  });
  const emailSettings = upgradeLegacyRewardEmailSettings(input.emailSettings, input.merchantName);
  const subject = renderEmailTemplate(emailSettings.subject, variables);
  const delivery = await upsertRewardEmailDeliveryInSupabase({
    campaignId: input.campaignId,
    leadId: input.leadId,
    recipientEmail: input.leadEmail,
    senderEmail: from,
    replyToEmail: emailSettings.replyTo,
    subject,
    metadata: {
      redemptionCode: input.redemptionCode,
      prizeLabel: input.prizeLabel,
      campaignTitle: input.campaignTitle,
    },
  });

  try {
    const result = await resend.emails.send({
      from: formatSenderName(emailSettings.senderName || input.merchantName, from),
      to: input.leadEmail,
      subject,
      replyTo: emailSettings.replyTo || undefined,
      text: renderRewardEmailText(emailSettings, variables),
      html: renderRewardEmailHtml(emailSettings, variables),
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    await markRewardEmailSentInSupabase(delivery.id, result.data?.id ?? null);
    await captureProductEvent("reward_email_sent", `lead:${input.leadId}`, {
      campaignId: input.campaignId,
      leadId: input.leadId,
      deliveryId: delivery.id,
      hasResendEmailId: Boolean(result.data?.id),
    });
    logSupportEvent("info", "reward_email_sent", {
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
    await captureProductEvent("reward_email_failed", `lead:${input.leadId}`, {
      campaignId: input.campaignId,
      leadId: input.leadId,
      deliveryId: delivery.id,
      error: message.slice(0, 240),
    });
    logSupportEvent("error", "reward_email_failed", {
      campaignId: input.campaignId,
      leadId: input.leadId,
      deliveryId: delivery.id,
      recipientEmail: input.leadEmail,
      error: message,
    });
    throw error;
  }
}
