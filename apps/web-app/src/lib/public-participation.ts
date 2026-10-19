import type { DrawSession } from "@/lib/types";

/** Retrying the same server capability cannot create a second participation. */
export async function recordScratchParticipation(
  session: DrawSession,
  send: typeof fetch = fetch,
) {
  if (session.isPreview || session.previewSessionToken) return true;
  if (!session.participationToken) return false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await send("/api/public/draw/played", {
        method: "POST", keepalive: true,
        signal: AbortSignal.timeout(5000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: session.campaignId, sessionId: session.id, token: session.participationToken,
        }),
      });
      if (response.ok) return true;
      if (response.status >= 400 && response.status < 500 && response.status !== 429) return false;
    } catch { /* A lost acknowledgement can be retried with the same session. */ }
  }
  return false;
}
