import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { redeemMerchantLeadPrizeFromCashier } from "@/lib/store";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { logSupportEvent } from "@/lib/support-log";
import { assertMerchantRole } from "@/lib/merchant-access";

function redemptionErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("déjà") || message.includes("deja")) return 409;
  if (message.includes("expir")) return 410;
  if (message.includes("pas encore")) return 425;
  if (message.includes("achat")) return 422;
  if (message.includes("introuvable")) return 404;
  return getRequestSecurityErrorStatus(error);
}

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
  } catch (error) {
    logSupportEvent("error", "cashier_redemption_failed", {
      error: error instanceof Error ? error.message : "Cashier redemption failed",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Le retrait n'a pas pu être validé." },
      { status: redemptionErrorStatus(error) },
    );
  }

  // Keep authentication redirects intact: do not swallow Next.js redirect errors
  // in the operational error handler below.
  const session = await requireAuthenticatedSession();
  try {
    assertMerchantRole(session.user.role, ["owner", "admin", "manager", "cashier"]);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accès refusé." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      leadId?: string;
      purchaseConfirmed?: boolean;
      idempotencyKey?: string;
    };

    const leadId = body.leadId?.trim() ?? "";
    const idempotencyKey = body.idempotencyKey?.trim() ?? "";
    if (!leadId || !idempotencyKey) {
      return NextResponse.json({ error: "Le gain et la clé de validation sont requis." }, { status: 400 });
    }

    const context = await redeemMerchantLeadPrizeFromCashier({
      leadId,
      merchantId: session.merchant.id,
      operatorUserId: session.user.id,
      purchaseConfirmed: Boolean(body.purchaseConfirmed),
      idempotencyKey,
    });

    logSupportEvent("info", "cashier_redemption_completed", {
      merchantId: session.merchant.id,
      merchantUserId: session.user.id,
      leadId,
      campaignId: context.campaignId,
      redemptionCode: context.redemptionCode,
      purchaseConfirmed: Boolean(body.purchaseConfirmed),
    });
    void captureProductEvent(
      "cashier_redemption_completed",
      merchantDistinctId(session.merchant.id, session.user.id),
      {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
        leadId,
        campaignId: context.campaignId,
        purchaseConfirmed: Boolean(body.purchaseConfirmed),
      },
    );

    return NextResponse.json({ context }, { status: 200 });
  } catch (error) {
    logSupportEvent("error", "cashier_redemption_failed", {
      error: error instanceof Error ? error.message : "Cashier redemption failed",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Le retrait n’a pas pu être validé." },
      { status: redemptionErrorStatus(error) },
    );
  }
}

