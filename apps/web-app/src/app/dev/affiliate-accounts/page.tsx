import { notFound } from "next/navigation";
import { AffiliateAccountsFixture } from "../../../../e2e/fixtures/affiliate-accounts";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string; enabled?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  return <AffiliateAccountsFixture account={query.mode === "account"} enabled={query.enabled === "1"} />;
}
