import { getAuthenticatedSession } from "@/lib/auth";
import { betaReplayPolicy } from "@/lib/beta-replay-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
  const phase = process.env.OKADO_REPLAY_PHASE;
  const project = process.env.POSTHOG_PROJECT_ID;
  // An emergency stop requires no database or authentication service to work.
  if (phase !== "closed_beta" || project !== "212872") {
    return Response.json(betaReplayPolicy(null, phase, project), { headers });
  }
  try {
    const session = await getAuthenticatedSession();
    return Response.json(betaReplayPolicy(session?.user ?? null, phase, project), {
      headers, status: session ? 200 : 401,
    });
  } catch {
    return Response.json(betaReplayPolicy(null, phase, project), { headers, status: 503 });
  }
}
