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
import { createDrawSession, getPublicCampaign } from "@/lib/store";
import { createPreviewDrawSession } from "@/lib/store";
import { issuePreviewSessionToken, verifyPreviewAccessToken } from "@/lib/preview-token";
import { logSupportEvent } from "@/lib/support-log";
import { issueParticipationToken, verifyMarketingClickToken, publicPlayerToken } from "@/lib/participation-token";
import { requiresGoogleClick } from "@/lib/google-click-policy";
import { CreateDrawSessionRequest, CreateDrawSessionResult } from "@/lib/types";

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Draw session failed";
}

type PreparationStage = "parse" | "rateLimit" | "campaignLookup" | "dailyLock" | "sessionCreation" | "analytics" | "releaseLock";
type PreparationTiming = {
  mode: "unknown" | "preview" | "production";
  stage: PreparationStage;
  stages: Partial<Record<PreparationStage, number>>;
};

async function measure<T>(timing: PreparationTiming, stage: PreparationStage, work: () => Promise<T>): Promise<T> {
  timing.stage = stage;
  const startedAt = performance.now();
  try {
    return await work();
  } finally {
    timing.stages[stage] = Math.round(performance.now() - startedAt);
  }
}

// One operational measurement per request, including refusals and failures.
// Keep this event aggregate-only: no identifiers, tokens, URLs or raw request bodies.
export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  const timing: PreparationTiming = { mode: "unknown", stage: "parse", stages: {} };
  let status = 500;
  try {
    const response = await prepareDrawSession(request, timing);
    status = response.status;
    return response;
  } finally {
    console.info(JSON.stringify({
      event: "okado.draw_preparation", schemaVersion: 1, mode: timing.mode,
      status, totalMs: Math.round(performance.now() - startedAt),
      lastStage: timing.stage, stages: timing.stages,
    }));
  }
}

async function prepareDrawSession(request: NextRequest, timing: PreparationTiming) {
  const preparationStartedAt = performance.now();
  const body = (await measure(timing, "parse", () => request.json())) as CreateDrawSessionRequest;
  timing.mode = body.previewToken ? "preview" : "production";
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
      const rateLimitStartedAt = performance.now();
      await measure(timing, "rateLimit", () => assertPersistentPublicRateLimit(request, {
        key: `preview-draw-session:${campaignId}`,
        limit: 60,
        windowMs: 60 * 1000,
      }));
      const rateLimitMs = Math.round(performance.now() - rateLimitStartedAt);

      const sessionStartedAt = performance.now();
      const result = await measure(timing, "sessionCreation", () => createPreviewDrawSession({ campaignId }));
      const sessionCreationMs = Math.round(performance.now() - sessionStartedAt);
      const previewSessionToken = issuePreviewSessionToken({
        campaignId,
        sessionId: result.session.id,
        prizeId: result.session.prizeId ?? null,
      });
      result.session.previewSessionToken = previewSessionToken;
      result.previewSessionToken = previewSessionToken;
      logSupportEvent("info", "preview_draw_preparation_timing", {
        campaignId,
        totalMs: Math.round(performance.now() - preparationStartedAt),
        rateLimitMs,
        sessionCreationMs,
        mode: "preview",
      });
      return NextResponse.json(
        {
          session: result.session,
          prize: result.prize,
          previewSessionToken: result.previewSessionToken,
        },
        {
          status: 201,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const cookieName = getDailyParticipationCookieName(campaignId);
    assertDailyParticipationCookie(request.cookies.get(cookieName)?.value, campaignId);

    const rateLimitStartedAt = performance.now();
    await measure(timing, "rateLimit", () => assertPersistentPublicRateLimit(request, {
      key: `draw-session:${campaignId}`,
      limit: 12,
      windowMs: 60 * 1000,
    }));
    const rateLimitMs = Math.round(performance.now() - rateLimitStartedAt);

    const campaign = await measure(timing, "campaignLookup", () => getPublicCampaign(campaignId, publicPlayerToken(request, campaignId)));
    if (!campaign) return NextResponse.json({ error: "Animation introuvable." }, { status: 404 });
    const click = typeof body.marketingClickToken === "string"
      ? verifyMarketingClickToken(body.marketingClickToken, campaignId) : null;
    const proposedAction = campaign.actions[0];
    const validClick = click && click.actionId === proposedAction?.id;
    if (requiresGoogleClick(campaign.googleClickRequired, proposedAction?.kind) && !validClick) {
      return NextResponse.json({ error: "Cliquez sur « Écrire un avis » avant de jouer. Vous n’avez aucune obligation de publier un avis.", code: "google_click_required" }, { status: 403 });
    }
    if (body.marketingClickToken && !validClick) {
      return NextResponse.json({ error: "Le clic a expiré. Ouvrez à nouveau l’action avant de jouer." }, { status: 400 });
    }
    const dailyLockStartedAt = performance.now();
    await measure(timing, "dailyLock", () => assertPersistentDailyParticipationLock(request, campaignId));
    const dailyLockMs = Math.round(performance.now() - dailyLockStartedAt);
    dailyLockClaimed = true;
    const sessionStartedAt = performance.now();
    const result = (await measure(timing, "sessionCreation", () => createDrawSession({ campaignId, marketingClickEventId: validClick ? click.eventId : undefined,
      proposedActionId: proposedAction?.id }))) as CreateDrawSessionResult;
    const sessionCreationMs = Math.round(performance.now() - sessionStartedAt);
    const preparationMs = Math.round(performance.now() - preparationStartedAt);
    logSupportEvent("info", "draw_started", {
      campaignId: result.campaign.id,
      sessionId: result.session.id,
      prizeId: result.prize?.id,
      expiresAt: result.session.expiresAt,
      preparationMs,
      rateLimitMs,
      dailyLockMs,
      sessionCreationMs,
    });
    const analyticsStartedAt = performance.now();
    await measure(timing, "analytics", () => captureProductEvent("draw_started", `public:${result.campaign.id}`, {
      campaignId: result.campaign.id,
      gameType: result.campaign.gameType,
      hasPrize: Boolean(result.prize),
      preparationMs,
      rateLimitMs,
      dailyLockMs,
      sessionCreationMs,
    }));
    logSupportEvent("info", "draw_preparation_timing", {
      campaignId: result.campaign.id,
      sessionId: result.session.id,
      totalMs: Math.round(performance.now() - preparationStartedAt),
      rateLimitMs,
      dailyLockMs,
      sessionCreationMs,
      analyticsMs: Math.round(performance.now() - analyticsStartedAt),
      mode: "production",
    });

    const response = NextResponse.json(
      { session: { ...result.session,
        participationToken: issueParticipationToken(campaignId, result.session.id, result.session.expiresAt),
      }, prize: result.prize },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
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
      await measure(timing, "releaseLock", () => releasePersistentDailyParticipationLock(request, campaignId));
    }
    const errorMessage = getErrorMessage(error);
    logSupportEvent("error", "draw_start_failed", {
      campaignId,
      error: errorMessage,
    });

    const retryAfter = getPublicRetryAfter(error);
    return NextResponse.json(
      {
        error: errorMessage,
        code: isDailyParticipationError(error) ? "already_played_today" : undefined,
      },
      {
        status: getPublicErrorStatus(error),
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      },
    );
  }
}
