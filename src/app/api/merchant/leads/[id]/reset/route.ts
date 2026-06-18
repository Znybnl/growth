import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { logSupportEvent } from "@/lib/support-log";
import { getMerchantLeads, resetLeadPrize } from "@/lib/store";

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
    const updatedLead = await resetLeadPrize(id);
    logSupportEvent("info", "prize-reset-from-merchant", {
      merchantId: session.merchant.id,
      leadId: id,
      status: updatedLead.status,
    });

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    logSupportEvent("error", "prize-reset-merchant-failed", {
      merchantId: session.merchant.id,
      leadId: id,
      error: error instanceof Error ? error.message : "Réinitialisation impossible",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Réinitialisation impossible" },
      { status: 400 },
    );
  }
}
