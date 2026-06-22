import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { getMerchantDashboard, resetPrizeStock } from "@/lib/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuthenticatedSession();
  const { id } = await params;
  const dashboard = await getMerchantDashboard(session.merchant.id, session.merchant);
  const allowed = dashboard.campaigns.some((campaign) =>
    campaign.prizes.some((prize) => prize.id === id),
  );

  if (!allowed) {
    return NextResponse.json({ error: "Dotation introuvable" }, { status: 404 });
  }

  try {
    const prize = await resetPrizeStock(id);
    return NextResponse.json({ prize });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Réinitialisation impossible",
      },
      { status: 400 },
    );
  }
}
