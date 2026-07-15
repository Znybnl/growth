import { NextResponse } from "next/server";

import { assertSaasAdminEmail } from "@/lib/admin";
import { getAuthenticatedSession } from "@/lib/auth";
import {
  deletePrizeSuggestion,
  updatePrizeSuggestion,
  validatePrizeSuggestionInput,
} from "@/lib/prize-suggestion-repository";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";

type Context = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const session = await getAuthenticatedSession();
  if (!session) throw new Error("Authentification requise.");
  assertSaasAdminEmail(session.user.email);
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertTrustedMutationRequest(request);
    await requireAdmin();
    const body = await request.json();
    const { id } = await context.params;
    const suggestion = await updatePrizeSuggestion(id, validatePrizeSuggestionInput(body));
    return NextResponse.json({ suggestion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise à jour impossible." },
      { status: getRequestSecurityErrorStatus(error) === 403 ? 403 : 400 },
    );
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertTrustedMutationRequest(request);
    await requireAdmin();
    const { id } = await context.params;
    await deletePrizeSuggestion(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Suppression impossible." },
      { status: getRequestSecurityErrorStatus(error) === 403 ? 403 : 400 },
    );
  }
}
