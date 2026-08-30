import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { syncMerchantContactToBrevo } from "@/lib/brevo";
import { parseMerchantAccountSettingsInput } from "@/lib/merchant-input";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { updateMerchantAccount } from "@/lib/store";

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const payload = (await request.json()) as { locationId?: unknown } & Record<string, unknown>;
    const locationId = typeof payload.locationId === "string" && payload.locationId.trim()
      ? payload.locationId.trim()
      : session.merchant.id;
    const canUpdateLocation = session.locations.some(({ merchant }) => merchant.id === locationId);

    if (!canUpdateLocation) {
      return NextResponse.json({ error: "Accès à cet établissement refusé." }, { status: 403 });
    }

    const body = parseMerchantAccountSettingsInput(payload);
    const account = await updateMerchantAccount(session.user.id, body, locationId);
    await syncMerchantContactToBrevo({
      merchant: account.merchant,
      user: account.user,
      source: "account",
    });

    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise a jour impossible." },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
