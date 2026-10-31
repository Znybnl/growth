function polygon(points: Array<[number, number]>) {
  return `polygon(${points.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(",")})`;
}

function brushEdgeNoise(progress: number) {
  return 1.8 * Math.sin(progress * Math.PI * 10 + 0.35)
    + 0.9 * Math.sin(progress * Math.PI * 18 + 1.1)
    + 0.45 * Math.sin(progress * Math.PI * 34 + 2.4);
}

function createBrushClipPath() {
  const points: Array<[number, number]> = [];
  const count = 100;
  for (let index = 0; index <= count; index += 1) {
    const progress = index / count;
    const x = 6 + progress * 88;
    points.push([x, 10 + brushEdgeNoise(progress)]);
  }
  for (let index = 0; index <= count; index += 1) {
    const progress = index / count;
    const y = 14 + progress * 72;
    points.push([96 + brushEdgeNoise(progress + 0.19), y]);
  }
  for (let index = 0; index <= count; index += 1) {
    const progress = index / count;
    const x = 94 - progress * 88;
    points.push([x, 90 - brushEdgeNoise(progress + 0.41)]);
  }
  for (let index = 0; index <= count; index += 1) {
    const progress = index / count;
    const y = 86 - progress * 72;
    points.push([4 - brushEdgeNoise(progress + 0.67), y]);
  }
  return polygon(points);
}

function createScallopedTicketClipPath() {
  const points: Array<[number, number]> = [];
  const count = 168;
  const sample = (from: number, to: number, edge: "top" | "right" | "bottom" | "left") => {
    for (let index = 0; index <= count; index += 1) {
      const progress = index / count;
      const along = from + (to - from) * progress;
      const wave = 3.2 * Math.cos(progress * Math.PI * 12);
      points.push(edge === "top" ? [along, 3.5 - wave]
        : edge === "right" ? [96 + wave, along]
          : edge === "bottom" ? [100 - along, 96 + wave]
            : [3.5 - wave, 100 - along]);
    }
  };
  sample(8, 92, "top");
  sample(8, 92, "right");
  sample(8, 92, "bottom");
  sample(8, 92, "left");
  return polygon(points);
}

export const BRUSH_CLIP_PATH = createBrushClipPath();
export const SCALLOPED_TICKET_CLIP_PATH = createScallopedTicketClipPath();
