"use client";

import { ChristmasWheelScene } from "@/components/public/christmas-wheel-art";
import { WheelOfFortune } from "@/components/public/wheel-of-fortune";
import { isChristmasWheelTemplate } from "@/lib/christmas-wheel-themes";
import { textFontFamily } from "@/lib/format";
import type { CampaignEditorPreviewModel } from "./campaign-live-preview";
import styles from "@/components/public/christmas-wheel.module.css";

/** Shared by both editors: same scene and scale as the actual public game. */
export function ChristmasCampaignPreview({ preview, publicPage = false }: { preview: CampaignEditorPreviewModel; publicPage?: boolean }) {
  if (!isChristmasWheelTemplate(preview.gamePageTemplateId)) return null;
  return <div className={`okado-preview-surface ${styles.surface}`} data-template-id={preview.gamePageTemplateId}>
    <ChristmasWheelScene templateId={preview.gamePageTemplateId}
      background={{ color: preview.backgroundStyle.backgroundColor, imageUrl: preview.selectedBackgroundImageUrl }}
      logoMode={preview.logoMode} logoText={preview.logoText} logoUrl={preview.logoUrl} logoWidthPx={preview.logoWidthPx}
      logoTextSizePx={preview.logoTextSizePx} logoTextColor={preview.logoTextColor}
      logoAlign={preview.logoAlignmentClass === "justify-start" ? "left" : preview.logoAlignmentClass === "justify-end" ? "right" : "center"}
      logoBottomSpacingPx={preview.logoBottomSpacingPx}
      title={preview.subtitle} titleColor={preview.headingTextColor} titleFontSizePx={preview.headingFontSizePx}
      titleFontFamily={textFontFamily(preview.headingFontFamily)} titleFontWeight={preview.headingFontWeight}
      titleAlign={preview.headingAlignmentClass === "text-left" ? "left" : preview.headingAlignmentClass === "text-right" ? "right" : "center"}
      secondaryText={preview.wheelSubtitle} subtitleSpacingPx={preview.subtitleSpacingPx} blockSpacingPx={preview.blockSpacingPx} publicPage={publicPage}>
      <WheelOfFortune accent={preview.accent} pageTemplate={preview.gamePageTemplateId} wheelStyle={preview.wheelStyle}
        buttonStyle={preview.buttonStyle} segments={preview.previewSegments} winningSegmentId={preview.winningSegmentId} buttonEnabled />
    </ChristmasWheelScene>
  </div>;
}
