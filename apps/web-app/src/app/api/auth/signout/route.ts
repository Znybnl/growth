import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import {
  SESSION_LAST_ACTIVITY_COOKIE,
  SESSION_STARTED_COOKIE,
} from "@/lib/session-security";
import { createRouteSupabaseClient } from "@/lib/supabase-server-auth";

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
    const response = NextResponse.json({ ok: true });
    const supabase = createRouteSupabaseClient({
      request,
      response,
    });
    await supabase.auth.signOut();
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(SESSION_STARTED_COOKIE);
    response.cookies.delete(SESSION_LAST_ACTIVITY_COOKIE);

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Déconnexion impossible." },
      { status: getRequestSecurityErrorStatus(error) },
    );
  }
}
