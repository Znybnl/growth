import { notFound } from "next/navigation";
import { HalloweenFixture } from "../../../../e2e/fixtures/halloween-wheel";
import type { GamePageTemplateId } from "@/lib/types";

// Synthetic visual-test fixture only. Never expose this route in production.
export const metadata = { robots: { index: false, follow: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; template?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  return (
    <HalloweenFixture
      mode={query.mode}
      templateId={query.template as GamePageTemplateId | undefined}
    />
  );
}
