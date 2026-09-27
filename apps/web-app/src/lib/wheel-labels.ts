export const MIN_WHEEL_PRIZE_LABEL_FONT_SIZE_PX = 25;

export function enforceMinimumWheelPrizeLabelFontSize(fontSize: number) {
  return Math.max(MIN_WHEEL_PRIZE_LABEL_FONT_SIZE_PX, fontSize);
}
