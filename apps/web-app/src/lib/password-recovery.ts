import { createHash } from "node:crypto";

export const PASSWORD_RECOVERY_USER_COOKIE = "okado_password_recovery_user";

type AuthUser = { id: string };

export type PasswordRecoveryAuth = {
  verifyOtp(input: { token_hash: string; type: "recovery" }): Promise<{
    data: { user: AuthUser | null };
    error: unknown | null;
  }>;
  getUser(): Promise<{ data: { user: AuthUser | null }; error: unknown | null }>;
  updateUser(input: { password: string }): Promise<{ error: unknown | null }>;
  signOut(input: { scope: "global" | "local" }): Promise<{ error: unknown | null }>;
};

export type CompletePasswordRecoveryResult =
  | { kind: "success"; sessionsRevoked: boolean }
  | { kind: "invalid_link" }
  | { kind: "recovery_required" }
  | { kind: "rate_limited"; recoveryUserId?: string }
  | { kind: "password_rejected"; recoveryUserId: string }
  | { kind: "unavailable"; recoveryUserId?: string };

export function normalizeRecoveryEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function recoveryEmailRateLimitKey(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const emailHash = createHash("sha256").update(normalizedEmail).digest("hex");
  return `auth-password-recovery-email:${emailHash}`;
}

export function authErrorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function classifyVerificationError(error: unknown): CompletePasswordRecoveryResult["kind"] {
  const status = authErrorStatus(error);
  if (status === 429) return "rate_limited";
  if (status !== null && status >= 500) return "unavailable";
  return "invalid_link";
}

function classifyUpdateError(error: unknown): CompletePasswordRecoveryResult["kind"] {
  const status = authErrorStatus(error);
  if (status === 429) return "rate_limited";
  if (status === 401 || status === 403) return "recovery_required";
  if (status !== null && status >= 400 && status < 500) return "password_rejected";
  return "unavailable";
}

export async function completePasswordRecovery({
  auth,
  tokenHash,
  recoveryUserId,
  password,
}: {
  auth: PasswordRecoveryAuth;
  tokenHash?: string;
  recoveryUserId?: string;
  password: string;
}): Promise<CompletePasswordRecoveryResult> {
  let verifiedUserId = recoveryUserId;

  if (tokenHash) {
    let verification: Awaited<ReturnType<PasswordRecoveryAuth["verifyOtp"]>>;
    try {
      verification = await auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    } catch {
      return { kind: "unavailable" };
    }
    if (verification.error) {
      const kind = classifyVerificationError(verification.error);
      return kind === "rate_limited" ? { kind } : kind === "unavailable" ? { kind } : { kind: "invalid_link" };
    }
    if (!verification.data.user?.id) return { kind: "invalid_link" };
    verifiedUserId = verification.data.user.id;
  } else {
    let current: Awaited<ReturnType<PasswordRecoveryAuth["getUser"]>>;
    try {
      current = await auth.getUser();
    } catch {
      return { kind: "unavailable" };
    }
    if (current.error) {
      const status = authErrorStatus(current.error);
      return status !== null && status >= 500 ? { kind: "unavailable" } : { kind: "recovery_required" };
    }
    if (!current.data.user?.id || !recoveryUserId || current.data.user.id !== recoveryUserId) {
      return { kind: "recovery_required" };
    }
    verifiedUserId = current.data.user.id;
  }

  if (!verifiedUserId) return { kind: "invalid_link" };

  let update: Awaited<ReturnType<PasswordRecoveryAuth["updateUser"]>>;
  try {
    update = await auth.updateUser({ password });
  } catch {
    return { kind: "unavailable", recoveryUserId: verifiedUserId };
  }
  if (update.error) {
    const kind = classifyUpdateError(update.error);
    if (kind === "password_rejected") return { kind, recoveryUserId: verifiedUserId };
    if (kind === "rate_limited") return { kind, recoveryUserId: verifiedUserId };
    if (kind === "unavailable") return { kind, recoveryUserId: verifiedUserId };
    return { kind: "recovery_required" };
  }

  let globalSignOutFailed = false;
  try {
    globalSignOutFailed = Boolean((await auth.signOut({ scope: "global" })).error);
  } catch {
    globalSignOutFailed = true;
  }

  if (globalSignOutFailed) {
    try {
      await auth.signOut({ scope: "local" });
    } catch {
      // Local cookies are cleared by the SDK before its best-effort request.
    }
  }

  return { kind: "success", sessionsRevoked: !globalSignOutFailed };
}
