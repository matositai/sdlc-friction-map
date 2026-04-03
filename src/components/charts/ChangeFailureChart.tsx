"use client";

import { memo, useMemo } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { mockDoraMetrics } from "@/lib/mock-data";
import type { DoraMetrics } from "@/lib/types";

const CustomTooltip = memo(({ active, payload }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "rgba(26,31,42,0.95)", borderLeft: "2px solid #ffc965", border: "1px solid var(--nc-ghost)" }}>
      <p className="font-medium" style={{ color: "var(--foreground)" }}>{(payload[0].value).toFixed(1)}%</p>
    </div>
  );
});
CustomTooltip.displayName = "CustomTooltip";

interface ChangeFailureChartProps {
  metrics?: DoraMetrics[];
}

function ChangeFailureChartComponent({ metrics }: ChangeFailureChartProps = {}) {
  const data = useMemo(() => {
    return (metrics ?? mockDoraMetrics).map((d) => ({
      studio: d.studioName.split(" ")[0],
      cfr: +(d.changeFailureRate * 100).toFixed(1),
    }));
  }, [metrics]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
        <PolarGrid stroke="rgba(255,255,255,0.06)" />
        <PolarAngleAxis
          dataKey="studio"
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Radar
          name="CFR %"
          dataKey="cfr"
          stroke="#ffc965"
          fill="#ffc965"
          fillOpacity={0.12}
          strokeWidth={1.5}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export const ChangeFailureChart = memo(ChangeFailureChartComponent);
