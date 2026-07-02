import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { getMerchantDashboard, updatePrizeStock } from "@/lib/store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedMutationRequest(request);
    const session = await requireAuthenticatedSession();
    const { id } = await params;
    const body = (await request.json()) as { remainingQuantity?: number | null };

    if (
      body.remainingQuantity !== null &&
      (typeof body.remainingQuantity !== "number" ||
        Number.isNaN(body.remainingQuantity) ||
        body.remainingQuantity < 0)
    ) {
      return NextResponse.json({ error: "Stock invalide" }, { status: 400 });
    }

    const dashboard = await getMerchantDashboard(session.merchant.id, session.merchant);
    const allowed = dashboard.campaigns.some((campaign) =>
      campaign.prizes.some((prize) => prize.id === id),
    );

    if (!allowed) {
      return NextResponse.json({ error: "Dotation introuvable" }, { status: 404 });
    }

    const prize = await updatePrizeStock(id, body.remainingQuantity ?? null);
    return NextResponse.json({ prize });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Mise à jour impossible",
      },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
