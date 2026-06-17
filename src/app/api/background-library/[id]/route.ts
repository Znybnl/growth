import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
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
    await requireAuthenticatedSession();
    const { id } = await context.params;
    await deleteBackgroundAsset(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Suppression impossible." },
      { status: 500 },
    );
  }
}
