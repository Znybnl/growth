import { NextResponse } from "next/server";

import { dispatchBrevoEventRetries } from "@/lib/brevo";
import { recordBrevoEventRetryRun } from "@/lib/support-task-log";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const result = await dispatchBrevoEventRetries();
    await recordBrevoEventRetryRun(result);
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    await recordBrevoEventRetryRun({}, true);
    return NextResponse.json({ error: "Reprise des événements Brevo impossible." }, { status: 503 });
  }
}
