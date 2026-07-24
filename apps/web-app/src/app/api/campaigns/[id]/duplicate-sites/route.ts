import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { duplicateCampaignToLocations } from "@/lib/store";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { assertMerchantRole } from "@/lib/merchant-access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertTrustedMutationRequest(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Requête refusée." }, { status: getRequestSecurityErrorStatus(error) });
  }

  const session = await requireAuthenticatedSession();
  try {
    assertMerchantRole(session.user.role, ["owner", "admin", "manager"]);
    const body = (await request.json()) as { locationIds?: string[] };
    const locationIds = Array.isArray(body.locationIds) ? body.locationIds.filter((id): id is string => typeof id === "string") : [];
    const { id } = await params;
    const campaignIds = await duplicateCampaignToLocations(id, session.user.id, session.merchant, locationIds);
    return NextResponse.json({ campaignIds }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Duplication multi-site impossible.";
    return NextResponse.json({ error: message }, { status: message.includes("rôle") ? 403 : getRequestSecurityErrorStatus(error) });
  }
}

