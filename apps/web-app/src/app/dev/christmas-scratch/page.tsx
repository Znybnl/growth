import { notFound } from "next/navigation";
import { ChristmasScratchFixture } from "../../../../e2e/fixtures/christmas-scratch";
import { christmasScratchTemplate } from "@/lib/christmas-scratch-templates";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ template?: string; mode?: string; background?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  return <ChristmasScratchFixture templateId={christmasScratchTemplate(query.template)?.id ?? "scratch-christmas-rose"} mode={query.mode} initialBackground={query.background} />;
}
