"use client";

import { useState, useMemo, useCallback, memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { mockDoraMetrics, mockDoraTrends } from "@/lib/mock-data";
import type { DoraMetrics, DoraTrend } from "@/lib/types";


const PERIODS = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const CustomTooltip = memo(({ active, payload, label, days }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  days: number;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "rgba(26,31,42,0.95)", borderLeft: "2px solid var(--nc-cyan)", border: "1px solid var(--nc-ghost)" }}>
      <p className="mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="font-medium" style={{ color: "var(--foreground)" }}>{payload[0].value.toFixed(1)} deploys/day</p>
      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>avg over last {days}d</p>
    </div>
  );
});
CustomTooltip.displayName = "CustomTooltip";

interface DeployFrequencyChartProps {
  metrics?: DoraMetrics[];
  trends?: DoraTrend[];
}

function DeployFrequencyChartComponent({ metrics, trends }: DeployFrequencyChartProps = {}) {
  const [activeDays, setActiveDays] = useState(7);
  const metricsData = metrics ?? mockDoraMetrics;
  const trendsData = trends ?? mockDoraTrends;

  const handlePeriodChange = useCallback((days: number) => {
    setActiveDays(days);
  }, []);

  const { colorMap, data } = useMemo(() => {
    const colors = Object.fromEntries(trendsData.map((t) => [t.studioId, t.color]));
    const chartData = metricsData.map((d) => {
      // Use real multi-period deploy frequency from GitHub API total_count queries
      const value =
        activeDays === 7 ? d.deploymentFrequencyPerDay :
        activeDays === 14 ? (d.deployFreq14d ?? 0) :
        activeDays === 30 ? (d.deployFreq30d ?? 0) :
        (d.deployFreq90d ?? 0);
      return { name: d.studioName, value, studioId: d.studioId };
    });
    return { colorMap: colors, data: chartData };
  }, [metricsData, trendsData, activeDays]);

  return (
    <div className="space-y-2">
      <div className="flex gap-1 justify-end">
        {PERIODS.map(({ label, days }) => (
          <button
            key={label}
            onClick={() => handlePeriodChange(days)}
            className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
            style={{
              border: activeDays === days ? "1px solid var(--nc-cyan)" : "1px solid var(--nc-ghost)",
              color: activeDays === days ? "var(--nc-cyan)" : "var(--muted-foreground)",
              backgroundColor: activeDays === days ? "rgba(105,218,255,0.1)" : "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 18, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            tickFormatter={(v) => v.split(" ")[0]}
          />
          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
          <Tooltip content={<CustomTooltip days={activeDays} />} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: unknown) => (typeof v === "number" ? v.toFixed(1) : "")}
              style={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}
            />
            {data.map((entry) => (
              <Cell key={entry.studioId} fill={colorMap[entry.studioId] || "#6b7280"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const DeployFrequencyChart = memo(DeployFrequencyChartComponent);
