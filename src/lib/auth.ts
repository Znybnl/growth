import { redirect } from "next/navigation";
import { cache } from "react";

import { resolveMerchantSessionFromAuthUser } from "@/lib/merchant-account-repository";
import { createAppRouterSupabaseServerClient } from "@/lib/supabase-server";
import { LEGACY_SESSION_COOKIE } from "@/lib/supabase-auth-config";

export const getAuthenticatedSession = cache(async function getAuthenticatedSession() {
  const supabase = await createAppRouterSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  try {
    return await resolveMerchantSessionFromAuthUser(user);
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
