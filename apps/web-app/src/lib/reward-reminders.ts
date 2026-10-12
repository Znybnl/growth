import { Resend } from "resend";
import { setTimeout as delay } from "node:timers/promises";
import { getSupabaseAdmin } from "@/lib/supabase";
import { renderRewardReminder } from "@/lib/reward-reminder-email";
import type { RewardReminderEmailInput } from "@/lib/reward-reminder-email";

type Payload = { from: string; to: string; subject: string; html: string; text: string;
  replyTo?: string; attachments?: ReturnType<typeof renderRewardReminder>["attachments"] };
type Job = { id: string; lease_token: string; email_payload: Payload | null };

export async function dispatchRewardReminders(options: { limit?: number; budgetMs?: number; minIntervalMs?: number } = {}) {
  if (process.env.VERCEL_ENV !== "production" || process.env.REWARD_REMINDERS_ENABLED !== "true") {
    return { skipped: true, sent: 0, failed: 0, processed: 0, limitReached: false };
  }
  const origin = process.env.REWARD_REMINDERS_ORIGIN;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (origin !== "https://app.okado.app" || !key || !from) throw new Error("Configuration de relance indisponible.");
  const db = getSupabaseAdmin();
  async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const result = await db.rpc(name, args);
    if (result.error) throw new Error("Traitement de relance indisponible.");
    return result.data as T;
  }
  const now = () => new Date().toISOString();
  const token = await rpc<string | null>("acquire_reward_reminder_runner", { p_now: now() });
  if (!token) return { skipped: true, sent: 0, failed: 0, processed: 0, limitReached: false };
  let sent = 0, failed = 0, processed = 0;
  const limit = Math.min(200, Math.max(0, options.limit ?? 200));
  const deadline = Date.now() + Math.min(210_000, Math.max(0, options.budgetMs ?? 210_000));
  const resend = new Resend(key);
  try {
    await rpc("enqueue_reward_reminders", { p_now: now() });
    while (processed < limit && Date.now() < deadline) {
      // Leave headroom for the existing gain/merchant emails using the same provider.
      if (processed) await delay(options.minIntervalMs ?? 3000);
      const job = await rpc<Job | null>("claim_reward_reminder", { p_now: now() });
      if (!job) break;
      processed++;
      let message = job.email_payload;
      if (!message) {
        const input = await rpc<(RewardReminderEmailInput & { recipient: string }) | null>("get_reward_reminder_input", {
          p_id: job.id, p_token: job.lease_token, p_now: now(),
        });
        if (!input) continue;
        const email = renderRewardReminder({ ...input, origin });
        const sender = email.senderName.replace(/[<>"\r\n]/g, "").trim() || "Okado";
        message = { from: `${sender} <${from.replace(/^.*<(.+)>$/, "$1")}>`, to: input.recipient,
          subject: email.subject, html: email.html, text: email.text, replyTo: email.replyTo, attachments: email.attachments };
      }
      const payload = await rpc<Payload | null>("prepare_reward_reminder", {
        p_id: job.id, p_token: job.lease_token, p_payload: message, p_now: now(),
      });
      if (!payload || !await rpc<boolean>("authorize_reward_reminder", { p_id: job.id, p_token: job.lease_token, p_now: now() })) continue;
      let provider: string | null = null;
      try {
        const result = await resend.emails.send(payload, { idempotencyKey: `reward-expiry/${job.id}` });
        provider = result.error ? null : result.data?.id ?? null;
      } catch { /* Ambiguous delivery: keep the frozen payload and identity; never log provider data. */ }
      await rpc("finish_reward_reminder", { p_id: job.id, p_token: job.lease_token, p_provider: provider, p_now: now() });
      if (provider) sent++; else failed++;
    }
    return { skipped: false, sent, failed, processed, limitReached: processed === limit || Date.now() >= deadline };
  } finally { await rpc("release_reward_reminder_runner", { p_token: token }); }
}
