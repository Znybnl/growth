import { getAuthenticatedSession } from "@/lib/auth";
import { getAffiliateSummaryForMerchant } from "@/lib/affiliate-repository";
import { getMerchantBillingSummary } from "@/lib/billing";
import { syncMerchantBillingFromStripeCustomerIdInSupabase } from "@/lib/merchant-account-repository";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { measureServerStage } from "@/lib/server-performance";
import { getMerchantRedemptionPinStates } from "@/lib/store";

function respond(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return respond({ error: "Authentification requise." }, 401);

    const params = new URL(request.url).searchParams;
    if (params.get("section") === "affiliate") {
      if (!["owner", "admin"].includes(session.user.role ?? "owner")) {
        return respond({ error: "Accès à l’affiliation refusé." }, 403);
      }
      const summary = await measureServerStage("data.account-affiliate", () => getAffiliateSummaryForMerchant(session.merchant));
      return respond({ summary: summary?.account.status === "active" ? summary : null });
    }

    if (params.get("section") === "pin") {
      const locationId = params.get("locationId");
      if (!locationId || !session.locations.some(({ merchant }) => merchant.id === locationId)) {
        return respond({ error: "Accès à cet établissement refusé." }, 403);
      }
      const pin = (await getMerchantRedemptionPinStates([locationId]))[locationId];
      return pin ? respond({ pin }) : respond({ error: "PIN indisponible." }, 404);
    }

    return respond({ error: "Section inconnue." }, 400);
  } catch {
    return respond({ error: "Impossible de charger cette section." }, 503);
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();
    if (!session) return respond({ error: "Authentification requise." }, 401);

    const { merchant } = session;
    const paymentReturn = new URL(request.url).searchParams.get("billing") === "success";
    if (!merchant.stripeCustomerId || (!paymentReturn && (merchant.stripeSubscriptionId || merchant.stripeSubscriptionStatus))) {
      return respond({ billing: getMerchantBillingSummary(merchant), synced: false });
    }

    const customerId = merchant.stripeCustomerId;
    const synced = await measureServerStage("data.account-billing",
      () => syncMerchantBillingFromStripeCustomerIdInSupabase(customerId));
    const billing = getMerchantBillingSummary({
      stripeCustomerId: synced?.stripeCustomerId ?? merchant.stripeCustomerId,
      stripeSubscriptionId: synced?.stripeSubscriptionId ?? merchant.stripeSubscriptionId,
      stripeSubscriptionStatus: synced?.stripeSubscriptionStatus ?? merchant.stripeSubscriptionStatus,
      trialStartDate: synced?.trialStartDate ?? merchant.trialStartDate,
      trialEndDate: synced?.trialEndDate ?? merchant.trialEndDate,
      subscriptionCurrentPeriodEnd: synced?.subscriptionCurrentPeriodEnd ?? merchant.subscriptionCurrentPeriodEnd,
      subscriptionCancelAtPeriodEnd: synced?.subscriptionCancelAtPeriodEnd ?? merchant.subscriptionCancelAtPeriodEnd,
    });
    return respond({ billing, synced: Boolean(synced) });
  } catch (error) {
    return respond({ error: "Impossible d’actualiser l’abonnement." }, getRequestSecurityErrorStatus(error) === 403 ? 403 : 503);
  }
}
