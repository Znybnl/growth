import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { logSupportEvent } from "@/lib/support-log";
import { getMerchantLeads, redeemLeadPrize } from "@/lib/store";

type RedeemBody = {
  leadId: string;
};

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  const body = (await request.json()) as RedeemBody;

  if (!body.leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  try {
    const leads = await getMerchantLeads(session.merchant.id);
    const existingLead = leads.find((item) => item.id === body.leadId);

    if (!existingLead) {
      return NextResponse.json({ error: "Gain introuvable" }, { status: 404 });
    }

    const updatedLead = await redeemLeadPrize(body.leadId);
    logSupportEvent("info", "prize-redeemed-from-public", {
      merchantId: session.merchant.id,
      leadId: body.leadId,
      status: updatedLead.status,
    });

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    logSupportEvent("error", "prize-redeem-public-failed", {
      merchantId: session.merchant.id,
      leadId: body.leadId,
      error: error instanceof Error ? error.message : "Redeem failed",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Redeem failed" },
      { status: 400 },
    );
  }
}

