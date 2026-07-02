import { NextResponse } from "next/server";

import { createAffiliateReferralForMerchant } from "@/lib/affiliate-repository";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { createMerchantAccount } from "@/lib/store";
import { createRouteSupabaseClient } from "@/lib/supabase-server-auth";
import { MerchantSignUpInput } from "@/lib/types";

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

export async function POST(request: Request) {
  const provisionalResponse = NextResponse.json({});

  try {
    const body = (await request.json()) as MerchantSignUpInput;
    const session = await createMerchantAccount(body);
    const supabase = createRouteSupabaseClient({
      request,
      response: provisionalResponse,
    });
    const signInResult = await supabase.auth.signInWithPassword({
      email: body.email.trim().toLowerCase(),
      password: body.password,
    });

    if (signInResult.error || !signInResult.data.user) {
      throw new Error(signInResult.error?.message ?? "Connexion automatique impossible.");
    }

    const referralCode =
      body.referralCode?.trim() || request.headers.get("x-okado-referral-code") || "";

    if (referralCode) {
      await createAffiliateReferralForMerchant({
        referredMerchantId: session.merchant.id,
        referralCode,
        source: "signup",
      });
    }

    await captureProductEvent(
      "signup_completed",
      merchantDistinctId(session.merchant.id, session.user.id),
      {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
        companyName: session.merchant.companyName,
        authProvider: "email",
      },
    );

    const response = NextResponse.json(
      {
        merchant: session.merchant,
        user: {
          id: session.user.id,
          merchantId: session.user.merchantId,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          email: session.user.email,
          createdAt: session.user.createdAt,
        },
      },
      { status: 201 },
    );

    copyCookies(provisionalResponse, response);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Inscription impossible." },
      { status: 400 },
    );
  }
}
