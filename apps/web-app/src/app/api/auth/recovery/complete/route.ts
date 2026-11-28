import { NextResponse } from "next/server";

import { assertPersistentPublicRateLimit } from "@/lib/public-security-store";
import { getPublicErrorStatus, getPublicRetryAfter } from "@/lib/public-api";
import { assertTrustedMutationRequest, getRequestSecurityErrorStatus } from "@/lib/request-security";
import {
  authErrorStatus,
  completePasswordRecovery,
  PASSWORD_RECOVERY_USER_COOKIE,
} from "@/lib/password-recovery";
import { createRouteSupabaseClient } from "@/lib/supabase-server-auth";

const responseHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};

function json(body: Record<string, unknown>, status = 200, retryAfter?: string | null) {
  const headers = new Headers(responseHeaders);
  if (retryAfter) headers.set("Retry-After", retryAfter);
  return NextResponse.json(body, { status, headers });
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

function readRecoveryUserId(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === PASSWORD_RECOVERY_USER_COOKIE) {
      try {
        return decodeURIComponent(value.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function responseForResult(
  result: Awaited<ReturnType<typeof completePasswordRecovery>>,
  provisionalResponse: NextResponse,
  request: Request,
) {
  if (result.kind === "success") {
    const response = json({
      completed: true,
      sessionsRevoked: result.sessionsRevoked,
    });
    copyCookies(provisionalResponse, response);
    response.cookies.set(PASSWORD_RECOVERY_USER_COOKIE, "", {
      path: "/api/auth/recovery",
      maxAge: 0,
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "strict",
    });
    return response;
  }

  const status =
    result.kind === "invalid_link" ? 400 :
    result.kind === "recovery_required" ? 401 :
    result.kind === "rate_limited" ? 429 :
    result.kind === "password_rejected" ? 422 : 503;
  const error =
    result.kind === "invalid_link" ? "invalid_link" :
    result.kind === "recovery_required" ? "recovery_required" :
    result.kind === "rate_limited" ? "rate_limited" :
    result.kind === "password_rejected" ? "password_rejected" : "temporarily_unavailable";
  const recoveryUserId = "recoveryUserId" in result ? result.recoveryUserId : undefined;
  const response = json(
    {
      error,
      ...(recoveryUserId ? { recoverySessionReady: true } : {}),
    },
    status,
  );

  // A valid email link is single-use. Preserve its verified Supabase session
  // after a password-policy or transient error so the user can safely retry.
  if (recoveryUserId) {
    copyCookies(provisionalResponse, response);
    response.cookies.set(PASSWORD_RECOVERY_USER_COOKIE, recoveryUserId, {
      path: "/api/auth/recovery",
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "strict",
    });
  }
  return response;
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
    if (!body || typeof body !== "object") return json({ error: "invalid_request" }, 400);

    const input = body as {
      token_hash?: unknown;
      password?: unknown;
      confirmPassword?: unknown;
    };
    const tokenHash = typeof input.token_hash === "string" ? input.token_hash : "";
    const password = typeof input.password === "string" ? input.password : "";
    const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";

    if (password.length === 0 || password.length > 1024) {
      return json({ error: "password_rejected" }, 422);
    }
    if (password !== confirmPassword) return json({ error: "password_mismatch" }, 400);
    if (tokenHash.length > 512) return json({ error: "invalid_link" }, 400);

    await assertPersistentPublicRateLimit(request, {
      key: "auth-password-recovery-complete",
      limit: 8,
      windowMs: 10 * 60 * 1000,
    });

    const provisionalResponse = NextResponse.json({});
    const supabase = createRouteSupabaseClient({ request, response: provisionalResponse });
    const result = await completePasswordRecovery({
      auth: supabase.auth,
      tokenHash,
      recoveryUserId: readRecoveryUserId(request) ?? undefined,
      password,
    });

    if (result.kind === "rate_limited" && !result.recoveryUserId) {
      return json({ error: "rate_limited" }, 429);
    }
    return responseForResult(result, provisionalResponse, request);
  } catch (error) {
    if (getRequestSecurityErrorStatus(error) === 403) {
      return json({ error: "request_not_allowed" }, 403);
    }
    if (getPublicErrorStatus(error) === 429) {
      return json({ error: "rate_limited" }, 429, getPublicRetryAfter(error));
    }
    if (authErrorStatus(error) === 429) return json({ error: "rate_limited" }, 429);
    return json({ error: "temporarily_unavailable" }, 503);
  }
}
