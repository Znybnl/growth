import { NextResponse } from "next/server";
import { dispatchMerchantGainNotifications } from "@/lib/merchant-gain-notifications";
import { logSupportEvent } from "@/lib/support-log";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    // One daily run: drain multiple recipients/parts, with a time budget and
    // pacing below the existing Resend default rate, not just ten messages.
    const result = await dispatchMerchantGainNotifications(undefined, 200, {
      budgetMs: 240_000, minIntervalMs: 600,
    });
    if (!result.skipped) logSupportEvent(
      result.failed || result.limitReached ? "error" : "info",
      "merchant_gain_notification_dispatch", result,
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    logSupportEvent("error", "merchant_gain_notification_dispatch_failed", {});
    return NextResponse.json({ error: "Traitement des notifications indisponible." }, { status: 503 });
  }
}
