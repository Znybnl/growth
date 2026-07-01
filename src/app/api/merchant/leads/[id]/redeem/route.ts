import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { logSupportEvent } from "@/lib/support-log";
import { getMerchantLeads, redeemLeadPrize } from "@/lib/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedMutationRequest(_request);
    const session = await requireAuthenticatedSession();
    const { id } = await params;
    const leads = await getMerchantLeads(session.merchant.id);
    const lead = leads.find((item) => item.id === id);

    if (!lead) {
      return NextResponse.json({ error: "Gain introuvable" }, { status: 404 });
    }

    const updatedLead = await redeemLeadPrize(id);
    logSupportEvent("info", "prize_redeemed", {
      merchantId: session.merchant.id,
      leadId: id,
      status: updatedLead.status,
    });
    await captureProductEvent(
      "prize_redeemed",
      merchantDistinctId(session.merchant.id, session.user.id),
      {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
        leadId: id,
        campaignId: updatedLead.campaignId,
        source: "merchant",
      },
    );

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    logSupportEvent("error", "prize_redeem_failed", {
      error: error instanceof Error ? error.message : "Retrait impossible",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Retrait impossible" },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
