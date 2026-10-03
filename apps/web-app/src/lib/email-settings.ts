import type { CampaignEmailSettings, Merchant } from "@/lib/types";
import { isRestaurantIndustry } from "@/lib/merchant-options";

const EMAIL_VARIABLE_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

const REWARD_INSTRUCTIONS = "Présentez simplement le QR code ci-dessous lors de votre prochaine visite.";
const REWARD_BACKUP_NOTE = "En cas de difficulté à scanner le QR code, présentez simplement ce code à l’établissement.";
const RECOMMENDED_REWARD_BODY = [
  "Vous avez gagné :\n{{prizeLabel}}\nchez {{merchantName}}",
  `Comment profiter de votre gain ?\n${REWARD_INSTRUCTIONS}`,
  "Conditions\n{{usageConditions}}\n{{purchaseCondition}}\n{{rewardAvailability}}\n{{rewardExpiry}}\nUtilisable une seule fois",
].join("\n\n");

// Only exact known defaults are upgraded; a merchant's edited text is retained.
const LEGACY_REWARD_BODIES = ["demain", "à partir de demain"].flatMap((wording) =>
  ["Vous avez gagné", "Vous avez gagné le lot"].map((intro) => [
    `${intro} {{prizeLabel}} chez {{merchantName}} le {{rewardDate}}.`,
    `Ce coupon sera valable lors de votre prochaine visite. Rendez-vous sur place ${wording} et montrez le QR code ci-dessous au personnel de l'établissement pour récupérer votre cadeau.`,
    "{{rewardAvailability}}", "{{rewardExpiry}}", "{{purchaseCondition}}", "{{usageConditions}}",
  ].join("\n\n")),
);

export type RewardEmailRenderOptions = {
  logoSrc?: string;
  appointmentUrl?: string;
  rewardAvailableAt?: string;
  rewardExpiresAt?: string;
};

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

