export const MIN_WHEEL_PRIZE_LABEL_FONT_SIZE_PX = 25;

export function enforceMinimumWheelPrizeLabelFontSize(fontSize: number) {
  return Math.max(MIN_WHEEL_PRIZE_LABEL_FONT_SIZE_PX, fontSize);
}

/** Fit one measured label, never increase it or change its horizontal proportions. */
export function fittedWheelLabelFontSize(baseFontSize: number, width: number, height: number,
  radius: number, innerRadius: number, outerRadius: number, angle: number) {
  if (!(width > 0) || !(height > 0)) return baseFontSize;
  const halfAngle = Math.min(89, angle / 2) * Math.PI / 180;
  const fits = (scale: number) => {
    const near = radius - width * scale / 2;
    const far = radius + width * scale / 2;
    const halfHeight = height * scale / 2;
    return near >= innerRadius + 6
      && Math.hypot(far, halfHeight) <= outerRadius - 8
      && halfHeight + 5 <= near * Math.tan(halfAngle);
  };
  if (fits(1)) return baseFontSize;
  let low = 0, high = 1;
  for (let iteration = 0; iteration < 24; iteration++) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle; else high = middle;
  }
  return Math.max(1, Math.floor(baseFontSize * low * 10) / 10);
}
