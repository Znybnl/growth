import { NextResponse } from "next/server";

import { assertSaasAdminEmail } from "@/lib/admin";
import { extendMerchantTrial, AdminTrialExtensionError } from "@/lib/admin-repository";
import { getAuthenticatedSession } from "@/lib/auth";
import { logSupportEvent } from "@/lib/support-log";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";

type RouteContext = {
  params: Promise<{ merchantId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    assertSaasAdminEmail(session.user.email);

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("days" in body) || !Number.isInteger(body.days)) {
      return NextResponse.json(
        { error: "Saisissez un nombre entier de jours à ajouter." },
        { status: 400 },
      );
    }

    const { merchantId } = await params;
    const result = await extendMerchantTrial(merchantId, body.days as number);
    logSupportEvent("info", "admin-trial-extended", {
      merchantId: result.merchantId,
      actorUserId: session.user.id,
      daysAdded: body.days,
      previousTrialEnd: result.previousTrialEnd,
      newTrialEnd: result.trialEndDate,
    });

    return NextResponse.json({ trialEndDate: result.trialEndDate });
  } catch (error) {
    if (error instanceof AdminTrialExtensionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (getRequestSecurityErrorStatus(error) === 403) {
      return NextResponse.json({ error: "Origine de requête non autorisée." }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("administration")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "La demande est invalide." }, { status: 400 });
    }
    console.error("[admin-trial-extension] Échec de prolongation", error);
    return NextResponse.json(
      { error: "La période d’essai n’a pas pu être prolongée." },
      { status: 500 },
    );
  }
}