export type RewardEmailVariables = {
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

function getSafeAppointmentUrl(value?: string) {
  const appointmentUrl = value?.trim();
  if (!appointmentUrl) return undefined;

  try {
    const parsedUrl = new URL(appointmentUrl);
    if (
      (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return undefined;
    }
    return appointmentUrl;
  } catch {
    return undefined;
  }
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
  ].some((value) => /\{\{\s*usageConditions\s*\}\}/.test(value));
}

function migrateRewardWording(value: string) {
  return value.replaceAll(
    "Vous avez gagné {{prizeLabel}} chez {{merchantName}}",
    "Vous avez gagné le lot {{prizeLabel}} chez {{merchantName}}",
  );
}

export function renderEmailTemplate(template: string, variables: RewardEmailVariables) {
  return replaceVariables(template, variables);
}

export function createCampaignEmailDefaults(merchant: Merchant): CampaignEmailSettings {
  return {
    ...createCampaignEmailDefaultsForBusinessNoun(
      isRestaurantIndustry(merchant.industry) ? "restaurant" : "commerce",
    ),
    replyTo: merchant.restaurantEmail ?? "",
  };
}

function createCampaignEmailDefaultsForBusinessNoun(
  businessNoun = "commerce",
): CampaignEmailSettings {
  return {
    senderName: "{{merchantName}}",
    replyTo: "",
    subject: "{{merchantName}} · récupérez votre lot",
    preheader: `Conservez ce QR code pour retirer votre cadeau au ${businessNoun}.`,
    headline: "Félicitations {{firstName}} 🎁",
    body: RECOMMENDED_REWARD_BODY,
    buttonLabel: "Voir mon QR code",
    footerNote: REWARD_BACKUP_NOTE,
    accentColor: "#111827",
  };
}

export function upgradeLegacyRewardEmailSettings(
  settings: CampaignEmailSettings,
): CampaignEmailSettings {
  const defaults = createCampaignEmailDefaultsForBusinessNoun();
  const legacyReadySubject = `votre lot est pr${String.fromCharCode(195, 170)}t`;
  const legacyReadyHeadline = `Votre lot est pr${String.fromCharCode(195, 170)}t`;
  const hasLegacyBody = LEGACY_REWARD_BODIES.includes(settings.body.trim().replaceAll("\r\n", "\n"));

  return {
    ...settings,
    subject: settings.subject
      .replace(legacyReadySubject, "récupérez votre lot")
      .replace("votre lot est prêt", "récupérez votre lot"),
    headline: ["Récupérez votre lot, {{firstName}}", "Votre lot est prêt, {{firstName}}", `${legacyReadyHeadline}, {{firstName}}`].includes(settings.headline)
      ? defaults.headline
      : settings.headline,
    body: hasLegacyBody ? defaults.body : settings.body,
    footerNote: settings.footerNote === "Présentez ce QR code au comptoir. Il ne pourra être consommé qu'une seule fois."
      ? defaults.footerNote
      : settings.footerNote,
    buttonLabel:
      settings.buttonLabel === "Ouvrir mon QR code" ? defaults.buttonLabel : settings.buttonLabel,
  };
}

export function normalizeCampaignEmailSettings(
  input: Partial<CampaignEmailSettings> | undefined,
  defaults: CampaignEmailSettings,
): CampaignEmailSettings {
  return upgradeLegacyRewardEmailSettings({
    senderName: input?.senderName?.trim() || defaults.senderName,
    replyTo: input?.replyTo?.trim() || defaults.replyTo,
    subject: input?.subject?.trim() || defaults.subject,
    preheader: input?.preheader?.trim() || defaults.preheader,
    headline: input?.headline?.trim() || defaults.headline,
    body: migrateRewardWording(input?.body?.trim() || defaults.body),
    buttonLabel: input?.buttonLabel?.trim() || defaults.buttonLabel,
    footerNote: input?.footerNote?.trim() || defaults.footerNote,
    accentColor: input?.accentColor || defaults.accentColor,
  });
}

function isRecommendedBody(settings: CampaignEmailSettings) {
  return settings.body.trim().replaceAll("\r\n", "\n") === RECOMMENDED_REWARD_BODY;
}

export function getRewardEmailConditions(
  variables: RewardEmailVariables,
  options: RewardEmailRenderOptions = {},
) {
  const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const formatDate = (value?: string) => value && Number.isFinite(Date.parse(value))
    ? dateFormat.format(new Date(value))
    : undefined;
  const start = formatDate(options.rewardAvailableAt);
  const end = formatDate(options.rewardExpiresAt);
  const period = start && end
    ? `Utilisable du ${start} au ${end}`
    : start ? `Utilisable à partir du ${start}` : end ? `Utilisable jusqu’au ${end}` : "";
  return [
    variables.usageConditions.trim(),
    variables.purchaseCondition.trim(),
    ...(period ? [
      ...(!start && variables.rewardAvailability.trim() ? [variables.rewardAvailability.trim()] : []),
      period,
      ...(!end && variables.rewardExpiry.trim() ? [variables.rewardExpiry.trim()] : []),
    ] : [variables.rewardAvailability.trim(), variables.rewardExpiry.trim()]),
    "Utilisable une seule fois",
  ].filter(Boolean);
}

export function renderRewardEmailText(
  settings: CampaignEmailSettings,
  variables: RewardEmailVariables,
  options: RewardEmailRenderOptions = {},
) {
  settings = upgradeLegacyRewardEmailSettings(settings);
  const shouldAppendUsageConditions =
    Boolean(variables.usageConditions.trim()) && !hasUsageConditionsPlaceholder(settings);
  const appointmentUrl = getSafeAppointmentUrl(options.appointmentUrl);

  return [
    renderEmailTemplate(settings.headline, variables).replace(/Félicitations\s+🎁/, "Félicitations 🎁"),
    "",
    isRecommendedBody(settings) ? [
      "Vous avez gagné :", variables.prizeLabel, `chez ${variables.merchantName}`,
      "", "Comment profiter de votre gain ?", REWARD_INSTRUCTIONS,
      "", "Conditions", ...getRewardEmailConditions(variables, options).map((condition) => `- ${condition}`),
    ].join("\n") : renderEmailTemplate(settings.body, variables),
    shouldAppendUsageConditions ? `Conditions d'utilisation : ${variables.usageConditions}` : "",
    "",
    "QR CODE DE RETRAIT",
    variables.qrUrl,
    `Code de secours : ${variables.redemptionCode}`,
    REWARD_BACKUP_NOTE,
    settings.buttonLabel
      ? `${renderEmailTemplate(settings.buttonLabel, variables)} : ${variables.qrUrl}`
      : variables.qrUrl,
    "",
    settings.footerNote !== REWARD_BACKUP_NOTE ? renderEmailTemplate(settings.footerNote, variables) : "",
    appointmentUrl ? `Prendre rendez-vous : ${appointmentUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderRewardEmailHtml(
  settings: CampaignEmailSettings,
  variables: RewardEmailVariables,
  options: RewardEmailRenderOptions = {},
) {
  settings = upgradeLegacyRewardEmailSettings(settings);
  const headline = escapeHtml(renderEmailTemplate(settings.headline, variables).replace(/Félicitations\s+🎁/, "Félicitations 🎁"));
  const preheader = escapeHtml(renderEmailTemplate(settings.preheader, variables));
  const bodyBlocks = paragraphize(renderEmailTemplate(settings.body, variables)).map((block) =>
    emphasizePrizeLabelHtml(escapeHtml(block), variables.prizeLabel).replaceAll("\n", "<br />"),
  );
  const footerBlocks = paragraphize(settings.footerNote === REWARD_BACKUP_NOTE ? "" : renderEmailTemplate(settings.footerNote, variables)).map(
    (block) => escapeHtml(block).replaceAll("\n", "<br />"),
  );
  const buttonLabel = escapeHtml(renderEmailTemplate(settings.buttonLabel, variables));
  const accentColor = /^#[\da-f]{6}$/i.test(settings.accentColor) ? settings.accentColor : "#111827";
  const appointmentUrl = getSafeAppointmentUrl(options.appointmentUrl);
  const shouldAppendUsageConditions =
    Boolean(variables.usageConditions.trim()) && !hasUsageConditionsPlaceholder(settings);
  const usageConditionsBlock = shouldAppendUsageConditions
    ? `<div style="margin:20px 0 0;padding:18px;border-radius:18px;background:#fff8e8;border:1px solid #f2ddb0;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8a6a18;">Conditions d'utilisation</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">${escapeHtml(variables.usageConditions).replaceAll("\n", "<br />")}</p>
        </div>`
    : "";
  const logoBlock = options.logoSrc
    ? `<div style="margin:0 0 20px;text-align:center;"><img src="${escapeHtml(options.logoSrc)}" alt="Logo de ${escapeHtml(variables.merchantName)}" style="display:inline-block;max-width:220px;max-height:72px;width:auto;height:auto;object-fit:contain;" /></div>`
    : `<p style="margin:0 0 12px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#7b8496;">${escapeHtml(variables.merchantName)}</p>`;
  const appointmentCta = appointmentUrl
    ? `<div style="margin:12px 0 0;"><a href="${escapeHtml(appointmentUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 20px;border-radius:12px;border:1px solid ${escapeHtml(accentColor)};background:#ffffff;color:${escapeHtml(accentColor)};text-decoration:none;font-weight:700;">Prendre rendez-vous</a></div>`
    : "";
  const recommendedBodyHtml = `
    <p style="margin:24px 0 8px;font-size:16px;line-height:1.5;color:#475569;">Vous avez gagné :</p>
    <h2 style="margin:0 0 8px;font-size:28px;line-height:1.2;font-weight:700;text-transform:uppercase;overflow-wrap:anywhere;color:${accentColor};">${escapeHtml(variables.prizeLabel)}</h2>
    <p style="margin:0 0 28px;font-size:16px;line-height:1.5;">chez <strong>${escapeHtml(variables.merchantName)}</strong></p>
    <h3 style="margin:0 0 8px;font-size:18px;line-height:1.35;">Comment profiter de votre gain ?</h3>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#374151;">${REWARD_INSTRUCTIONS}</p>
    <h3 style="margin:0 0 8px;font-size:18px;line-height:1.35;">Conditions</h3>
    <ul style="margin:0 0 28px;padding-left:22px;font-size:15px;line-height:1.6;color:#374151;">${getRewardEmailConditions(variables, options).map((condition, index) => `<li style="margin-bottom:6px;">${index === 0 && variables.usageConditions.trim() ? `<strong>${escapeHtml(condition).replaceAll("\n", "<br />")}</strong>` : escapeHtml(condition)}</li>`).join("")}</ul>`;

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;font-family:Arial,sans-serif;color:#111827;"><tr><td style="padding:16px 8px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:24px;border:1px solid #dbe4f0;overflow-wrap:anywhere;">
        ${logoBlock}
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;">${headline}</h1>
        ${isRecommendedBody(settings) ? recommendedBodyHtml : bodyBlocks
          .map(
            (block) =>
              `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">${block}</p>`,
          )
          .join("")}
        ${usageConditionsBlock}
        <h2 style="margin:28px 0 16px;font-size:16px;line-height:1.4;letter-spacing:0.08em;">QR CODE DE RETRAIT</h2>
        <div style="margin:0 0 20px;">
          <img src="${escapeHtml(variables.qrUrl)}" alt="QR code de retrait" width="200" height="200" style="display:block;width:200px;height:200px;max-width:100%;border:1px solid #dbe4f0;background:#ffffff;" />
        </div>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.5;"><strong>Code de secours :</strong><br /><code style="font-family:Consolas,monospace;font-size:17px;font-weight:700;">${escapeHtml(variables.redemptionCode)}</code></p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#64748b;">${REWARD_BACKUP_NOTE}</p>
        <a href="${escapeHtml(variables.qrUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 18px;border-radius:12px;border:1px solid ${accentColor};color:${accentColor};text-decoration:none;font-weight:700;">${buttonLabel}</a>
        ${appointmentCta}
        ${footerBlocks
          .map(
            (block) =>
              `<p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">${block}</p>`,
          )
          .join("")}
      </div>
    </td></tr></table>
  `;
}

export function resolveRewardEmailVariables(variables: RewardEmailVariables) {
  return variables;
}
