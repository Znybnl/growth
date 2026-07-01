import { NextResponse } from "next/server";

import { updateAffiliateAccountSettings } from "@/lib/affiliate-repository";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAuthenticatedSession } from "@/lib/auth";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();

    if (!session || !isSaasAdminEmail(session.user.email)) {
      return NextResponse.json({ error: "Accès réservé à l'administration." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: "active" | "disabled";
      commissionRatePercent?: number;
      commissionDurationMonths?: number;
    };

    await updateAffiliateAccountSettings({
      accountId: id,
      status: body.status ?? "disabled",
      commissionRatePercent: Number(body.commissionRatePercent ?? 40),
      commissionDurationMonths: Number(body.commissionDurationMonths ?? 12),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise à jour impossible." },
      { status: getRequestSecurityErrorStatus(error) === 403 ? 403 : 400 },
    );
  }
}
