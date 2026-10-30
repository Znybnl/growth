"use client";

import Image from "next/image";
import { ImmersiveScratchTicket } from "@/components/public/immersive-scratch-ticket";
import { christmasScratchDefaultBackground, christmasScratchTemplate } from "@/lib/christmas-scratch-templates";
import type { CampaignEditorPreviewModel } from "./campaign-live-preview";
import { GAME_PREVIEW_VIEWPORT } from "@/lib/game-preview-viewport";

/** Render at the canonical mobile size; the phone frame scales the entire result. */
export function ChristmasScratchPreview({ preview }: { preview: CampaignEditorPreviewModel }) {
  const theme = christmasScratchTemplate(preview.gamePageTemplateId);
  if (!theme) return null;
  const image = preview.selectedBackgroundImageUrl || christmasScratchDefaultBackground(theme.id, { mode: "color", color: preview.backgroundStyle.backgroundColor });
  return <div data-template-id={theme.id} className="okado-preview-surface relative isolate h-full min-h-full w-full overflow-hidden" style={{ position: "relative", minHeight: `${GAME_PREVIEW_VIEWPORT.height}px`, backgroundColor: preview.backgroundStyle.backgroundColor }}>
    {image ? <Image src={image} alt="" fill sizes="390px" loading="eager" unoptimized={Boolean(preview.selectedBackgroundImageUrl)} data-template-art={preview.selectedBackgroundImageUrl ? undefined : theme.id} className="pointer-events-none object-cover" /> : null}
    <div className="relative flex min-h-full w-full flex-col px-4 pb-8">
      <ImmersiveScratchTicket accent={preview.accent} template={theme.id} resultLabel={preview.previewPrize} enabled={false} onReveal={() => undefined}
        logoMode={preview.logoMode} logoText={preview.logoText} logoUrl={preview.logoUrl} logoImageSizingMode={preview.logoImageSizingMode} logoWidthPx={preview.logoWidthPx} logoTextSizePx={preview.logoTextSizePx} logoTextColor={preview.logoTextColor}
        logoAlignmentClass={preview.logoAlignmentClass} logoBottomSpacingPx={preview.logoBottomSpacingPx}
        headline={preview.subtitle} secondaryText={preview.scratchSubtitle} headingTextColor={preview.headingTextColor}
        headingFontClass={preview.headingFontClass} headingFontSizePx={preview.headingFontSizePx} headingFontWeight={preview.headingFontWeight} headingAlignmentClass={preview.headingAlignmentClass}
        textToScratchSpacingPx={preview.blockSpacingPx} subtitleSpacingPx={preview.subtitleSpacingPx} />
    </div>
  </div>;
}
