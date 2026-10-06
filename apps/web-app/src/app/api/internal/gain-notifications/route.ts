import { NextResponse } from "next/server";
import { dispatchMerchantGainNotifications } from "@/lib/merchant-gain-notifications";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    return NextResponse.json(await dispatchMerchantGainNotifications(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Traitement des notifications indisponible." }, { status: 503 });
  }
}
