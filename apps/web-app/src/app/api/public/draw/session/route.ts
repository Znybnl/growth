import { NextResponse } from "next/server";

import {
  assertPublicRateLimit,
  getPublicErrorStatus,
  getPublicRetryAfter,
  isValidPublicIdentifier,
} from "@/lib/public-api";
import { captureProductEvent } from "@/lib/product-analytics";
import { createDrawSession } from "@/lib/store";
import { logSupportEvent } from "@/lib/support-log";
import { CreateDrawSessionRequest, CreateDrawSessionResult } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as CreateDrawSessionRequest;

  if (!isValidPublicIdentifier(body.campaignId)) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  try {
    assertPublicRateLimit(request, {
      key: `draw-session:${body.campaignId.trim()}`,
      limit: 12,
      windowMs: 60 * 1000,
    });

    const result = (await createDrawSession(body)) as CreateDrawSessionResult;
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

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logSupportEvent("error", "draw_start_failed", {
      campaignId: body.campaignId,
      error: error instanceof Error ? error.message : "Draw session failed",
    });

    const retryAfter = getPublicRetryAfter(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Draw session failed" },
      {
        status: getPublicErrorStatus(error),
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      },
    );
  }
}
