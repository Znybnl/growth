import { notFound } from "next/navigation";
import { ChristmasWheelsFixture } from "../../../../e2e/fixtures/christmas-wheels";
import { isChristmasWheelTemplate } from "@/lib/christmas-wheel-themes";
import type { GamePageTemplateId } from "@/lib/types";

export const metadata = { robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ template?: string; mode?: string; background?: string; copy?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const requested = query.template as GamePageTemplateId;
  return <ChristmasWheelsFixture templateId={isChristmasWheelTemplate(requested) ? requested : "christmas-rose"} mode={query.mode} initialBackground={query.background} longCopy={query.copy === "long"} />;
}
