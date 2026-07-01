import Stripe from "stripe";

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY manquant.");
  }

  return new Stripe(secretKey, {
    apiVersion: "2026-06-24.dahlia",
  });
}

export function getStripeMonthlyPriceId() {
  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;

  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID_MONTHLY manquant.");
  }

  return priceId;
}

export function getStripeWebhookSecret() {
  const secret = getStripeWebhookSecrets()[0];

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET manquant.");
  }

  return secret;
}

export function getStripeWebhookSecrets() {
  const configuredSecrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_TEST,
    process.env.STRIPE_WEBHOOK_SECRET_LOCAL,
  ]
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(configuredSecrets));
}
