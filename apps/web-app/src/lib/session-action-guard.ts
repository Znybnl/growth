export type SessionActionGuard = { current: string | null };

export function runOnceForSession(
  guard: SessionActionGuard,
  sessionId: string,
  action: () => void,
) {
  if (guard.current === sessionId) return false;
  guard.current = sessionId;
  action();
  return true;
}
