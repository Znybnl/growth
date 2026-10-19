import { BEAUTY_SCRATCH_TEMPLATES, type BeautyScratchTemplateId } from "@/lib/beauty-scratch-templates";
import { GameTemplateCard } from "./game-template-card";

export function BeautyScratchTemplateGallery({
  selectedTemplateId,
  onSelect,
}: {
  selectedTemplateId?: string;
  onSelect: (templateId: BeautyScratchTemplateId) => void;
}) {
  return <section aria-labelledby="beauty-scratch-templates-title" className="space-y-3">
    <h3 id="beauty-scratch-templates-title" className="text-base font-semibold text-carbon">Templates Beauté</h3>
    <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
      {BEAUTY_SCRATCH_TEMPLATES.map(template => <GameTemplateCard key={template.id}
        label={template.name} description={template.description}
        selected={selectedTemplateId === template.id} onSelect={() => onSelect(template.id)}>
        <div aria-hidden="true" className="flex h-full items-center justify-center bg-cover bg-center p-2"
          style={{ backgroundImage: `url("${template.background}")` }}>
          <div className="flex h-[144px] w-[96px] shrink-0 flex-col items-center overflow-hidden rounded-[11px] border border-white/80 bg-cover bg-center px-2 pb-2 pt-3 text-center shadow-[0_9px_22px_rgba(33,28,41,.2)]"
            style={{ backgroundImage: `url("${template.background}")`, color: template.text }}>
            <span className={`${template.fontClass} max-w-full truncate text-[5px] font-semibold`}>Votre établissement</span>
            <span className={`${template.fontClass} mt-2 max-w-full text-[12px] leading-[1.05]`}>Grattez &amp;<br />gagnez</span>
            <span className="mt-1 max-w-full text-[4px] uppercase leading-tight tracking-[0.06em]">De belles surprises pour votre prochaine visite</span>
            <span className="mt-2 block aspect-square w-[67%] shrink-0 rounded-full border border-white/90 bg-cover bg-center shadow-sm"
              style={{ backgroundImage: `url("${template.scratch.texture}")` }} />
          </div>
        </div>
      </GameTemplateCard>)}
    </div>
  </section>;
}
