import { NextResponse } from "next/server";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAuthenticatedSession } from "@/lib/auth";
import { assertTrustedMutationRequest } from "@/lib/request-security";
import { getSupabaseAdmin } from "@/lib/supabase";

const attentionStatuses = new Set(["failed", "bounced", "complained", "suppressed"]);
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedMutationRequest(request);
  } catch {
    return NextResponse.json({ error: "Origine de requête non autorisée." }, { status: 403, headers: privateHeaders });
  }
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401, headers: privateHeaders });
  if (!isSaasAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Accès réservé à l’administration." }, { status: 403, headers: privateHeaders });
  }
  let body: { eventAt?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Demande invalide." }, { status: 400, headers: privateHeaders });
  }
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      !body || typeof body.status !== "string" || !attentionStatuses.has(body.status) ||
      !(body.eventAt === null || (typeof body.eventAt === "string" &&
        /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(body.eventAt) && Number.isFinite(Date.parse(body.eventAt))))) {
    return NextResponse.json({ error: "Demande invalide." }, { status: 400, headers: privateHeaders });
  }
  try {
    const { data, error } = await getSupabaseAdmin().rpc("handle_support_email_incident", {
      p_delivery_id: id,
      p_actor_user_id: session.user.id,
      p_expected_event_at: body.eventAt,
      p_expected_status: body.status,
    });
    if (error) throw new Error("Acknowledgement unavailable");
    if (data !== true) {
      return NextResponse.json({ error: "Cet incident a changé ou n’existe plus. Rechargez la page avant de le traiter." }, { status: 409, headers: privateHeaders });
    }
    return NextResponse.json({ handled: true }, { headers: privateHeaders });
  } catch {
    // Never expose supplier messages, identities or database details.
    return NextResponse.json({ error: "Impossible de marquer cet incident comme traité. Réessayez." }, { status: 503, headers: privateHeaders });
  }
}
