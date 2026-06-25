"use client";

import { useMemo, useState } from "react";

type ActivityPoint = {
  label: string;
  scans: number;
  participations: number;
};

type DashboardActivityChartProps = {
  title: string;
  eyebrow: string;
  points: ActivityPoint[];
};

const PERIOD_OPTIONS = [
  { value: 7, label: "7 derniers jours" },
  { value: 14, label: "14 derniers jours" },
  { value: 30, label: "30 derniers jours" },
] as const;

const CHART_WIDTH = 960;
const CHART_HEIGHT = 320;
const PADDING = { top: 24, right: 22, bottom: 42, left: 10 };
const INNER_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function buildSmoothPath(values: number[], max: number) {
  if (!values.length) return "";

  const coords = values.map((value, index) => {
    const x = values.length === 1 ? INNER_WIDTH / 2 : (index / (values.length - 1)) * INNER_WIDTH;
    const y = INNER_HEIGHT - (value / max) * INNER_HEIGHT;
    return { x, y };
  });

  if (coords.length === 1) {
    return `M ${coords[0].x} ${coords[0].y}`;
  }

  let path = `M ${coords[0].x} ${coords[0].y}`;

  for (let index = 0; index < coords.length - 1; index += 1) {
    const current = coords[index];
    const next = coords[index + 1];
    const controlX = (current.x + next.x) / 2;
    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
}

function buildAreaPath(values: number[], max: number) {
  if (!values.length) return "";

  const linePath = buildSmoothPath(values, max);
  const lastX = values.length === 1 ? INNER_WIDTH / 2 : INNER_WIDTH;
  return `${linePath} L ${lastX} ${INNER_HEIGHT} L 0 ${INNER_HEIGHT} Z`;
}

export function DashboardActivityChart({
  title,
  eyebrow,
  points,
}: DashboardActivityChartProps) {
  const [period, setPeriod] = useState<number>(7);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const visiblePoints = useMemo(() => {
    const safePeriod = Math.min(period, points.length || period);
    return points.slice(-safePeriod);
  }, [period, points]);

  const resolvedActiveIndex =
    activeIndex !== null && activeIndex < visiblePoints.length ? activeIndex : visiblePoints.length - 1;
  const activePoint = resolvedActiveIndex >= 0 ? visiblePoints[resolvedActiveIndex] : null;
  const max = Math.max(
    ...visiblePoints.flatMap((point) => [point.scans, point.participations]),
    1,
  );
  const scansValues = visiblePoints.map((point) => point.scans);
  const participationsValues = visiblePoints.map((point) => point.participations);
  const scansPath = buildSmoothPath(scansValues, max);
  const participationsPath = buildSmoothPath(participationsValues, max);
  const scansAreaPath = buildAreaPath(scansValues, max);
  const participationsAreaPath = buildAreaPath(participationsValues, max);

  const activeCoord =
    resolvedActiveIndex >= 0
      ? {
          x:
            visiblePoints.length === 1
              ? INNER_WIDTH / 2
              : (resolvedActiveIndex / (visiblePoints.length - 1)) * INNER_WIDTH,
          yScans: INNER_HEIGHT - ((activePoint?.scans ?? 0) / max) * INNER_HEIGHT,
          yParticipations:
            INNER_HEIGHT - ((activePoint?.participations ?? 0) / max) * INNER_HEIGHT,
        }
      : null;

  const tooltipPosition = activeCoord
    ? {
        left: clamp(((activeCoord.x + PADDING.left) / CHART_WIDTH) * 100, 12, 88),
        top: clamp(
          (((Math.min(activeCoord.yParticipations, activeCoord.yScans) + PADDING.top) / CHART_HEIGHT) * 100) - 8,
          16,
          72,
        ),
      }
    : null;

  return (
    <section className="overflow-hidden rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#111827]">{title}</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#4f5f76]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4e79d8]" />
              Scans
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#4f5f76]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#22b8a5]" />
              Participations
            </div>
          </div>
        </div>

        <label className="inline-flex items-center gap-3 self-start rounded-[18px] border border-[#dbe4f0] bg-[#fbfcfe] px-4 py-3 text-sm font-medium text-[#304156] shadow-[0_10px_24px_rgba(122,136,166,0.08)]">
          <span className="text-[#6a7689]">Période</span>
          <select
            value={period}
            onChange={(event) => {
              setPeriod(Number(event.target.value));
              setActiveIndex(null);
            }}
            className="bg-transparent font-semibold text-[#111827] outline-none"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 h-[360px]">
        <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)]">
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="h-full w-full"
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id="chart-scans-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4e79d8" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#4e79d8" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="chart-participations-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#22b8a5" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#22b8a5" stopOpacity="0" />
              </linearGradient>
              <filter id="chart-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#8da6d8" floodOpacity="0.18" />
              </filter>
            </defs>

            <g transform={`translate(${PADDING.left} ${PADDING.top})`}>
              {visiblePoints.map((point, index) => {
                const x =
                  visiblePoints.length === 1
                    ? INNER_WIDTH / 2
                    : (index / (visiblePoints.length - 1)) * INNER_WIDTH;

                return (
                  <g key={point.label}>
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={INNER_HEIGHT}
                      stroke="#e7eef8"
                      strokeDasharray="6 8"
                    />
                  </g>
                );
              })}

              {[0, 1, 2, 3].map((row) => {
                const y = (row / 3) * INNER_HEIGHT;
                return <line key={row} x1={0} y1={y} x2={INNER_WIDTH} y2={y} stroke="#edf3fa" />;
              })}

              <path d={participationsAreaPath} fill="url(#chart-participations-fill)" />
              <path d={scansAreaPath} fill="url(#chart-scans-fill)" />

              <path
                d={participationsPath}
                fill="none"
                stroke="#22b8a5"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#chart-glow)"
              />
              <path
                d={scansPath}
                fill="none"
                stroke="#4e79d8"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#chart-glow)"
              />

              {activeCoord ? (
                <>
                  <line
                    x1={activeCoord.x}
                    y1={0}
                    x2={activeCoord.x}
                    y2={INNER_HEIGHT}
                    stroke="#202735"
                    strokeDasharray="5 7"
                    opacity="0.18"
                  />
                  <circle cx={activeCoord.x} cy={activeCoord.yParticipations} r="8" fill="#22b8a5" stroke="#ffffff" strokeWidth="5" />
                  <circle cx={activeCoord.x} cy={activeCoord.yScans} r="8" fill="#4e79d8" stroke="#ffffff" strokeWidth="5" />
                </>
              ) : null}

              {visiblePoints.map((point, index) => {
                const x =
                  visiblePoints.length === 1
                    ? INNER_WIDTH / 2
                    : (index / (visiblePoints.length - 1)) * INNER_WIDTH;

                return (
                  <g key={`hit-${point.label}`}>
                    <rect
                      x={x - Math.max(24, INNER_WIDTH / Math.max(visiblePoints.length * 2, 2))}
                      y={0}
                      width={Math.max(48, INNER_WIDTH / Math.max(visiblePoints.length, 1))}
                      height={INNER_HEIGHT}
                      fill="transparent"
                      onMouseEnter={() => setActiveIndex(index)}
                    />
                    <text
                      x={x}
                      y={INNER_HEIGHT + 28}
                      textAnchor="middle"
                      fontSize="14"
                      fill={index === resolvedActiveIndex ? "#111827" : "#7b8496"}
                      fontWeight={index === resolvedActiveIndex ? "700" : "500"}
                    >
                      {formatShortDate(point.label)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {activeCoord && activePoint ? (
            <div
              className="pointer-events-none absolute z-10 min-w-[160px] rounded-[18px] bg-[#161a23] px-4 py-3 text-white shadow-[0_18px_36px_rgba(15,23,40,0.24)]"
              style={{
                left: `${tooltipPosition?.left ?? 50}%`,
                top: `${tooltipPosition?.top ?? 32}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              <p className="text-base font-semibold">{formatShortDate(activePoint.label)}</p>
              <div className="mt-2 space-y-1 text-sm text-white/80">
                <p>Scans : {activePoint.scans}</p>
                <p>Participations : {activePoint.participations}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

