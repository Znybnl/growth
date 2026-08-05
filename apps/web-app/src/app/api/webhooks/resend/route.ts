import { NextResponse } from "next/server";
import { Resend } from "resend";

import { syncRewardEmailWebhookInSupabase } from "@/lib/campaign-repository";
import { logSupportEvent } from "@/lib/support-log";
import { allowLocalTlsBypass } from "@/lib/supabase";

function getWebhookHeaders(request: Request) {
  return {
    id: request.headers.get("webhook-id") ?? "",
    timestamp: request.headers.get("webhook-timestamp") ?? "",
    signature: request.headers.get("webhook-signature") ?? "",
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
    return NextResponse.json({ error: "Headers webhook Resend manquants" }, { status: 400 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const event = resend.webhooks.verify({
      payload,
      headers,
      webhookSecret,
    });

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
  } catch (error) {
    logSupportEvent("error", "resend-webhook-invalid", {
      error: error instanceof Error ? error.message : "Webhook invalide",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook invalide" },
      { status: 400 },
    );
  }
}

