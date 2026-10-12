import { NextResponse } from "next/server";
import { dispatchRewardReminders } from "@/lib/reward-reminders";
import { getSupabaseAdmin } from "@/lib/supabase";
export const maxDuration = 300;

async function recordRun(summary: string, level: "info" | "error") {
  if (process.env.VERCEL_ENV !== "production" || process.env.REWARD_REMINDERS_ENABLED !== "true") return;
  try {
    const { error } = await getSupabaseAdmin().from("business_logs").insert({
      event: "reward_expiry_reminder_run", level, summary, payload: {}, created_at: new Date().toISOString(),
    });
    if (error) console.error("[SUPPORT][reward-reminder-run-unavailable]");
  } catch { console.error("[SUPPORT][reward-reminder-run-unavailable]"); }
}
export async function GET(request: Request) {
  const secret = process.env.REWARD_REMINDER_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    const result = await dispatchRewardReminders();
    if (!result.skipped) await recordRun(`Acceptés : ${result.sent} ; échecs : ${result.failed} ; traités : ${result.processed} ; limite atteinte : ${result.limitReached}.`, result.failed || result.limitReached ? "error" : "info");
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    await recordRun("Traitement de relance indisponible ; consulter l’outbox privée.", "error");
    return NextResponse.json({ error: "Relances indisponibles." }, { status: 503 });
  }
}
export const POST = GET;
