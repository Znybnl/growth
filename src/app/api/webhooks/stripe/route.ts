import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  findMerchantByStripeCustomerIdInSupabase,
  markMerchantSubscriptionCanceledInSupabase,
  updateMerchantBillingFromStripeSubscriptionInSupabase,
} from "@/lib/merchant-account-repository";
import { captureProductEvent } from "@/lib/product-analytics";
import { logSupportEvent } from "@/lib/support-log";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) {
    return undefined;
  }

  return typeof customer === "string" ? customer : customer.id;
}

async function resolveMerchantIdFromSession(session: Stripe.Checkout.Session) {
  const metadataMerchantId =
    typeof session.metadata?.merchantId === "string" ? session.metadata.merchantId : undefined;

  if (metadataMerchantId) {
    return metadataMerchantId;
  }

  if (typeof session.client_reference_id === "string" && session.client_reference_id) {
    return session.client_reference_id;
  }

  if (typeof session.customer === "string") {
    const merchant = await findMerchantByStripeCustomerIdInSupabase(session.customer);
    return merchant?.id;
  }

  return undefined;
}

async function syncFromSubscriptionId(subscriptionId: string) {
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = getCustomerId(subscription.customer);
  if (!customerId) {
    throw new Error("Client Stripe introuvable sur l'abonnement.");
  }
  const merchant = await findMerchantByStripeCustomerIdInSupabase(customerId);

  if (!merchant) {
    throw new Error("Marchand Stripe introuvable.");
  }

  await updateMerchantBillingFromStripeSubscriptionInSupabase(merchant.id, subscription);
  return merchant.id;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const merchantId = await resolveMerchantIdFromSession(session);

  if (!merchantId) {
    throw new Error("Impossible d'identifier le marchand après le checkout.");
  }

  if (!session.subscription || typeof session.subscription !== "string") {
    throw new Error("Aucun abonnement Stripe trouvé sur la session checkout.");
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  await updateMerchantBillingFromStripeSubscriptionInSupabase(merchantId, subscription);
  return merchantId;
}

async function markInvoiceState(invoice: Stripe.Invoice) {
  const subscription =
    invoice.parent?.subscription_details?.subscription &&
    typeof invoice.parent.subscription_details.subscription === "string"
      ? invoice.parent.subscription_details.subscription
      : undefined;

  if (!subscription) {
    return undefined;
  }

  return syncFromSubscriptionId(subscription);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature Stripe manquante" }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
    let merchantId: string | undefined;

    switch (event.type) {
      case "checkout.session.completed":
        merchantId = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        merchantId = await syncFromSubscriptionId(
          (event.data.object as Stripe.Subscription).id,
        );
        break;
      case "customer.subscription.deleted":
        {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = getCustomerId(subscription.customer);
        await markMerchantSubscriptionCanceledInSupabase(
          subscription.id,
        );
        merchantId =
          customerId
            ? (await findMerchantByStripeCustomerIdInSupabase(customerId))?.id ?? undefined
            : undefined;
        break;
        }
      case "invoice.paid":
      case "invoice.payment_failed":
        merchantId = await markInvoiceState(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }

    if (merchantId) {
      await captureProductEvent("billing_webhook_received", merchantId, {
        merchantId,
        stripeEventType: event.type,
      });

      if (["checkout.session.completed", "invoice.paid", "customer.subscription.updated"].includes(event.type)) {
        await captureProductEvent("subscription_active", merchantId, {
          merchantId,
          stripeEventType: event.type,
        });
      }
    }

    logSupportEvent("info", "stripe_webhook_received", {
      type: event.type,
      merchantId,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    logSupportEvent("error", "stripe_webhook_invalid", {
      error: error instanceof Error ? error.message : "Webhook Stripe invalide",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook Stripe invalide" },
      { status: 400 },
    );
  }
}
