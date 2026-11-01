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
  const addSideNotch = (centerY: number, side: "left" | "right") => {
    const steps = 12;
    for (let index = 0; index <= steps; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * index) / steps;
      const inset = 5.5 * Math.cos(angle);
      const y = centerY + 6 * Math.sin(angle);
      points.push([side === "right" ? 100 - inset : inset, y]);
    }
  };

  points.push([7, 2], [93, 2], [98, 6], [98, 17]);
  for (const center of [25, 50, 75]) {
    points.push([100, center - 6]);
    addSideNotch(center, "right");
    points.push([100, center + 6]);
  }
  points.push([98, 83], [98, 94], [93, 98], [7, 98], [2, 94], [2, 83]);
  for (const center of [75, 50, 25]) {
    points.push([0, center + 6]);
    const steps = 12;
    for (let index = 0; index <= steps; index += 1) {
      const angle = Math.PI / 2 - (Math.PI * index) / steps;
      points.push([5.5 * Math.cos(angle), center + 6 * Math.sin(angle)]);
    }
    points.push([0, center - 6]);
  }
  points.push([2, 17], [2, 6]);
  return polygon(points);
}

export const BRUSH_CLIP_PATH = createBrushClipPath();
export const SCALLOPED_TICKET_CLIP_PATH = createScallopedTicketClipPath();
