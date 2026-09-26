import { BEAUTY_WHEEL_THEMES, beautyWheelBackground } from "@/lib/beauty-wheel-themes";
import { Pointer } from "lucide-react";
import { textFontFamily } from "@/lib/format";
import type { GamePageTemplateId } from "@/lib/types";

type BeautyTheme = (typeof BEAUTY_WHEEL_THEMES)[number];

function thumbnailSegmentColors(theme: BeautyTheme) {
  const softPrimary = `color-mix(in srgb, ${theme.primary} 28%, white)`;
  const palePrimary = `color-mix(in srgb, ${theme.primary} 14%, white)`;

  switch (theme.id) {
    case "beauty-rose":
      return [theme.secondary, "#f3cdd5", "#e7aebb", theme.secondary, "#f3cdd5", "#d58a9a", theme.secondary, "#e7aebb"];
    case "beauty-pop":
      return [theme.secondary, softPrimary, theme.secondary, theme.primary, palePrimary, theme.secondary, softPrimary, theme.primary];
    case "beauty-editorial":
      return [theme.secondary, "#fbf8f2", theme.primary, theme.secondary, "#fbf8f2", theme.primary, theme.secondary, "#fbf8f2"];
    case "beauty-tech":
      return [theme.secondary, softPrimary, "#34244e", theme.secondary, theme.primary, "#e7ddff", theme.secondary, "#34244e"];
    case "beauty-nude":
    case "beauty-botanical":
      return [theme.secondary, softPrimary, theme.secondary, palePrimary, softPrimary, theme.secondary, palePrimary, theme.secondary];
  }
}

function BeautyWheelThumbnail({ theme }: { theme: BeautyTheme }) {
  const colors = thumbnailSegmentColors(theme);
  const wedgeStops = colors
    .map((color, index) => `${color} ${index * 45}deg ${(index + 1) * 45}deg`)
    .join(", ");
  const ringColor = theme.id === "beauty-editorial" ? "#b99a68" : theme.id === "beauty-tech" ? "#d9ccff" : theme.id === "beauty-rose" ? "#d58a9a" : "#fffdfb";
  const centerTextColor = theme.id === "beauty-nude" || theme.id === "beauty-botanical" ? theme.text : "#fffdfc";

  return (
    <div
      aria-hidden="true"
      className="absolute -bottom-5 right-[-0.8rem] z-10 grid size-32 place-items-center rounded-full p-[3px]"
      style={{ backgroundColor: ringColor, boxShadow: `0 8px 22px color-mix(in srgb, ${theme.primary} 22%, transparent)` }}
    >
      <div
        className="relative size-full rounded-full border border-white/75"
        style={{ backgroundImage: `repeating-conic-gradient(from -22.5deg, transparent 0deg 44deg, rgba(255,255,255,.88) 44deg 45deg), conic-gradient(from -22.5deg, ${wedgeStops})` }}
      >
        <div
          className="absolute left-1/2 top-1/2 flex size-[2.55rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 text-[6px] font-semibold tracking-[0.04em]"
          style={{ backgroundColor: theme.primary, borderColor: ringColor, color: centerTextColor, boxShadow: `0 2px 6px color-mix(in srgb, ${theme.primary} 25%, transparent)` }}
        >
          {theme.id === "beauty-rose" ? (
            <svg viewBox="0 0 24 24" className="mb-0.5 size-[0.9rem]" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
              <ellipse cx="12" cy="7.5" rx="2.8" ry="4.2" />
              <ellipse cx="12" cy="7.5" rx="2.8" ry="4.2" transform="rotate(90 12 12)" />
              <ellipse cx="12" cy="7.5" rx="2.8" ry="4.2" transform="rotate(180 12 12)" />
              <ellipse cx="12" cy="7.5" rx="2.8" ry="4.2" transform="rotate(270 12 12)" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          ) : (
            <Pointer className="mb-0.5 size-[0.9rem]" strokeWidth={2} />
          )}
          <span>JOUER</span>
        </div>
      </div>
    </div>
  );
}

function BeautyThumbnailDecor({ theme }: { theme: BeautyTheme }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 size-full" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" focusable="false">
      {theme.id === "beauty-rose" ? <g fill={theme.primary} opacity=".1"><ellipse cx="275" cy="24" rx="62" ry="38" /><ellipse cx="20" cy="145" rx="50" ry="27" /></g> : null}
      {theme.id === "beauty-nude" ? <g fill="none" stroke={theme.primary} strokeLinecap="round"><path d="M226 -18 C300 14 316 51 321 83" opacity=".3" /><path d="M245 -23 C309 7 329 43 334 72" opacity=".18" /><path d="M12 147 C33 151 48 156 61 165" opacity=".16" /></g> : null}
      {theme.id === "beauty-botanical" ? <g fill={theme.primary} opacity=".11"><path d="M-18 115 C19 74 50 78 65 98 C44 129 17 137 -18 115Z" /><path d="M-10 145 C23 115 48 120 61 140 C37 162 15 163 -10 145Z" /><path d="M43 110 C28 121 14 130 -4 137" fill="none" stroke={theme.primary} strokeWidth="1.2" opacity=".48" /></g> : null}
      {theme.id === "beauty-pop" ? <g fill={theme.primary} opacity=".16"><circle cx="24" cy="36" r="18" /><circle cx="68" cy="18" r="6" /><path d="M238 28l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" /></g> : null}
      {theme.id === "beauty-editorial" ? <g><path d="M283 0h37v160h-28" fill={theme.primary} opacity=".06" /><path d="M260 18h40M260 24h26M14 137h44" fill="none" stroke="#b99a68" strokeWidth="1" opacity=".5" /></g> : null}
      {theme.id === "beauty-tech" ? <g fill="none" stroke="#d9ccff"><circle cx="296" cy="34" r="30" opacity=".16" /><circle cx="296" cy="34" r="42" opacity=".1" /><circle cx="45" cy="143" r="1.5" fill="#e8ddff" stroke="none" opacity=".7" /><circle cx="75" cy="26" r="1.5" fill="#e8ddff" stroke="none" opacity=".6" /></g> : null}
    </svg>
  );
}

