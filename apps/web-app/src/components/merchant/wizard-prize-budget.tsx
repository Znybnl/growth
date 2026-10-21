"use client";

import { Wallet } from "lucide-react";
import { calculatePrizeBudget } from "@/lib/prize-budget";
import type { CampaignSetupInput } from "@/lib/types";

const euros = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
export function WizardPrizeBudget({ prizes, onEdit }: { prizes: CampaignSetupInput["prizes"]; onEdit: (index: number) => void }) {
  const budget = calculatePrizeBudget(prizes);
  return <section aria-labelledby="wizard-prize-budget-title" data-testid="wizard-prize-budget" style={{ scrollMarginTop: "calc(var(--wizard-toolbar-height, 0px) + 1rem)" }} className="rounded-[14px] border border-[#e8e2ea] bg-white p-4 sm:p-5">
    <h3 id="wizard-prize-budget-title" className="flex items-center gap-2 text-sm font-semibold text-[#242126]"><Wallet className="size-4 text-[#64206f]" aria-hidden="true" />Budget estimé des gains</h3>
    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg bg-[#f6f0fa] p-3"><dt className="text-xs leading-5 text-[#716b78]">Coût moyen théorique par participation</dt><dd data-testid="wizard-budget-average" className="mt-1 text-lg font-semibold tabular-nums text-[#471550]">{budget.average === null ? "—" : euros(budget.average)}</dd></div>
      <div className="rounded-lg bg-[#faf8fb] p-3"><dt className="text-xs leading-5 text-[#716b78]">Projection pour 100 participations</dt><dd data-testid="wizard-budget-projection" className="mt-1 text-lg font-semibold tabular-nums text-[#242126]">{budget.projection100 === null ? "—" : euros(budget.projection100)}</dd></div>
    </dl>
    {!budget.valid ? <p className="mt-3 text-sm text-[#b42318]">Corrigez les chances de gain pour calculer le budget.</p> : null}
    {!budget.complete ? <div role="status" className="mt-3 rounded-lg bg-[#fff5e5] p-3 text-sm leading-5 text-[#714400]">
      <p className="font-semibold">Estimation incomplète</p><p>{budget.missingCostIndexes.length} lot{budget.missingCostIndexes.length > 1 ? "s" : ""} sans coût renseigné. Un coût inconnu n’est pas un coût nul.</p>
      <ul className="mt-2 flex flex-wrap gap-2">{budget.missingCostIndexes.map((index) => <li key={prizes[index].id ?? index} className="min-w-0 max-w-full"><button type="button" onClick={() => onEdit(index)} className="max-w-full break-words rounded border border-[#dbbc82] bg-white px-3 py-2 text-left text-xs font-semibold [overflow-wrap:anywhere]" aria-label={`Renseigner le coût de ${prizes[index].label || `lot ${index + 1}`}`}>{prizes[index].label || `Lot ${index + 1}`}</button></li>)}</ul>
    </div> : null}
    <p className="mt-3 text-xs leading-5 text-[#716b78]">Estimation indicative, basée sur les probabilités et les coûts saisis, dans l’hypothèse où tous les gains attribués sont utilisés.</p>
    <p className="mt-1 text-xs leading-5 text-[#716b78]">Le montant réel peut varier selon les retraits, les stocks et les coûts effectivement supportés.{budget.hasLimitedStock ? " Certains stocks sont limités : cette projection n’est ni un plafond de dépense ni une garantie du coût réel." : ""}</p>
  </section>;
}
