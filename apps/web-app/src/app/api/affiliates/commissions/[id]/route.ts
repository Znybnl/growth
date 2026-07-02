import { NextResponse } from "next/server";

import { updateAffiliateCommissionStatus } from "@/lib/affiliate-repository";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAuthenticatedSession } from "@/lib/auth";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { AffiliateCommissionStatus } from "@/lib/types";

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
    const body = (await request.json()) as { status?: AffiliateCommissionStatus };

    if (!body.status) {
      return NextResponse.json({ error: "Statut requis." }, { status: 400 });
    }

    await updateAffiliateCommissionStatus({
      commissionId: id,
      status: body.status,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise à jour impossible." },
      { status: getRequestSecurityErrorStatus(error) === 403 ? 403 : 400 },
    );
  }
}
