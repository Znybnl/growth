import { redirect } from "next/navigation";
import { cache } from "react";
import { measureServerStage } from "@/lib/server-performance";
import { cookies } from "next/headers";

import { readMerchantReplayIdentity, resolveMerchantSessionFromAuthUser } from "@/lib/merchant-account-repository";
import {
  SESSION_INACTIVITY_MS,
  SESSION_LAST_ACTIVITY_COOKIE,
  SESSION_MAX_AGE_MS,
  SESSION_STARTED_COOKIE,
} from "@/lib/session-security";
import { createAppRouterSupabaseServerClient } from "@/lib/supabase-server";
import { LEGACY_SESSION_COOKIE } from "@/lib/supabase-auth-config";

const getValidatedMerchantAuth = cache(async function getValidatedMerchantAuth() {
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
  } = await measureServerStage("auth.validate", () => supabase.auth.getUser());

  if (error || !user) {
    return null;
  }

  return { user, activeLocationId: cookieStore.get("okado_active_location")?.value };
});

async function resolveAuthenticatedSession(auth: NonNullable<Awaited<ReturnType<typeof getValidatedMerchantAuth>>>) {
  try {
    return await measureServerStage("auth.context", () =>
      resolveMerchantSessionFromAuthUser(auth.user, auth.activeLocationId));
  } catch {
    return null;
  }
}

export const getAuthenticatedSession = cache(async function getAuthenticatedSession() {
  const auth = await getValidatedMerchantAuth();
  return auth ? resolveAuthenticatedSession(auth) : null;
});

export async function getAuthenticatedReplayIdentity() {
  const auth = await getValidatedMerchantAuth();
  if (!auth) return null;
  const linkedId = auth.user.app_metadata?.merchant_user_id;
  if (typeof linkedId === "string") {
    const identity = await measureServerStage("auth.context", () => readMerchantReplayIdentity(linkedId));
    if (identity) return identity;
  }

  // Legacy or stale links still use the existing account reconciliation path.
  return (await resolveAuthenticatedSession(auth))?.user ?? null;
}

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