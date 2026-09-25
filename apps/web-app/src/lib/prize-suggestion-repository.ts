import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import {
  BEAUTY_INDUSTRY,
  isBeautySubsector,
} from "@/lib/merchant-options";
import { PrizeSuggestion } from "@/lib/types";

type PrizeSuggestionRow = {
  id: string;
  industry: string;
  industry_subsector?: string | null;
  label: string;
  description: string;
  probability: number | string;
  estimated_unit_cost: number | string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PrizeSuggestionInput = Pick<
  PrizeSuggestion,
  | "industry"
  | "industrySubsector"
  | "label"
  | "description"
  | "probability"
  | "estimatedUnitCost"
  | "icon"
  | "isActive"
  | "sortOrder"
>;

function toPrizeSuggestion(row: PrizeSuggestionRow): PrizeSuggestion {
  return {
    id: row.id,
    industry: row.industry,
    industrySubsector: row.industry_subsector ?? undefined,
    label: row.label,
    description: row.description,
    probability: Number(row.probability),
    estimatedUnitCost: Number(row.estimated_unit_cost),
    icon: row.icon,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateId() {
  return `ps-${crypto.randomUUID().slice(0, 12)}`;
}

function normalizeIndustry(industry: string) {
  return industry.trim().slice(0, 80);
}

function industryAliases(industry: string) {
  const normalized = normalizeIndustry(industry);
  const key = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (key === "restaurant" || key === "restauration") {
    return ["Restauration", "restauration", "Restaurant", "restaurant"];
  }

  return [normalized];
}

export function validatePrizeSuggestionInput(input: Partial<PrizeSuggestionInput>) {
  const industry = normalizeIndustry(String(input.industry ?? ""));
  const label = String(input.label ?? "").trim().slice(0, 120);
  const description = String(input.description ?? "").trim().slice(0, 280);
  const probability = Number(input.probability);
  const estimatedUnitCost = Number(input.estimatedUnitCost ?? 0);
  const icon = String(input.icon ?? "gift").trim();
  const sortOrder = Number(input.sortOrder ?? 0);
  const isActive = input.isActive !== false;
  const industrySubsector = normalizeIndustry(String(input.industrySubsector ?? ""));
  const validIcons = new Set(["coffee", "dessert", "drink", "discount", "supplement", "menu", "gift"]);

  if (!industry) throw new Error("Le secteur d'activité est requis.");
  if (industrySubsector && (industry !== BEAUTY_INDUSTRY || !isBeautySubsector(industrySubsector))) {
    throw new Error("Le sous-secteur sélectionné n'est pas valide pour ce secteur.");
  }
  if (!label) throw new Error("Le nom du lot est requis.");
  if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
    throw new Error("La probabilité doit être comprise entre 0 et 100 %.");
  }
  if (!Number.isFinite(estimatedUnitCost) || estimatedUnitCost < 0) {
    throw new Error("Le coût estimé doit être positif ou nul.");
  }
  if (!validIcons.has(icon)) throw new Error("L'icône sélectionnée est invalide.");

  return {
    industry,
    industrySubsector: industrySubsector || undefined,
    label,
    description,
    probability,
    estimatedUnitCost,
    icon,
    isActive,
    sortOrder: Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0,
  } satisfies PrizeSuggestionInput;
}

async function fetchPrizeSuggestions(
  industry: string,
  industrySubsector: string | undefined,
  includeInactive: boolean,
  useSubsectorColumn = true,
) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("prize_suggestions")
    .select("*")
    .in("industry", industryAliases(industry))
    // Surface the most likely prizes first in the merchant suggestion dialog.
    .order("probability", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (useSubsectorColumn) {
    query = industrySubsector
      ? query.eq("industry_subsector", industrySubsector)
      : query.is("industry_subsector", null);
  }

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) {
    const columnUnavailable =
      error.code === "42703"
      || error.code === "PGRST204"
      || /industry_subsector.*(?:does not exist|schema cache|could not find)/i.test(error.message);
    if (useSubsectorColumn && columnUnavailable) {
      // Keep the legacy catalog readable until the additive migration is applied.
      return fetchPrizeSuggestions(industry, undefined, includeInactive, false);
    }
    throw new Error("Lecture des suggestions de lots impossible.");
  }
  const suggestions = ((data ?? []) as PrizeSuggestionRow[]).map(toPrizeSuggestion);
  return useSubsectorColumn
    ? suggestions
    : suggestions.filter((suggestion) => !suggestion.industrySubsector);
}

export async function getPrizeSuggestions(
  industry: string,
  includeInactive = false,
  industrySubsector?: string,
) {
  const normalizedIndustry = normalizeIndustry(industry);
  if (!isSupabaseConfigured() || !normalizedIndustry) return [];

  const requestedSubsector = normalizeIndustry(industrySubsector ?? "");
  if (requestedSubsector && (normalizedIndustry !== BEAUTY_INDUSTRY || !isBeautySubsector(requestedSubsector))) {
    throw new Error("Le sous-secteur sélectionné n'est pas valide pour ce secteur.");
  }

  const scopedSuggestions = await fetchPrizeSuggestions(
    normalizedIndustry,
    requestedSubsector || undefined,
    includeInactive,
  );
  if (scopedSuggestions.length || !requestedSubsector) return scopedSuggestions;

  // Keep the existing general Beauty catalog usable until a dedicated
  // catalog has been configured for the selected subsector.
  return fetchPrizeSuggestions(BEAUTY_INDUSTRY, undefined, includeInactive);
}

export async function getAllPrizeSuggestions() {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("prize_suggestions")
    .select("*")
    .order("industry", { ascending: true })
    .order("probability", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error("Lecture des suggestions de lots impossible.");
  return ((data ?? []) as PrizeSuggestionRow[]).map(toPrizeSuggestion);
}

export async function createPrizeSuggestion(input: PrizeSuggestionInput) {
  const value = validatePrizeSuggestionInput(input);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("prize_suggestions")
    .insert({
      id: generateId(),
      industry: value.industry,
      industry_subsector: value.industrySubsector ?? null,
      label: value.label,
      description: value.description,
      probability: value.probability,
      estimated_unit_cost: value.estimatedUnitCost,
      icon: value.icon,
      is_active: value.isActive,
      sort_order: value.sortOrder,
    })
    .select()
    .single();
  if (error || !data) throw new Error("Création de la suggestion impossible.");
  return toPrizeSuggestion(data as PrizeSuggestionRow);
}

export async function updatePrizeSuggestion(id: string, input: PrizeSuggestionInput) {
  const value = validatePrizeSuggestionInput(input);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("prize_suggestions")
    .update({
      industry: value.industry,
      industry_subsector: value.industrySubsector ?? null,
      label: value.label,
      description: value.description,
      probability: value.probability,
      estimated_unit_cost: value.estimatedUnitCost,
      icon: value.icon,
      is_active: value.isActive,
      sort_order: value.sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error("Mise à jour de la suggestion impossible.");
  return toPrizeSuggestion(data as PrizeSuggestionRow);
}

export async function deletePrizeSuggestion(id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("prize_suggestions").delete().eq("id", id);
  if (error) throw new Error("Suppression de la suggestion impossible.");
}
