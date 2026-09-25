import { BEAUTY_WHEEL_THEMES, beautyWheelBackground, type BeautyWheelTemplateId } from "@/lib/beauty-wheel-themes";
import { Pointer } from "lucide-react";
import { RoseFlowerMark, RosePowderDecor } from "@/components/public/rose-powder-decor";
import { textFontFamily } from "@/lib/format";
import type { GamePageTemplateId } from "@/lib/types";

const roseWheelPreviewBackground = "conic-gradient(from -25.7deg, #fffdfc 0deg 51.4deg, #f3cdd5 51.4deg 102.9deg, #e7aebb 102.9deg 154.3deg, #fffdfc 154.3deg 205.7deg, #f3cdd5 205.7deg 257.1deg, #e7aebb 257.1deg 308.6deg, #fffdfc 308.6deg 360deg)";

export function BeautyWheelTemplateGallery({
  selectedTemplateId,
  merchantName,
  onSelect,
}: {
  selectedTemplateId?: GamePageTemplateId;
  merchantName: string;
  onSelect: (templateId: BeautyWheelTemplateId) => void;
}) {
  return (
    <section aria-labelledby="beauty-wheel-templates-title" className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b3774]">Collection Beauté</p>
        <h3 id="beauty-wheel-templates-title" className="mt-1 text-base font-semibold text-[#241b2a]">Templates Beauté</h3>
        <p className="mt-1 text-sm text-[#69616c]">Six ambiances pour votre roue, personnalisables aux couleurs de votre établissement.</p>
      </div>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        {BEAUTY_WHEEL_THEMES.map((theme) => {
          const selected = selectedTemplateId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(theme.id)}
              className={`group min-w-0 overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b3774] ${selected ? "border-[#6b3774] ring-2 ring-[#6b3774]/15" : "border-[#ded8e1]"}`}
            >
              <div
                className={`relative h-40 overflow-hidden px-4 pt-3 ${theme.id === "beauty-rose" ? "okado-rose-powder-surface" : ""}`}
                style={{ backgroundColor: theme.background, backgroundImage: beautyWheelBackground(theme.id, theme.background, theme.primary), color: theme.text }}
              >
                {theme.id === "beauty-rose" ? <RosePowderDecor primaryColor={theme.primary} /> : null}
                <div className="relative z-10 max-w-[70%] truncate text-[10px] font-semibold tracking-[0.08em]">{merchantName}</div>
                <div className="relative z-10 mt-3 max-w-[80%] text-sm font-bold leading-tight" style={{ fontFamily: textFontFamily(theme.font), fontWeight: theme.id === "beauty-rose" ? 600 : undefined }}>Tournez la roue<br />et tentez de gagner</div>
                <div className="relative z-10 mt-1 text-[9px] opacity-75">Des surprises vous attendent</div>
                <div
                  aria-hidden="true"
                  className={`absolute -bottom-[6.4rem] right-[-1.5rem] h-44 w-44 rounded-full ${theme.id === "beauty-rose" ? "border-[2px]" : "border-[7px] border-white shadow-[0_8px_24px_rgba(0,0,0,.12)]"}`}
                  style={{ borderColor: theme.id === "beauty-rose" ? "#e7aebb" : undefined, background: theme.id === "beauty-rose" ? roseWheelPreviewBackground : `repeating-conic-gradient(from -22deg, ${theme.primary} 0deg 45deg, ${theme.secondary} 45deg 90deg)`, boxShadow: theme.id === "beauty-rose" ? "0 12px 30px rgba(90,45,60,.12), 0 0 0 4px #fffdfc, 0 0 0 5px #e7aebb" : undefined }}
                >
                  {theme.id === "beauty-rose" ? <svg className="absolute left-1/2 top-[-3px] h-8 w-6 -translate-x-1/2 overflow-visible" viewBox="0 0 48 64" aria-hidden="true"><path d="M24 2C35 2 43 10 43 22C43 36 31 50 24 62C17 50 5 36 5 22C5 10 13 2 24 2Z" fill="#b95f75" stroke="#fffdfc" strokeWidth="2" /></svg> : null}
                  <span className={`absolute left-1/2 top-1/2 flex ${theme.id === "beauty-rose" ? "h-[62px] w-[62px]" : "h-12 w-12"} -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full ${theme.id === "beauty-rose" ? "text-[10px]" : "text-[8px]"} font-bold ${theme.id === "beauty-rose" ? "border-2 border-[#e7aebb] text-[#b95f75] shadow-[0_2px_7px_rgba(90,45,60,.12)]" : "border-[3px] border-white text-white"}`} style={{ background: theme.id === "beauty-rose" ? "#fffdfc" : theme.primary }}>{theme.id === "beauty-rose" ? <RoseFlowerMark className="h-5 w-5" /> : <Pointer aria-hidden="true" className="h-4 w-4" />}JOUER</span>
                </div>
              </div>
              <div className="flex items-start justify-between gap-2 px-4 py-3">
                <span className="min-w-0"><span className="block text-sm font-semibold text-[#241b2a]">{theme.name}</span><span className="mt-0.5 block text-xs text-[#746c78]">{theme.tagline}</span></span>
                {selected ? <span className="shrink-0 rounded-full bg-[#f2e7f5] px-2 py-0.5 text-[10px] font-semibold text-[#6b3774]">Sélectionné</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
