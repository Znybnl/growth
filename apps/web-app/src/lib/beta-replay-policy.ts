import { BETA_REPLAY_LEASE_MS, BETA_REPLAY_VERSION, type BetaReplayPolicy } from "@/lib/beta-replay-contract";

export function betaReplayPolicy(
  user: { id: string; merchantId: string } | null,
  phase: string | undefined,
  projectId: string | undefined,
  now = Date.now(),
): BetaReplayPolicy {
  const denied: BetaReplayPolicy = { enabled: false, version: BETA_REPLAY_VERSION };
  if (phase !== "closed_beta" || projectId !== "212872" || !user) return denied;
  if (typeof user.id !== "string" || typeof user.merchantId !== "string" ||
      !/^[\w-]+$/.test(user.id) || !/^[\w-]+$/.test(user.merchantId)) return denied;
  return {
    enabled: true, version: BETA_REPLAY_VERSION,
    // Same stable pseudonymous identity as authenticated product analytics, without adding email.
    subject: `${user.merchantId}:${user.id}`,
    issuedAt: now, expiresAt: now + BETA_REPLAY_LEASE_MS,
  };
}
