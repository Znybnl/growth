import { NextRequest, NextResponse } from "next/server";

import {
  assertDailyParticipationCookie,
  assertDailyParticipationDeviceLock,
  assertPublicRateLimit,
  getDailyParticipationCookieName,
  getDailyParticipationCookieOptions,
  getDailyParticipationCookieValue,
  getPublicErrorStatus,
  getPublicRetryAfter,
  isDailyParticipationError,
  isValidPublicEmail,
  isValidPublicFirstName,
  isValidPublicIdentifier,
  normalizePublicEmail,
  normalizePublicFirstName,
} from "@/lib/public-api";
import { captureProductEvent } from "@/lib/product-analytics";
import { sendRewardEmail } from "@/lib/reward-email";
import { logSupportEvent } from "@/lib/support-log";
import { drawForLead } from "@/lib/store";

type DrawBody = {
  campaignId: string;
  firstName: string;
  email: string;
  marketingConsent: boolean;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as DrawBody;
  const campaignId = body.campaignId?.trim() ?? "";
  const firstName = normalizePublicFirstName(body.firstName ?? "");
  const email = normalizePublicEmail(body.email ?? "");

  if (
    !isValidPublicIdentifier(campaignId) ||
    !isValidPublicFirstName(firstName) ||
    !isValidPublicEmail(email) ||
    !body.marketingConsent
  ) {
    return NextResponse.json(
      { error: "campaignId, firstName, email and marketingConsent are required" },
      { status: 400 },
    );
  }

  try {
    const cookieName = getDailyParticipationCookieName(campaignId);
    assertDailyParticipationCookie(request.cookies.get(cookieName)?.value, campaignId);

    assertPublicRateLimit(request, {
      key: `draw-legacy:${campaignId}:${email}`,
      limit: 6,
      windowMs: 10 * 60 * 1000,
    });

    const result = await drawForLead({
      ...body,
      campaignId,
      firstName,
      email,
    });
    assertDailyParticipationDeviceLock(request, campaignId);
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
      legacyFlow: true,
    });

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
    response.cookies.set(
      cookieName,
      getDailyParticipationCookieValue(campaignId),
      getDailyParticipationCookieOptions(),
    );
    return response;
  } catch (error) {
    logSupportEvent("error", "draw_finalize_failed", {
      campaignId,
      email,
      error: error instanceof Error ? error.message : "Draw failed",
    });

    const retryAfter = getPublicRetryAfter(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Draw failed",
        code: isDailyParticipationError(error) ? "already_played_today" : undefined,
      },
      {
        status: getPublicErrorStatus(error),
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      },
    );
  }
}
