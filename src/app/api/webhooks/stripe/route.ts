import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  createAffiliateCommissionFromPaidInvoice,
  markAffiliateReferralCanceled,
  voidAffiliateCommissionByInvoice,
} from "@/lib/affiliate-repository";
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

function getInvoiceIdFromCharge(charge: Stripe.Charge) {
  const chargeWithInvoice = charge as Stripe.Charge & {
    invoice?: string | { id?: string } | null;
  };

  return typeof chargeWithInvoice.invoice === "string"
    ? chargeWithInvoice.invoice
    : chargeWithInvoice.invoice?.id;
}

async function getInvoiceIdFromRefund(refund: Stripe.Refund) {
  const chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge?.id;

  if (!chargeId) {
    return undefined;
  }

  const stripe = getStripeClient();
  const charge = await stripe.charges.retrieve(chargeId);
  return getInvoiceIdFromCharge(charge);
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
        await markAffiliateReferralCanceled(merchantId);
        break;
        }
      case "invoice.paid":
        {
          const invoice = event.data.object as Stripe.Invoice;
          merchantId = await markInvoiceState(invoice);
          await createAffiliateCommissionFromPaidInvoice(invoice, merchantId);
          break;
        }
      case "invoice.payment_failed":
        merchantId = await markInvoiceState(event.data.object as Stripe.Invoice);
        break;
      case "charge.refunded":
        {
          const invoiceId = getInvoiceIdFromCharge(event.data.object as Stripe.Charge);
          await voidAffiliateCommissionByInvoice(invoiceId, "charge_refunded");
          break;
        }
      case "refund.created":
        {
          const invoiceId = await getInvoiceIdFromRefund(event.data.object as Stripe.Refund);
          await voidAffiliateCommissionByInvoice(invoiceId, "refund_created");
          break;
        }
      case "credit_note.created":
        {
          const creditNote = event.data.object as Stripe.CreditNote;
          const invoiceId =
            typeof creditNote.invoice === "string" ? creditNote.invoice : creditNote.invoice?.id;
          await voidAffiliateCommissionByInvoice(invoiceId, "credit_note_created");
          break;
        }
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
