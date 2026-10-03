"use client";

import { HalloweenWheelScene } from "@/components/public/halloween-wheel-art";
import { WheelOfFortune } from "@/components/public/wheel-of-fortune";
import { textFontFamily } from "@/lib/format";
import type { CampaignEditorPreviewModel } from "./campaign-live-preview";

export function HalloweenCampaignPreview({
  preview,
}: {
  preview: CampaignEditorPreviewModel;
}) {
  return (
    <div
      className="okado-preview-surface overflow-hidden rounded-[30px]"
      data-template-id="halloween-gold"
    >
      <HalloweenWheelScene
        logoMode={preview.logoMode}
        logoText={preview.logoText}
        logoUrl={preview.logoUrl}
        logoWidthPx={preview.logoWidthPx}
        logoTextSizePx={preview.logoTextSizePx}
        logoTextColor={preview.logoTextColor}
        logoAlign={
          preview.logoAlignmentClass === "justify-start"
            ? "left"
            : preview.logoAlignmentClass === "justify-end"
              ? "right"
              : "center"
        }
        logoBottomSpacingPx={preview.logoBottomSpacingPx}
        title={preview.subtitle}
        titleFontSizePx={preview.headingFontSizePx}
        titleFontFamily={textFontFamily(preview.headingFontFamily)}
        titleFontWeight={preview.headingFontWeight}
        titleAlign={
          preview.headingAlignmentClass === "text-left"
            ? "left"
            : preview.headingAlignmentClass === "text-right"
              ? "right"
              : "center"
        }
        secondaryText={preview.wheelSubtitle}
        subtitleSpacingPx={preview.subtitleSpacingPx}
        blockSpacingPx={preview.blockSpacingPx}
      >
        <WheelOfFortune
          accent={preview.accent}
          pageTemplate="halloween-gold"
          segments={preview.previewSegments}
          winningSegmentId={preview.winningSegmentId}
          buttonEnabled
        />
      </HalloweenWheelScene>
    </div>
  );
}
