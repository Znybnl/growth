import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/merchant/admin-dashboard";
import { isSaasAdminEmail } from "@/lib/admin";
import { getSaasAdminOverview } from "@/lib/admin-repository";
import { requireAuthenticatedSession } from "@/lib/auth";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireAuthenticatedSession();
  if (!isSaasAdminEmail(session.user.email)) redirect("/");
  const query = (await searchParams).q?.trim() ?? "";
  const overview = await getSaasAdminOverview(query);
  return <AdminDashboard overview={overview} query={query} />;
}
