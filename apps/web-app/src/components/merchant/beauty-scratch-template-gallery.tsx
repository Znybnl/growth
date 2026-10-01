import { BEAUTY_SCRATCH_TEMPLATES, type BeautyScratchTemplateId } from "@/lib/beauty-scratch-templates";

export function BeautyScratchTemplateGallery({
  selectedTemplateId,
  onSelect,
}: {
  selectedTemplateId?: string;
  onSelect: (templateId: BeautyScratchTemplateId) => void;
}) {
  return (
    <section aria-labelledby="beauty-scratch-templates-title" className="mb-6">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7b8496]">Collection beauté &amp; bien-être</p>
        <h3 id="beauty-scratch-templates-title" className="mt-1 text-lg font-semibold text-[#182033]">
          Des cartes à gratter pensées pour votre univers
        </h3>
      </div>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        {BEAUTY_SCRATCH_TEMPLATES.map((template) => {
          const selected = selectedTemplateId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(template.id)}
              className={`overflow-hidden rounded-[16px] border bg-white text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine ${selected ? "border-aubergine ring-1 ring-aubergine" : "border-[#e2e8f0]"}`}
            >
              <span
                aria-hidden="true"
                className="relative block aspect-[0.68/1] overflow-hidden bg-cover bg-center"
                style={{ backgroundImage: `url("${template.background}")` }}
              >
                <span className="absolute inset-0 flex flex-col items-center px-3 pb-4 pt-7 text-center">
                  <span className={`${template.fontClass} max-w-full truncate text-[12px] font-semibold`} style={{ color: template.text }}>
                    Votre établissement
                  </span>
                  <span className={`${template.fontClass} mt-3 line-clamp-3 max-w-[92%] text-[17px] leading-[1.05]`} style={{ color: template.text }}>
                    {template.sampleHeadline}
                  </span>
                  <span className="mt-2 max-w-[90%] text-[8px] uppercase tracking-[0.12em]" style={{ color: template.text }}>
                    {template.sampleSubline}
                  </span>
                  <span
                    className="mt-5 block aspect-square w-[67%] rounded-full border border-white/90 bg-cover bg-center shadow-[0_5px_12px_rgba(48,39,28,.16)]"
                    style={{ backgroundImage: `url("${template.scratch.texture}")` }}
                  />
                  <span className="mt-auto pt-3 text-[7px] leading-tight" style={{ color: template.text }}>
                    Le résultat s&apos;affiche automatiquement.
                  </span>
                </span>
              </span>
              <span className="block px-3 py-3">
                <span className="block text-sm font-semibold text-[#182033]">{template.name}</span>
                <span className="mt-1 block text-xs leading-5 text-[#8993a6]">{template.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
