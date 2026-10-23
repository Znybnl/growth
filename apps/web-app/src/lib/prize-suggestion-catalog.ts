import type { PrizeSuggestion } from "@/lib/types";

/** Validate the network boundary before either library or recipes render it.
 * A malformed response is an error, not a genuine empty activity catalog. */
export function parsePrizeSuggestionCatalog(payload: unknown): PrizeSuggestion[] {
  if (!payload || typeof payload !== "object" || !("suggestions" in payload)
    || !Array.isArray(payload.suggestions)) throw new Error("Catalogue invalide");
  const ids = new Set<string>();
  for (const item of payload.suggestions) {
    if (!item || typeof item !== "object"
      || typeof item.id !== "string" || !item.id.trim() || ids.has(item.id)
      || typeof item.label !== "string" || !item.label.trim()
      || typeof item.description !== "string" || typeof item.industry !== "string"
      || (item.industrySubsector !== undefined && typeof item.industrySubsector !== "string")
      || typeof item.icon !== "string" || typeof item.isActive !== "boolean"
      || !Number.isFinite(item.sortOrder)
      || !Number.isFinite(item.probability) || item.probability < 0 || item.probability > 100
      || !Number.isFinite(item.estimatedUnitCost) || item.estimatedUnitCost < 0) {
      throw new Error("Catalogue invalide");
    }
    ids.add(item.id);
  }
  return payload.suggestions;
}
