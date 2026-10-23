export type WheelVisualSegment = {
  id: string;
  label: string;
  tone: "win" | "lose";
};

/** Presentation only: never hide a distinct reward to meet a visual sector target. */
export function selectWheelVisualSegments(
  segments: WheelVisualSegment[],
  winningSegmentId: string,
  targetCount = 8,
): WheelVisualSegment[] {
  if (!segments.length) return [];
  const baseId = (segment: WheelVisualSegment) => segment.id.replace(/-visual-\d+$/, "");
  const required = new Map<string, WheelVisualSegment>();
  for (const segment of segments) {
    if (!required.has(baseId(segment))) required.set(baseId(segment), segment);
  }
  const winner = segments.find((segment) => segment.id === winningSegmentId);
  if (winner) required.set(baseId(winner), winner);
  const target = Number.isFinite(targetCount) ? Math.max(1, Math.floor(targetCount)) : 8;
  const count = Math.min(segments.length, Math.max(target, required.size));
  const visible = segments.slice(0, count);
  const requiredIds = new Set([...required.values()].map((segment) => segment.id));
  for (const segment of required.values()) {
    if (visible.some((item) => item.id === segment.id)) continue;
    // Only replace a repeated visual copy, never another required reward/result.
    const replaceAt = visible.findLastIndex((item) => !requiredIds.has(item.id));
    if (replaceAt >= 0) visible[replaceAt] = segment;
  }
  return visible;
}

/** Rose poudré targets eight sectors, retaining every reward and the exact result. */
export function rosePowderVisualSegments(segments: WheelVisualSegment[], winningSegmentId: string): WheelVisualSegment[] {
  return selectWheelVisualSegments(segments, winningSegmentId, 8);
}

type WheelPrizeInput = {
  id: string;
  label: string;
  probability: number;
};

/** Builds ten visual slices from the configured odds without changing the actual draw logic. */
export function buildWheelVisualSegments(prizes: WheelPrizeInput[]): WheelVisualSegment[] {
  const minimumSegmentCount = 10;
  const eligiblePrizes = prizes.filter(
    (prize) => prize.label.trim() && Number.isFinite(prize.probability) && prize.probability > 0,
  );
  const winningProbability = eligiblePrizes.reduce(
    (total, prize) => total + prize.probability,
    0,
  );
  const lossProbability = Math.max(0, 100 - winningProbability);
  const buckets = [
    ...eligiblePrizes.map((prize) => ({
      id: prize.id,
      label: prize.label.trim().toUpperCase(),
      tone: "win" as const,
      weight: prize.probability,
    })),
    ...(lossProbability > 0 || eligiblePrizes.length === 0
      ? [{ id: "lose", label: "PERDU", tone: "lose" as const, weight: Math.max(1, lossProbability) }]
      : []),
  ];

  if (!buckets.length) {
    return [];
  }

  const slotCount = Math.max(minimumSegmentCount, buckets.length);
  const denominator = Math.max(100, winningProbability);
  const counts = buckets.map(() => 1);
  const idealCounts = buckets.map((bucket) => (bucket.weight / denominator) * slotCount);

  while (counts.reduce((total, count) => total + count, 0) < slotCount) {
    let selectedIndex = 0;
    let highestDifference = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < buckets.length; index += 1) {
      const difference = idealCounts[index] - counts[index];
      if (difference > highestDifference) {
        highestDifference = difference;
        selectedIndex = index;
      }
    }

    counts[selectedIndex] += 1;
  }

  // Smooth weighted round-robin spreads repeated rewards around the wheel.
  const scores = buckets.map(() => 0);
  const remaining = [...counts];
  const occurrences = buckets.map(() => 0);
  const segments: WheelVisualSegment[] = [];

  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    for (let index = 0; index < buckets.length; index += 1) {
      if (remaining[index] > 0) {
        scores[index] += counts[index];
      }
    }

    let selectedIndex = -1;
    let highestScore = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < buckets.length; index += 1) {
      if (remaining[index] > 0 && scores[index] > highestScore) {
        highestScore = scores[index];
        selectedIndex = index;
      }
    }

    const bucket = buckets[selectedIndex];
    const occurrence = occurrences[selectedIndex];
    occurrences[selectedIndex] += 1;
    remaining[selectedIndex] -= 1;
    scores[selectedIndex] -= slotCount;

    segments.push({
      id: occurrence === 0 ? bucket.id : `${bucket.id}-visual-${occurrence}`,
      label:
        bucket.tone === "lose" ? (occurrence % 2 === 0 ? "PERDU" : "DOMMAGE") : bucket.label,
      tone: bucket.tone,
    });
  }

  return segments;
}
