"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { mockDashboardStats, mockDoraMetrics } from "@/lib/mock-data";
import { TrendingDown, TrendingUp, Minus, Rocket, Clock, ShieldAlert, Zap, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats, DoraMetrics } from "@/lib/types";

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (trend === "degrading") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-zinc-400" />;
}

function scoreColor(score: number) {
  if (score >= 80) return "text-[#00ffa3]";
  if (score >= 60) return "text-[#69daff]";
  if (score >= 40) return "text-[#ffc965]";
  return "text-[#ff716c]";
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  status?: "good" | "warn" | "critical";
}

function MetricCard({ label, value, sub, icon: Icon, accent, status }: MetricCardProps) {
  const iconBg =
    status === "critical" ? "rgba(255,113,108,0.12)" :
    status === "warn"     ? "rgba(255,201,101,0.12)" :
    "var(--nc-surface-3)";

  return (
    <div
      className="rounded-lg p-5"
      style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-medium uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>{label}</p>
          <p className={cn("text-2xl font-bold font-heading", accent)}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{sub}</p>}
        </div>
        <div className="p-2 rounded" style={{ backgroundColor: iconBg }}>
          <Icon className={cn("w-5 h-5", accent)} />
        </div>
      </div>
    </div>
  );
}

interface MetricsCardsProps {
  stats?: DashboardStats;
  metrics?: DoraMetrics[];
}

export function MetricsCards({ stats, metrics }: MetricsCardsProps = {}) {
  const s = stats ?? mockDashboardStats;
  const m = metrics ?? mockDoraMetrics;
  const avgCfr = (
    m.reduce((a, b) => a + b.changeFailureRate, 0) / m.length * 100
  ).toFixed(1);
  void avgCfr;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Avg DevEx Score"
        value={`${s.avgDevExScore}/100`}
        sub={`Across ${s.totalStudios} repos`}
        icon={Zap}
        accent={scoreColor(s.avgDevExScore)}
        status={s.avgDevExScore < 60 ? "warn" : "good"}
      />
      <MetricCard
        label="Avg Lead Time"
        value={`${s.avgLeadTimeHours}h`}
        sub="Commit → Production"
        icon={Clock}
        accent={s.avgLeadTimeHours > 20 ? "text-orange-400" : "text-blue-400"}
        status={s.avgLeadTimeHours > 20 ? "warn" : "good"}
      />
      <MetricCard
        label="Weekly Builds"
        value={s.weeklyBuilds.toLocaleString()}
        sub={`Across ${s.totalPipelines} pipelines`}
        icon={Rocket}
        accent="text-purple-400"
      />
      <MetricCard
        label="Critical Friction"
        value={`${s.criticalFrictionCount}`}
        sub="Pipeline stages blocked"
        icon={ShieldAlert}
        accent={s.criticalFrictionCount > 0 ? "text-red-400" : "text-green-400"}
        status={s.criticalFrictionCount > 0 ? "critical" : "good"}
      />
    </div>
  );
}

function ColHeader({ label, tip }: { label: string; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <span className="inline-flex items-center gap-1 cursor-default">
          {label}
          <HelpCircle className="w-3 h-3 text-zinc-600 hover:text-zinc-400 transition-colors" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="bg-zinc-900 border-zinc-700 text-xs max-w-xs text-left">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

interface StudioDoraTableProps {
  metrics?: DoraMetrics[];
}

export function StudioDoraTable({ metrics }: StudioDoraTableProps = {}) {
  const data = metrics ?? mockDoraMetrics;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
            <th className="text-left text-zinc-500 font-medium pb-3 pr-4">Studio / Repo</th>
            <th className="text-right text-zinc-500 font-medium pb-3 px-4">
              <ColHeader label="Deploy Freq/day" tip="How many CI pipeline runs complete per day. Higher = faster iteration. Measured over the last 7 days via GitHub API." />
            </th>
            <th className="text-right text-zinc-500 font-medium pb-3 px-4">
              <ColHeader label="Lead Time" tip="LT — average time from a workflow run being created to completing successfully. Proxy for commit-to-production speed." />
            </th>
            <th className="text-right text-zinc-500 font-medium pb-3 px-4">
              <ColHeader label="MTTR" tip="Mean Time To Recovery — average hours between a failed run and the next successful run on the same repo. Lower is better." />
            </th>
            <th className="text-right text-zinc-500 font-medium pb-3 px-4">
              <ColHeader label="CFR" tip="Change Failure Rate — percentage of completed runs that ended in failure. DORA elite threshold is under 5%." />
            </th>
            <th className="text-right text-zinc-500 font-medium pb-3 px-4">
              <ColHeader label="DevEx" tip="Developer Experience score (0–100). Weighted composite: Reliability 40% + Throughput 35% + Speed 25%." />
            </th>
            <th className="text-right text-zinc-500 font-medium pb-3 pl-4">Trend</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr
              key={d.studioId}
              className="transition-colors"
              style={{ borderBottom: "1px solid var(--nc-ghost)" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--nc-surface-2)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
            >
              <td className="py-3 pr-4 font-medium" style={{ color: "var(--foreground)" }}>{d.studioName}</td>
              <td className="py-3 px-4 text-right" style={{ color: "var(--nc-cyan)" }}>{d.deploymentFrequencyPerDay.toFixed(1)}</td>
              <td className={cn("py-3 px-4 text-right font-medium", d.leadTimeHours > 20 ? "text-[#ff716c]" : d.leadTimeHours > 12 ? "text-[#ffc965]" : "text-[#00ffa3]")}>
                {d.leadTimeHours}h
              </td>
              <td className={cn("py-3 px-4 text-right", d.mttrHours > 3 ? "text-[#ff716c]" : d.mttrHours > 1.5 ? "text-[#ffc965]" : "text-[#00ffa3]")}>
                {d.mttrHours}h
              </td>
              <td className={cn("py-3 px-4 text-right", d.changeFailureRate > 0.1 ? "text-[#ff716c]" : d.changeFailureRate > 0.05 ? "text-[#ffc965]" : "text-[#00ffa3]")}>
                {(d.changeFailureRate * 100).toFixed(0)}%
              </td>
              <td className={cn("py-3 px-4 text-right font-bold font-heading", scoreColor(d.devExScore))}>
                {d.devExScore}
              </td>
              <td className="py-3 pl-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <TrendIcon trend={d.trend} />
                  <span className={cn("text-xs capitalize", d.trend === "improving" ? "text-[#00ffa3]" : d.trend === "degrading" ? "text-[#ff716c]" : "text-[#6b7280]")}>
                    {d.trend}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
