import { Resend } from "resend";
import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { contactEmailText, parseContactRequest } from "@/lib/contact-request";
import { assertTrustedMutationRequest } from "@/lib/request-security";
import { getSupabaseAdmin } from "@/lib/supabase";

const responseHeaders = { "Cache-Control": "private, no-store" };

function errorResponse(message: string, status: number, retryAfter?: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { ...responseHeaders, ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) },
  });
}

export async function POST(request: Request) {
  try {
    assertTrustedMutationRequest(request);
  } catch {
    return errorResponse("Origine non autorisée.", 403);
  }

  const session = await getAuthenticatedSession();
  if (!session || !session.merchant.onboardingCompleted) {
    return errorResponse("Authentification requise.", 401);
  }
  const replyTo = session.user.email?.trim();
  if (!replyTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo) || /[\r\n]/.test(replyTo)) {
    return errorResponse("Adresse du compte indisponible.", 422);
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json") ||
      Number(request.headers.get("content-length") ?? 0) > 12_000) {
    return errorResponse("Demande invalide.", 400);
  }

  let input;
  try {
    const raw = await request.text();
    if (raw.length > 12_000) return errorResponse("Demande trop longue.", 413);
    input = parseContactRequest(JSON.parse(raw));
  } catch {
    return errorResponse("Demande invalide.", 400);
  }
  if (!input) return errorResponse("Renseignez un objet et un message valides.", 400);

  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !sender) return errorResponse("Envoi indisponible. Réessayez plus tard.", 503);

  // The existing private rate-limit RPC is atomic across app instances.
  // Its key contains only the account user ID, never the message or address.
  try {
    const { data, error } = await getSupabaseAdmin().rpc("consume_public_rate_limit", {
      p_key: `contact-user:${session.user.id}`,
      p_limit: 5,
      p_window_seconds: 3600,
    });
    if (error) throw new Error("Rate limit unavailable");
    const result = (Array.isArray(data) ? data[0] : data) as
      { allowed?: boolean; retry_after_seconds?: number } | null;
    if (!result || typeof result.allowed !== "boolean") {
      return errorResponse("Envoi indisponible. Réessayez plus tard.", 503);
    }
    if (!result?.allowed) {
      const retryAfter = Math.max(1, Number(result?.retry_after_seconds) || 60);
      return errorResponse("Trop de demandes envoyées. Réessayez plus tard.", 429, retryAfter);
    }
  } catch {
    return errorResponse("Envoi indisponible. Réessayez plus tard.", 503);
  }

  try {
    const result = await new Resend(apiKey).emails.send({
      from: `Okado <${sender}>`,
      to: "contact@okado.app",
      replyTo,
      subject: `[Okado] ${input.subject}`,
      text: contactEmailText(input, replyTo),
    }, { idempotencyKey: `contact/${session.user.id}/${input.requestId}` });
    if (result.error || !result.data?.id) throw new Error("Provider did not accept message");
    return NextResponse.json({ sent: true }, { headers: responseHeaders });
  } catch {
    // Provider errors may include the email body or personal data.
    return errorResponse("Envoi impossible. Réessayez ou écrivez à contact@okado.app.", 503);
  }
}
