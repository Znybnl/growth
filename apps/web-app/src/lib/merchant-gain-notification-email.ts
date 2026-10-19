export const GAIN_NOTIFICATION_FREQUENCIES = ["instant", "daily", "weekly", "monthly"] as const;
export type GainNotificationFrequency = typeof GAIN_NOTIFICATION_FREQUENCIES[number];
export const GAIN_NOTIFICATION_LABELS: Record<GainNotificationFrequency, string> = {
  instant: "À chaque gain", daily: "Synthèse quotidienne",
  weekly: "Synthèse hebdomadaire", monthly: "Synthèse mensuelle",
};
export type NotificationGain = {
  leadId: string; campaignId: string; campaignTitle: string; prizeLabel: string; wonAt: string;
  rewardExpiresAt?: string | null; redeemed?: boolean;
  // Optional for older prepared snapshots. Never infer identity from an email.
  firstName?: string | null; lastName?: string | null;
};
export type NotificationStock = {
  campaignTitle: string;
  prizeLabel: string;
  totalQuantity: number | null;
  remainingQuantity: number | null;
};
export type GainNotificationEmail = {
  merchantName: string; merchantId: string; frequency: Exclude<GainNotificationFrequency, "disabled">;
  timeZone: string; periodStart: string; periodEnd: string; gains: NotificationGain[];
  redeemedCount?: number; stocks?: NotificationStock[];
  part?: number; parts?: number; origin: string;
};
function escape(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
function safeZone(zone: string) {
  try { new Intl.DateTimeFormat("fr-FR", { timeZone: zone }); return zone; }
  catch { return "Europe/Paris"; }
}
function participantName(gain: NotificationGain) {
  return [gain.firstName, gain.lastName].filter((value): value is string => typeof value === "string")
    .map(value => value.trim()).filter(Boolean).join(" ");
}

export function renderMerchantGainNotification(input: GainNotificationEmail) {
  if (!input.gains.length) throw new Error("Une notification vide ne doit pas être envoyée.");
  const zone = safeZone(input.timeZone);
  const format = (value: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("fr-FR", { timeZone: zone, ...options }).format(new Date(value));
  const date = (value: string) => format(value, { day: "numeric", month: "long", year: "numeric" });
  const dateTime = (value: string) => format(value, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const instant = input.frequency === "instant";
  const parts = input.parts ?? 1;
  const pagination = parts > 1 ? ` — partie ${input.part ?? 1}/${parts}` : "";
  const inclusiveEnd = new Date(new Date(input.periodEnd).getTime() - 1).toISOString();
  const endMonth = format(inclusiveEnd, { month: "numeric", year: "numeric" });
  const sameMonth = format(input.periodStart, { month: "numeric", year: "numeric" }) === endMonth;
  const sameYear = format(input.periodStart, { year: "numeric" }) === format(inclusiveEnd, { year: "numeric" });
  const rangeStart = format(input.periodStart, {
    day: "numeric", ...(sameMonth ? {} : { month: "long" }), ...(sameYear ? {} : { year: "numeric" }),
  });
  const month = format(input.periodStart, { month: "long", year: "numeric" });
  const subjectPeriod = input.frequency === "daily" ? `du ${date(input.periodStart)}`
    : input.frequency === "weekly" ? `du ${rangeStart} au ${date(inclusiveEnd)}`
    : `${/^[aeiouéèê]/i.test(month) ? "d’" : "de "}${month}`;
  const subject = instant ? `Nouveau gain — ${input.merchantName}`
    : `Les gains ${subjectPeriod} — ${input.merchantName}${pagination}`;
  const heading = { instant: "Un nouveau gain", daily: "Les gains de la journée",
    weekly: "Les gains de la semaine", monthly: "Les gains du mois" }[input.frequency];
  const period = instant ? `Le ${date(input.gains[0].wonAt)} à ${format(input.gains[0].wonAt, { hour: "2-digit", minute: "2-digit" })}`
    : input.frequency === "daily" ? `Le ${date(input.periodStart)}` : `Du ${date(input.periodStart)} au ${date(inclusiveEnd)}`;
  const games = new Set(input.gains.map(g => g.campaignId)).size;
  const winner = participantName(input.gains[0]);
  const summary = instant
    ? `${winner || "Un participant"} a remporté « ${input.gains[0].prizeLabel} » dans votre jeu « ${input.gains[0].campaignTitle} ».`
    : `${input.gains.length} gain${input.gains.length > 1 ? "s" : ""} remporté${input.gains.length > 1 ? "s" : ""} dans ${games} jeu${games > 1 ? "x" : ""}${parts > 1 ? " dans cette partie" : ""}.`;
  // Use the deployment's canonical URL, never a user-supplied URL from the game.
  const origin = new URL(input.origin);
  if (!["https:", "http:"].includes(origin.protocol)) throw new Error("Origine invalide.");
  const results = new URL("/api/merchant/gain-notifications/results", origin);
  results.searchParams.set("location", input.merchantId);
  const account = new URL("/api/merchant/gain-notifications/account", origin);
  account.searchParams.set("location", input.merchantId);
  const stockRows = (input.stocks ?? []).map((stock) => {
    const exhausted = stock.remainingQuantity === 0;
    const remaining = stock.remainingQuantity === null
      ? "Illimité"
      : `${stock.remainingQuantity} restant${stock.remainingQuantity > 1 ? "s" : ""}`;
    const quantity = stock.totalQuantity === null
      ? remaining
      : `${remaining} sur ${stock.totalQuantity}`;
    return { stock, exhausted, quantity };
  });
  const digestSummary = instant ? "" : `<section style="margin:24px 0;padding:20px;background:#f8f3f8;border:1px solid #ebe4ed;border-radius:12px"><h2 style="margin:0 0 12px;font-size:17px">Indicateurs de la période</h2><div style="padding:14px 16px;background:white;border-radius:8px"><p style="margin:0 0 4px;font-size:12px;color:#655c6b">Lots récupérés pendant la période</p><p style="margin:0;color:#43174b;font-size:28px;font-weight:700">${input.redeemedCount ?? 0}</p></div><h2 style="margin:22px 0 10px;font-size:17px">Stocks des campagnes actives</h2>${stockRows.length ? `<table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;background:white"><th width="34%" style="padding:9px 7px">Jeu</th><th width="38%" style="padding:9px 7px">Lot</th><th width="28%" style="padding:9px 7px">Stock</th></tr></thead><tbody>${stockRows.map(({ stock, exhausted, quantity }) => `<tr><td style="padding:10px 7px;vertical-align:top;border-top:1px solid #ebe4ed;overflow-wrap:anywhere">${escape(stock.campaignTitle)}</td><td style="padding:10px 7px;vertical-align:top;border-top:1px solid #ebe4ed;overflow-wrap:anywhere">${escape(stock.prizeLabel)}</td><td style="padding:10px 7px;vertical-align:top;border-top:1px solid #ebe4ed;overflow-wrap:anywhere;${exhausted ? "color:#a61b1b;font-weight:700" : ""}">${escape(quantity)}${exhausted ? " — STOCK ÉPUISÉ" : ""}</td></tr>`).join("")}</tbody></table>` : `<p style="margin:0;font-size:13px;color:#655c6b">Aucun lot configuré dans une campagne active.</p>`}</section>`;
  const digestText = instant ? [] : [
    `Indicateurs de la période\nLots récupérés pendant la période : ${input.redeemedCount ?? 0}`,
    `Stocks des campagnes actives\n${stockRows.length
      ? stockRows.map(({ stock, exhausted, quantity }) => `${stock.campaignTitle} | ${stock.prizeLabel} | ${quantity}${exhausted ? " — STOCK ÉPUISÉ" : ""}`).join("\n")
      : "Aucun lot configuré dans une campagne active."}`,
  ];
  const detail = instant
    ? `<div style="padding:24px;background:#f8f3f8;border-radius:12px"><p style="margin:0 0 8px;font-size:12px;color:#716473">LOT REMPORTÉ</p><p style="margin:0;font-size:23px;font-weight:700;color:#43174b">${escape(input.gains[0].prizeLabel)}</p><p style="margin:18px 0 4px;font-size:12px;color:#716473">PARTICIPANT</p><p style="margin:0;font-size:16px;font-weight:600;overflow-wrap:anywhere">${escape(winner || "Nom non renseigné")}</p><p style="margin:14px 0 0;font-size:14px;color:#655c6b">Jeu : ${escape(input.gains[0].campaignTitle)}</p></div>`
    : `<h2 style="font-size:18px;margin:28px 0 14px">Détail des gains${escape(pagination)}</h2><table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border-collapse:collapse;font-size:14px"><thead><tr style="text-align:left;background:#f8f3f8"><th width="20%" style="padding:12px 6px">Date</th><th width="52%" style="padding:12px 6px">Participant · jeu · lot</th><th width="28%" style="padding:12px 6px">Expiration / retrait</th></tr></thead><tbody>${input.gains.map(g => `<tr><td style="padding:15px 6px;vertical-align:top;border-bottom:1px solid #ebe4ed;font-size:12px;overflow-wrap:anywhere">${escape(dateTime(g.wonAt))}</td><td style="padding:15px 6px;vertical-align:top;border-bottom:1px solid #ebe4ed;overflow-wrap:anywhere"><p style="margin:0 0 6px;font-weight:700">${escape(participantName(g) || "Nom non renseigné")}</p><p style="margin:0 0 6px;font-size:13px;line-height:1.4;color:#655c6b">Jeu : ${escape(g.campaignTitle)}</p><p style="margin:0;line-height:1.4;color:#43174b;font-weight:600">Lot : ${escape(g.prizeLabel)}</p></td><td style="padding:15px 6px;vertical-align:top;border-bottom:1px solid #ebe4ed;font-size:12px;line-height:1.4;overflow-wrap:anywhere">${g.redeemed ? "Récupéré" : g.rewardExpiresAt ? `À utiliser avant le ${escape(date(g.rewardExpiresAt))}` : "Sans date d'expiration"}</td></tr>`).join("")}</tbody></table>`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head><body style="margin:0;background:#f6f3f6;font-family:Arial,Helvetica,sans-serif;color:#201a27"><div style="display:none;max-height:0;overflow:hidden">${escape(summary)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:white;border:1px solid #e8e1ea;border-radius:16px"><tr><td style="padding:24px;border-bottom:1px solid #eee7ef"><p style="margin:0;font-size:19px;font-weight:700;color:#43174b;overflow-wrap:anywhere">${escape(input.merchantName)}</p></td></tr><tr><td style="padding:28px 24px"><p style="font-size:12px;letter-spacing:1.5px;color:#796980;margin:0 0 12px">NOTIFICATIONS DE GAINS</p><h1 style="margin:0 0 12px;font-size:28px;line-height:1.2">${escape(heading)}</h1><p style="margin:0 0 22px;color:#796980;font-size:13px">${escape(period)} · ${escape(zone)}</p><p style="font-size:16px;line-height:1.5;margin:0 0 24px;overflow-wrap:anywhere">${escape(summary)}</p>${detail}<p style="margin:30px 0 12px"><a href="${escape(results.href)}" style="display:inline-block;padding:14px 22px;background:#611f69;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">${instant ? "Voir les résultats" : "Consulter les résultats"}</a></p><p style="font-size:12px;color:#796980;line-height:1.5;margin:0">L’accès aux résultats nécessite une connexion à votre compte Okado.</p></td></tr><tr><td style="padding:22px 24px;border-top:1px solid #eee7ef;font-size:12px;line-height:1.6;color:#796980">Vous recevez cet e-mail car vous avez activé les notifications de gains pour cet établissement.<br>Vous pouvez modifier vos options de notification (fréquences ou désactivation) dans <a href="${escape(account.href)}" style="color:#611f69">Mon compte</a>.</td></tr></table></td></tr></table></body></html>`;
  const htmlWithDigest = instant ? html : html.replace(detail, `${digestSummary}${detail}`);
  const text = [input.merchantName, heading, period, summary,
    ...digestText,
    ...input.gains.map(g => `${dateTime(g.wonAt)} | ${participantName(g) || "Nom non renseigné"} | Jeu : ${g.campaignTitle} | Lot : ${g.prizeLabel}${instant ? "" : ` | Expiration / retrait : ${g.redeemed ? "Récupéré" : g.rewardExpiresAt ? `À utiliser avant le ${date(g.rewardExpiresAt)}` : "Sans date d'expiration"}`}`),
    `Résultats : ${results.href}`,
    `Vous pouvez modifier vos options de notification (fréquences ou désactivation) dans Mon compte : ${account.href}`].join("\n\n");
  return { subject, html: htmlWithDigest, text };
}
