import Image from "next/image";

import { TRAVEL_SCRATCH_THEMES } from "@/lib/travel-scratch-themes";
import type { GamePageTemplateId } from "@/lib/types";
import { GameTemplateCard } from "./game-template-card";

export function TravelScratchTemplateGallery({
  selectedTemplateId,
  onSelect,
}: {
  selectedTemplateId?: string;
  onSelect: (templateId: GamePageTemplateId) => void;
}) {
  return (
    <section aria-labelledby="travel-scratch-templates-title" className="space-y-3">
      <h3 id="travel-scratch-templates-title" className="text-base font-semibold text-carbon">
        Templates Voyage
      </h3>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3" data-testid="travel-scratch-template-options">
        {TRAVEL_SCRATCH_THEMES.map((theme) => (
          <GameTemplateCard
            key={theme.id}
            label={theme.name}
            description={theme.description}
            selected={selectedTemplateId === theme.id}
            onSelect={() => onSelect(theme.id)}
          >
            <div className="relative flex h-full items-center justify-center overflow-hidden bg-cover bg-center p-2" style={{ backgroundImage: `url("${theme.artwork}")` }}>
              <div aria-hidden="true" className="absolute inset-0 bg-black/5" />
              <div className="relative flex h-[144px] w-[96px] shrink-0 flex-col items-center overflow-hidden rounded-[11px] border border-white/80 bg-cover bg-center px-2 pb-2 pt-3 text-center shadow-[0_9px_22px_rgba(33,28,41,.28)]" style={{ backgroundImage: `url("${theme.artwork}")`, color: theme.text }}>
                <span className={`${theme.fontClass} max-w-full truncate text-[5px] font-semibold`}>Votre établissement</span>
                <span className={`${theme.fontClass} mt-2 line-clamp-2 max-w-full text-[11px] font-semibold leading-[1.05]`}>{theme.sampleHeadline}</span>
                <span className="mt-1 max-w-full line-clamp-2 text-[4px] leading-tight">{theme.sampleSubline}</span>
                <span className="relative mt-auto flex h-[43px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] border shadow-sm" style={{ background: `linear-gradient(135deg, ${theme.scratch.base}, ${theme.scratch.highlight} 48%, ${theme.scratch.base})`, borderColor: theme.scratch.edge }}>
                  <Image src="/images/scratch-templates/beauty-foil-nude.webp" alt="" fill sizes="64px" className="object-cover opacity-25 mix-blend-soft-light" />
                  <span className="relative z-10 px-1 text-[5px] font-semibold leading-tight text-white">À découvrir</span>
                </span>
              </div>
            </div>
          </GameTemplateCard>
        ))}
      </div>
    </section>
  );
}
