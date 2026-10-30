import { notFound } from "next/navigation";
import { ChristmasScratchFixture } from "../../../../e2e/fixtures/christmas-scratch";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  return <ChristmasScratchFixture templateId="scratch-halloween-gold" mode={query.mode} />;
}
