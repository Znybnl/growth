import Link from "next/link";
import { notFound } from "next/navigation";

import { CampaignExperience } from "@/components/public/campaign-experience";
import { getPublicCampaign } from "@/lib/store";

type CampaignPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    preview?: string;
  }>;
};

function SuspendedCampaignNotice({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-6 py-10">
      <div className="w-full max-w-[560px] rounded-[32px] border border-[#dbe4f0] bg-white p-8 text-center shadow-[0_24px_60px_rgba(122,136,166,0.18)]">
        <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Campagne indisponible</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-[#0f1728]">
          Cette animation est momentanément suspendue
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#5c6577]">{message}</p>
        <p className="mt-4 text-sm leading-7 text-[#5c6577]">
          Merci de revenir un peu plus tard ou de vous rapprocher du commerçant.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/connexion"
            className="inline-flex items-center justify-center rounded-[18px] bg-[#0f1728] px-5 py-3 text-sm font-semibold !text-white"
          >
            Espace marchand
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function CampaignPage({ params, searchParams }: CampaignPageProps) {
  const { id } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";
  let campaign = null;

  try {
    campaign = await getPublicCampaign(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cette campagne est indisponible.";

    if (
      message.toLowerCase().includes("abonnement") ||
      message.toLowerCase().includes("essai") ||
      message.toLowerCase().includes("indisponible")
    ) {
      return <SuspendedCampaignNotice message={message} />;
    }

    throw error;
  }

  if (!campaign) {
    notFound();
  }

  return <CampaignExperience campaignId={id} initialCampaign={campaign} isPreview={isPreview} />;
}

