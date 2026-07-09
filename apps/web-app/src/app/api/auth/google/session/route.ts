import { NextResponse } from "next/server";

import { createAffiliateReferralForMerchant } from "@/lib/affiliate-repository";
import { syncMerchantContactToBrevo } from "@/lib/brevo";
import { authenticateOrProvisionMerchantWithGoogle } from "@/lib/merchant-account-repository";
import { getPublicErrorStatus } from "@/lib/public-api";
import { assertPersistentPublicRateLimit } from "@/lib/public-security-store";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { createRouteSupabaseClient } from "@/lib/supabase-server-auth";

type GoogleSessionBody = {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  referralCode?: string;
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");

  return { firstName, lastName };
}

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const body = (await request.json()) as GoogleSessionBody;
    const provisionalResponse = NextResponse.json({});
    const supabase = createRouteSupabaseClient({
      request,
      response: provisionalResponse,
    });
    const { data, error } = await supabase.auth.getUser();
    const supabaseUser = data.user;
    const email = supabaseUser?.email?.trim().toLowerCase() ?? "";

    if (!email) {
      return NextResponse.json(
        { error: error?.message ?? "Session Google introuvable." },
        { status: 401 },
      );
    }

    await assertPersistentPublicRateLimit(request, {
      key: `auth-google-session:${email}`,
      limit: 8,
      windowMs: 10 * 60 * 1000,
    });

    const metadata = supabaseUser?.user_metadata ?? {};
    const fullName =
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
          ? metadata.name
          : body.fullName?.trim() ?? "";
    const { firstName, lastName } = splitName(fullName);

    const session = await authenticateOrProvisionMerchantWithGoogle({
      email,
      firstName:
        typeof metadata.given_name === "string"
          ? metadata.given_name
          : body.firstName?.trim() || firstName,
      lastName:
        typeof metadata.family_name === "string"
          ? metadata.family_name
          : body.lastName?.trim() || lastName,
      fullName,
    });

    if (body.referralCode?.trim()) {
      await createAffiliateReferralForMerchant({
        referredMerchantId: session.merchant.id,
        referralCode: body.referralCode,
        source: "google_signup",
      });
    }
    await syncMerchantContactToBrevo({
      merchant: session.merchant,
      user: session.user,
      source: "google",
    });

    const response = NextResponse.json({
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

    for (const cookie of provisionalResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connexion Google impossible." },
      { status: getRequestSecurityErrorStatus(error) === 403 ? 403 : getPublicErrorStatus(error) },
    );
  }
}
