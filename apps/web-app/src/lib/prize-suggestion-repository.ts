import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { PrizeSuggestion } from "@/lib/types";

type PrizeSuggestionRow = {
  id: string;
  industry: string;
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
  "industry" | "label" | "description" | "probability" | "estimatedUnitCost" | "icon" | "isActive" | "sortOrder"
>;

function toPrizeSuggestion(row: PrizeSuggestionRow): PrizeSuggestion {
  return {
    id: row.id,
    industry: row.industry,
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

export function validatePrizeSuggestionInput(input: Partial<PrizeSuggestionInput>) {
  const industry = normalizeIndustry(String(input.industry ?? ""));
  const label = String(input.label ?? "").trim().slice(0, 120);
  const description = String(input.description ?? "").trim().slice(0, 280);
  const probability = Number(input.probability);
  const estimatedUnitCost = Number(input.estimatedUnitCost ?? 0);
  const icon = String(input.icon ?? "gift").trim();
  const sortOrder = Number(input.sortOrder ?? 0);
  const isActive = input.isActive !== false;
  const validIcons = new Set(["coffee", "dessert", "drink", "discount", "supplement", "menu", "gift"]);

  if (!industry) throw new Error("Le secteur d'activité est requis.");
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
    label,
    description,
    probability,
    estimatedUnitCost,
    icon,
    isActive,
    sortOrder: Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0,
  } satisfies PrizeSuggestionInput;
}

export async function getPrizeSuggestions(industry: string, includeInactive = false) {
  if (!isSupabaseConfigured() || !normalizeIndustry(industry)) return [];

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("prize_suggestions")
    .select("*")
    .ilike("industry", normalizeIndustry(industry))
    // Surface the most likely prizes first in the merchant suggestion dialog.
    .order("probability", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error("Lecture des suggestions de lots impossible.");
  return ((data ?? []) as PrizeSuggestionRow[]).map(toPrizeSuggestion);
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
