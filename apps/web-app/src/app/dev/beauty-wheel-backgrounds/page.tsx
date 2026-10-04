import { notFound } from "next/navigation";
import { BeautyWheelBackgroundFixture } from "../../../../e2e/fixtures/beauty-wheel-backgrounds";
import type { GamePageTemplateId } from "@/lib/types";

export const metadata = { robots: { index: false, follow: false } };

export default async function Page({ searchParams }: {
  searchParams: Promise<{ mode?: string; template?: string; background?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const templateId: GamePageTemplateId = query.template === "beauty-botanical" ? "beauty-botanical" : "beauty-nude";
  return <BeautyWheelBackgroundFixture mode={query.mode} templateId={templateId} background={query.background} />;
}
