import { NextResponse } from "next/server";

import { dispatchBrevoEmailDecisionEvents } from "@/lib/brevo";
import { recordBrevoEventRetryRun } from "@/lib/support-task-log";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const result = await dispatchBrevoEmailDecisionEvents();
    if (result.emitted > 0 || result.failed > 0) {
      await recordBrevoEventRetryRun({
        processed: result.processed,
        sent: result.emitted,
        needsReview: result.failed,
        skipped: result.skipped,
      }, result.failed > 0);
    }
    return NextResponse.json({ ok: true, result }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    await recordBrevoEventRetryRun({}, true);
    return NextResponse.json({ error: "Évaluation des emails Brevo impossible." }, { status: 503 });
  }
}
