import { notFound } from "next/navigation";
import { BeautyWheelBackgroundFixture } from "../../../../e2e/fixtures/beauty-wheel-backgrounds";
import type { GamePageTemplateId, LogoMode } from "@/lib/types";
import { isBeautyWheelTemplate } from "@/lib/beauty-wheel-themes";

export const metadata = { robots: { index: false, follow: false } };

export default async function Page({ searchParams }: {
  searchParams: Promise<{ mode?: string; template?: string; background?: string; logo?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const requestedTemplate = query.template as GamePageTemplateId;
  const templateId = isBeautyWheelTemplate(requestedTemplate) || requestedTemplate === "rose-institut" || requestedTemplate === "classic" ? requestedTemplate : "beauty-nude";
  const logoMode: LogoMode = query.logo === "image" || query.logo === "none" ? query.logo : "text";
  return <BeautyWheelBackgroundFixture mode={query.mode} templateId={templateId} background={query.background} logoMode={logoMode} />;
}
