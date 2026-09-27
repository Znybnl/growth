function rgb(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, "");
  const expanded = /^[\da-f]{3}$/i.test(hex)
    ? hex.split("").map((digit) => digit + digit).join("")
    : hex;
  if (!/^[\da-f]{6}$/i.test(expanded)) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16)) as [number, number, number];
}

function luminance(color: string): number | null {
  const channels = rgb(color);
  if (!channels) return null;
  const [red, green, blue] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function contrastRatio(first: string, second: string): number {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  if (firstLuminance === null || secondLuminance === null) return 0;
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Keep the chosen text color when readable; otherwise use a contrasting neutral. */
export function legibleSegmentTextColor(background: string, preferred?: string, dark = "#111827"): string {
  if (preferred && contrastRatio(background, preferred) >= 4.5) return preferred;
  const darkContrast = contrastRatio(background, dark);
  const whiteContrast = contrastRatio(background, "#ffffff");
  if (darkContrast >= 4.5 || whiteContrast >= 4.5) {
    return darkContrast >= whiteContrast ? dark : "#ffffff";
  }
  return contrastRatio(background, "#000000") >= whiteContrast ? "#000000" : "#ffffff";
}
