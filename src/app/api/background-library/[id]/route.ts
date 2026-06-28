import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { assertSaasAdminEmail } from "@/lib/admin";
import { deleteBackgroundAsset } from "@/lib/background-library-repository";

type BackgroundLibraryRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: BackgroundLibraryRouteContext,
) {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    assertSaasAdminEmail(session.user.email);
    const { id } = await context.params;
    await deleteBackgroundAsset(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const isForbidden =
      error instanceof Error && error.message === "Accès réservé à l'administration.";

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Suppression impossible." },
      { status: isForbidden ? 403 : 500 },
    );
  }
}
