import { CampaignEmailSettings, Merchant } from "@/lib/types";
import { isRestaurantIndustry } from "@/lib/merchant-options";

const EMAIL_VARIABLE_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

export const CAMPAIGN_EMAIL_VARIABLES = [
  "firstName",
  "merchantName",
  "campaignTitle",
  "prizeLabel",
  "redemptionCode",
  "redeemUrl",
  "qrUrl",
  "rewardAvailability",
  "rewardExpiry",
  "rewardDate",
  "purchaseCondition",
  "usageConditions",
] as const;

const REQUIRED_CAMPAIGN_EMAIL_VARIABLES = [
  "prizeLabel",
  "rewardAvailability",
  "rewardExpiry",
  "purchaseCondition",
  "usageConditions",
] as const;

export function validateCampaignEmailSettings(settings: CampaignEmailSettings): string[] {
  const errors: string[] = [];
  const content = [settings.subject, settings.preheader, settings.headline, settings.body, settings.footerNote]
    .filter(Boolean)
    .join("\n");

  if (!settings.senderName.trim()) errors.push("Renseignez un nom d’expéditeur.");
  if (!settings.subject.trim()) errors.push("L’objet de l’e-mail est obligatoire.");
  if (!settings.headline.trim()) errors.push("Le titre principal de l’e-mail est obligatoire.");
  if (!settings.body.trim()) errors.push("Le contenu principal de l’e-mail est obligatoire.");
  if (!settings.buttonLabel.trim()) errors.push("Le libellé du bouton de retrait est obligatoire.");

  if (settings.replyTo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.replyTo.trim())) {
    errors.push("L’adresse de réponse n’est pas valide.");
  }

  for (const variable of REQUIRED_CAMPAIGN_EMAIL_VARIABLES) {
    if (!new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`).test(content)) {
      errors.push(`L’information « ${variable} » doit rester présente dans l’e-mail.`);
    }
  }

  const unknownVariables = Array.from(content.matchAll(EMAIL_VARIABLE_PATTERN))
    .map((match) => match[1])
    .filter((variable, index, variables) => !CAMPAIGN_EMAIL_VARIABLES.includes(variable as (typeof CAMPAIGN_EMAIL_VARIABLES)[number]) && variables.indexOf(variable) === index);
  if (unknownVariables.length) {
    errors.push(`Variable(s) non reconnue(s) : ${unknownVariables.map((variable) => `{{${variable}}}`).join(", ")}.`);
  }

  return errors;
}

type RewardEmailVariables = {
  firstName: string;
  merchantName: string;
  campaignTitle: string;
  prizeLabel: string;
  redemptionCode: string;
  redeemUrl: string;
  qrUrl: string;
  rewardAvailability: string;
  rewardExpiry: string;
  rewardDate: string;
  purchaseCondition: string;
  usageConditions: string;
};

function replaceVariables(template: string, variables: RewardEmailVariables) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: keyof RewardEmailVariables) => {
    return variables[key] ?? "";
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emphasizePrizeLabelHtml(value: string, prizeLabel: string) {
  const escapedPrizeLabel = escapeHtml(prizeLabel);
  if (!escapedPrizeLabel) return value;
  return value.replaceAll(
    escapedPrizeLabel,
    `<strong style="font-weight:700;">${escapedPrizeLabel}</strong>`,
  );
}

function paragraphize(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function hasUsageConditionsPlaceholder(settings: CampaignEmailSettings) {
  return [
    settings.subject,
    settings.preheader,
    settings.headline,
    settings.body,
    settings.footerNote,
  ].some((value) => value.includes("{{usageConditions}}"));
}

export function renderEmailTemplate(template: string, variables: RewardEmailVariables) {
  return replaceVariables(template, variables);
}

export function createCampaignEmailDefaults(merchant: Merchant): CampaignEmailSettings {
  return {
    ...createCampaignEmailDefaultsForMerchantName(
      merchant.companyName,
      isRestaurantIndustry(merchant.industry) ? "restaurant" : "commerce",
    ),
    replyTo: merchant.restaurantEmail ?? "",
  };
}

function createCampaignEmailDefaultsForMerchantName(
  companyName: string,
  businessNoun = "commerce",
): CampaignEmailSettings {
  return {
    senderName: companyName,
    replyTo: "",
    subject: "{{merchantName}} · récupérez votre lot",
    preheader: `Conservez ce QR code pour retirer votre cadeau au ${businessNoun}.`,
    headline: "Récupérez votre lot, {{firstName}}",
    body: [
      "Vous avez gagné {{prizeLabel}} chez {{merchantName}} le {{rewardDate}}.",
      "Ce coupon sera valable lors de votre prochaine visite. Rendez-vous sur place demain et montrez le QR code ci-dessous au personnel de l'établissement pour récupérer votre cadeau.",
      "{{rewardAvailability}}",
      "{{rewardExpiry}}",
      "{{purchaseCondition}}",
      "{{usageConditions}}",
    ].join("\n\n"),
    buttonLabel: "Voir mon QR code",
    footerNote:
      "Présentez ce QR code au comptoir. Il ne pourra être consommé qu'une seule fois.",
    accentColor: "#111827",
  };
}

export function upgradeLegacyRewardEmailSettings(
  settings: CampaignEmailSettings,
  merchantName: string,
): CampaignEmailSettings {
  const defaults = createCampaignEmailDefaultsForMerchantName(merchantName);
  const legacyReadySubject = `votre lot est pr${String.fromCharCode(195, 170)}t`;
  const legacyReadyHeadline = `Votre lot est pr${String.fromCharCode(195, 170)}t`;
  const hasLegacyBody =
    settings.body.includes("dans la campagne {{campaignTitle}}") ||
    settings.body.includes("Code de retrait");

  return {
    ...settings,
    subject: settings.subject
      .replace(legacyReadySubject, "récupérez votre lot")
      .replace("votre lot est prêt", "récupérez votre lot"),
    headline: settings.headline
      .replace(legacyReadyHeadline, "Récupérez votre lot")
      .replace("Votre lot est prêt", "Récupérez votre lot"),
    body: hasLegacyBody ? defaults.body : settings.body,
    buttonLabel:
      settings.buttonLabel === "Ouvrir mon QR code" ? defaults.buttonLabel : settings.buttonLabel,
  };
}

export function normalizeCampaignEmailSettings(
  input: Partial<CampaignEmailSettings> | undefined,
  defaults: CampaignEmailSettings,
): CampaignEmailSettings {
  return {
    senderName: input?.senderName?.trim() || defaults.senderName,
    replyTo: input?.replyTo?.trim() || defaults.replyTo,
    subject: input?.subject?.trim() || defaults.subject,
    preheader: input?.preheader?.trim() || defaults.preheader,
    headline: input?.headline?.trim() || defaults.headline,
    body: input?.body?.trim() || defaults.body,
    buttonLabel: input?.buttonLabel?.trim() || defaults.buttonLabel,
    footerNote: input?.footerNote?.trim() || defaults.footerNote,
    accentColor: input?.accentColor || defaults.accentColor,
  };
}

export function renderRewardEmailText(
  settings: CampaignEmailSettings,
  variables: RewardEmailVariables,
) {
  const shouldAppendUsage