import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { syncMerchantContactToBrevo } from "@/lib/brevo";
import { parseMerchantOnboardingInput } from "@/lib/merchant-input";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { updateMerchantOnboarding } from "@/lib/store";

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = parseMerchantOnboardingInput(await request.json());
    const merchant = await updateMerchantOnboarding(session.user.id, body);
    await syncMerchantContactToBrevo({
      merchant,
      user: session.user,
      source: "onboarding",
    });
    await captureProductEvent(
      "onboarding_completed",
      merchantDistinctId(session.merchant.id, session.user.id),
      {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
        industry: merchant.industry,
        restaurantType: merchant.restaurantType,
      },
    );

    return NextResponse.json({ merchant });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onboarding impossible." },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
