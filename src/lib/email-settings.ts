import { CampaignEmailSettings, Merchant } from "@/lib/types";

type RewardEmailVariables = {
  firstName: string;
  merchantName: string;
  campaignTitle: string;
  prizeLabel: string;
  playedDate: string;
  redemptionCode: string;
  redeemUrl: string;
  qrUrl: string;
  rewardAvailability: string;
  rewardExpiry: string;
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

function upgradeLegacyDefaultSettings(
  input: Partial<CampaignEmailSettings> | undefined,
  defaults: CampaignEmailSettings,
) {
  if (!input) {
    return undefined;
  }

  const upgraded = { ...input };

  if (
    upgraded.subject === "{{merchantName}} · votre lot est prêt" ||
    upgraded.subject === "{{merchantName}} Â· votre lot est prÃªt"
  ) {
    upgraded.subject = defaults.subject;
  }

  if (
    upgraded.headline === "Votre lot est prêt, {{firstName}}" ||
    upgraded.headline === "Votre lot est prÃªt, {{firstName}}"
  ) {
    upgraded.headline = defaults.headline;
  }

  if (
    upgraded.body?.includes("Vous avez gagné {{prizeLabel}} dans la campagne {{campaignTitle}}") ||
    upgraded.body?.includes("Vous avez gagnÃ© {{prizeLabel}} dans la campagne {{campaignTitle}}")
  ) {
    upgraded.body = defaults.body;
  }

  if (
    upgraded.footerNote ===
      "Présentez ce QR code au comptoir. Il ne pourra être consommé qu'une seule fois." ||
    upgraded.footerNote ===
      "PrÃ©sentez ce QR code au comptoir. Il ne pourra Ãªtre consommÃ© qu'une seule fois."
  ) {
    upgraded.footerNote = defaults.footerNote;
  }

  return upgraded;
}

export function renderEmailTemplate(template: string, variables: RewardEmailVariables) {
  return replaceVariables(template, variables);
}

export function createCampaignEmailDefaults(merchant: Merchant): CampaignEmailSettings {
  return {
    senderName: merchant.companyName,
    replyTo: "",
    subject: "{{merchantName}} · récupérez votre lot",
    preheader: "Conservez ce QR code pour récupérer votre cadeau.",
    headline: "Votre lot vous attend, {{firstName}}",
    body: [
      "Vous avez gagné {{prizeLabel}} chez {{merchantName}} le {{playedDate}}.",
      "Ce coupon sera valable lors de votre prochaine visite. Rendez-vous sur place demain et montrez le QR code ci-dessous au personnel de l'établissement pour récupérer votre cadeau.",
      "{{rewardAvailability}}",
      "{{rewardExpiry}}",
      "{{purchaseCondition}}",
      "{{usageConditions}}",
    ].join("\n\n"),
    buttonLabel: "Ouvrir mon QR code",
    footerNote: "Le QR code ne pourra être utilisé qu'une seule fois.",
    accentColor: "#111827",
  };
}

export function normalizeCampaignEmailSettings(
  input: Partial<CampaignEmailSettings> | undefined,
  defaults: CampaignEmailSettings,
): CampaignEmailSettings {
  const upgradedInput = upgradeLegacyDefaultSettings(input, defaults);

  return {
    senderName: upgradedInput?.senderName?.trim() || defaults.senderName,
    replyTo: upgradedInput?.replyTo?.trim() || defaults.replyTo,
    subject: upgradedInput?.subject?.trim() || defaults.subject,
    preheader: upgradedInput?.preheader?.trim() || defaults.preheader,
    headline: upgradedInput?.headline?.trim() || defaults.headline,
    body: upgradedInput?.body?.trim() || defaults.body,
    buttonLabel: upgradedInput?.buttonLabel?.trim() || defaults.buttonLabel,
    footerNote: upgradedInput?.footerNote?.trim() || defaults.footerNote,
    accentColor: upgradedInput?.accentColor || defaults.accentColor,
  };
}

export function renderRewardEmailText(
  settings: CampaignEmailSettings,
  variables: RewardEmailVariables,
) {
  const shouldAppendUsageConditions =
    Boolean(variables.usageConditions.trim()) && !hasUsageConditionsPlaceholder(settings);

  return [
    renderEmailTemplate(settings.headline, variables),
    "",
    renderEmailTemplate(settings.body, variables),
    shouldAppendUsageConditions ? `Conditions d'utilisation : ${variables.usageConditions}` : "",
    "",
    settings.buttonLabel
      ? `${renderEmailTemplate(settings.buttonLabel, variables)} : ${variables.qrUrl}`
      : variables.qrUrl,
    "",
    renderEmailTemplate(settings.footerNote, variables),
    variables.qrUrl ? `QR code : ${variables.qrUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderRewardEmailHtml(
  settings: CampaignEmailSettings,
  variables: RewardEmailVariables,
) {
  const headline = escapeHtml(renderEmailTemplate(settings.headline, variables));
  const preheader = escapeHtml(renderEmailTemplate(settings.preheader, variables));
  const bodyBlocks = paragraphize(renderEmailTemplate(settings.body, variables)).map((block) =>
    escapeHtml(block).replaceAll("\n", "<br />"),
  );
  const footerBlocks = paragraphize(renderEmailTemplate(settings.footerNote, variables)).map(
    (block) => escapeHtml(block).replaceAll("\n", "<br />"),
  );
  const buttonLabel = escapeHtml(renderEmailTemplate(settings.buttonLabel, variables));
  const accentColor = settings.accentColor;
  const shouldAppendUsageConditions =
    Boolean(variables.usageConditions.trim()) && !hasUsageConditionsPlaceholder(settings);
  const usageConditionsBlock = shouldAppendUsageConditions
    ? `<div style="margin:20px 0 0;padding:18px;border-radius:18px;background:#fff8e8;border:1px solid #f2ddb0;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8a6a18;">Conditions d'utilisation</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">${escapeHtml(variables.usageConditions).replaceAll("\n", "<br />")}</p>
        </div>`
    : "";

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <div style="margin:0;padding:32px;background:#f4f7fb;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #dbe4f0;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#7b8496;">${escapeHtml(variables.merchantName)}</p>
        <h1 style="margin:0 0 16px;font-size:30px;line-height:1.05;">${headline}</h1>
        ${bodyBlocks
          .map(
            (block) =>
              `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">${block}</p>`,
          )
          .join("")}
        ${usageConditionsBlock}
        <div style="margin:20px 0 18px;padding:18px;border-radius:18px;background:#f8fafc;border:1px solid #e4eaf2;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7b8496;">Code de retrait</p>
          <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:0.08em;">${escapeHtml(variables.redemptionCode)}</p>
        </div>
        <div style="margin:24px 0;">
          <img src="${variables.qrUrl}" alt="QR code de retrait" width="180" height="180" style="display:block;width:180px;height:180px;border-radius:20px;border:1px solid #dbe4f0;background:#ffffff;" />
        </div>
        <a href="${variables.qrUrl}" style="display:inline-block;padding:14px 20px;border-radius:16px;background:${accentColor};color:#ffffff;text-decoration:none;font-weight:700;">${buttonLabel}</a>
        ${footerBlocks
          .map(
            (block) =>
              `<p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">${block}</p>`,
          )
          .join("")}
      </div>
    </div>
  `;
}

export function resolveRewardEmailVariables(variables: RewardEmailVariables) {
  return variables;
}
