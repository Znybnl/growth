import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/auth";
import { assertMerchantBillingAccess } from "@/lib/billing";
import { getMerchantLeads } from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = await requireAuthenticatedSession();
  const campaignId = request.nextUrl.searchParams.get("campaign") ?? undefined;
  const leads = (await getMerchantLeads(session.merchant.id, campaignId)).sort((a, b) =>
    (b.consentTimestamp ?? b.createdAt).localeCompare(a.consentTimestamp ?? a.createdAt),
  );
  const format = request.nextUrl.searchParams.get("format");

  if (format === "csv") {
    try {
      assertMerchantBillingAccess(session.merchant, "csv_export");
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Export indisponible" },
        { status: 403 },
      );
    }

    const header = [
      "lead_id",
      "prenom",
      "email",
      "campaign_title",
      "goal_type",
      "prize_label",
      "status",
      "email_status",
      "email_sent_at",
      "email_delivered_at",
      "email_error",
      "consent_timestamp",
    ];
    const rows = leads.map((lead) =>
      [
        lead.id,
        lead.firstName,
        lead.email,
        lead.campaignTitle,
        lead.goalType,
        lead.prizeLabel,
        lead.status,
        lead.emailDeliveryStatus ?? "",
        lead.emailSentAt ?? "",
        lead.emailDeliveredAt ?? "",
        lead.emailErrorMessage ?? "",
        lead.consentTimestamp ?? "",
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="merchant-leads.csv"',
      },
    });
  }

  return NextResponse.json(leads);
}
