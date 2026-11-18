import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getMerchantOperationalAlerts } from "@/lib/merchant-alerts-repository";
import { getSupabaseAdmin } from "@/lib/supabase";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";

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

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const session = await requireAuthenticatedSession();
    const body = await request.json() as { campaignId?: unknown; snapshot?: unknown };
    if (typeof body.campaignId !== "string" || !Array.isArray(body.snapshot) || body.snapshot.length > 10000 ||
        !body.snapshot.every((item: unknown) => item !== null && typeof item === "object" &&
          typeof (item as { id?: unknown }).id === "string" && typeof (item as { status?: unknown }).status === "string" &&
          (typeof (item as { eventAt?: unknown }).eventAt === "string" || (item as { eventAt?: unknown }).eventAt === null))) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    const { error } = await getSupabaseAdmin().rpc("see_merchant_email_alerts", {
      p_merchant_id: session.merchant.id, p_campaign_id: body.campaignId, p_snapshot: body.snapshot,
    });
    if (error) throw new Error("Enregistrement impossible");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: getRequestSecurityErrorStatus(error) });
  }
}
