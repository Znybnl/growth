"use client";

import {
  CAMPAIGN_SPACING_MAX_PX,
  CAMPAIGN_SPACING_MIN_PX,
  clampCampaignSpacingPx,
} from "@/lib/campaign-defaults";
import { GameType, LogoMode } from "@/lib/types";

type CampaignSpacingControlsProps = {
  gameType: GameType;
  logoMode?: LogoMode;
  logoSpacingPx: number;
  blockSpacingPx: number;
  onLogoSpacingChange: (value: number) => void;
  onBlockSpacingChange: (value: number) => void;
};

export function CampaignSpacingControls({
  gameType,
  logoMode,
  logoSpacingPx,
  blockSpacingPx,
  onLogoSpacingChange,
  onBlockSpacingChange,
}: CampaignSpacingControlsProps) {
  const showLogoSpacing = logoMode !== "none";
  const showBlockSpacing = gameType === "wheel";

  if (!showLogoSpacing && !showBlockSpacing) return null;

  return (
    <div className="space-y-5">
      {showLogoSpacing ? (
        <label className="block text-sm">
          <span className="mb-1 flex items-center justify-between gap-3 font-semibold text-[#182033]">
            <span>Espacement sous le logo (px)</span>
            <output className="text-aubergine">
              {clampCampaignSpacingPx(logoSpacingPx)} px
            </output>
          </span>
          <span className="block text-xs leading-5 text-[#8993a6]">
            Espace entre le logo affiché et le texte principal.
          </span>
          <input
            type="range"
            min={CAMPAIGN_SPACING_MIN_PX}
            max={CAMPAIGN_SPACING_MAX_PX}
            step={1}
            value={clampCampaignSpacingPx(logoSpacingPx)}
            onChange={(event) => onLogoSpacingChange(Number(event.target.value))}
            className="mt-3 w-full cursor-pointer accent-aubergine"
            aria-label="Espacement sous le logo (px)"
          />
        </label>
      ) : null}

      {showBlockSpacing ? (
        <label className="block text-sm">
          <span className="mb-1 flex items-center justify-between gap-3 font-semibold text-[#182033]">
            <span>Espacement entre le texte et la roue (px)</span>
            <output className="text-aubergine">
              {clampCampaignSpacingPx(blockSpacingPx)} px
            </output>
          </span>
          <span className="block text-xs leading-5 text-[#8993a6]">
            Espace entre le texte principal et la roue.
          </span>
          <input
            type="range"
            min={CAMPAIGN_SPACING_MIN_PX}
            max={CAMPAIGN_SPACING_MAX_PX}
            step={1}
            value={clampCampaignSpacingPx(blockSpacingPx)}
            onChange={(event) => onBlockSpacingChange(Number(event.target.value))}
            className="mt-3 w-full cursor-pointer accent-aubergine"
            aria-label="Espacement entre le texte et la roue (px)"
          />
        </label>
      ) : null}
    </div>
  );
}
