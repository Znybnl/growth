import { NextResponse } from "next/server";

import { createRouteSupabaseClient } from "@/lib/supabase-server-auth";

function sanitizeNextPath(rawNext: string | null) {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) {
    return "/";
  }

  return rawNext;
}

function buildErrorRedirect(origin: string, message: string) {
  const redirectUrl = new URL("/connexion", origin);
  redirectUrl.searchParams.set("error", "google_oauth");
  redirectUrl.searchParams.set("reason", message);
  return redirectUrl;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const referralCode = requestUrl.searchParams.get("ref")?.trim() ?? "";
  const callbackUrl = new URL("/api/auth/google/callback", origin);
  callbackUrl.searchParams.set("next", next);
  if (referralCode) {
    callbackUrl.searchParams.set("ref", referralCode);
  }

  const provisionalResponse = NextResponse.redirect(callbackUrl);

  try {
    const supabase = createRouteSupabaseClient({
      request,
      response: provisionalResponse,
    });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error || !data.url) {
      throw error ?? new Error("Redirection Google impossible.");
    }

    const response = NextResponse.redirect(data.url);
    for (const cookie of provisionalResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
    return response;
  } catch (error) {
    return NextResponse.redirect(
      buildErrorRedirect(
        origin,
        error instanceof Error ? error.message : "Connexion Google impossible.",
      ),
    );
  }
}
