import { Resend } from "resend";
import { setTimeout as delay } from "node:timers/promises";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  renderMerchantGainNotification,
  type GainNotificationFrequency, type NotificationGain,
} from "@/lib/merchant-gain-notification-email";

export type GainNotificationPreference = { frequency: GainNotificationFrequency; updatedAt: string | null };
export async function getGainNotificationPreference(userId: string, merchantId: string): Promise<GainNotificationPreference> {
  const { data, error } = await getSupabaseAdmin().from("merchant_gain_notification_preferences")
    .select("frequency,updated_at").eq("user_id", userId).eq("merchant_id", merchantId).maybeSingle();
  if (error) throw new Error("Impossible de charger les préférences de notification.");
  return { frequency: data?.frequency ?? "disabled", updatedAt: data?.updated_at ?? null };
}
export async function saveGainNotificationPreference(userId: string, merchantId: string, frequency: GainNotificationFrequency) {
  const { data, error } = await getSupabaseAdmin().rpc("set_merchant_gain_notification_preference", {
    p_user: userId, p_merchant: merchantId, p_frequency: frequency,
  });
  if (error || !data) throw new Error("Impossible d’enregistrer les préférences de notification.");
  return { frequency: data.frequency, updatedAt: data.updated_at } as GainNotificationPreference;
}
type NotificationJob = {
  id: string; lease_token: string; merchant_id: string; merchant_name: string; recipient: string;
  time_zone: string; frequency: Exclude<GainNotificationFrequency, "disabled">;
  period_start: string; period_end: string; part: number; parts: number; gains: NotificationGain[];
};
export async function dispatchMerchantGainNotifications(
  leadId?: string, limit = 10,
  options: { budgetMs?: number; minIntervalMs?: number } = {},
) {
  // Never send from previews/local development. A production cron recovers the
  // durable SQL outbox even if the post-response callback is interrupted.
  if (process.env.VERCEL_ENV !== "production" || process.env.MERCHANT_GAIN_NOTIFICATIONS_ENABLED !== "true") {
    return { sent: 0, failed: 0, skipped: true };
  }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const origin = process.env.MERCHANT_GAIN_NOTIFICATIONS_ORIGIN;
  if (!key || !from || !origin) throw new Error("Configuration des notifications incomplète.");
  const resend = new Resend(key);
  const db = getSupabaseAdmin();
  const maxJobs = Math.min(Math.max(Math.trunc(limit), 0), 200);
  const deadline = Date.now() + Math.min(Math.max(options.budgetMs ?? 45_000, 0), 240_000);
  const interval = Math.min(Math.max(options.minIntervalMs ?? 0, 0), 1_000);
  let sent = 0; let failed = 0; let processed = 0; let limitReached = false;
  for (let i = 0; i < maxJobs; i++) {
    if (i > 0 && interval > 0) await delay(interval);
    // Stop before acquiring another lease. Unattempted parts remain durable
    // for the next run; never relax the provider's idempotency safety window.
    if (Date.now() >= deadline) { limitReached = true; break; }
    const { data, error } = await db.rpc("claim_merchant_gain_notification", { p_lead: leadId ?? null });
    if (error) throw new Error("Impossible de préparer les notifications.");
    if (!data) break;
    processed++;
    const job = data as NotificationJob;
    const email = renderMerchantGainNotification({
      origin, merchantName: job.merchant_name, merchantId: job.merchant_id,
      frequency: job.frequency, timeZone: job.time_zone, periodStart: job.period_start,
      periodEnd: job.period_end, gains: job.gains, part: job.part, parts: job.parts,
    });
    const prepared = await db.rpc("prepare_merchant_gain_notification_payload", {
      p_id: job.id, p_token: job.lease_token,
      p_payload: { ...email, from: `Okado <${from.replace(/^.*<(.+)>$/, "$1")}>` },
    });
    if (prepared.error) throw new Error("Impossible de préparer le contenu de notification.");
    if (!prepared.data) continue;
    const payload = prepared.data as typeof email & { from: string };
    const authorization = await db.rpc("authorize_merchant_gain_notification", {
      p_id: job.id, p_token: job.lease_token,
    });
    if (authorization.error) throw new Error("Impossible de vérifier la notification.");
    if (authorization.data !== true) continue;
    let providerId: string | null = null;
    try {
      const result = await resend.emails.send({
        from: payload.from, to: job.recipient,
        subject: payload.subject, html: payload.html, text: payload.text,
      }, { idempotencyKey: `merchant-gain/${job.id}` });
      if (result.error || !result.data?.id) throw new Error("Envoi non confirmé.");
      providerId = result.data.id;
    } catch {
      // Never log provider errors: these may contain an e-mail address.
      failed++;
    }
    const finish = await db.rpc("finish_merchant_gain_notification", {
      p_id: job.id, p_token: job.lease_token, p_sent: providerId !== null, p_provider_id: providerId,
    });
    if (finish.error) throw new Error("Impossible de confirmer l’état de notification.");
    if (providerId) sent++;
  }
  return { sent, failed, skipped: false, limitReached: limitReached || processed === maxJobs };
}
