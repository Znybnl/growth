import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { isBrevoConfigured, syncExistingContactsToBrevo } from "@/lib/brevo";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";

export async function GET() {
  const session = await getAuthenticatedSession();

  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  return NextResponse.json({
    configured: isBrevoConfigured(),
  });
}

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const summary = await syncExistingContactsToBrevo(session.user.email);

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Synchronisation Brevo impossible." },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
