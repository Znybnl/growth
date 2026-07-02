import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { logSupportEvent } from "@/lib/support-log";
import { getMerchantLeads, redeemLeadPrize } from "@/lib/store";

type RedeemBody = {
  leadId: string;
};

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const session = await requireAuthenticatedSession();
    const body = (await request.json()) as RedeemBody;

    if (!body.leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const leads = await getMerchantLeads(session.merchant.id);
    const existingLead = leads.find((item) => item.id === body.leadId);

    if (!existingLead) {
      return NextResponse.json({ error: "Gain introuvable" }, { status: 404 });
    }

    const updatedLead = await redeemLeadPrize(body.leadId);
    logSupportEvent("info", "prize_redeemed", {
      merchantId: session.merchant.id,
      leadId: body.leadId,
      status: updatedLead.status,
    });
    await captureProductEvent(
      "prize_redeemed",
      merchantDistinctId(session.merchant.id, session.user.id),
      {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
        leadId: body.leadId,
        campaignId: updatedLead.campaignId,
        source: "public_redeem_button",
      },
    );

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    logSupportEvent("error", "prize_redeem_failed", {
      error: error instanceof Error ? error.message : "Redeem failed",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Redeem failed" },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
