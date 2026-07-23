"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function DashboardActivityChart({
  title,
  eyebrow,
  points,
}: DashboardActivityChartProps) {
  const [period, setPeriod] = useState<number>(7);

  const data = useMemo(() => {
    const visiblePoints = points.slice(-Math.min(period, points.length || period));

    return visiblePoints.map((point) => ({
      ...point,
      date: formatShortDate(point.label),
    }));
  }, [period, points]);

  const chartWidth = 900;
  const chartHeight = 330;
  const plot = { left: 48, right: 24, top: 24, bottom: 44 };
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) => [point.scans, point.participations]),
  );
  const xFor = (index: number) =>
    plot.left +
    (index * (chartWidth - plot.left - plot.right)) /
      Math.max(1, data.length - 1);
  const yFor = (value: number) =>
    plot.top +
    (chartHeight - plot.top - plot.bottom) * (1 - value / maxValue);
  const scanPoints = data.map((point, index) => `${xFor(index)},${yFor(point.scans)}`).join(" ");
  const participationPoints = data
    .map((point, index) => `${xFor(index)},${yFor(point.participations)}`)
    .join(" ");
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = Math.round((maxValue * (4 - index)) / 4);
    return { value, y: yFor(value) };
  });

  return (
    <section className="okado-card overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="okado-label">{eyebrow}</p>
          <h2 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.22px] text-graphite">
            {title}
          </h2>
        </div>

        <label className="inline-flex h-11 items-center gap-2 self-start rounded-[12px] border border-border bg-linen-canvas px-3 text-sm font-semibold text-graphite shadow-[0_10px_24px_rgba(20,31,61,0.05)]">
          <CalendarDays className="h-4 w-4 text-signal-blue" />
          <select
            value={period}
            onChange={(event) => setPeriod(Number(event.target.value))}
            className="cursor-pointer bg-transparent outline-none"
            aria-label="Période d'analyse"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-5 px-5 pt-4 text-sm text-graphite">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#145aff]" />
          Scans
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0f1f3d]" />
          Participations
        </span>
      </div>

      <div className="h-[330px] w-full px-2 pb-3 pt-1">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-full w-full"
          role="img"
          aria-label={`${title} : évolution des scans et participations`}
        >
          <defs>
            <filter id="okado-chart-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#145aff" floodOpacity="0.14" />
            </filter>
          </defs>
          {yTicks.map((tick) => (
            <g key={`y-${tick.value}`}>
              <line
                x1={plot.left}
                x2={chartWidth - plot.right}
                y1={tick.y}
                y2={tick.y}
                stroke="#dfe6f2"
                strokeDasharray="4 8"
              />
              <text x={plot.left - 12} y={tick.y + 4} textAnchor="end" fill="#7b8496" fontSize="12">
                {tick.value}
              </text>
            </g>
          ))}
          {data.map((point, index) => (
            <g key={point.label}>
              <line
                x1={xFor(index)}
                x2={xFor(index)}
                y1={plot.top}
                y2={chartHeight - plot.bottom}
                stroke="#dfe6f2"
                strokeDasharray="4 8"
              />
              <text
                x={xFor(index)}
                y={chartHeight - 14}
                textAnchor="middle"
                fill="#7b8496"
                fontSize="12"
              >
                {point.date}
              </text>
            </g>
          ))}
          <polyline points={scanPoints} fill="none" stroke="#145aff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" filter="url(#okado-chart-shadow)" />
          <polyline points={participationPoints} fill="none" stroke="#0f1f3d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((point, index) => (
            <g key={`points-${point.label}`}>
              <circle cx={xFor(index)} cy={yFor(point.scans)} r="4.5" fill="#145aff" stroke="#ffffff" strokeWidth="3">
                <title>{`${formatShortDate(point.label)} · Scans : ${point.scans}`}</title>
              </circle>
              <circle cx={xFor(index)} cy={yFor(point.participations)} r="4.5" fill="#0f1f3d" stroke="#ffffff" strokeWidth="3">
                <title>{`${formatShortDate(point.label)} · Participations : ${point.participations}`}</title>
              </circle>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

