import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import {
  getPublicErrorStatus,
  getPublicRetryAfter,
  isDailyParticipationError,
  isValidPublicEmail,
  isValidPublicFirstName,
  isValidPublicIdentifier,
  normalizePublicEmail,
  normalizePublicFirstName,
} from "@/lib/public-api";
import { assertPersistentPublicRateLimit } from "@/lib/public-security-store";
import { captureProductEvent } from "@/lib/product-analytics";
import { sendRewardEmail } from "@/lib/reward-email";
import { finalizeDrawSession } from "@/lib/store";
import { rememberPublicCampaignParticipant } from "@/lib/store";
import { logSupportEvent } from "@/lib/support-log";
import { DrawResult, FinalizeDrawSessionRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as FinalizeDrawSessionRequest;
  const sessionId = body.sessionId?.trim() ?? "";
  const firstName = normalizePublicFirstName(body.firstName ?? "");
  const email = normalizePublicEmail(body.email ?? "");

  if (
    !isValidPublicIdentifier(sessionId) ||
    !isValidPublicFirstName(firstName) ||
    !isValidPublicEmail(email)
  ) {
    return NextResponse.json(
      { error: "sessionId, firstName and email are required" },
      { status: 400 },
    );
  }

  try {
    await assertPersistentPublicRateLimit(request, {
      key: `draw-finalize:${sessionId}:${email}`,
      limit: 6,
      windowMs: 10 * 60 * 1000,
    });

    const result = (await finalizeDrawSession({
      ...body,
      sessionId,
      firstName,
      email,
    })) as DrawResult;
    logSupportEvent("info", "draw_finalized", {
      campaignId: result.campaign.id,
      leadId: result.lead.id,
      email: result.lead.email,
      prizeId: result.lead.prizeId,
      status: result.lead.status,
    });
    await captureProductEvent("draw_finalized", `public:${result.campaign.id}`, {
      campaignId: result.campaign.id,
      gameType: result.campaign.gameType,
      leadId: result.lead.id,
      hasPrize: Boolean(result.prize),
      leadStatus: result.lead.status,
    });

    let participantToken: string | null = null;
    try {
      participantToken = await rememberPublicCampaignParticipant(
        result.campaign.id,
        result.lead.email,
        randomUUID(),
      );
    } catch (identityError) {
      logSupportEvent("error", "player_identity_failed", {
        campaignId: result.campaign.id,
        leadId: result.lead.id,
        error: identityError instanceof Error ? identityError.message : "Player identity failed",
      });
    }

    if (result.prize && result.lead.redemptionCode) {
      try {
        await sendRewardEmail({
          origin: new URL(request.url).origin,
          campaignId: result.campaign.id,
          leadId: result.lead.id,
          merchantName: result.campaign.merchantName,
          campaignTitle: result.campaign.title,
          leadFirstName: result.lead.firstName,
          leadEmail: result.lead.email,
          prizeLabel: result.prize.label,
          usageConditions: result.prize.usageConditions,
          redemptionCode: result.lead.redemptionCode,
          rewardWonAt: result.lead.createdAt,
          rewardAvailableAt: result.lead.rewardAvailableAt,
          rewardExpiresAt: result.lead.rewardExpiresAt,
          purchaseRequired: result.campaign.rewardRules.purchaseRequired,
          emailSettings: result.campaign.presentation.email,
        });
      } catch (emailError) {
        logSupportEvent("error", "reward_email_failed", {
          campaignId: result.campaign.id,
          leadId: result.lead.id,
          error: emailError instanceof Error ? emailError.message : "Envoi e-mail impossible",
        });
      }
    }

    const response = NextResponse.json(result, { status: 201 });
    if (participantToken) {
      response.cookies.set(
        `okado_player_${encodeURIComponent(result.campaign.id).slice(0, 80)}`,
        participantToken,
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 90 * 24 * 60 * 60,
        },
      );
    }
    return response;
  } catch (error) {
    logSupportEvent("error", "draw_finalize_failed", {
      sessionId,
      email,
      error: error instanceof Error ? error.message : "Draw finalize failed",
    });

    const retryAfter = getPublicRetryAfter(error);
    const message = error instanceof Error ? error.message : "Draw finalize failed";
    const participationBlocked =
      isDailyParticipationError(error) || /déjà participé|deja participe/i.test(message);
    return NextResponse.json(
      {
        error: message,
        code: participationBlocked ? "participation_cooldown" : undefined,
      },
      {
        status: participationBlocked ? 409 : getPublicErrorStatus(error),
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      },
    );
  }
}
