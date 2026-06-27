import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { logSupportEvent } from "@/lib/support-log";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();

  if (!session.merchant.stripeCustomerId) {
    return NextResponse.json(
      { error: "Aucun client Stripe n'est encore rattaché à ce compte." },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripeClient();
    const origin = new URL(request.url).origin;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: session.merchant.stripeCustomerId,
      return_url: `${origin}/account`,
    });

    logSupportEvent("info", "stripe-portal-created", {
      merchantId: session.merchant.id,
      stripeCustomerId: session.merchant.stripeCustomerId,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    logSupportEvent("error", "stripe-portal-failed", {
      merchantId: session.merchant.id,
      error: error instanceof Error ? error.message : "Stripe portal impossible",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ouverture du portail impossible." },
      { status: 500 },
    );
  }
}
