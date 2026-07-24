import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { archiveMerchantLocation } from "@/lib/store";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    if (!session.workspace?.id) {
      return NextResponse.json({ error: "Workspace introuvable." }, { status: 409 });
    }
    const { id } = await params;
    const merchant = await archiveMerchantLocation({
      workspaceId: session.workspace.id,
      merchantUserId: session.user.id,
      merchantId: id,
    });
    return NextResponse.json({ merchant });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Le site n'a pas pu être archivé." },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}

