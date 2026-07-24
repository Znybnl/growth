import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { getMerchantWorkspaceContext, createMerchantLocation } from "@/lib/store";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";

export async function GET() {
  const session = await requireAuthenticatedSession();
  const context = await getMerchantWorkspaceContext(session.user.id, session.merchant);
  return NextResponse.json({ workspace: context.workspace, locations: context.locations });
}

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
    const body = (await request.json()) as {
      companyName?: string;
      city?: string;
      address?: string;
      timeZone?: string;
    };
    if (!session.workspace?.id) {
      return NextResponse.json({ error: "Votre compte n'est pas encore organisé en workspace." }, { status: 409 });
    }
    const merchant = await createMerchantLocation({
      workspaceId: session.workspace.id,
      merchantUserId: session.user.id,
      companyName: body.companyName ?? "",
      city: body.city ?? "",
      address: body.address,
      timeZone: body.timeZone,
    });
    return NextResponse.json({ merchant }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Le site n'a pas pu être créé." },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}

