import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getMerchantProfile, getMerchantUser } from "@/lib/store";

const SESSION_COOKIE = "growth_session";

export async function getSessionUserId() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getAuthenticatedSession() {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  const user = await getMerchantUser(userId);

  if (!user) {
    return null;
  }

  const merchant = await getMerchantProfile(user.merchantId);

  return { user, merchant };
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

export { SESSION_COOKIE };
