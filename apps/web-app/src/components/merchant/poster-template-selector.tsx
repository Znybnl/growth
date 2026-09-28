import { GameType, PosterBackgroundMotif, PosterTemplateId } from "@/lib/types";
import {
  getPosterTemplate,
  POSTER_BACKGROUND_MOTIFS,
  POSTER_TEMPLATE_CHOICES,
  PosterTemplateConfig,
} from "@/lib/poster-templates";
import { QrCode } from "lucide-react";
import Image from "next/image";

type PosterTemplateSelectorProps = {
  gameType: GameType;
  selectedTemplateId?: PosterTemplateId;
  qrDataUrl?: string | null;
  selectedBackgroundMotif?: PosterBackgroundMotif;
  classicThumbnailSvg: string;
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

function IvoryEditorialThumbnail({ qrDataUrl }: { qrDataUrl?: string | null }) {
  return (
    <svg viewBox="0 0 794 1123" className="h-full w-full" aria-hidden="true" data-testid="ivory-editorial-poster-thumbnail">
      <defs>
        <radialGradient id="ivoryEditorialThumbnailBackground" cx="50%" cy="38%" r="85%">
          <stop offset="0%" stopColor="#fffefa" />
          <stop offset="72%" stopColor="#fffdf8" />
          <stop offset="100%" stopColor="#f8f4eb" />
        </radialGradient>
      </defs>
      <rect width="794" height="1123" fill="url(#ivoryEditorialThumbnailBackground)" />
      <text data-testid="ivory-editorial-thumbnail-logo" x="397" y="130" textAnchor="middle" fontSize="61" fontFamily="Georgia,serif" fontWeight="400" fill="#111111">Votre logo</text>
      <line x1="361" y1="178" x2="433" y2="178" stroke="#191817" strokeWidth="3" />
      <text data-testid="ivory-editorial-thumbnail-headline" x="397" y="329" textAnchor="middle" fontSize="150" fontFamily="Georgia,serif" fontWeight="600" fill="#111111">
        <tspan x="397">Scannez</tspan><tspan x="397" dy="135">et jouez</tspan>
      </text>
      <text x="397" y="547" textAnchor="middle" fontSize="29" fontFamily="Arial,sans-serif" letterSpacing="5" fill="#171614">
        <tspan x="397">TENTEZ DE GAGNER</tspan><tspan x="397" dy="43">UN CADEAU</tspan>
      </text>
      <g data-testid="ivory-editorial-thumbnail-qr">
        <rect x="210" y="638" width="374" height="374" rx="32" fill="#fffefa" stroke="#f3c0ad" strokeWidth="7" />
        {qrDataUrl ? (
          <image href={qrDataUrl} x="234" y="662" width="326" height="326" preserveAspectRatio="xMidYMid meet" />
        ) : (
          <QrCode x="234" y="662" width="326" height="326" color="#111111" strokeWidth="1.6" />
        )}
      </g>
      <path d="M301 1070 C243 1060 221 999 237 964 L210 983 M237 964 L243 998" fill="none" stroke="#111111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <text data-testid="ivory-editorial-thumbnail-qr-label" x="397" y="1095" textAnchor="middle" fontSize="44" fontFamily="Georgia,serif" fontStyle="italic" fontWeight="600" fill="#111111">Scannez ici</text>
    </svg>
  );
}

function EditorialPosterThumbnail({
  gameType,
  qrDataUrl,
}: {
  gameType: GameType;
  qrDataUrl?: string | null;
}) {
  const action = gameType === "wheel" ? "JOUEZ" : "GRATTEZ";

  return (
    <svg viewBox="0 0 794 1123" className="h-full w-full" aria-hidden="true" data-testid="editorial-poster-thumbnail">
      <defs>
        <linearGradient id="editorialPosterThumbnailBackground" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe3d4" />
          <stop offset="52%" stopColor="#f5d0df" />
          <stop offset="100%" stopColor="#e6d2f3" />
        </linearGradient>
      </defs>
      <rect width="794" height="1123" fill="url(#editorialPosterThumbnailBackground)" />
      <path d="M0 520 C130 660 135 850 0 1060Z" fill="#f6adc3" fillOpacity="0.55" />
      <path d="M794 454 C640 495 538 651 520 850 C510 977 440 1070 386 1123H794Z" fill="#e3c7ed" fillOpacity="0.7" />
      <text data-testid="editorial-thumbnail-logo" x="397" y="126" textAnchor="middle" fontSize="38" fontFamily="Georgia,serif" fontWeight="500" fill="#111111">Votre logo</text>
      <line x1="354" y1="158" x2="440" y2="158" stroke="#111111" strokeWidth="3" />
      <text x="76" y="292" fontSize="88" fontFamily="Georgia,serif" fontWeight="600" fill="#111111">
        <tspan x="76">Scannez et</tspan><tspan x="76" dy="77">jouez</tspan>
      </text>
      <text x="76" y="465" fontSize="25" fontFamily="Arial,sans-serif" letterSpacing="4" fill="#111111">
        <tspan x="76">TENTEZ DE GAGNER</tspan><tspan x="76" dy="35">UN CADEAU !</tspan>
      </text>
      <g data-testid="editorial-thumbnail-qr">
        <rect x="104" y="624" width="344" height="344" rx="30" fill="#fffdfb" stroke="#f4b5c3" strokeWidth="5" />
        {qrDataUrl ? (
          <image href={qrDataUrl} x="128" y="648" width="296" height="296" />
        ) : (
          <QrCode x="128" y="648" width="296" height="296" color="#111111" strokeWidth="1.6" />
        )}
      </g>
      <path d="M208 1058 C172 1042 164 1004 184 974 L164 991 M184 974 L191 1000" fill="none" stroke="#111111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="226" y="1080" fontSize="42" fontFamily="Georgia,serif" fontStyle="italic" fontWeight="600" fill="#111111">Scannez ici</text>
      {[
        { y: 605, number: "1.", label: "SCANNEZ", kind: "phone" },
        { y: 784, number: "2.", label: action, kind: gameType === "wheel" ? "wheel" : "scratch" },
        { y: 963, number: "3.", label: "GAGNEZ", kind: "gift" },
      ].map((step) => (
        <g key={step.number}>
          <circle cx="638" cy={step.y} r="60" fill="#fffaf7" fillOpacity="0.54" stroke="#ffffff" strokeWidth="4" />
          {step.kind === "phone" ? (
            <g transform={`translate(638 ${step.y}) scale(0.9)`} fill="none" stroke="#111111" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="-23" y="-39" width="46" height="78" rx="8" />
              <path d="M-21 -27H21M-21 27H21" />
            </g>
          ) : step.kind === "wheel" ? (
            <g data-testid="editorial-step-wheel-icon" transform={`translate(638 ${step.y}) scale(0.9)`} fill="none" stroke="#111111" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0-35V-7M24.75-24.75 5-5M35 0H7M24.75 24.75 5 5M0 35V7M-24.75 24.75-5 5M-35 0H-7M-24.75-24.75-5-5" />
              <circle r="34" strokeWidth="5" />
              <circle r="6" fill="#111111" stroke="none" />
              <path d="M0-35-9-49H9Z" fill="#111111" stroke="none" />
            </g>
          ) : step.kind === "scratch" ? (
            <g transform={`translate(638 ${step.y}) scale(0.9)`} fill="none" stroke="#111111" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="-30" y="-36" width="60" height="72" rx="8" />
              <path d="M-20-15H20M-20 0H20M-20 15H20" strokeDasharray="5 6" />
              <path d="M-30-24H30M-30 24H30" />
            </g>
          ) : (
            <g transform={`translate(638 ${step.y}) scale(0.9)`} fill="none" stroke="#111111" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M-29 -9H29V29H-29ZM-36 -23H36V-9H-36ZM0 -23V29M0 -23C-27 -23-31 -38-20 -40-11 -42-4 -32 0 -23ZM0 -23C27 -23 31 -38 20 -40 11 -42 4 -32 0 -23Z" />
            </g>
          )}
          <text x="638" y={step.y + 96} textAnchor="middle" fontSize="20" fontFamily="Arial,sans-serif" fontWeight="600" letterSpacing="3.2" fill="#111111">
            {step.number} {step.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ClassicPosterThumbnail({ posterSvg }: { posterSvg: string }) {
  return (
    <Image
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(posterSvg)}`}
      width={794}
      height={1123}
      alt=""
      aria-hidden="true"
      unoptimized
      className="h-full w-full object-contain"
      data-testid="classic-poster-thumbnail"
    />
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
  classicThumbnailSvg,
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
                {visualTemplate.id === "ivory-editorial-wheel" ? (
                  <IvoryEditorialThumbnail qrDataUrl={qrDataUrl} />
                ) : visualTemplate.id === "pastel-editorial-wheel" ? (
                  <EditorialPosterThumbnail gameType={gameType} qrDataUrl={qrDataUrl} />
                ) : visualTemplate.id === "soft-gradient-wheel" ? (
                  <ClassicPosterThumbnail posterSvg={classicThumbnailSvg} />
                ) : visualTemplate.id === "premium-wheel" ? (
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
                    <rect width="794" height="1123" fill="#fbf9f1" />
                    <image data-testid="botanical-editorial-thumbnail-backdrop" href="/backgrounds/botanical-editorial-poster-backdrop.webp" width="794" height="1123" preserveAspectRatio="xMidYMid slice" />
                    <circle data-testid="botanical-editorial-thumbnail-medallion" cx="137" cy="676" r="120" fill={visualTemplate.medallionFill ?? visualTemplate.accent} />
                    <circle cx="137" cy="676" r="116" fill="none" stroke="#f7f4e8" strokeOpacity=".65" strokeWidth="2" />
                    <text x="397" y="118" textAnchor="middle" fontFamily="Georgia, serif" fontSize="30" fill="#1d2a16">Votre logo</text>
                    <line x1="357" y1="161" x2="437" y2="161" stroke="#77845e" strokeWidth="3" />
                    <text x="443" y="300" textAnchor="middle" fontFamily="Georgia, serif" fontSize="83" fill="#1d2a16">
                      <tspan x="443">Scannez</tspan><tspan x="443" dy="82">et jouez</tspan>
                    </text>
                    <text x="443" y="468" textAnchor="middle" fontSize="23" letterSpacing="4" fill="#1d2a16">TENTEZ DE GAGNER</text>
                    <text x="443" y="500" textAnchor="middle" fontSize="23" letterSpacing="4" fill="#1d2a16">UN CADEAU !</text>
                    <g textAnchor="middle" fontFamily="Georgia, serif" fontSize="25" fill="#1d2a16"><text x="137" y="636">De jolis</text><text x="137" y="662">cadeaux</text><text x="137" y="688">à gagner !</text></g>
                    <g data-testid="botanical-editorial-thumbnail-leaf" fill="#f7f4e8" fillOpacity=".12" stroke="#f7f4e8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity=".96">
                      <path d="M108 770c5-24 23-43 54-54-3 29-22 48-54 54z" />
                      <path d="M109 769c18-17 36-35 53-52m-37 36c-2-7-7-12-13-14m24 3c-1-8-4-14-10-19m21 4c1-8 0-14-4-20" fill="none" />
                    </g>
                    <g data-testid="botanical-editorial-thumbnail-qr">
                      <rect x="282" y="564" width="322" height="322" rx="24" fill="#fffefa" stroke={visualTemplate.qrFrame} strokeWidth="4" />
                      {qrDataUrl ? <image href={qrDataUrl} x="300" y="582" width="286" height="286" /> : <QrCode x="314" y="596" width="258" height="258" color="#111" strokeWidth="1.5" />}
                    </g>
                    <g data-testid="botanical-editorial-thumbnail-footer">
                      <path data-testid="botanical-editorial-thumbnail-arrow-one" d="M268 980h48" stroke="#1d2a16" strokeWidth="2" markerEnd="url(#thumbnailArrow)" />
                      <path data-testid="botanical-editorial-thumbnail-arrow-two" d="M475 980h48" stroke="#1d2a16" strokeWidth="2" markerEnd="url(#thumbnailArrow)" />
                      <defs><marker id="thumbnailArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10" fill="none" stroke="#1d2a16" strokeWidth="1.5" /></marker></defs>
                      {[190, 397, 604].map((x, index) => <g key={x}>
                        <circle cx={x} cy="980" r="47" fill="#f5f1e2" stroke="#77845e" strokeWidth="2.5" />
                        {index === 0 ? <g fill="none" stroke="#1d2a16" strokeWidth="3" transform={`translate(${x} 980) scale(.8)`}><rect x="-14" y="-24" width="28" height="48" rx="5" /><path d="M-9-16h18M-9 18h18" /></g> : index === 1 ? (gameType === "wheel" ? <g fill="none" stroke="#1d2a16" strokeWidth="3" transform={`translate(${x} 980) scale(.78)`}><circle r="34" /><path d="M0-30v60M-30 0h60M-21-21l42 42M21-21l-42 42" /></g> : <g fill="none" stroke="#1d2a16" strokeWidth="3" transform={`translate(${x} 980) scale(.8)`}><path d="M-25-31h42l9 9v52h-51zM17-31v10h9M-14-9h22M-14 3h22M-14 15h15" /><circle cx="15" cy="18" r="8" fill="#f5f1e2" /></g>) : <g fill="none" stroke="#1d2a16" strokeWidth="3" transform={`translate(${x} 980) scale(.8)`}><rect x="-18" y="-5" width="36" height="27" /><path d={`M-22-13h44v11h-44zm22 0v40m0-40c-15 0-17-15-8-15 7 0 11 15 8 15m0 0c15 0 17-15 8-15-7 0-11 15-8 15`} /></g>}
                        <text x={x} y="1062" textAnchor="middle" fontSize="17" fontWeight="700" letterSpacing="1.5" fill="#1d2a16">{index === 0 ? "1. SCANNEZ" : index === 1 ? "2. JOUEZ" : "3. GAGNEZ"}</text>
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
                    {POSTER_BACKGROUND_MOTIFS.filter((motif) => motif.id === "soft-gradient").map((motif) => {
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
