import { redirect } from "next/navigation";
import { cache } from "react";
import { cookies } from "next/headers";

import { resolveMerchantSessionFromAuthUser } from "@/lib/merchant-account-repository";
import {
  SESSION_INACTIVITY_MS,
  SESSION_LAST_ACTIVITY_COOKIE,
  SESSION_MAX_AGE_MS,
  SESSION_STARTED_COOKIE,
} from "@/lib/session-security";
import { createAppRouterSupabaseServerClient } from "@/lib/supabase-server";
import { LEGACY_SESSION_COOKIE } from "@/lib/supabase-auth-config";

export const getAuthenticatedSession = cache(async function getAuthenticatedSession() {
  // Login and signup pages are prerendered during builds where runtime secrets may be absent.
  // Treat a missing Supabase configuration as an anonymous session instead of failing the build.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const cookieStore = await cookies();
  const startedAt = Number(cookieStore.get(SESSION_STARTED_COOKIE)?.value);
  const lastActivityAt = Number(cookieStore.get(SESSION_LAST_ACTIVITY_COOKIE)?.value);
  const now = Date.now();
  if (
    (Number.isFinite(startedAt) && startedAt > 0 && now - startedAt >= SESSION_MAX_AGE_MS) ||
    (Number.isFinite(lastActivityAt) &&
      lastActivityAt > 0 &&
      now - lastActivityAt >= SESSION_INACTIVITY_MS)
  ) {
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
    const activeLocationId = cookieStore.get("okado_active_location")?.value;
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
