import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { parseMerchantOnboardingInput } from "@/lib/merchant-input";
import { updateMerchantOnboarding } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = parseMerchantOnboardingInput(await request.json());
    const merchant = await updateMerchantOnboarding(session.user.id, body);

    return NextResponse.json({ merchant });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onboarding impossible." },
      { status: 400 },
    );
  }
}
