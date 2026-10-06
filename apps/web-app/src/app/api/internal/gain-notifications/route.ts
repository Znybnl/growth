import { NextResponse } from "next/server";
import { dispatchMerchantGainNotifications } from "@/lib/merchant-gain-notifications";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    // One daily run: drain multiple recipients/parts, with a time budget and
    // pacing below the existing Resend default rate, not just ten messages.
    return NextResponse.json(await dispatchMerchantGainNotifications(undefined, 200, {
      budgetMs: 240_000, minIntervalMs: 600,
    }), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Traitement des notifications indisponible." }, { status: 503 });
  }
}
