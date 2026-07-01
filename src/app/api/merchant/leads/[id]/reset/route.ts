import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { logSupportEvent } from "@/lib/support-log";
import { getMerchantLeads, resetLeadPrize } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedMutationRequest(request);
    const session = await requireAuthenticatedSession();
    const { id } = await params;
    const leads = await getMerchantLeads(session.merchant.id);
    const lead = leads.find((item) => item.id === id);

    if (!lead) {
      return NextResponse.json({ error: "Gain introuvable" }, { status: 404 });
    }

    const updatedLead = await resetLeadPrize(id);
    logSupportEvent("info", "prize-reset-from-merchant", {
      merchantId: session.merchant.id,
      leadId: id,
      status: updatedLead.status,
    });

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    logSupportEvent("error", "prize-reset-merchant-failed", {
      error: error instanceof Error ? error.message : "Réinitialisation impossible",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Réinitialisation impossible" },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
