import { NextResponse } from "next/server";

import { redeemLeadPrize } from "@/lib/store";

type RedeemBody = {
  leadId: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RedeemBody;

  if (!body.leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  try {
    const lead = await redeemLeadPrize(body.leadId);
    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Redeem failed" },
      { status: 400 },
    );
  }
}
