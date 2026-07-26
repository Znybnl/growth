import Link from "next/link";

import { ExpressRedemption } from "@/components/public/express-redemption";
import { getPublicRedemptionContext } from "@/lib/store";

type RedeemPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function RedeemPage({ params }: RedeemPageProps) {
  const { code: rawCode } = await params;
  let code = rawCode;
  try {
    code = decodeURIComponent(rawCode);
  } catch {
    // Keep the raw segment when a malformed QR URL is scanned.
  }

  const context = await getPublicRedemptionContext(code);

  if (!context) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-5 py-10">
        <section className="w-full max-w-xl rounded-[28px] border border-[#dbe4f0] bg-white p-7 text-center shadow-[0_24px_70px_rgba(18,24,39,0.1)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b28719]">Retrait sécurisé</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-[#111827]">QR code introuvable</h1>
          <p className="mt-3 text-sm leading-6 text-[#667286]">Ce code ne correspond à aucun gain disponible.</p>
          <Link href="/" className="mt-6 inline-flex rounded-[14px] bg-[#111827] px-5 py-3 text-sm font-semibold text-white">Fermer</Link>
        </section>
      </main>
    );
  }

  return <ExpressRedemption code={code} context={context} />;
}
