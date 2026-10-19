import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth";
import { assertTrustedMutationRequest } from "@/lib/request-security";
import { GAIN_NOTIFICATION_FREQUENCIES, type GainNotificationFrequency } from "@/lib/merchant-gain-notification-email";
import { getGainNotificationPreference, saveGainNotificationPreferences } from "@/lib/merchant-gain-notifications";

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const location = new URL(request.url).searchParams.get("location") ?? session.merchant.id;
  if (!session.locations.some(l => l.merchant.id === location)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  try {
    return NextResponse.json(await getGainNotificationPreference(session.user.id, location), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Notifications indisponibles. Réessayez." }, { status: 503 });
  }
}
export async function POST(request: Request) {
  try { assertTrustedMutationRequest(request); }
  catch { return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 }); }
  const session = await getAuthenticatedSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  let body: { location?: unknown; frequencies?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 }); }
  if (!body || typeof body.location !== "string" || !Array.isArray(body.frequencies) ||
    body.frequencies.some((frequency) => !GAIN_NOTIFICATION_FREQUENCIES.includes(frequency as GainNotificationFrequency))) {
    return NextResponse.json({ error: "Fréquences ou établissement invalides." }, { status: 400 });
  }
  if (!session.locations.some(l => l.merchant.id === body.location)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  try {
    return NextResponse.json(await saveGainNotificationPreferences(session.user.id, body.location, [...new Set(body.frequencies)] as GainNotificationFrequency[]),
      { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible. Réessayez." }, { status: 503 });
  }
}
