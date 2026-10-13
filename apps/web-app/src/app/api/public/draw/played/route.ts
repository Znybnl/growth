import { NextResponse } from "next/server";
import { getPublicErrorStatus, getPublicRetryAfter, isValidPublicIdentifier } from "@/lib/public-api";
import { verifyParticipationToken } from "@/lib/participation-token";
import { assertPersistentPublicRateLimit } from "@/lib/public-security-store";
import { recordDrawSessionParticipation } from "@/lib/store";
import { logSupportEvent } from "@/lib/support-log";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.campaignId !== "string" || typeof body.sessionId !== "string" ||
      typeof body.token !== "string" || !isValidPublicIdentifier(body.campaignId) ||
      !isValidPublicIdentifier(body.sessionId)) {
    return NextResponse.json({ error: "Participation invalide." }, { status: 400 });
  }
  if (!verifyParticipationToken(body.token, body.campaignId, body.sessionId)) {
    return NextResponse.json({ error: "Participation non autorisée." }, { status: 403 });
  }
  try {
    await assertPersistentPublicRateLimit(request, {
      key: `draw-played:${body.sessionId}`, limit: 12, windowMs: 60 * 1000,
    });
    const recorded = await recordDrawSessionParticipation(body.campaignId, body.sessionId);
    if (!recorded) return NextResponse.json({ error: "Session indisponible." }, { status: 409 });
    return NextResponse.json({ recorded: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logSupportEvent("error", "draw_participation_failed", {
      campaignId: body.campaignId, sessionId: body.sessionId,
    });
    const retryAfter = getPublicRetryAfter(error);
    return NextResponse.json({ error: "Enregistrement de la participation indisponible." }, {
      status: getPublicErrorStatus(error) === 429 ? 429 : 503,
      headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
    });
  }
}
