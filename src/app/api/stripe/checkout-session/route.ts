import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { getMerchantBillingSummary } from "@/lib/billing";
import { setMerchantStripeCustomerIdInSupabase } from "@/lib/merchant-account-repository";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { logSupportEvent } from "@/lib/support-log";
import { getStripeClient, getStripeMonthlyPriceId } from "@/lib/stripe";

function toUnixTimestamp(value?: string) {
  if (!value) {
    return undefined;
  }

  const timestamp = Math.floor(new Date(value).getTime() / 1000);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const billing = getMerchantBillingSummary(session.merchant);

    if (billing.isSubscribed) {
      return NextResponse.json(
        { error: "Un abonnement actif existe déjà pour ce compte." },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    const origin = new URL(request.url).origin;
    const priceId = getStripeMonthlyPriceId();
    let customerId = session.merchant.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.merchant.companyName,
        metadata: {
          merchantId: session.merchant.id,
          merchantUserId: session.user.id,
        },
      });
      customerId = customer.id;
      await setMerchantStripeCustomerIdInSupabase(session.merchant.id, customer.id);
    }

    const trialEnd = billing.isTrialActive ? toUnixTimestamp(billing.trialEndDate) : undefined;
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: session.merchant.id,
      success_url: `${origin}/account?billing=success`,
      cancel_url: `${origin}/account?billing=cancel`,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
      },
      subscription_data: {
        metadata: {
          merchantId: session.merchant.id,
        },
        ...(trialEnd && trialEnd > Math.floor(Date.now() / 1000)
          ? { trial_end: trialEnd }
          : {}),
      },
      allow_promotion_codes: false,
    });

    logSupportEvent("info", "stripe_checkout_created", {
      merchantId: session.merchant.id,
      merchantUserId: session.user.id,
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: checkoutSession.id,
      hasTrial: Boolean(trialEnd),
    });
    await captureProductEvent(
      "stripe_checkout_started",
      merchantDistinctId(session.merchant.id, session.user.id),
      {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: checkoutSession.id,
        hasTrial: Boolean(trialEnd),
      },
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Création du paiement impossible." },
      { status: getRequestSecurityErrorStatus(error) === 403 ? 403 : 500 },
    );
  }
}
