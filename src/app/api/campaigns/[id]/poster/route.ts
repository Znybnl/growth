import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth";
import { createCampaignPosterSvg } from "@/lib/campaign-exports";
import { getCampaignPerformance } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const { id } = await context.params;
    const performance = await getCampaignPerformance(id, session.merchant);

    if (!performance || performance.campaign.merchantId !== session.merchant.id) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const publicUrl = `${origin}/campaign/${performance.campaign.id}`;
    const posterSvg = await createCampaignPosterSvg(performance, publicUrl);
    const { default: sharp } = await import("sharp");
    const posterPng = await sharp(Buffer.from(posterSvg), {
      failOn: "none",
      limitInputPixels: false,
    })
      .png()
      .toBuffer();

    return new NextResponse(new Uint8Array(posterPng), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${performance.campaign.id}-affiche-a4.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[poster_png_generation_failed]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Téléchargement impossible : ${error.message}`
            : "Téléchargement impossible.",
      },
      { status: 500 },
    );
  }
}
