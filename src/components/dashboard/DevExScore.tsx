"use client";

import { mockDevExScores } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { DevExScoreBreakdown } from "@/lib/types";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function scoreColorHex(score: number) {
  if (score >= 80) return "#00ffa3";
  if (score >= 60) return "#69daff";
  if (score >= 40) return "#ffc965";
  return "#ff716c";
}

function scoreColor(score: number) {
  if (score >= 80) return "text-[#00ffa3]";
  if (score >= 60) return "text-[#69daff]";
  if (score >= 40) return "text-[#ffc965]";
  return "text-[#ff716c]";
}

function scoreRingColor(score: number) {
  return scoreColorHex(score);
}

function MiniGauge({ score }: { score: number }) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;

  return (
    <svg width="52" height="52" className="-rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--nc-surface-3)" strokeWidth="4" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        strokeWidth="4"
        strokeDasharray={`${progress} ${circumference}`}
        strokeLinecap="round"
        stroke={scoreRingColor(score)}
      />
    </svg>
  );
}

function SparkLine({ data }: { data: { value: number; date: string }[] }) {
  return (
    <ResponsiveContainer width={80} height={32}>
      <AreaChart data={data.slice(-14)} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#69daff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#69daff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="#69daff"
          strokeWidth={1}
          fill="url(#sparkGrad)"
          dot={false}
        />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="rounded px-2 py-1 text-[10px]" style={{ backgroundColor: "var(--nc-surface-2)", border: "1px solid var(--nc-ghost)", color: "var(--foreground)" }}>
                {payload[0].value}
              </div>
            ) : null
          }
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
        <span className={scoreColor(value)}>{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--nc-surface-3)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: scoreColorHex(value) }}
        />
      </div>
    </div>
  );
}

interface DevExScoreGridProps {
  scores?: DevExScoreBreakdown[];
}

export function DevExScoreGrid({ scores }: DevExScoreGridProps = {}) {
  const data = scores ?? mockDevExScores;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((s) => (
        <div key={s.studioId} className="rounded-lg p-4 space-y-3" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <MiniGauge score={s.total} />
              <span className={cn("absolute text-xs font-bold font-heading rotate-90", scoreColor(s.total))}>
                {s.total}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight" style={{ color: "var(--foreground)" }}>{s.studioName}</p>
              <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>DevEx Score</p>
            </div>
            <SparkLine data={s.history} />
          </div>

          {/* Breakdown bars */}
          <div className="space-y-2">
            <ScoreBar label="Build Speed" value={s.buildSpeed} />
            <ScoreBar label="Reliability" value={s.reliability} />
            <ScoreBar label="Deploy Confidence" value={s.deploymentConfidence} />
            <ScoreBar label="Review Cycle" value={s.reviewCycleTime} />
          </div>
        </div>
      ))}
    </div>
  );
}
