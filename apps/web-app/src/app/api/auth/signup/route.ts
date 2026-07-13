import { NextResponse } from "next/server";

import { createAffiliateReferralForMerchant } from "@/lib/affiliate-repository";
import { notifyAdministratorsOfMerchantSignup } from "@/lib/admin-notifications";
import { syncMerchantContactToBrevo } from "@/lib/brevo";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { getPublicErrorStatus } from "@/lib/public-api";
import { assertPersistentPublicRateLimit } from "@/lib/public-security-store";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { createMerchantAccount } from "@/lib/store";
import { createRouteSupabaseClient } from "@/lib/supabase-server-auth";
import { logSupportEvent } from "@/lib/support-log";
import { MerchantSignUpInput } from "@/lib/types";

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

export async function POST(request: Request) {
  const provisionalResponse = NextResponse.json({});

  try {
    assertTrustedMutationRequest(request);
    const body = (await request.json()) as MerchantSignUpInput;
    await assertPersistentPublicRateLimit(request, {
      key: `auth-signup:${body.email?.trim().toLowerCase() ?? "unknown"}`,
      limit: 5,
      windowMs: 30 * 60 * 1000,
    });
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
    await syncMerchantContactToBrevo({
      merchant: session.merchant,
      user: session.user,
      source: "signup",
    });
    try {
      await notifyAdministratorsOfMerchantSignup({
        merchant: session.merchant,
        user: session.user,
        origin: new URL(request.url).origin,
        provider: "email",
      });
      await logSupportEvent("info", "merchant_signup_admin_notified", {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
      });
    } catch (notificationError) {
      await logSupportEvent("warn", "merchant_signup_admin_notification_failed", {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
        error: notificationError instanceof Error ? notificationError.message : "Unknown error",
      });
    }

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
      { status: getRequestSecurityErrorStatus(error) === 403 ? 403 : getPublicErrorStatus(error) },
    );
  }
}
