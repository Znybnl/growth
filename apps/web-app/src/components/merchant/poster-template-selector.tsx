import { GameType, PosterBackgroundMotif, PosterTemplateId } from "@/lib/types";
import {
  getPosterTemplate,
  POSTER_BACKGROUND_MOTIFS,
  POSTER_TEMPLATE_CHOICES,
  PosterTemplateConfig,
} from "@/lib/poster-templates";
import { QrCode } from "lucide-react";

type PosterTemplateSelectorProps = {
  gameType: GameType;
  selectedTemplateId?: PosterTemplateId;
  qrDataUrl?: string | null;
  selectedBackgroundMotif?: PosterBackgroundMotif;
  onSelect: (templateId: PosterTemplateId) => void;
  onSelectMotif: (backgroundMotif: PosterBackgroundMotif) => void;
};

function WheelThumbnail({ template }: { template: PosterTemplateConfig }) {
  return (
    <span
      className="absolute -left-6 top-5 h-[200px] w-[200px] rounded-full border-[10px] shadow-[0_18px_34px_rgba(17,24,39,0.16)]"
      style={{
        borderColor: template.wheel.rimColor,
        background: `conic-gradient(${template.wheel.winColor} 0 60deg, #fff7ef 60deg 120deg, ${template.wheel.winColor} 120deg 180deg, #fff7ef 180deg 240deg, ${template.wheel.winColor} 240deg 300deg, #fff7ef 300deg 360deg)`,
      }}
    />
  );
}

function ScratchThumbnail({ template }: { template: PosterTemplateConfig }) {
  return (
    <span
      className="absolute left-6 top-12 block h-[126px] w-[230px] -rotate-3 rounded-[20px] border-[6px] bg-white p-3 shadow-[0_18px_34px_rgba(17,24,39,0.16)]"
      style={{ borderColor: template.accent }}
    >
      <span className="block h-[62px] rounded-[12px] bg-[linear-gradient(135deg,#dbe2ee,#fff,#aeb9ce)]" />
      <span className="mt-2 block text-center text-[10px] font-black tracking-[0.12em]" style={{ color: template.accentDark }}>
        GRATTEZ ICI
      </span>
    </span>
  );
}

function QrThumbnail({ template }: { template: PosterTemplateConfig }) {
  return (
    <span
      className="absolute bottom-5 right-5 grid h-20 w-20 grid-cols-5 gap-0.5 rounded-[14px] border-4 bg-white p-2"
      style={{ borderColor: template.wheel.winColor }}
    >
      {Array.from({ length: 25 }).map((_, index) => (
        <span
          key={index}
          className="rounded-[1px]"
          style={{
            backgroundColor: [0, 1, 3, 4, 5, 9, 11, 12, 14, 15, 18, 20, 21, 23, 24].includes(index)
              ? "#111827"
              : "transparent",
          }}
        />
      ))}
    </span>
  );
}

type ThumbnailStepIconKind = "scan" | "wheel" | "gift";

function ThumbnailStepIcon({
  kind,
  x,
  y,
  scale = 1,
}: {
  kind: ThumbnailStepIconKind;
  x: number;
  y: number;
  scale?: number;
}) {
  if (kind === "scan") {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke="#ffffff" strokeLinecap="round">
        <path
          d="M-16-19h31a6 6 0 0 1 6 6v42a6 6 0 0 1-6 6h-31a6 6 0 0 1-6-6v-42a6 6 0 0 1 6-6Z"
          strokeWidth="4"
        />
        <path d="M-14-6h27M-14 5h20M-14 16h23" strokeWidth="4" />
      </g>
    );
  }

  if (kind === "wheel") {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke="#ffffff" strokeLinecap="round">
        <circle r="25" strokeWidth="4" />
        <path d="M0-25v50M-25 0h50M-18-18l36 36M18-18l-36 36" strokeWidth="3" />
      </g>
    );
  }

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round">
      <rect x="-13" y="-5" width="26" height="19" rx="2" strokeWidth="2.25" />
      <path d="M-15-5h30v7h-30zM0-5v19" strokeWidth="2.25" />
      <path d="M0-5c-7 0-11-2-10-6 1-4 7-3 10 6ZM0-5c7 0 11-2 10-6-1-4-7-3-10 6Z" strokeWidth="2.25" />
    </g>
  );
}

