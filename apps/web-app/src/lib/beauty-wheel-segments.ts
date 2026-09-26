import { beautyWheelTheme, type BeautyWheelTemplateId } from "@/lib/beauty-wheel-themes";
import type { WheelVisualSegment } from "@/lib/wheel-segments";

const MAX_BEAUTY_WHEEL_SEGMENTS = 9;

function normalizeHex(color: string | undefined, fallback: string) {
  return color && /^#[\da-f]{6}$/i.test(color) ? color.toLowerCase() : fallback.toLowerCase();
}

function mixHex(color: string, target: string, amount: number) {
  const sourceChannels = [0, 2, 4].map((offset) => Number.parseInt(color.slice(offset + 1, offset + 3), 16));
  const targetChannels = [0, 2, 4].map((offset) => Number.parseInt(target.slice(offset + 1, offset + 3), 16));
  return `#${sourceChannels
    .map((channel, index) => Math.round(channel + (targetChannels[index] - channel) * amount).toString(16).padStart(2, "0"))
    .join("")}`;
}

function uniqueColors(colors: string[]) {
  return [...new Set(colors.map((color) => color.toLowerCase()))];
}

function isLightNeutral(color: string) {
  const channels = [0, 2, 4].map((offset) => Number.parseInt(color.slice(offset + 1, offset + 3), 16) / 255);
  const brightness = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const saturation = Math.max(...channels) - Math.min(...channels);
  return brightness >= 0.86 && saturation <= 0.07;
}

function colorsConflict(first: string, second: string) {
  return first === second || (isLightNeutral(first) && isLightNeutral(second));
}

function preferredBeautySegmentColor(
  templateId: BeautyWheelTemplateId,
  index: number,
  primary: string,
  secondary: string,
) {
  switch (templateId) {
    case "beauty-nude":
      return [secondary, mixHex(primary, "#ffffff", 0.72), mixHex(primary, "#ffffff", 0.48)][index % 3];
    case "beauty-botanical":
      return [secondary, mixHex(primary, "#ffffff", 0.5), mixHex(primary, "#ffffff", 0.12)][index % 3];
    case "beauty-pop":
      return [
        secondary,
        mixHex(primary, "#ffffff", 0.4),
        mixHex("#ff735b", "#ffffff", 0.32),
        mixHex("#ffd76a", "#ffffff", 0.28),
      ][index % 4];
    case "beauty-editorial":
      return [secondary, mixHex("#c4a879", "#ffffff", 0.45), primary][index % 3];
    case "beauty-tech":
      return [secondary, mixHex(primary, secondary, 0.55), mixHex(primary, "#ffffff", 0.58)][index % 3];
    case "beauty-rose":
      return [secondary, mixHex(primary, "#ffffff", 0.67), mixHex(primary, "#ffffff", 0.4)][index % 3];
  }
}

/** Caps only the displayed Beauty sectors and keeps the actual drawn prize visible for the spin. */
export function limitBeautyWheelSegments(
  segments: WheelVisualSegment[],
  winningSegmentId: string,
  maxSegments = MAX_BEAUTY_WHEEL_SEGMENTS,
) {
  const cap = Math.max(1, Math.min(MAX_BEAUTY_WHEEL_SEGMENTS, Math.floor(maxSegments)));
  const visibleSegments = segments.slice(0, cap);
  const winningSegment = segments.find((segment) => segment.id === winningSegmentId);

  if (!winningSegment || visibleSegments.some((segment) => segment.id === winningSegmentId)) {
    return visibleSegments;
  }

  return [...visibleSegments.slice(0, cap - 1), winningSegment];
}

/** Produces a deterministic palette with no repeated or visually adjacent light-neutral sectors, including the wheel seam. */
export function buildBeautyWheelSegmentColors(
  templateId: BeautyWheelTemplateId,
  segmentCount: number,
  primaryInput: string,
  secondaryInput: string,
) {
  if (segmentCount <= 0) return [];

  const theme = beautyWheelTheme(templateId)!;
  const primary = normalizeHex(primaryInput, theme.primary);
  const secondary = normalizeHex(secondaryInput, theme.secondary);
  const themePalette = Array.from({ length: Math.max(segmentCount, 1) }, (_, index) =>
    preferredBeautySegmentColor(templateId, index, primary, secondary),
  );
  const generatedTints = [primary, secondary].flatMap((color) =>
    [0.16, 0.32, 0.48, 0.64, 0.8].flatMap((amount) => [
      mixHex(color, "#ffffff", amount),
      mixHex(color, "#000000", amount),
    ]),
  );
  const palette = uniqueColors([
    ...themePalette,
    secondary,
    primary,
    mixHex(primary, "#ffffff", 0.78),
    mixHex(primary, "#ffffff", 0.9),
    mixHex(secondary, "#ffffff", 0.08),
    ...generatedTints,
  ]);
  const result: string[] = [];

  for (let index = 0; index < segmentCount; index += 1) {
    const preferred = themePalette[index];
    const conflictsWithNeighbors = (color: string) =>
      (result.length > 0 && colorsConflict(color, result[result.length - 1])) ||
      (index === segmentCount - 1 && segmentCount > 1 && colorsConflict(color, result[0]));

    const selected = !conflictsWithNeighbors(preferred)
      ? preferred
      : palette.find((color) => !conflictsWithNeighbors(color));

    result.push(selected ?? preferred);
  }

  return result;
}