function EclatWheelThumbnail() {
  return (
    <div
      aria-hidden="true"
      className="absolute -bottom-5 right-[-0.8rem] z-10 grid size-32 place-items-center rounded-full border-[5px] border-white p-1 shadow-[0_9px_24px_rgba(0,60,180,0.2)]"
      style={{ backgroundImage: "conic-gradient(from -22.5deg, #fff 0deg 45deg, #dce8ff 45deg 90deg, #fff 90deg 135deg, #dce8ff 135deg 180deg, #fff 180deg 225deg, #dce8ff 225deg 270deg, #fff 270deg 315deg, #dce8ff 315deg 360deg)" }}
    >
      <div className="relative size-full rounded-full border-2 border-[#003cb4]/35">
        <div className="absolute left-1/2 top-1 -translate-x-1/2 border-x-[7px] border-t-[13px] border-x-transparent border-t-[#003cb4]" />
        <div className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white bg-[#003cb4] text-[6px] font-bold tracking-wide text-white shadow-md">
          JOUER
        </div>
      </div>
    </div>
  );
}

export function BeautyWheelTemplateGallery({
  selectedTemplateId,
  onSelect,
}: {
  selectedTemplateId?: GamePageTemplateId;
  onSelect: (templateId: GamePageTemplateId) => void;
}) {
  return (
    <section aria-labelledby="beauty-wheel-templates-title" className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b3774]">Collection Beauté</p>
        <h3 id="beauty-wheel-templates-title" className="mt-1 text-base font-semibold text-[#241b2a]">Templates Beauté</h3>
        <p className="mt-1 text-sm text-[#69616c]">Sept styles de roue, personnalisables aux couleurs de votre établissement.</p>
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
                className="relative h-40 overflow-hidden px-4 pt-3"
                style={{ backgroundColor: theme.background, backgroundImage: beautyWheelBackground(theme.id, theme.background, theme.primary), color: theme.text }}
              >
                <BeautyThumbnailDecor theme={theme} />
                <div className="relative z-10 max-w-[56%] truncate text-[9px] font-semibold uppercase tracking-[0.12em]">Votre établissement</div>
                <div className="relative z-10 mt-3 max-w-[56%] text-[13px] font-bold leading-[1.12]" style={{ fontFamily: textFontFamily(theme.font) }}>Votre animation<br />vous réserve une surprise</div>
                <div className="relative z-10 mt-1 max-w-[55%] text-[8px] leading-tight opacity-75">Des surprises vous attendent</div>
                <BeautyWheelThumbnail theme={theme} />
              </div>
              <div className="flex items-start justify-between gap-2 px-4 py-3">
                <span className="min-w-0"><span className="block text-sm font-semibold text-[#241b2a]">{theme.name}</span><span className="mt-0.5 block text-xs text-[#746c78]">{theme.tagline}</span></span>
                {selected ? <span className="shrink-0 rounded-full bg-[#f2e7f5] px-2 py-0.5 text-[10px] font-semibold text-[#6b3774]">Sélectionné</span> : null}
              </div>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={selectedTemplateId === "rose-institut"}
          onClick={() => onSelect("rose-institut")}
          className={`group min-w-0 overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b3774] ${selectedTemplateId === "rose-institut" ? "border-[#6b3774] ring-2 ring-[#6b3774]/15" : "border-[#ded8e1]"}`}
        >
          <div className="relative h-40 overflow-hidden bg-[radial-gradient(ellipse_at_18%_8%,rgba(47,109,246,0.16),transparent_48%),linear-gradient(145deg,#f7f9ff,#eaf0ff)] px-4 pt-3 text-[#003cb4]">
            <div className="relative z-10 max-w-[56%] truncate text-[9px] font-semibold uppercase tracking-[0.12em]">Votre établissement</div>
            <div className="relative z-10 mt-3 max-w-[56%] font-playfair text-[13px] font-bold leading-[1.12]">Tournez la roue<br />et tentez de gagner</div>
            <div className="relative z-10 mt-1 max-w-[55%] text-[8px] leading-tight opacity-75">Une roue lumineuse à vos couleurs</div>
            <EclatWheelThumbnail />
          </div>
          <div className="flex items-start justify-between gap-2 px-4 py-3">
            <span className="min-w-0"><span className="block text-sm font-semibold text-[#241b2a]">Éclat</span><span className="mt-0.5 block text-xs text-[#746c78]">Lumineux & personnalisable</span></span>
            {selectedTemplateId === "rose-institut" ? <span className="shrink-0 rounded-full bg-[#f2e7f5] px-2 py-0.5 text-[10px] font-semibold text-[#6b3774]">Sélectionné</span> : null}
          </div>
        </button>
      </div>
    </section>
  );
}
