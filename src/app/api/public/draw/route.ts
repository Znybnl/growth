import { NextResponse } from "next/server";

import { sendRewardEmail } from "@/lib/reward-email";
import { logSupportEvent } from "@/lib/support-log";
import { drawForLead } from "@/lib/store";

type DrawBody = {
  campaignId: string;
  firstName: string;
  email: string;
  marketingConsent: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json()) as DrawBody;

  if (!body.campaignId || !body.firstName || !body.email || !body.marketingConsent) {
    return NextResponse.json(
      { error: "campaignId, firstName, email and marketingConsent are required" },
      { status: 400 },
    );
  }

  try {
    const result = await drawForLead(body);
    logSupportEvent("info", "draw-created", {
      campaignId: result.campaign.id,
      leadId: result.lead.id,
      email: result.lead.email,
      prizeId: result.lead.prizeId,
      status: result.lead.status,
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
          redemptionCode: result.lead.redemptionCode,
          rewardAvailableAt: result.lead.rewardAvailableAt,
          rewardExpiresAt: result.lead.rewardExpiresAt,
          purchaseRequired: result.campaign.rewardRules.purchaseRequired,
          emailSettings: result.campaign.presentation.email,
        });
      } catch (emailError) {
        logSupportEvent("error", "draw-email-failed", {
          campaignId: result.campaign.id,
          leadId: result.lead.id,
          error: emailError instanceof Error ? emailError.message : "Envoi e-mail impossible",
        });
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logSupportEvent("error", "draw-failed", {
      campaignId: body.campaignId,
      email: body.email,
      error: error instanceof Error ? error.message : "Draw failed",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Draw failed" },
      { status: 400 },
    );
  }
}

