import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { getMerchantCampaignLibrary } from "@/lib/store";

export async function GET() {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const campaigns = await getMerchantCampaignLibrary(session.merchant.id, session.merchant);
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lecture impossible." },
      { status: 500 },
    );
  }
}
