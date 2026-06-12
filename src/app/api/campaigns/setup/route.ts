import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { updateCampaignSetup } from "@/lib/store";
import { CampaignSetupInput } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const body = (await request.json()) as CampaignSetupInput;
  body.merchantId = session.merchant.id;

  if (!body.merchantId || !body.title || !body.goalType || !body.prizes?.length) {
    return NextResponse.json(
      { error: "merchantId, title, goalType and prizes are required" },
      { status: 400 },
    );
  }

  const campaign = await updateCampaignSetup(body);
  return NextResponse.json({ campaign }, { status: 201 });
}
