function parseHex(color: string): [number, number, number] | null {
  const raw = color.trim().replace(/^#/, "");
  const hex = /^[\da-f]{3}$/i.test(raw)
    ? raw.split("").map((channel) => channel + channel).join("")
    : raw;
  if (!/^[\da-f]{6}$/i.test(hex)) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
}

function luminance(channels: [number, number, number]): number {
  const [red, green, blue] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function whiteContrast(channels: [number, number, number]): number {
  return 1.05 / (luminance(channels) + 0.05);
}

function toHex(channels: [number, number, number]): string {
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/** Only change the rendered fill when a white label would be hard to read. */
export function wheelButtonBackgroundForWhiteText(
  background: string,
  renderedTextColor: string,
  minimumContrast = 4.5,
): string {
  if (!["#fff", "#ffffff"].includes(renderedTextColor.trim().toLowerCase())) return background;
  const channels = parseHex(background);
  if (!channels || whiteContrast(channels) >= minimumContrast) return background;

  let safeFactor = 0;
  let unsafeFactor = 1;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const factor = (safeFactor + unsafeFactor) / 2;
    const candidate = channels.map((channel) => Math.round(channel * factor)) as [number, number, number];
    if (whiteContrast(candidate) >= minimumContrast) safeFactor = factor;
    else unsafeFactor = factor;
  }
  return toHex(channels.map((channel) => Math.round(channel * safeFactor)) as [number, number, number]);
}

export function whiteWheelButtonContrast(background: string): number {
  const channels = parseHex(background);
  return channels ? whiteContrast(channels) : 0;
}
