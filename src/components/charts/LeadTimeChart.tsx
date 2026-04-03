"use client";

import { useState, useMemo, useCallback, memo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { mockDoraTrends } from "@/lib/mock-data";
import type { DoraTrend } from "@/lib/types";


const PERIODS = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function buildChartData(trends: DoraTrend[], days: number) {
  // Fixed window so all studio lines start at the same X position
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates.map((date) => {
    const point: Record<string, number | string | null> = { date };
    for (const trend of trends) {
      const match = trend.leadTime.find((p) => p.date === date);
      point[trend.studioId] = match?.value ?? null;
    }
    return point;
  });
}

const CustomTooltip = memo(({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs shadow-nebula" style={{ backgroundColor: "rgba(26,31,42,0.95)", borderLeft: "2px solid var(--nc-cyan)", border: "1px solid var(--nc-ghost)" }}>
      <p className="mb-2" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-1 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="capitalize" style={{ color: "var(--muted-foreground)" }}>{entry.name.replace("-", " ")}:</span>
          <span className="font-medium" style={{ color: "var(--foreground)" }}>{entry.value.toFixed(1)}h</span>
        </div>
      ))}
    </div>
  );
});
CustomTooltip.displayName = "CustomTooltip";

interface LeadTimeChartProps {
  trends?: DoraTrend[];
}

function LeadTimeChartComponent({ trends }: LeadTimeChartProps = {}) {
  const [activeDays, setActiveDays] = useState(30);
  const data_trends = trends ?? mockDoraTrends;

  const handlePeriodChange = useCallback((days: number) => {
    setActiveDays(days);
  }, []);

  const { data, tickInterval } = useMemo(() => {
    const chartData = buildChartData(data_trends, activeDays);
    const interval = activeDays <= 7 ? 1 : activeDays <= 14 ? 2 : activeDays <= 30 ? 6 : 14;
    return { data: chartData, tickInterval: interval };
  }, [data_trends, activeDays]);

  return (
    <div className="space-y-2">
      {/* Period selector */}
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
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
            interval={tickInterval}
          />
          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} unit="h" />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>{value.replace("-", " ")}</span>
            )}
          />
          {data_trends.map((trend) => (
            <Line
              key={trend.studioId}
              type="monotone"
              dataKey={trend.studioId}
              stroke={trend.color}
              strokeWidth={1.5}
              dot={false}
              connectNulls
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export const LeadTimeChart = memo(LeadTimeChartComponent);
