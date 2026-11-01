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
  const addPerforatedEdge = (top: boolean) => {
    const teeth = 18;
    for (let index = 0; index <= teeth; index += 1) {
      const x = top ? 4 + (92 * index) / teeth : 96 - (92 * index) / teeth;
      const outer = index % 2 === 0;
      points.push([x, top ? (outer ? 2 : 6) : (outer ? 98 : 94)]);
    }
  };
  const addSideNotch = (centerY: number, side: "left" | "right") => {
    const steps = 12;
    for (let index = 0; index <= steps; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * index) / steps;
      const inset = 4.5 * Math.cos(angle);
      const y = centerY + 5 * Math.sin(angle);
      points.push([side === "right" ? 100 - inset : inset, y]);
    }
  };

  points.push([4, 5]);
  addPerforatedEdge(true);
  points.push([98, 8], [100, 15]);
  for (const center of [25, 50, 75]) {
    points.push([100, center - 5]);
    addSideNotch(center, "right");
    points.push([100, center + 5]);
  }
  points.push([100, 85], [98, 92]);
  addPerforatedEdge(false);
  points.push([2, 92], [0, 85]);
  for (const center of [75, 50, 25]) {
    points.push([0, center + 5]);
    const steps = 12;
    for (let index = 0; index <= steps; index += 1) {
      const angle = Math.PI / 2 - (Math.PI * index) / steps;
      points.push([4.5 * Math.cos(angle), center + 5 * Math.sin(angle)]);
    }
  }
  points.push([0, 15], [2, 8]);
  return polygon(points);
}

export const BRUSH_CLIP_PATH = createBrushClipPath();
export const SCALLOPED_TICKET_CLIP_PATH = createScallopedTicketClipPath();
