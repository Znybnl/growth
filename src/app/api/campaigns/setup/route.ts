import { NextResponse } from "next/server";

import { updateCampaignSetup } from "@/lib/store";
import { CampaignSetupInput } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as CampaignSetupInput;

  if (!body.merchantId || !body.title || !body.goalType || !body.prizes?.length) {
    return NextResponse.json(
      { error: "merchantId, title, goalType and prizes are required" },
      { status: 400 },
    );
  }

  const campaign = updateCampaignSetup(body);
  return NextResponse.json({ campaign }, { status: 201 });
}
