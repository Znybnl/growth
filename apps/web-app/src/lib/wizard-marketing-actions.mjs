const GOOGLE_REVIEW_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "search.google.com",
  "maps.google.com",
  "g.page",
  "maps.app.goo.gl",
]);

const REVIEW_ACTION_PRIORITY = ["instagram", "facebook", "tiktok", "tripadvisor", "custom"];

function normalizeConfiguredUrl(value, kind) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return "";
    if (kind === "google" && !GOOGLE_REVIEW_HOSTS.has(parsed.hostname.toLowerCase())) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function wizardMarketingActionUrl(merchant, kind) {
  const merchantField = {
    google: "googleReviewUrl",
    instagram: "instagramUrl",
    facebook: "facebookUrl",
    tiktok: "tiktokUrl",
    tripadvisor: "tripadvisorUrl",
    custom: "customLinkUrl",
    crm: "websiteUrl",
  }[kind];

  return merchantField ? normalizeConfiguredUrl(merchant[merchantField], kind) : "";
}

export function createWizardMarketingActionDefaults(merchant, goalType) {
  const createAction = (kind, id) => {
    const url = wizardMarketingActionUrl(merchant, kind);
    return url ? { id, kind, url } : null;
  };

  if (goalType === "review_prompt") {
    const googleAction = createAction("google", "wizard-google-action");
    const additionalActions = REVIEW_ACTION_PRIORITY.map((kind, index) =>
      createAction(kind, `wizard-additional-action-${index + 2}`),
    )
      .filter(Boolean)
      .slice(0, 2);

    return [...(googleAction ? [googleAction] : []), ...additionalActions];
  }

  if (goalType === "social_follow") {
    return [
      ["instagram", "wizard-instagram-action"],
      ["google", "wizard-google-action"],
      ["facebook", "wizard-facebook-action"],
    ]
      .map(([kind, id]) => createAction(kind, id))
      .filter(Boolean);
  }

  if (goalType === "lead_capture") {
    const googleAction = createAction("google", "wizard-google-action");
    const otherActions = ["instagram", "facebook", "tripadvisor", "custom"]
      .map((kind) => createAction(kind, `wizard-${kind}-action`))
      .filter(Boolean);

    return [...(googleAction ? [googleAction] : []), ...otherActions];
  }

  return [];
}

export function createAdminWizardMarketingActionDefaults(merchant) {
  const configuredActions = [
    ["google", merchant.googleReviewUrl],
    ["instagram", merchant.instagramUrl],
    ["facebook", merchant.facebookUrl],
    ["tiktok", merchant.tiktokUrl],
    ["tripadvisor", merchant.tripadvisorUrl],
    ["custom", merchant.customLinkUrl],
    ["custom", merchant.appointmentUrl, "Prendre rendez-vous"],
  ];

  return configuredActions
    .map(([kind, url, label]) => ({ kind, url: normalizeConfiguredUrl(url, kind), label }))
    .filter(({ url }) => Boolean(url))
    .map(({ kind, url, label }, index) => ({
      id: `admin-wizard-action-${index + 1}`,
      kind,
      url,
      label,
    }));
}
