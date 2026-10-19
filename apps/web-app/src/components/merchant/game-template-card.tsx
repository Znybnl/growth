import type { ReactNode } from "react";

export function GameTemplateCard({ label, description, selected, onSelect, children }: {
  label: string; description: string; selected: boolean; onSelect: () => void; children: ReactNode;
}) {
  return <button type="button" aria-pressed={selected} onClick={onSelect} data-testid="game-template-card"
    className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white text-left transition hover:border-aubergine/50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aubergine ${selected ? "border-aubergine ring-2 ring-aubergine/15" : "border-border"}`}>
    <div data-testid="game-template-art" aria-hidden="true" className="relative h-40 w-full shrink-0 overflow-hidden">{children}</div>
    <div className="flex w-full flex-1 items-start justify-between gap-2 px-4 py-3">
      <span className="min-w-0"><span className="block text-sm font-semibold text-carbon">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-charcoal">{description}</span></span>
      {selected ? <span className="shrink-0 rounded-full bg-purple-haze px-2 py-0.5 text-[10px] font-semibold text-aubergine">Sélectionné</span> : null}
    </div>
  </button>;
}
