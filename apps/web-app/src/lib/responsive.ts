/**
 * Converts a design-system pixel value into a fluid CSS size.
 * rem keeps the scale tied to the user's base font size while vw lets it
 * breathe between the mobile and desktop limits.
 */
export function fluidType(
  basePx: number,
  options: { minRatio?: number; maxRatio?: number; viewportStep?: number } = {},
) {
  const minRatio = options.minRatio ?? 0.8;
  const maxRatio = options.maxRatio ?? 1.12;
  const viewportStep = options.viewportStep ?? 0.35;
  const baseRem = (basePx / 16).toFixed(3);
  const minRem = ((basePx * minRatio) / 16).toFixed(3);
  const maxRem = ((basePx * maxRatio) / 16).toFixed(3);

  return `clamp(${minRem}rem, calc(${baseRem}rem + ${viewportStep}vw), ${maxRem}rem)`;
}
