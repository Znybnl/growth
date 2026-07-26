import { NextResponse } from "next/server";

import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { assertPersistentPublicRateLimit } from "@/lib/public-security-store";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { logSupportEvent } from "@/lib/support-log";
import {
  getPublicRedemptionContext,
  redeemMerchantLeadPrizeFromCashier,
  verifyPublicRedemptionPin,
} from "@/lib/store";

type RedemptionRouteContext = {
  params: Promise<{ code: string }>;
};

function decodeCode(value: string) {
  try {
    return decodeURIComponent(value).trim().toUpperCase();
  } catch {
    return value.trim().toUpperCase();
  }
}

function errorStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("trop de tentatives")) return 429;
  if (message.includes("pin")) return 401;
  if (message.includes("introuvable")) return 404;
  if (message.includes("achat") || message.includes("disponible") || message.includes("retir")) return 409;
  return getRequestSecurityErrorStatus(error);
}

export async function GET(_request: Request, { params }: RedemptionRouteContext) {
  const { code } = await params;
  const context = await getPublicRedemptionContext(decodeCode(code));

  if (!context) {
    return NextResponse.json({ error: "Ce code de retrait est introuvable." }, { status: 404 });
  }

  return NextResponse.json({ context }, { status: 200, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: RedemptionRouteContext) {
  try {
    assertTrustedMutationRequest(request);
    const { code: rawCode } = await params;
    const code = decodeCode(rawCode);
    const body = (await request.json().catch(() => null)) as {
      mode?: "authorize" | "redeem";
      pin?: string;
      purchaseConfirmed?: boolean;
      idempotencyKey?: string;
    } | null;
    const mode = body?.mode === "redeem" ? "redeem" : "authorize";
    const pin = body?.pin?.trim() ?? "";
    const context = await getPublicRedemptionContext(code);

    if (!context?.leadId || !context.merchantId) {
      return NextResponse.json({ error: "Ce code de retrait est introuvable." }, { status: 404 });
    }

    await assertPersistentPublicRateLimit(request, {
      key: `redemption-pin:${context.merchantId}`,
      limit: 8,
      windowMs: 5 * 60 * 1000,
    });

    const pinIsValid = await verifyPublicRedemptionPin(context.merchantId, pin);
    if (!pinIsValid) {
      return NextResponse.json(
        { error: "PIN commerçant incorrect. Demandez le PIN à un responsable du commerce." },
        { status: 401 },
      );
    }

    if (mode === "authorize") {
      if (context.status !== "available") {
        return NextResponse.json({ error: "Ce lot ne peut pas être validé dans son état actuel.", context }, { status: 409 });
      }

      return NextResponse.json({ authorized: true, context }, { status: 200 });
    }

    const redeemed = await redeemMerchantLeadPrizeFromCashier({
      leadId: context.leadId,
      merchantId: context.merchantId,
      operatorUserId: "express-pin",
      purchaseConfirmed: Boolean(body?.purchaseConfirmed),
      idempotencyKey: body?.idempotencyKey?.trim() || crypto.randomUUID(),
    });

    logSupportEvent("info", "express_redemption_completed", {
      merchantId: context.merchantId,
      campaignId: context.campaignId,
      leadId: context.leadId,
      redemptionCode: context.redemptionCode,
    });
    void captureProductEvent(
      "express_redemption_completed",
      merchantDistinctId(context.merchantId, "express-pin"),
      {
        merchantId: context.merchantId,
        campaignId: context.campaignId,
        leadId: context.leadId,
        source: "express_pin",
      },
    );

    return NextResponse.json({ redeemed: true, context: { ...context, ...redeemed, status: "redeemed" } }, { status: 200 });
  } catch (error) {
    logSupportEvent("error", "express_redemption_failed", {
      error: error instanceof Error ? error.message : "Express redemption failed",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "La validation du retrait a échoué." },
      { status: errorStatus(error) },
    );
  }
}
