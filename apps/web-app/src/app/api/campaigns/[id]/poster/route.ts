import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

function escapeXmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function ensurePosterFontConfig() {
  if (fontConfigReady) return;

  const fontDir = path.join(process.cwd(), "public", "fonts");
  const configDir = path.join(tmpdir(), "okado-fontconfig");
  const cacheDir = path.join(tmpdir(), "okado-font-cache");
  const configFile = path.join(configDir, "fonts.conf");

  mkdirSync(configDir, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(
    configFile,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${escapeXmlAttribute(fontDir)}</dir>
  <cachedir>${escapeXmlAttribute(cacheDir)}</cachedir>
  <alias>
    <family>Anton</family>
    <prefer>
      <family>Anton</family>
      <family>Inter</family>
      <family>Geist</family>
      <family>DejaVu Sans</family>
    </prefer>
  </alias>
  <alias>
    <family>sans-serif</family>
    <prefer>
      <family>Anton</family>
      <family>Inter</family>
      <family>Geist</family>
      <family>DejaVu Sans</family>
      <family>Liberation Sans</family>
      <family>Arial</family>
    </prefer>
  </alias>
  <alias>
    <family>Inter</family>
    <default>
      <family>sans-serif</family>
    </default>
  </alias>
  <alias>
    <family>Geist</family>
    <default>
      <family>sans-serif</family>
    </default>
  </alias>
</fontconfig>
`,
    "utf8",
  );

  process.env.FONTCONFIG_PATH = configDir;
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
