"use client";

import { Coffee, Gift, Percent, Pizza, Plus, Save, Soup, Sparkles, Trash2, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { INDUSTRY_OPTIONS } from "@/lib/merchant-options";
import { PrizeSuggestion } from "@/lib/types";

type SuggestionForm = Omit<PrizeSuggestion, "id" | "createdAt" | "updatedAt">;

const ICON_OPTIONS = [
  { value: "coffee", label: "Café", Icon: Coffee },
  { value: "dessert", label: "Dessert", Icon: Sparkles },
  { value: "drink", label: "Boisson", Icon: Soup },
  { value: "discount", label: "Réduction", Icon: Percent },
  { value: "supplement", label: "Supplément", Icon: Pizza },
  { value: "menu", label: "Menu", Icon: UtensilsCrossed },
  { value: "gift", label: "Cadeau", Icon: Gift },
] as const;

function createEmptyForm(industry = "Restauration"): SuggestionForm {
  return {
    industry,
    label: "",
    description: "",
    probability: 10,
    estimatedUnitCost: 0,
    icon: "gift",
    isActive: true,
    sortOrder: 100,
  };
}

export function PrizeSuggestionsManager({ initialSuggestions }: { initialSuggestions: PrizeSuggestion[] }) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<SuggestionForm>(createEmptyForm());
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selected = useMemo(
    () => suggestions.find((suggestion) => suggestion.id === selectedId) ?? null,
    [selectedId, suggestions],
  );

  function startCreate() {
    setSelectedId(null);
    setForm(createEmptyForm(form.industry));
    setMessage(null);
  }

  function startEdit(suggestion: PrizeSuggestion) {
    setSelectedId(suggestion.id);
    setForm({
      industry: suggestion.industry,
      label: suggestion.label,
      description: suggestion.description,
      probability: suggestion.probability,
      estimatedUnitCost: suggestion.estimatedUnitCost,
      icon: suggestion.icon,
      isActive: suggestion.isActive,
      sortOrder: suggestion.sortOrder,
    });
    setMessage(null);
  }

  function updateForm<Key extends keyof SuggestionForm>(key: Key, value: SuggestionForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(
        selected ? `/api/admin/prize-suggestions/${selected.id}` : "/api/admin/prize-suggestions",
        {
          method: selected ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const payload = (await response.json()) as { error?: string; suggestion?: PrizeSuggestion };
      if (!response.ok || !payload.suggestion) throw new Error(payload.error ?? "Enregistrement impossible.");

      setSuggestions((current) =>
        selected
          ? current.map((item) => (item.id === payload.suggestion!.id ? payload.suggestion! : item))
          : [...current, payload.suggestion!].sort((a, b) =>
              `${a.industry}-${a.sortOrder}`.localeCompare(`${b.industry}-${b.sortOrder}`, "fr"),
            ),
      );
      setSelectedId(payload.suggestion.id);
      setMessage("Suggestion enregistrée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(suggestion: PrizeSuggestion) {
    if (!window.confirm(`Supprimer « ${suggestion.label} » ?`)) return;
    setMessage(null);
    const response = await fetch(`/api/admin/prize-suggestions/${suggestion.id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Suppression impossible.");
      return;
    }
    setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
    if (selectedId === suggestion.id) startCreate();
  }

  return (
    <div className="w-full space-y-6 px-1 pb-8">
      <header className="flex flex-col gap-4 py-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="okado-label">Administration</p>
          <h1 className="okado-page-title mt-3">Suggestions de lots</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ash">
            Configurez les dotations proposées aux commerçants selon leur secteur d&apos;activité.
          </p>
        </div>
        <Button type="button" onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter une suggestion
        </Button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="okado-card overflow-hidden">
          <div className="border-b border-[#e8edf5] px-5 py-4">
            <p className="text-sm font-semibold text-graphite">Catalogue actif et brouillons</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {suggestions.map((suggestion) => {
              const icon = ICON_OPTIONS.find((item) => item.value === suggestion.icon) ?? ICON_OPTIONS.at(-1)!;
              const Icon = icon.Icon;
              return (
                <article key={suggestion.id} className="rounded-[18px] border border-[#e3eaf3] bg-white p-4 shadow-[0_8px_20px_rgba(18,24,39,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#eef4ff] text-[#2563eb]"><Icon className="h-5 w-5" /></span>
                      <div className="min-w-0"><p className="truncate font-semibold text-graphite">{suggestion.label}</p><p className="text-xs text-ash">{suggestion.industry}</p></div>
                    </div>
                    <span className={`okado-status-badge ${suggestion.isActive ? "bg-[#ecfdf3] text-[#047857]" : "bg-[#f3f6fb] text-[#64748b]"}`}>{suggestion.isActive ? "Active" : "Masquée"}</span>
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-ash">{suggestion.description || "Sans description"}</p>
                  <div className="mt-4 flex items-center justify-between text-xs font-medium text-[#52627b]"><span>{suggestion.probability} % suggéré</span><span>{suggestion.estimatedUnitCost.toLocaleString("fr-FR")} €</span></div>
                  <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => startEdit(suggestion)}>Modifier</Button><Button type="button" variant="outline" size="icon" aria-label={`Supprimer ${suggestion.label}`} onClick={() => remove(suggestion)} className="text-[#b42318]"><Trash2 className="h-4 w-4" /></Button></div>
                </article>
              );
            })}
            {!suggestions.length ? <p className="col-span-full px-2 py-12 text-center text-sm text-ash">Aucune suggestion. Ajoutez le premier lot pour un secteur.</p> : null}
          </div>
        </section>

        <aside className="okado-card h-fit p-5">
          <p className="okado-label">{selected ? "Modifier" : "Nouvelle suggestion"}</p>
          <h2 className="okado-section-title mt-2">{selected ? selected.label : "Ajouter un lot"}</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-[#44516a]">Secteur<select value={form.industry} onChange={(event) => updateForm("industry", event.target.value)} className="mt-2 w-full"><option value="">Choisir un secteur</option>{INDUSTRY_OPTIONS.map((industry) => <option key={industry} value={industry}>{industry}</option>)}</select></label>
            <label className="block text-sm font-medium text-[#44516a]">Nom du lot<input value={form.label} onChange={(event) => updateForm("label", event.target.value)} className="mt-2 w-full" placeholder="Ex. Un dessert offert" /></label>
            <label className="block text-sm font-medium text-[#44516a]">Description<textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} className="mt-2 min-h-24 w-full" placeholder="Décrivez l'intérêt du lot." /></label>
            <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-[#44516a]">Probabilité (%)<input type="number" min="0" max="100" value={form.probability} onChange={(event) => updateForm("probability", Number(event.target.value))} className="mt-2 w-full" /></label><label className="text-sm font-medium text-[#44516a]">Coût estimé (€)<input type="number" min="0" step="0.01" value={form.estimatedUnitCost} onChange={(event) => updateForm("estimatedUnitCost", Number(event.target.value))} className="mt-2 w-full" /></label></div>
            <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-[#44516a]">Icône<select value={form.icon} onChange={(event) => updateForm("icon", event.target.value)} className="mt-2 w-full">{ICON_OPTIONS.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select></label><label className="text-sm font-medium text-[#44516a]">Ordre<input type="number" value={form.sortOrder} onChange={(event) => updateForm("sortOrder", Number(event.target.value))} className="mt-2 w-full" /></label></div>
            <label className="flex items-center gap-3 rounded-[14px] border border-[#e3eaf3] bg-[#f8fafc] px-3 py-3 text-sm font-medium text-[#44516a]"><input type="checkbox" checked={form.isActive} onChange={(event) => updateForm("isActive", event.target.checked)} /> Afficher aux commerçants</label>
            {message ? <p className={`rounded-[14px] px-3 py-2 text-sm ${message === "Suggestion enregistrée." ? "bg-[#ecfdf3] text-[#047857]" : "bg-[#fff1f2] text-[#b42318]"}`}>{message}</p> : null}
            <Button type="button" onClick={save} disabled={isSaving} className="w-full gap-2"><Save className="h-4 w-4" />{isSaving ? "Enregistrement..." : "Enregistrer"}</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
