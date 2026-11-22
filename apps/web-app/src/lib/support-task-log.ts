import { getSupabaseAdmin } from "@/lib/supabase";

// Await persistence in the scheduled request; global events were previously
// discarded by the legacy logger when no merchantId was present.
export async function recordGainNotificationRun(
  recovery: boolean,
  result: { sent?: number; failed?: number; limitReached?: boolean; skipped?: boolean },
  failed = false,
) {
  if (process.env.VERCEL_ENV !== "production") return;
  const count = (value?: number) => Number.isSafeInteger(value) && value! >= 0 ? value : 0;
  const level = failed || result.failed || result.limitReached ? "error" : result.skipped ? "warn" : "info";
  const summary = failed ? "Échec du traitement planifié."
    : result.skipped ? "Traitement non exécuté : notifications désactivées ou environnement non autorisé."
    : `Acceptés : ${count(result.sent)} ; échecs : ${count(result.failed)} ; limite atteinte : ${result.limitReached ? "oui" : "non"}.`;
  try {
    const { error } = await getSupabaseAdmin().from("business_logs").insert({
      level, event: recovery ? "gain_notification_recovery_run" : "gain_notification_scheduled_run",
      summary, payload: {}, created_at: new Date().toISOString(),
    });
    if (error) console.warn("[SUPPORT][scheduled-run-record-unavailable]");
  } catch { console.warn("[SUPPORT][scheduled-run-record-unavailable]"); }
}

export async function recordBrevoEventRetryRun(
  result: { processed?: number; sent?: number; retrying?: number; needsReview?: number; skipped?: boolean; limitReached?: boolean },
  failed = false,
) {
  if (process.env.VERCEL_ENV !== "production") return;
  const count = (value?: number) => Number.isSafeInteger(value) && value! >= 0 ? value : 0;
  const level = failed || result.needsReview || result.limitReached ? "error" : result.retrying ? "warn" : result.skipped ? "warn" : "info";
  const summary = failed ? "Échec du traitement Brevo planifié."
    : result.skipped ? "Traitement Brevo ignoré : configuration indisponible."
    : `Traités : ${count(result.processed)} ; acceptés : ${count(result.sent)} ; reprises prévues : ${count(result.retrying)} ; à vérifier : ${count(result.needsReview)} ; limite atteinte : ${result.limitReached ? "oui" : "non"}.`;
  try {
    const { error } = await getSupabaseAdmin().from("business_logs").insert({
      level,
      event: "brevo_event_retry_run",
      summary,
      payload: {},
      created_at: new Date().toISOString(),
    });
    if (error) console.warn("[SUPPORT][brevo-event-run-record-unavailable]");
  } catch {
    console.warn("[SUPPORT][brevo-event-run-record-unavailable]");
  }
}
