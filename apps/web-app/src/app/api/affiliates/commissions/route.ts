import { NextResponse } from "next/server";

import { getAffiliateAdminOverview } from "@/lib/affiliate-repository";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAuthenticatedSession } from "@/lib/auth";

function escapeCsv(value: string | number) {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function formatCsvMoney(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();

  if (!session || !isSaasAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Accès réservé à l'administration." }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  if (format !== "csv") {
    return NextResponse.json({ error: "Format non supporté." }, { status: 400 });
  }

  const overview = await getAffiliateAdminOverview({
    query: url.searchParams.get("q") ?? "",
    status: url.searchParams.get("status") ?? "all",
  });
  const header = [
    "Affilié",
    "Filleul",
    "Facture Stripe",
    "Date facture",
    "Montant HT",
    "Commission",
    "Statut",
  ];
  const rows = overview.commissions.map((commission) => [
    commission.affiliateMerchantName,
    commission.referredMerchantName,
    commission.stripeInvoiceId,
    commission.invoicePaidAt,
    formatCsvMoney(commission.invoiceAmountCents),
    formatCsvMoney(commission.commissionAmountCents),
    commission.status,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((value) => escapeCsv(value)).join(";"))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="okado-affiliation-commissions.csv"',
    },
  });
}
