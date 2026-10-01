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
  hasScratchSubtitle?: boolean;
  logoSpacingPx: number;
  blockSpacingPx: number;
  subtitleSpacingPx: number;
  onLogoSpacingChange: (value: number) => void;
  onBlockSpacingChange: (value: number) => void;
  onSubtitleSpacingChange: (value: number) => void;
};

export function CampaignSpacingControls({
  gameType,
  logoMode,
  hasScratchSubtitle = false,
  logoSpacingPx,
  blockSpacingPx,
  subtitleSpacingPx,
  onLogoSpacingChange,
  onBlockSpacingChange,
  onSubtitleSpacingChange,
}: CampaignSpacingControlsProps) {
  const showLogoSpacing = logoMode !== "none";
  const showBlockSpacing = gameType === "wheel" || gameType === "scratch";
  const showSubtitleSpacing =
    gameType === "wheel" || (gameType === "scratch" && hasScratchSubtitle);

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
            <span>
              {gameType === "wheel"
                ? "Espacement entre le texte et la roue (px)"
                : "Espacement entre le texte et la zone à gratter (px)"}
            </span>
            <output className="text-aubergine">
              {clampCampaignSpacingPx(blockSpacingPx)} px
            </output>
          </span>
          <input
            type="range"
            min={CAMPAIGN_SPACING_MIN_PX}
            max={CAMPAIGN_SPACING_MAX_PX}
            step={1}
            value={clampCampaignSpacingPx(blockSpacingPx)}
            onChange={(event) => onBlockSpacingChange(Number(event.target.value))}
            className="mt-3 w-full cursor-pointer accent-aubergine"
            aria-label={
              gameType === "wheel"
                ? "Espacement entre le texte et la roue (px)"
                : "Espacement entre le texte et la zone à gratter (px)"
            }
          />
        </label>
      ) : null}

      {showSubtitleSpacing ? (
        <label className="block text-sm">
          <span className="mb-1 flex items-center justify-between gap-3 font-semibold text-[#182033]">
            <span>
              {gameType === "wheel"
                ? "Espacement entre le texte principal et le sous-titre (px)"
                : "Espacement entre le titre et le sous-titre du ticket (px)"}
            </span>
            <output className="text-aubergine">
              {clampCampaignSpacingPx(subtitleSpacingPx)} px
            </output>
          </span>
          <input
            type="range"
            min={CAMPAIGN_SPACING_MIN_PX}
            max={CAMPAIGN_SPACING_MAX_PX}
            step={1}
            value={clampCampaignSpacingPx(subtitleSpacingPx)}
            onChange={(event) => onSubtitleSpacingChange(Number(event.target.value))}
            className="mt-3 w-full cursor-pointer accent-aubergine"
            aria-label={
              gameType === "wheel"
                ? "Espacement entre le texte principal et le sous-titre (px)"
                : "Espacement entre le titre et le sous-titre du ticket (px)"
            }
          />
        </label>
      ) : null}
    </div>
  );
}
