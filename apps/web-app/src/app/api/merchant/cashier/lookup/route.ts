import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { findMerchantLeadByRedemptionCode } from "@/lib/store";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { isCashierCodeCandidate, normalizeCashierCode, cashierStatusMessage } from "@/lib/cashier";
import { logSupportEvent } from "@/lib/support-log";
import { assertMerchantRole } from "@/lib/merchant-access";

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
  } catch (error) {
    logSupportEvent("error", "cashier_lookup_failed", {
      error: error instanceof Error ? error.message : "Cashier lookup failed",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recherche impossible" },
      { status: getRequestSecurityErrorStatus(error) },
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
    const body = (await request.json()) as { code?: string };
    const code = normalizeCashierCode(body.code ?? "");

    if (!isCashierCodeCandidate(code)) {
      return NextResponse.json(
        { error: "Saisissez un code de retrait valide.", status: "invalid" },
        { status: 400 },
      );
    }

    const context = await findMerchantLeadByRedemptionCode(session.merchant.id, code);
    if (!context) {
      return NextResponse.json(
        { error: cashierStatusMessage("invalid"), status: "invalid" },
        { status: 404 },
      );
    }

    return NextResponse.json({ context }, { status: 200 });
  } catch (error) {
    logSupportEvent("error", "cashier_lookup_failed", {
      error: error instanceof Error ? error.message : "Cashier lookup failed",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recherche impossible" },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
