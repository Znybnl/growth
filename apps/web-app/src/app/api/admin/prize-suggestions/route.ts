import { NextResponse } from "next/server";

import { assertSaasAdminEmail } from "@/lib/admin";
import { getAuthenticatedSession } from "@/lib/auth";
import {
  createPrizeSuggestion,
  getAllPrizeSuggestions,
  validatePrizeSuggestionInput,
} from "@/lib/prize-suggestion-repository";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";

export async function GET() {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    assertSaasAdminEmail(session.user.email);
    return NextResponse.json({ suggestions: await getAllPrizeSuggestions() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lecture impossible." },
      { status: error instanceof Error && error.message.includes("administration") ? 403 : 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();
    if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    assertSaasAdminEmail(session.user.email);
    const body = await request.json();
    const suggestion = await createPrizeSuggestion(validatePrizeSuggestionInput(body));
    return NextResponse.json({ suggestion }, { status: 201 });
  } catch (error) {
    const status = getRequestSecurityErrorStatus(error) === 403 ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Création impossible." },
      { status },
    );
  }
}
