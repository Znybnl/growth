import { NextRequest, NextResponse } from "next/server";

import {
  assertDailyParticipationCookie,
  getDailyParticipationCookieName,
  getDailyParticipationCookieOptions,
  getDailyParticipationCookieValue,
  getPublicErrorStatus,
  getPublicRetryAfter,
  isDailyParticipationError,
  isValidPublicIdentifier,
} from "@/lib/public-api";
import {
  assertPersistentDailyParticipationLock,
  assertPersistentPublicRateLimit,
  releasePersistentDailyParticipationLock,
} from "@/lib/public-security-store";
import { captureProductEvent } from "@/lib/product-analytics";
import { createDrawSession } from "@/lib/store";
import { createPreviewDrawSession } from "@/lib/store";
import { issuePreviewSessionToken, verifyPreviewAccessToken } from "@/lib/preview-token";
import { logSupportEvent } from "@/lib/support-log";
import { CreateDrawSessionRequest, CreateDrawSessionResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateDrawSessionRequest;
  const campaignId = body.campaignId?.trim() ?? "";
  const previewClaims = body.previewToken
    ? verifyPreviewAccessToken(body.previewToken, campaignId)
    : null;
  let dailyLockClaimed = false;

  if (!isValidPublicIdentifier(campaignId)) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }
  if (body.previewToken && !previewClaims) {
    return NextResponse.json(
      { error: "Le jeton de prévisualisation est invalide ou expiré." },
      { status: 403 },
    );
  }

  try {
    if (previewClaims) {
      await assertPersistentPublicRateLimit(request, {
        key: `preview-draw-session:${campaignId}`,
        limit: 60,
        windowMs: 60 * 1000,
      });

      const result = await createPreviewDrawSession({ campaignId });
      const previewSessionToken = issuePreviewSessionToken({
        campaignId,
        sessionId: result.session.id,
        prizeId: result.session.prizeId ?? null,
      });
      result.session.previewSessionToken = previewSessionToken;
      result.previewSessionToken = previewSessionToken;
      return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
    }

    const cookieName = getDailyParticipationCookieName(campaignId);
    assertDailyParticipationCookie(request.cookies.get(cookieName)?.value, campaignId);

    await assertPersistentPublicRateLimit(request, {
      key: `draw-session:${campaignId}`,
      limit: 12,
      windowMs: 60 * 1000,
    });

    await assertPersistentDailyParticipationLock(request, campaignId);
    dailyLockClaimed = true;
    const result = (await createDrawSession({ campaignId })) as CreateDrawSessionResult;
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
      getDailyParticipationCookieValue(
        campaignId,
        result.campaign.rewardRules.participationIntervalDays,
      ),
      getDailyParticipationCookieOptions(result.campaign.rewardRules.participationIntervalDays),
    );
    return response;
  } catch (error) {
    if (dailyLockClaimed) {
      await releasePersistentDailyParticipationLock(request, campaignId);
    }
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