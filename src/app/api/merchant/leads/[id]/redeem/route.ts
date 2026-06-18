import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { logSupportEvent } from "@/lib/support-log";
import { getMerchantLeads, redeemLeadPrize } from "@/lib/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuthenticatedSession();
  const { id } = await params;
  const leads = await getMerchantLeads(session.merchant.id);
  const lead = leads.find((item) => item.id === id);

  if (!lead) {
    return NextResponse.json({ error: "Gain introuvable" }, { status: 404 });
  }

  try {
    const updatedLead = await redeemLeadPrize(id);
    logSupportEvent("info", "prize-redeemed-from-merchant", {
      merchantId: session.merchant.id,
      leadId: id,
      status: updatedLead.status,
    });

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    logSupportEvent("error", "prize-redeem-merchant-failed", {
      merchantId: session.merchant.id,
      leadId: id,
      error: error instanceof Error ? error.message : "Retrait impossible",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Retrait impossible" },
      { status: 400 },
    );
  }
}

