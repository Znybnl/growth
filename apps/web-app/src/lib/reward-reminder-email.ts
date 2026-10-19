import { createCampaignEmailDefaults, normalizeCampaignEmailSettings, renderEmailTemplate,
  renderRewardEmailHtml, renderRewardEmailText } from "@/lib/email-settings";
import type { CampaignEmailSettings } from "./types";

export type RewardReminderEmailInput = {
  origin: string; firstName: string; merchantName: string; campaignTitle: string;
  prizeLabel: string; redemptionCode: string; expiresAt: string; availableAt?: string; wonAt?: string;
  usageConditions?: string; purchaseRequired?: boolean; logoUrl?: string;
  appointmentUrl?: string; merchantEmail?: string; industry?: string; timeZone: string; emailSettings?: Partial<CampaignEmailSettings>;
};

export function renderRewardReminder(input: RewardReminderEmailInput) {
  const origin = new URL(input.origin);
  if (!/^https?:$/.test(origin.protocol)) throw new Error("Origine invalide.");
  const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: input.timeZone }).format(new Date(input.expiresAt));
  const base = normalizeCampaignEmailSettings(input.emailSettings, createCampaignEmailDefaults({ id: "", companyName: input.merchantName,
    logoText: "", createdAt: "", industry: input.industry, restaurantEmail: input.merchantEmail }));
  const settings = { ...base, headline: "Votre gain expire bientôt, {{firstName}}",
    preheader: `Profitez de votre gain avant le ${date}.` };
  const variables = {
    firstName: input.firstName, merchantName: input.merchantName, campaignTitle: input.campaignTitle,
    prizeLabel: input.prizeLabel, redemptionCode: input.redemptionCode,
    redeemUrl: new URL(`/redeem/${encodeURIComponent(input.redemptionCode)}`, origin).href,
    qrUrl: new URL(`/api/public/redeem/${encodeURIComponent(input.redemptionCode)}/qr`, origin).href,
    rewardAvailability: "", rewardExpiry: `Valable jusqu’au ${date}.`, rewardDate: input.wonAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: input.timeZone }).format(new Date(input.wonAt)) : "",
    usageConditions: input.usageConditions?.trim() ?? "",
    purchaseCondition: input.purchaseRequired ? "Retrait du lot soumis à une condition d’achat." : "",
  };
  let logoSrc: string | undefined;
  let attachments: Array<{ filename: string; content: string; contentType: string; contentId: string }> | undefined;
  if (input.logoUrl) {
    const data = input.logoUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (data) { logoSrc = "cid:campaign-logo"; attachments = [{ filename: "campaign-logo", content: data[2], contentType: data[1], contentId: "campaign-logo" }]; }
    else {
      try { const url = new URL(input.logoUrl, origin); if (/^https?:$/.test(url.protocol)) logoSrc = url.href; }
      catch { /* A legacy invalid logo must not prevent a service reminder; use the merchant name. */ }
    }
  }
  const options = { reminder: true, timeZone: input.timeZone, logoSrc,
    appointmentUrl: input.appointmentUrl, rewardExpiresAt: input.expiresAt, rewardAvailableAt: input.availableAt };
  return { subject: `${input.merchantName} : votre gain expire bientôt`,
    html: renderRewardEmailHtml(settings, variables, options), text: renderRewardEmailText(settings, variables, options),
    senderName: renderEmailTemplate(settings.senderName || "{{merchantName}}", variables),
    replyTo: settings.replyTo || undefined, attachments };
}
