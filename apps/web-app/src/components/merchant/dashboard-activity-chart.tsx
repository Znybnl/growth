"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

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

const chartConfig = {
  scans: {
    label: "Scans",
    color: "#145aff",
  },
  participations: {
    label: "Participations",
    color: "#0f1f3d",
  },
} satisfies ChartConfig;

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

      <ChartContainer
        config={chartConfig}
        className={cn("h-[330px] w-full px-2 pb-3 pt-1")}
        initialDimension={{ width: 900, height: 330 }}
      >
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ left: 10, right: 24, top: 24, bottom: 12 }}
        >
          <defs>
            <filter id="okado-chart-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="10"
                stdDeviation="8"
                floodColor="#145aff"
                floodOpacity="0.14"
              />
            </filter>
          </defs>
          <CartesianGrid
            vertical
            strokeDasharray="4 8"
            stroke="#dfe6f2"
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            interval="preserveStartEnd"
          />
          <YAxis
            width={32}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            allowDecimals={false}
          />
          <ChartTooltip
            cursor={{ stroke: "#145aff", strokeWidth: 1, strokeDasharray: "4 6" }}
            content={
              <ChartTooltipContent
                className="min-w-[210px] rounded-[8px] border-border bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_18px_36px_rgba(15,23,40,0.18)] [&_.text-muted-foreground]:text-[#111827]"
                indicator="dot"
                labelFormatter={(_, payload) => {
                  const label = payload?.[0]?.payload?.label;
                  return label ? formatShortDate(label) : "";
                }}
              />
            }
          />
          <Line
            dataKey="scans"
            type="monotone"
            stroke="var(--color-scans)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 4, stroke: "#ffffff" }}
            filter="url(#okado-chart-shadow)"
          />
          <Line
            dataKey="participations"
            type="monotone"
            stroke="var(--color-participations)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 4, stroke: "#ffffff" }}
          />
        </LineChart>
      </ChartContainer>
    </section>
  );
}
