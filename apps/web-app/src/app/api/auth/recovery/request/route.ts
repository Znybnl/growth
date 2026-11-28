import { NextResponse } from "next/server";

import { assertPersistentPublicRateLimit } from "@/lib/public-security-store";
import { getPublicErrorStatus, getPublicRetryAfter } from "@/lib/public-api";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import { createRouteSupabaseClient } from "@/lib/supabase-server-auth";
import { normalizeRecoveryEmail, recoveryEmailRateLimitKey } from "@/lib/password-recovery";

const responseHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};

function json(body: Record<string, unknown>, status = 200, retryAfter?: string | null) {
  const headers = new Headers(responseHeaders);
  if (retryAfter) headers.set("Retry-After", retryAfter);
  return NextResponse.json(body, { status, headers });
}

function recoveryRedirectTo(request: Request) {
  const origin =
    process.env.NODE_ENV === "production"
      ? new URL(process.env.NEXT_PUBLIC_APP_URL || "https://app.okado.app").origin
      : new URL(request.url).origin;

  if (process.env.NODE_ENV === "production" && origin !== "https://app.okado.app") {
    throw new Error("URL de récupération non autorisée.");
  }

  return new URL("/reinitialiser-mot-de-passe", origin).toString();
}

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_request" }, 400);
    }

    const email = normalizeRecoveryEmail(
      body && typeof body === "object" ? (body as { email?: unknown }).email : undefined,
    );
    if (!email) return json({ error: "invalid_email" }, 400);

    await assertPersistentPublicRateLimit(request, {
      key: recoveryEmailRateLimitKey(email),
      limit: 1,
      windowMs: 60 * 1000,
    });
    await assertPersistentPublicRateLimit(request, {
      key: "auth-password-recovery-ip",
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });

    const provisionalResponse = NextResponse.json({});
    const supabase = createRouteSupabaseClient({ request, response: provisionalResponse });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: recoveryRedirectTo(request),
    });

    // Supabase applies a user-specific cooldown. Keep that response indistinguishable
    // from an accepted request so it cannot reveal whether the address has an account.
    if (error?.status === 429) return json({ accepted: true });
    if (error) return json({ error: "temporarily_unavailable" }, 503);
    return json({ accepted: true });
  } catch (error) {
    if (getRequestSecurityErrorStatus(error) === 403) {
      return json({ error: "request_not_allowed" }, 403);
    }
    if (getPublicErrorStatus(error) === 429) {
      return json({ error: "rate_limited" }, 429, getPublicRetryAfter(error));
    }
    return json({ error: "temporarily_unavailable" }, 503);
  }
}
