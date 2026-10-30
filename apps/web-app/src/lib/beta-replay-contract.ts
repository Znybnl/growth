/** Contractual closed-beta phase, including new accounts; never inferred from a cookie. #712 */
export const BETA_REPLAY_VERSION = "closed-beta-2026-10-30-v1";
export const BETA_REPLAY_LEASE_MS = 5 * 60_000;
export const BETA_REPLAY_REFRESH_MS = 4 * 60_000;
export const BETA_REPLAY_STOP_EVENT = "okado:stop-beta-replay";

export type BetaReplayPolicy = {
  enabled: boolean;
  version: typeof BETA_REPLAY_VERSION;
  subject?: string;
  issuedAt?: number;
  expiresAt?: number;
};

// Deliberate allowlist: no public games, auth, payment, participant lists or admin data.
export function betaReplayPage(path: string): string | null {
  if (["/", "/merchant", "/onboarding", "/campaigns", "/campaigns/new", "/campaigns/new/guided", "/backgrounds"].includes(path)) return path;
  if (/^\/campaigns\/[^/?#]+\/(edit(?:\/guided)?|poster|email)$/.test(path)) {
    return path.replace(/^\/campaigns\/[^/]+\//, "/campaigns/[id]/");
  }
  return null;
}

export function validBetaReplayLease(value: unknown, now = Date.now()): value is BetaReplayPolicy & { subject: string; expiresAt: number } {
  if (!value || typeof value !== "object") return false;
  const p = value as BetaReplayPolicy;
  return p.enabled === true && p.version === BETA_REPLAY_VERSION &&
    typeof p.subject === "string" && /^[\w-]+:[\w-]+$/.test(p.subject) &&
    typeof p.issuedAt === "number" && Number.isSafeInteger(p.issuedAt) && p.issuedAt <= now &&
    typeof p.expiresAt === "number" && Number.isSafeInteger(p.expiresAt) &&
    p.expiresAt > now && p.expiresAt - p.issuedAt <= BETA_REPLAY_LEASE_MS;
}
