import { NextRequest, NextResponse } from "next/server";

import {
  assertPublicRateLimit,
  assertDailyParticipationCookie,
  assertDailyParticipationDeviceLock,
  getDailyParticipationCookieName,
  getDailyParticipationCookieOptions,
  getDailyParticipationCookieValue,
  getPublicErrorStatus,
  getPublicRetryAfter,
  isDailyParticipationError,
  isValidPublicIdentifier,
} from "@/lib/public-api";
import { captureProductEvent } from "@/lib/product-analytics";
import { createDrawSession } from "@/lib/store";
import { logSupportEvent } from "@/lib/support-log";
import { CreateDrawSessionRequest, CreateDrawSessionResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateDrawSessionRequest;
  const campaignId = body.campaignId?.trim() ?? "";

  if (!isValidPublicIdentifier(campaignId)) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  try {
    const cookieName = getDailyParticipationCookieName(campaignId);
    assertDailyParticipationCookie(request.cookies.get(cookieName)?.value, campaignId);

    assertPublicRateLimit(request, {
      key: `draw-session:${campaignId}`,
      limit: 12,
      windowMs: 60 * 1000,
    });

    const result = (await createDrawSession({ campaignId })) as CreateDrawSessionResult;
    assertDailyParticipationDeviceLock(request, campaignId);
    logSupportEvent("info", "draw_started", {
      campaignId: result.campaign.id,
      sessionId: result.session.id,
      prizeId: result.prize?.id,
      expiresAt: result.session.expiresAt,
    });
    await captureProductEvent("draw_started", `public:${result.campaign.id}`, {
      campaignId: result.campaign.id,
      gameType: result.campaign.gameType,
      hasPrize: Boolean(result.prize),
    });

    const response = NextResponse.json(result, { status: 201 });
    response.cookies.set(
      cookieName,
      getDailyParticipationCookieValue(campaignId),
      getDailyParticipationCookieOptions(),
    );
    return response;
  } catch (error) {
    logSupportEvent("error", "draw_start_failed", {
      campaignId,
      error: error instanceof Error ? error.message : "Draw session failed",
    });

    const retryAfter = getPublicRetryAfter(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Draw session failed",
        code: isDailyParticipationError(error) ? "already_played_today" : undefined,
      },
      {
        status: getPublicErrorStatus(error),
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      },
    );
  }
}
