import { redirect } from "next/navigation";
import { AffiliateAdminScreen } from "@/components/merchant/affiliate-admin-screen";
import { getAffiliateAdminOverview } from "@/lib/affiliate-repository";
import { isSaasAdminEmail } from "@/lib/admin";
import { requireAuthenticatedSession } from "@/lib/auth";

export default async function AffiliatesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const session = await requireAuthenticatedSession();
  if (!isSaasAdminEmail(session.user.email)) redirect("/");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "all";
  const overview = await getAffiliateAdminOverview({ query, status });
  return <AffiliateAdminScreen overview={overview} query={query} status={status} />;
}
