import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { getMerchantWorkspaceContext } from "@/lib/store";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Requête refusée." },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }

  const session = await requireAuthenticatedSession();
  try {
    const body = (await request.json()) as { locationId?: string };
    const locationId = body.locationId?.trim();
    if (!locationId) return NextResponse.json({ error: "Site invalide." }, { status: 400 });
    const context = await getMerchantWorkspaceContext(session.user.id, session.merchant);
    const allowed = context.locations.some(({ merchant }) => merchant.id === locationId);
    if (!allowed) return NextResponse.json({ error: "Accès à ce site refusé." }, { status: 403 });
    const response = NextResponse.json({ locationId });
    response.cookies.set("okado_active_location", locationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Le site n'a pas pu être sélectionné." },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}

