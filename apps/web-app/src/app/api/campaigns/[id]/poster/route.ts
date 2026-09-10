import { NextResponse } from "next/server";
import path from "node:path";

import { getAuthenticatedSession } from "@/lib/auth";
import { createCampaignPosterSvg } from "@/lib/campaign-exports";
import { captureProductEvent, merchantDistinctId } from "@/lib/product-analytics";
import { getCampaignPerformance } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

let fontConfigReady = false;

function ensurePosterFontConfig() {
  if (fontConfigReady) return;

  const fontDir = path.join(process.cwd(), "public", "fonts");
  const configFile = path.join(fontDir, "fonts.conf");

  // Keep Fontconfig read-only at runtime. The configuration and font files are
  // part of the deployment; omitting <cachedir> prevents fontconfig from
  // growing a cache in the function's ephemeral filesystem.
  process.env.FONTCONFIG_PATH = fontDir;
  process.env.FONTCONFIG_FILE = configFile;
  fontConfigReady = true;
}

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
    ensurePosterFontConfig();
    const { default: sharp } = await import("sharp");
    const posterPng = await sharp(Buffer.from(posterSvg), {
      failOn: "none",
      limitInputPixels: false,
    })
      .png()
      .toBuffer();
    await captureProductEvent(
      "poster_downloaded",
      merchantDistinctId(session.merchant.id, session.user.id),
      {
        merchantId: session.merchant.id,
        merchantUserId: session.user.id,
        campaignId: performance.campaign.id,
        template: performance.campaign.presentation.poster.templateId ?? "default",
        format: "png",
      },
    );

    return new NextResponse(new Uint8Array(posterPng), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${performance.campaign.id}-affiche-a4-a5.png"`,
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
