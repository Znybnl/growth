import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth";
import { assertTrustedMutationRequest } from "@/lib/request-security";
import { getRewardReminderSettings, saveRewardReminderSettings, RewardReminderAccessError } from "@/lib/reward-reminder-settings";

const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!session.workspace) return NextResponse.json({ error: "Compte indisponible." }, { status: 503 });
  try { return NextResponse.json(await getRewardReminderSettings(session.user.id, session.workspace.id), { headers }); }
  catch (error) { return NextResponse.json({ error: error instanceof RewardReminderAccessError ? "Accès refusé." : "Relances indisponibles. Réessayez." }, { status: error instanceof RewardReminderAccessError ? 403 : 503, headers }); }
}
export async function POST(request: Request) {
  try { assertTrustedMutationRequest(request); }
  catch { return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 }); }
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!session.workspace) return NextResponse.json({ error: "Compte indisponible." }, { status: 503 });
  let body: { enabled?: unknown; days?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 }); }
  if (!body || typeof body.enabled !== "boolean" || typeof body.days !== "number" || !Number.isInteger(body.days) || body.days < 1 || body.days > 365) {
    return NextResponse.json({ error: "Le délai doit être un entier de 1 à 365 jours." }, { status: 400 });
  }
  try {
    const settings = await getRewardReminderSettings(session.user.id, session.workspace.id);
    if (!settings.canEdit) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    return NextResponse.json(await saveRewardReminderSettings(session.user.id, session.workspace.id, body.enabled, body.days), { headers });
  } catch (error) { return NextResponse.json({ error: error instanceof RewardReminderAccessError ? "Accès refusé." : "Enregistrement impossible. Réessayez." }, { status: error instanceof RewardReminderAccessError ? 403 : 503, headers }); }
}
