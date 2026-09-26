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

function preferredBeautySegmentColor(
  templateId: BeautyWheelTemplateId,
  index: number,
  primary: string,
  secondary: string,
) {
  const softPrimary = mixHex(primary, "#ffffff", 0.78);
  const palePrimary = mixHex(primary, "#ffffff", 0.9);
  const softSecondary = mixHex(secondary, "#ffffff", 0.08);

  switch (templateId) {
    case "beauty-nude":
    case "beauty-botanical":
      return [secondary, softPrimary, secondary, palePrimary][index % 4];
    case "beauty-pop":
      return [secondary, softPrimary, palePrimary, secondary, mixHex(primary, "#ffffff", 0.58)][index % 5];
    case "beauty-editorial":
      return [secondary, softSecondary, primary, secondary][index % 4];
    case "beauty-tech":
      return [secondary, palePrimary, secondary, softPrimary, primary, secondary][index % 6];
    case "beauty-rose":
      return index % 2 === 0 ? secondary : primary;
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

/** Produces a deterministic palette with no equal colors on adjacent sectors, including the wheel seam. */
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
    const forbidden = new Set<string>();
    if (result.length) forbidden.add(result[result.length - 1]);
    if (index === segmentCount - 1 && segmentCount > 1) forbidden.add(result[0]);

    const selected = !forbidden.has(preferred)
      ? preferred
      : palette.find((color) => !forbidden.has(color));

    result.push(selected ?? preferred);
  }

  return result;
}
