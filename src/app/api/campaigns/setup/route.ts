import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { parseCampaignSetupInput } from "@/lib/merchant-input";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { updateCampaignSetup } from "@/lib/store";

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = parseCampaignSetupInput(await request.json(), session.merchant.id);

    const campaign = await updateCampaignSetup(body);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("Campaign setup failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sauvegarde impossible." },
      { status: getRequestSecurityErrorStatus(error) === 403 ? 403 : 500 },
    );
  }
}
