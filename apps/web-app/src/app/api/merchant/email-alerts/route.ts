import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getMerchantOperationalAlerts } from "@/lib/merchant-alerts-repository";

export async function GET() {
  const start = performance.now();
  const session = await requireAuthenticatedSession();
  try {
    const alerts = await getMerchantOperationalAlerts(session.merchant.id);
    return NextResponse.json(alerts, { headers: {
      "Cache-Control": "private, no-store",
      "Server-Timing": "merchant-alerts;dur=" + (performance.now() - start).toFixed(1),
    } });
  } catch {
    return NextResponse.json({ error: "Lecture des alertes impossible" }, {
      status: 503, headers: { "Cache-Control": "private, no-store" },
    });
  }
}
