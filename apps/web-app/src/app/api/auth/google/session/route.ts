import { NextResponse } from "next/server";

import { createAffiliateReferralForMerchant } from "@/lib/affiliate-repository";
import { authenticateOrProvisionMerchantWithGoogle } from "@/lib/merchant-account-repository";

type GoogleSessionBody = {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  referralCode?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GoogleSessionBody;
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!email) {
      return NextResponse.json({ error: "E-mail Google manquant." }, { status: 400 });
    }

    const session = await authenticateOrProvisionMerchantWithGoogle({
      email,
      firstName: body.firstName?.trim() ?? "",
      lastName: body.lastName?.trim() ?? "",
      fullName: body.fullName?.trim() ?? "",
    });

    if (body.referralCode?.trim()) {
      await createAffiliateReferralForMerchant({
        referredMerchantId: session.merchant.id,
        referralCode: body.referralCode,
        source: "google_signup",
      });
    }

    return NextResponse.json({
      merchant: session.merchant,
      user: {
        id: session.user.id,
        merchantId: session.user.merchantId,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        createdAt: session.user.createdAt,
      },
      redirectPath: session.merchant.onboardingCompleted ? "/" : "/onboarding",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connexion Google impossible." },
      { status: 400 },
    );
  }
}
