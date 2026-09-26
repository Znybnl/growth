import type { GameType } from "@/lib/types";

type GameTypeChoiceProps = {
  type: GameType;
  eyebrow?: string;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
};

const wheelColors = [
  "#642080",
  "#fbf5e9",
  "#e9dced",
  "#f4c14a",
  "#fffaf1",
  "#7f4b8c",
  "#e4d7e7",
  "#f4c14a",
];

function wheelSectorPath(index: number) {
  const centerX = 158;
  const centerY = 91;
  const radius = 54;
  const startAngle = (-112.5 + index * 45) * (Math.PI / 180);
  const endAngle = startAngle + Math.PI / 4;
  const startX = centerX + Math.cos(startAngle) * radius;
  const startY = centerY + Math.sin(startAngle) * radius;
  const endX = centerX + Math.cos(endAngle) * radius;
  const endY = centerY + Math.sin(endAngle) * radius;

  return `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY} Z`;
}

function WheelIllustration() {
  return (
    <svg viewBox="0 0 340 180" className="block h-full w-full" aria-hidden="true" focusable="false">
      <rect width="340" height="180" fill="#f5eff8" />
      <circle cx="298" cy="24" r="62" fill="#e8dced" opacity="0.52" />
      <circle cx="30" cy="164" r="45" fill="#fffaf1" opacity="0.9" />
      <path d="M24 43h42M282 146h32" stroke="#c7b3ce" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 29l4 7 7 2-7 3-4 7-3-7-7-3 7-2zM292 73l3 5 5 2-5 2-3 5-2-5-5-2 5-2z" fill="#f4c14a" />
      <circle cx="158" cy="96" r="68" fill="#24122a" opacity="0.12" />
      <circle cx="158" cy="91" r="62" fill="#fff" stroke="#642080" strokeWidth="4" />
      {wheelColors.map((color, index) => (
        <path key={index} d={wheelSectorPath(index)} fill={color} stroke="#fff" strokeWidth="2.5" />
      ))}
      <circle cx="158" cy="91" r="19" fill="#642080" stroke="#fff" strokeWidth="3" />
      <path d="M150 91h16v11h-16zM148 87h20v5h-20zM158 87v15M153 87c-5-6 2-8 5 0 3-8 10-6 5 0" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M149 22h18l-9 18z" fill="#f4c14a" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="158" cy="20" r="3" fill="#642080" />
      <path d="M254 98h35" stroke="#642080" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <circle cx="270" cy="85" r="5" fill="#f4c14a" />
      <circle cx="287" cy="109" r="3" fill="#9d7aa6" />
    </svg>
  );
}

function ScratchIllustration() {
  return (
    <svg viewBox="0 0 340 180" className="block h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="scratch-card-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fbf7ed" />
        </linearGradient>
        <linearGradient id="scratch-foil" x1="0" y1="0" x2="1" y2="0.8">
          <stop offset="0" stopColor="#d3d6df" />
          <stop offset="0.48" stopColor="#f7f7f9" />
          <stop offset="1" stopColor="#bdc2ce" />
        </linearGradient>
      </defs>
      <rect width="340" height="180" fill="#f1f7f3" />
      <circle cx="35" cy="38" r="34" fill="#dcebe2" opacity="0.8" />
      <circle cx="303" cy="145" r="54" fill="#e7dced" opacity="0.56" />
      <path d="M34 135l5 8 9 2-9 3-5 8-3-8-8-3 8-2zM296 32l3 6 7 2-7 2-3 6-3-6-6-2 6-2z" fill="#e5b33e" />
      <g transform="rotate(-2 170 91)">
        <rect x="54" y="34" width="232" height="112" rx="17" fill="#29152f" opacity="0.12" />
        <rect x="50" y="28" width="232" height="112" rx="17" fill="url(#scratch-card-paper)" stroke="#642080" strokeWidth="2" />
        <path d="M68 28v112M264 28v112" stroke="#bda8c5" strokeWidth="1.5" strokeDasharray="3 4" />
        <circle cx="50" cy="57" r="5" fill="#f1f7f3" stroke="#642080" strokeWidth="1.5" />
        <circle cx="50" cy="112" r="5" fill="#f1f7f3" stroke="#642080" strokeWidth="1.5" />
        <circle cx="282" cy="57" r="5" fill="#f1f7f3" stroke="#642080" strokeWidth="1.5" />
        <circle cx="282" cy="112" r="5" fill="#f1f7f3" stroke="#642080" strokeWidth="1.5" />
        <rect x="82" y="43" width="164" height="20" rx="10" fill="#642080" />
        <text x="164" y="57" textAnchor="middle" fill="#fff" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="700" letterSpacing="1.5">TICKET À GRATTER</text>
        <rect x="84" y="72" width="154" height="49" rx="8" fill="#eee2f1" />
        <path d="M220 76l4 8 9 2-9 3-4 8-3-8-8-3 8-2z" fill="#f4c14a" />
        <rect x="84" y="72" width="108" height="49" rx="8" fill="url(#scratch-foil)" stroke="#aab0bd" strokeWidth="1" />
        <path d="M94 113l16-32m1 36 18-38m3 35 14-29m5 31 15-31m3 29 10-21" stroke="#fff" strokeWidth="2" opacity="0.68" />
        <text x="137" y="101" textAnchor="middle" fill="#616778" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="700" letterSpacing="1.1">GRATTEZ ICI</text>
        <path d="M204 94h37M222 75v38" stroke="#642080" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M210 87h25v18h-25zM207 82h31v7h-31zM222 82v23M215 82c-6-7 3-10 7 0 4-10 13-7 7 0" fill="none" stroke="#642080" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M82 130h164" stroke="#f4c14a" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="79" cy="157" r="3" fill="#8fa89a" />
      <circle cx="265" cy="25" r="3" fill="#8fa89a" />
    </svg>
  );
}

export function GameTypeChoice({
  type,
  eyebrow,
  title,
  description,
  selected,
  onSelect,
}: GameTypeChoiceProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`group w-full overflow-hidden rounded-[16px] border text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aubergine/25 ${
        selected
          ? "border-aubergine bg-purple-haze ring-2 ring-aubergine/15"
          : "border-border bg-white hover:border-aubergine/50"
      }`}
    >
      <div className="h-[142px] overflow-hidden sm:h-[156px]">
        {type === "wheel" ? <WheelIllustration /> : <ScratchIllustration />}
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ash">{eyebrow}</p> : null}
            <h3 className={`${eyebrow ? "mt-2" : ""} text-base font-semibold text-graphite sm:text-lg`}>{title}</h3>
          </div>
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
              selected ? "border-aubergine bg-aubergine text-white" : "border-border bg-white text-transparent"
            }`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
              <path d="m3.5 8.2 3 3 6-6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <p className="mt-2 text-sm leading-5 text-slate">{description}</p>
      </div>
    </button>
  );
}
