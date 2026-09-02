"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

type CampaignOption = {
  id: string;
  title: string;
  scans: number;
  isActive?: boolean;
};

type DataCampaignSelectorProps = {
  campaigns: CampaignOption[];
  selectedCampaignId: string;
  query?: string;
  emailStatus?: "attention";
};

export function DataCampaignSelector({ campaigns, selectedCampaignId, query, emailStatus }: DataCampaignSelectorProps) {
  const router = useRouter();
  const selectorRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);
  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.title.toLocaleLowerCase("fr-FR").includes(search.trim().toLocaleLowerCase("fr-FR")),
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!selectorRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function selectCampaign(campaignId: string) {
    const params = new URLSearchParams({ campaign: campaignId });
    if (query) params.set("q", query);
    if (emailStatus) params.set("emailStatus", emailStatus);
    setIsOpen(false);
    setSearch("");
    startTransition(() => router.push(`/data?${params.toString()}`));
  }

  return (
    <div ref={selectorRef} className="relative min-w-0 flex-1" aria-busy={isPending}>
      <p className="okado-label mb-2">Campagne analysée</p>
      <button type="button" id="data-campaign" aria-haspopup="listbox" aria-expanded={isOpen} disabled={isPending} onClick={() => setIsOpen((open) => !open)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[4px] border border-border bg-white px-4 text-left outline-none transition hover:border-aubergine focus:border-aubergine focus:ring-2 focus:ring-aubergine/15 disabled:cursor-wait disabled:opacity-60">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-carbon">{selectedCampaign?.title ?? "Sélectionner une campagne"}</span>
          {selectedCampaign ? <span className="mt-0.5 block text-xs text-ash">{selectedCampaign.isActive === false ? "Terminée" : "Active"} · {selectedCampaign.scans.toLocaleString("fr-FR")} participations</span> : null}
        </span>
        {isPending ? <Loader2 className="size-4 shrink-0 animate-spin text-aubergine" aria-hidden="true" /> : <ChevronDown className="size-4 shrink-0 text-ash" aria-hidden="true" />}
      </button>

      {isOpen ? <div className="absolute inset-x-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[8px] border border-lavender-mist bg-white shadow-[0_16px_36px_rgba(72,26,84,0.16)]">
        <div className="border-b border-border p-2">
          <label className="flex items-center gap-2 rounded-[4px] border border-border bg-soft-white px-3 focus-within:border-aubergine focus-within:ring-2 focus-within:ring-aubergine/15">
            <Search className="size-4 shrink-0 text-ash" aria-hidden="true" />
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une campagne" className="h-9 min-w-0 flex-1 bg-transparent text-sm text-carbon outline-none placeholder:text-ash" />
          </label>
        </div>
        <div className="max-h-72 overflow-y-auto p-1" role="listbox" aria-labelledby="data-campaign">
          {filteredCampaigns.length ? filteredCampaigns.map((campaign) => {
            const isSelected = campaign.id === selectedCampaignId;
            return <button key={campaign.id} type="button" role="option" aria-selected={isSelected} onClick={() => selectCampaign(campaign.id)} className="flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-left transition hover:bg-purple-haze focus:bg-purple-haze focus:outline-none">
              <span className={`grid size-5 shrink-0 place-items-center rounded-[4px] ${isSelected ? "bg-aubergine text-white" : "border border-border text-transparent"}`}><Check className="size-3" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-carbon">{campaign.title}</span><span className="mt-0.5 block text-xs text-ash">{campaign.isActive === false ? "Terminée" : "Active"} · {campaign.scans.toLocaleString("fr-FR")} participations</span></span>
            </button>;
          }) : <p className="px-3 py-6 text-center text-sm text-ash">Aucune campagne trouvée.</p>}
        </div>
      </div> : null}
    </div>
  );
}
