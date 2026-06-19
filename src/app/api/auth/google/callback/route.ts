import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";
import { authenticateOrProvisionMerchantWithGoogle } from "@/lib/merchant-account-repository";
import { createRouteSupabaseClient } from "@/lib/supabase-server-auth";

function sanitizeNextPath(rawNext: string | null) {
  if (!rawNext || !rawNext.startsWith("/")) {
    return "/";
  }

  return rawNext;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");

  return { firstName, lastName };
}

function buildErrorRedirect(origin: string, message: string) {
  const redirectUrl = new URL("/connexion", origin);
  redirectUrl.searchParams.set("error", "google_oauth");
  redirectUrl.searchParams.set("reason", message);
  return redirectUrl;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const next = sanitizeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const providerError =
    url.searchParams.get("error_description") ||
    url.searchParams.get("error") ||
    "Connexion Google impossible.";

  if (!code) {
    return NextResponse.redirect(buildErrorRedirect(origin, providerError));
  }

  const provisionalResponse = NextResponse.redirect(new URL(next, origin));

  try {
    const supabase = createRouteSupabaseClient({
      request,
      response: provisionalResponse,
    });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user?.email) {
      throw error ?? new Error("Session Google introuvable ou code PKCE invalide.");
    }

    const metadata = data.user.user_metadata ?? {};
    const fullName =
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
          ? metadata.name
          : "";
    const { firstName, lastName } = splitName(fullName);
    const session = await authenticateOrProvisionMerchantWithGoogle({
      email: data.user.email,
      firstName: typeof metadata.given_name === "string" ? metadata.given_name : firstName,
      lastName: typeof metadata.family_name === "string" ? metadata.family_name : lastName,
      fullName,
    });

    const redirectPath = session.merchant.onboardingCompleted ? next : "/onboarding";
    const response = NextResponse.redirect(new URL(redirectPath, origin));

    for (const cookie of provisionalResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }

    response.cookies.set(SESSION_COOKIE, session.user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

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
