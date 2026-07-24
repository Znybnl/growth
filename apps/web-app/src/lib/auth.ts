import { redirect } from "next/navigation";
import { cache } from "react";
import { cookies } from "next/headers";

import { resolveMerchantSessionFromAuthUser } from "@/lib/merchant-account-repository";
import { createAppRouterSupabaseServerClient } from "@/lib/supabase-server";
import { LEGACY_SESSION_COOKIE } from "@/lib/supabase-auth-config";

export const getAuthenticatedSession = cache(async function getAuthenticatedSession() {
  // Login and signup pages are prerendered during builds where runtime secrets may be absent.
  // Treat a missing Supabase configuration as an anonymous session instead of failing the build.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createAppRouterSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  try {
    const activeLocationId = (await cookies()).get("okado_active_location")?.value;
    return await resolveMerchantSessionFromAuthUser(user, activeLocationId);
  } catch {
    return null;
  }
});

export async function requireAuthenticatedSession() {
  const session = await getAuthenticatedSession();

  if (!session) {
    redirect("/connexion");
  }

  return session;
}

export async function redirectAuthenticatedMerchant() {
  const session = await getAuthenticatedSession();

  if (!session) {
    return null;
  }

  if (!session.merchant.onboardingCompleted) {
    redirect("/onboarding");
  }

  redirect("/");
}

export const SESSION_COOKIE = LEGACY_SESSION_COOKIE;
