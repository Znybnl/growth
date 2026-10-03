import type { WheelVisualSegment } from "@/lib/wheel-segments";

export const HALLOWEEN_WHEEL_TEMPLATE_ID = "halloween-gold" as const;
export const HALLOWEEN_WHEEL_BACKGROUND =
  "/images/templates/halloween-gold/background.webp";
export const HALLOWEEN_WHEEL_FRAME =
  "/images/templates/halloween-gold/frame-v2.webp";

/** Presentation only: retain every distinct configured reward and the actual result. */
export function halloweenWheelVisualSegments(
  segments: WheelVisualSegment[],
  winningSegmentId: string,
) {
  if (!segments.length) return segments;
  const baseId = (id: string) => id.replace(/-visual-\d+$/, "");
  const distinct = new Map<string, WheelVisualSegment>();
  for (const segment of segments) {
    if (!distinct.has(baseId(segment.id)))
      distinct.set(baseId(segment.id), segment);
  }
  const winner = segments.find((segment) => segment.id === winningSegmentId);
  if (winner) distinct.set(baseId(winner.id), winner);
  const count = Math.max(6, Math.ceil(distinct.size / 2) * 2);
  const requiredIds = new Set(
    [...distinct.values()].map((segment) => segment.id),
  );
  const visible = Array.from(
    { length: count },
    (_, index) => segments[Math.floor((index * segments.length) / count)],
  );
  for (const required of distinct.values()) {
    if (visible.some((segment) => segment.id === required.id)) continue;
    const replaceAt = visible.findIndex(
      (segment, index) =>
        (!requiredIds.has(segment.id) ||
          visible.some(
            (other, otherIndex) =>
              otherIndex !== index && other.id === segment.id,
          )) &&
        visible.some(
          (other, otherIndex) =>
            otherIndex !== index && baseId(other.id) === baseId(segment.id),
        ),
    );
    if (replaceAt >= 0) visible[replaceAt] = required;
  }
  return visible;
}
