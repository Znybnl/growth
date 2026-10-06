export const GAIN_NOTIFICATION_FREQUENCIES = ["disabled", "instant", "daily", "weekly", "monthly"] as const;
export type GainNotificationFrequency = typeof GAIN_NOTIFICATION_FREQUENCIES[number];
export const GAIN_NOTIFICATION_LABELS: Record<GainNotificationFrequency, string> = {
  disabled: "Désactivé", instant: "À chaque gain", daily: "Synthèse quotidienne",
  weekly: "Synthèse hebdomadaire", monthly: "Synthèse mensuelle",
};
export type NotificationGain = {
  leadId: string; campaignId: string; campaignTitle: string; prizeLabel: string; wonAt: string;
};
export type GainNotificationEmail = {
  merchantName: string; merchantId: string; frequency: Exclude<GainNotificationFrequency, "disabled">;
  timeZone: string; periodStart: string; periodEnd: string; gains: NotificationGain[];
  part?: number; parts?: number; origin: string;
};
function escape(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
function safeZone(zone: string) {
  try { new Intl.DateTimeFormat("fr-FR", { timeZone: zone }); return zone; }
  catch { return "Europe/Paris"; }
}
export function renderMerchantGainNotification(input: GainNotificationEmail) {
  if (!input.gains.length) throw new Error("Une notification vide ne doit pas être envoyée.");
  const zone = safeZone(input.timeZone);
  const date = (value: string) => new Intl.DateTimeFormat("fr-FR", {
    timeZone: zone, day: "numeric", month: "long", year: "numeric",
  }).format(new Date(value));
  const dateTime = (value: string) => new Intl.DateTimeFormat("fr-FR", {
    timeZone: zone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
  const instant = input.frequency === "instant";
  const frequency = { instant: "", daily: "du jour", weekly: "de la semaine", monthly: "du mois" }[input.frequency];
  const parts = input.parts ?? 1;
  const pagination = parts > 1 ? ` — partie ${input.part ?? 1}/${parts}` : "";
  const subject = instant ? `Nouveau gain chez ${input.merchantName} 🎁` :
    `Vos gains ${frequency} — ${input.merchantName}${pagination}`;
  const heading = instant ? "Un nouveau gain 🎁" : `Vos gains ${frequency}`;
  const period = instant ? dateTime(input.gains[0].wonAt) : input.frequency === "daily" ? `Le ${date(input.periodStart)}` :
    `Du ${date(input.periodStart)} au ${date(new Date(new Date(input.periodEnd).getTime() - 1).toISOString())}`;
  const games = new Set(input.gains.map(g => g.campaignId)).size;
  const summary = instant
    ? `Un participant a remporté « ${input.gains[0].prizeLabel} » dans votre jeu « ${input.gains[0].campaignTitle} ».`
    : `${input.gains.length} gain${input.gains.length > 1 ? "s" : ""} remporté${input.gains.length > 1 ? "s" : ""} dans ${games} jeu${games > 1 ? "x" : ""}${parts > 1 ? " dans cette partie" : ""}.`;
  // Use the deployment's canonical URL, never a user-supplied URL from the game.
  const origin = new URL(input.origin);
  if (!["https:", "http:"].includes(origin.protocol)) throw new Error("Origine invalide.");
  const results = new URL("/api/merchant/gain-notifications/results", origin);
  results.searchParams.set("location", input.merchantId);
  const account = new URL("/account#account-user", origin).href;
  const detail = instant
    ? `<div style="padding:24px;background:#f8f3f8;border-radius:12px"><p style="margin:0 0 8px;font-size:12px;color:#716473">LOT REMPORTÉ</p><p style="margin:0;font-size:23px;font-weight:700;color:#43174b">${escape(input.gains[0].prizeLabel)}</p><p style="margin:12px 0 0;font-size:14px;color:#655c6b">${escape(input.gains[0].campaignTitle)}</p></div>`
    : `<h2 style="font-size:18px;margin:28px 0 14px">Détail des gains${escape(pagination)}</h2><table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;background:#f8f3f8"><th width="24%" style="padding:12px 8px">Date</th><th width="34%" style="padding:12px 8px">Jeu</th><th width="42%" style="padding:12px 8px">Lot remporté</th></tr></thead><tbody>${input.gains.map(g => `<tr><td style="padding:13px 8px;vertical-align:top;border-bottom:1px solid #ebe4ed;overflow-wrap:anywhere">${escape(dateTime(g.wonAt))}</td><td style="padding:13px 8px;vertical-align:top;border-bottom:1px solid #ebe4ed;overflow-wrap:anywhere">${escape(g.campaignTitle)}</td><td style="padding:13px 8px;vertical-align:top;border-bottom:1px solid #ebe4ed;font-weight:600;overflow-wrap:anywhere">${escape(g.prizeLabel)}</td></tr>`).join("")}</tbody></table>`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head><body style="margin:0;background:#f6f3f6;font-family:Arial,Helvetica,sans-serif;color:#201a27"><div style="display:none;max-height:0;overflow:hidden">${escape(summary)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:white;border:1px solid #e8e1ea;border-radius:16px"><tr><td style="padding:28px 24px;border-bottom:1px solid #eee7ef"><span style="font-size:23px;color:#611f69;font-weight:700">✦ Okado</span><p style="margin:12px 0 0;font-size:13px;color:#716473">${escape(input.merchantName)}</p></td></tr><tr><td style="padding:28px 24px"><p style="font-size:12px;letter-spacing:1.5px;color:#796980;margin:0 0 12px">NOTIFICATIONS DE GAINS</p><h1 style="margin:0 0 12px;font-size:28px;line-height:1.2">${escape(heading)}</h1><p style="margin:0 0 22px;color:#796980;font-size:13px">${escape(period)} · ${escape(zone)}</p><p style="font-size:16px;line-height:1.5;margin:0 0 24px">${escape(summary)}</p>${detail}<p style="margin:30px 0 12px"><a href="${escape(results.href)}" style="display:inline-block;padding:14px 22px;background:#611f69;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">${instant ? "Voir les résultats" : "Consulter les résultats"}</a></p><p style="font-size:12px;color:#796980;line-height:1.5;margin:0">L’accès aux résultats nécessite une connexion à votre compte Okado.</p></td></tr><tr><td style="padding:22px 24px;border-top:1px solid #eee7ef;font-size:12px;line-height:1.6;color:#796980">Vous recevez cet e-mail car vous avez activé les notifications de gains pour cet établissement.<br><a href="${escape(account)}" style="color:#611f69">Modifier la fréquence ou désactiver dans Mon compte</a></td></tr></table></td></tr></table></body></html>`;
  const text = [input.merchantName, heading, period, summary,
    ...input.gains.map(g => `${dateTime(g.wonAt)} | ${g.campaignTitle} | ${g.prizeLabel}`),
    `Résultats : ${results.href}`, `Notifications : ${account}`].join("\n\n");
  return { subject, html, text };
}