export function PosterTemplateSelector({
  gameType,
  selectedTemplateId,
  qrDataUrl,
  selectedBackgroundMotif = "plain",
  onSelect,
  onSelectMotif,
}: PosterTemplateSelectorProps) {
  return (
    <section className="okado-card p-6 md:p-8">
      <p className="okado-label">Template</p>
      <h2 className="okado-section-title mt-2">Choisir le design de l&apos;affiche</h2>
      <p className="mt-2 text-sm leading-6 text-ash">
        Le même design est utilisé pour la roue et le ticket ; seul le visuel central change.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {POSTER_TEMPLATE_CHOICES.map((template) => {
          const active = (selectedTemplateId ?? "classic-wheel") === template.id;
          const visualTemplate = template.id === "classic-wheel"
            ? getPosterTemplate("classic-wheel", selectedBackgroundMotif)
            : template;
          const footerAction = gameType === "wheel" ? "Jouez" : "Grattez";

          return (
            <div
              key={template.id}
              className={`group overflow-hidden rounded-[var(--radius-card)] border text-left transition ${
                active
                  ? "border-aubergine bg-purple-haze shadow-[0_8px_20px_rgba(97,31,105,0.12)]"
                  : "border-[#d7e0ed] bg-white hover:border-aubergine"
              }`}
            >
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(template.id)}
                className="block w-full text-left"
              >
              <span aria-hidden="true" className="relative block h-[220px] overflow-hidden" style={{
                background: visualTemplate.background,
              }}>
                {visualTemplate.id === "premium-wheel" ? (
                  <svg viewBox="0 0 794 1123" className="h-full w-full" aria-hidden="true">
                    <image href="/backgrounds/premium-poster-backdrop.png" width="794" height="1123" />
                    <text x="520" y="102" textAnchor="middle" fontSize="28" fill="#171412">Votre établissement</text>
                    <text x="284" y="210" fontSize="58" className="font-cormorant" fill="#111">
                      <tspan x="284">Scannez, jouez,</tspan><tspan x="284" dy="60">récupérez votre</tspan><tspan x="284" dy="60">cadeau !</tspan>
                    </text>
                    <g data-testid="elegance-thumbnail-qr">
                      <rect x="62" y="486" width="306" height="330" rx="24" fill="white" stroke="#a17d57" strokeWidth="2" />
                      {qrDataUrl ? <image href={qrDataUrl} x="95" y="514" width="240" height="240" /> : <QrCode x="95" y="514" width="240" height="240" color="#111" strokeWidth="1.5" />}
                      <text x="215" y="790" textAnchor="middle" fontSize="19" fontWeight="700" fill="#111">SCANNEZ POUR JOUER</text>
                    </g>
                    <rect y="925" width="794" height="198" fill="white" fillOpacity="0.8" />
                    <g data-testid="elegance-thumbnail-footer">
                      <line x1="281" y1="955" x2="281" y2="1063" stroke="#171412" strokeWidth="2" />
                      <line x1="513" y1="955" x2="513" y2="1063" stroke="#171412" strokeWidth="2" />
                      <circle cx="165" cy="987" r="42" fill="#a17d57" />
                      <ThumbnailStepIcon kind="scan" x={165} y={987} scale={0.9} />
                      <text x="165" y="1063" textAnchor="middle" fontSize="28" fontWeight="600" fill="#171412">Scannez</text>
                      <circle cx="396" cy="987" r="42" fill="#a17d57" />
                      <ThumbnailStepIcon kind="wheel" x={396} y={987} />
                      <text x="396" y="1063" textAnchor="middle" fontSize="28" fontWeight="600" fill="#171412">{footerAction}</text>
                      <circle cx="629" cy="987" r="42" fill="#a17d57" />
                      <ThumbnailStepIcon kind="gift" x={629} y={987} scale={1.6} />
                      <text x="629" y="1063" textAnchor="middle" fontSize="28" fontWeight="600" fill="#171412">Gagnez</text>
                    </g>
                  </svg>
                ) : visualTemplate.id === "botanical-editorial-poster" ? (
                  <svg viewBox="0 0 794 1123" className="h-full w-full" aria-hidden="true">
                    <image href="/backgrounds/botanical-editorial-poster-backdrop.svg" width="794" height="1123" />
                    <circle cx="137" cy="676" r="120" fill="#77845e" />
                    <circle cx="137" cy="676" r="116" fill="none" stroke="#f7f4e8" strokeOpacity=".65" strokeWidth="2" />
                    <text x="397" y="118" textAnchor="middle" fontFamily="Georgia, serif" fontSize="30" fill="#1d2a16">Votre logo</text>
                    <line x1="357" y1="161" x2="437" y2="161" stroke="#77845e" strokeWidth="3" />
                    <text x="397" y="300" textAnchor="middle" fontFamily="Georgia, serif" fontSize="83" fill="#1d2a16">
                      <tspan x="397">Scannez</tspan><tspan x="397" dy="82">et jouez</tspan>
                    </text>
                    <text x="397" y="468" textAnchor="middle" fontSize="23" letterSpacing="4" fill="#1d2a16">TENTEZ DE GAGNER</text>
                    <text x="397" y="500" textAnchor="middle" fontSize="23" letterSpacing="4" fill="#1d2a16">UN CADEAU !</text>
                    <g textAnchor="middle" fontFamily="Georgia, serif" fontSize="25" fill="#1d2a16"><text x="137" y="651">De jolis</text><text x="137" y="680">cadeaux</text><text x="137" y="709">à gagner !</text></g>
                    <path d="M104 779c17-16 32-23 52-25m-52 25c11-10 25-17 52-25m-28 13c-8 1-14-3-17-8m27-4c-1-8 2-13 7-18" fill="none" stroke="#edf0df" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity=".94" />
                    <g data-testid="botanical-editorial-thumbnail-qr">
                      <rect x="259" y="564" width="322" height="322" rx="24" fill="#fffefa" stroke="#d6bd8c" strokeWidth="4" />
                      {qrDataUrl ? <image href={qrDataUrl} x="277" y="582" width="286" height="286" /> : <QrCode x="291" y="596" width="258" height="258" color="#111" strokeWidth="1.5" />}
                    </g>
                    <g data-testid="botanical-editorial-thumbnail-footer">
                      <path d="M310 968h37m100 0h37" stroke="#1d2a16" strokeWidth="2" markerEnd="url(#thumbnailArrow)" />
                      <defs><marker id="thumbnailArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10" fill="none" stroke="#1d2a16" strokeWidth="1.5" /></marker></defs>
                      {[190, 397, 604].map((x, index) => <g key={x}>
                        <circle cx={x} cy="968" r="49" fill="#f5f1e2" stroke="#d6bd8c" strokeWidth="2" />
                        {index === 0 ? <g fill="none" stroke="#1d2a16" strokeWidth="3"><rect x={x - 14} y="944" width="28" height="48" rx="5" /><path d={`M${x - 9} 952h18m-18 34h18`} /></g> : index === 1 ? <g fill="none" stroke="#1d2a16" strokeWidth="3"><path d={`M${x - 27} 961q2-12 14-12h26q12 0 14 12l4 18q1 9-9 6l-11-9h-22l-11 9q-10 3-9-6z`} /><path d={`M${x - 17} 958v13m-6.5-6.5h13`} /></g> : <g fill="none" stroke="#1d2a16" strokeWidth="3"><rect x={x - 18} y="963" width="36" height="27" /><path d={`M${x - 22} 955h44v11h-44zm22 0v35m0-35c-15 0-17-15-8-15 7 0 11 15 8 15m0 0c15 0 17-15 8-15-7 0-11 15-8 15`} /></g>}
                        <text x={x} y="1050" textAnchor="middle" fontSize="17" fontWeight="700" letterSpacing="1.5" fill="#1d2a16">{index === 0 ? "1. SCANNEZ" : index === 1 ? "2. JOUEZ" : "3. GAGNEZ"}</text>
                      </g>)}
                    </g>
                  </svg>
                ) : visualTemplate.id === "botanical-wheel" ? (
                  <svg viewBox="0 0 794 1123" className="h-full w-full" aria-hidden="true">
                    <image href="/backgrounds/botanical-poster-backdrop.png" width="794" height="1123" />
                    <text x="72" y="104" fontSize="22" letterSpacing="4" fill="#153a35">Votre établissement</text>
                    <line x1="72" y1="132" x2="140" y2="132" stroke="#8d9c8e" strokeWidth="3" />
                    <text x="72" y="220" fontSize="48" fontFamily="Georgia, serif" fill="#153a35">
                      <tspan x="72">Scannez, jouez,</tspan><tspan x="72" dy="52">récupérez votre</tspan><tspan x="72" dy="52">cadeau !</tspan>
                    </text>
                    <g data-testid="botanical-thumbnail-qr">
                      <rect x="445" y="480" width="306" height="316" rx="24" fill="white" stroke="#9eafa0" strokeWidth="2" />
                      {qrDataUrl ? <image href={qrDataUrl} x="470" y="505" width="256" height="256" /> : <QrCode x="470" y="505" width="256" height="256" color="#111" strokeWidth="1.5" />}
                      <rect x="420" y="790" width="356" height="62" rx="20" fill="#718578" stroke="white" strokeWidth="4" />
                      <text x="598" y="828" textAnchor="middle" fontSize="18" fontWeight="700" fill="white">SCANNEZ POUR JOUER</text>
                    </g>
                    <g data-testid="botanical-thumbnail-footer">
                      <rect y="944" width="794" height="179" fill="#fbf8f2" fillOpacity="0.96" />
                      <circle cx="132" cy="992" r="32" fill="#718578" /><text x="132" y="1004" textAnchor="middle" fontSize="30" fontWeight="700" fill="white">1</text>
                      <circle cx="397" cy="992" r="32" fill="#718578" /><circle cx="397" cy="992" r="18" fill="none" stroke="white" strokeWidth="3" /><path d="M397 974v36M379 992h36M384 979l26 26M410 979l-26 26" stroke="white" strokeWidth="2" />
                      <circle cx="662" cy="992" r="32" fill="#718578" /><path d="M647 989h30v24h-30zM643 982h38v9h-38zM662 982v31M652 982c-11-9 4-14 10 0M672 982c6-14 21-9 10 0" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                      <line x1="270" y1="960" x2="270" y2="1036" stroke="#718578" strokeWidth="2" /><line x1="524" y1="960" x2="524" y2="1036" stroke="#718578" strokeWidth="2" />
                      <text x="132" y="1072" textAnchor="middle" fontSize="24" fontWeight="700" fill="#153a35">Scannez</text>
                      <text x="397" y="1072" textAnchor="middle" fontSize="24" fontWeight="700" fill="#153a35">{footerAction}</text>
                      <text x="662" y="1072" textAnchor="middle" fontSize="24" fontWeight="700" fill="#153a35">Gagnez</text>
                    </g>
                  </svg>
                ) : <>
                  {gameType === "wheel" ? <WheelThumbnail template={visualTemplate} /> : <ScratchThumbnail template={visualTemplate} />}
                  <QrThumbnail template={visualTemplate} />
                </>}
              </span>
              <span className="block p-4">
                <span className="block text-sm font-semibold text-[#111827]">{template.label}</span>
                <span className="mt-1 block text-xs leading-5 text-[#5c6577]">{template.description}</span>
              </span>
              </button>
              {active && template.id === "classic-wheel" ? (
                <div className="border-t border-[#e6d8eb] px-4 pb-4 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-charcoal">Motif du fond</p>
                  <div className="mt-2 grid gap-2" role="group" aria-label="Motif du fond">
                    {POSTER_BACKGROUND_MOTIFS.map((motif) => {
                      const motifActive = selectedBackgroundMotif === motif.id;
                      return (
                        <button
                          key={motif.id}
                          type="button"
                          aria-pressed={motifActive}
                          aria-label={motif.label}
                          title={motif.description}
                          onClick={() => onSelectMotif(motif.id)}
                          className={`flex min-w-0 items-center gap-2 rounded-[8px] border px-2 py-2 text-left text-[11px] font-semibold transition ${
                            motifActive
                              ? "border-aubergine bg-white text-aubergine shadow-sm"
                              : "border-[#e2e8f0] bg-white/60 text-graphite hover:border-aubergine"
                          }`}
                        >
                          <span className="block h-6 w-12 shrink-0 rounded-[4px] border border-black/5" style={{ background: motif.preview }} />
                          <span className="block break-words leading-4">{motif.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
