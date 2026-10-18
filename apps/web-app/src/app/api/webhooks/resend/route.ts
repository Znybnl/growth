import { NextResponse } from "next/server";
import { Resend, type WebhookEventPayload } from "resend";

import { syncRewardEmailWebhookInSupabase } from "@/lib/campaign-repository";
import { logSupportEvent } from "@/lib/support-log";
import { allowLocalTlsBypass } from "@/lib/supabase";

function getWebhookHeaders(request: Request) {
  // Resend sends Svix headers. Only accept the legacy names as a complete
  // fallback: a partial Svix set must never be completed from another set.
  const hasSvixHeaders = ["svix-id", "svix-timestamp", "svix-signature"].some((name) =>
    request.headers.has(name),
  );
  const prefix = hasSvixHeaders ? "svix" : "webhook";

  return {
    id: request.headers.get(`${prefix}-id`) ?? "",
    timestamp: request.headers.get(`${prefix}-timestamp`) ?? "",
    signature: request.headers.get(`${prefix}-signature`) ?? "",
  };
}

export async function POST(request: Request) {
  allowLocalTlsBypass();

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "RESEND_WEBHOOK_SECRET manquant" }, { status: 500 });
  }

  const payload = await request.text();
  const headers = getWebhookHeaders(request);

  if (!headers.id || !headers.timestamp || !headers.signature) {
    logSupportEvent("warn", "resend-webhook-invalid", { reason: "missing_headers" });
    return NextResponse.json({ error: "Headers webhook Resend manquants" }, { status: 400 });
  }

  let event: WebhookEventPayload;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    event = resend.webhooks.verify({
      payload,
      headers,
      webhookSecret,
    });
  } catch {
    logSupportEvent("warn", "resend-webhook-invalid", { reason: "verification_failed" });
    return NextResponse.json({ error: "Signature webhook Resend invalide" }, { status: 400 });
  }

  try {
    await syncRewardEmailWebhookInSupabase(event);
    logSupportEvent("info", "resend-webhook-received", {
      type: event.type,
      createdAt: event.created_at,
      emailId:
        "data" in event && typeof event.data === "object" && event.data && "email_id" in event.data
          ? event.data.email_id
          : undefined,
    });

    return NextResponse.json({ received: true });
  } catch {
    logSupportEvent("error", "resend-webhook-persistence-failed", {
      reason: "storage_unavailable",
    });

    return NextResponse.json(
      { error: "Enregistrement du webhook Resend temporairement indisponible" },
      { status: 503 },
    );
  }
}

