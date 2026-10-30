import { notFound } from "next/navigation";
import { TemplateRenderingProof } from "../../../../e2e/fixtures/template-rendering";
import type { GamePageTemplateId, TextFont } from "@/lib/types";

export const metadata = { robots: { index: false, follow: false } };

export default async function Page({ searchParams }: {
  searchParams: Promise<{ mode?: string; template?: string; background?: string; ink?: string; font?: string; business?: string; secondary?: string; button?: string; buttonText?: string; prizes?: string; headline?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const font = ["playfair", "cormorant", "bodoni"].includes(query.font ?? "") ? query.font as TextFont : undefined;
  return <TemplateRenderingProof mode={query.mode} templateId={query.template as GamePageTemplateId} background={query.background} ink={query.ink} font={font} business={query.business} secondary={query.secondary} button={query.button} buttonText={query.buttonText} prizeCase={query.prizes} headline={query.headline} />;
}
