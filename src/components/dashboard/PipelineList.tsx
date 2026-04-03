"use client";

import { mockPipelines, CLOUD_PROVIDER_COLORS, CLOUD_PROVIDER_LABELS, FRICTION_COLORS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import type { Pipeline } from "@/lib/types";

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success": return <CheckCircle2 className="w-4 h-4" style={{ color: "#00ffa3" }} />;
    case "failure": return <XCircle className="w-4 h-4" style={{ color: "#ff716c" }} />;
    case "running": return <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#69daff" }} />;
    default: return <Clock className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />;
  }
}

function CloudBadge({ provider }: { provider: string }) {
  const color = CLOUD_PROVIDER_COLORS[provider] ?? "#6b7280";
  const label = CLOUD_PROVIDER_LABELS[provider] ?? provider;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border"
      style={{
        color,
        borderColor: color + "40",
        backgroundColor: color + "15",
      }}
    >
      {label}
    </span>
  );
}

function FrictionBar({ pipeline }: { pipeline: Pipeline }) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  pipeline.stages.forEach((s) => counts[s.frictionLevel]++);
  const total = pipeline.stages.length;
  if (total === 0) return null;
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-24 gap-px">
      {(["low", "medium", "high", "critical"] as const).map((level) =>
        counts[level] > 0 ? (
          <div
            key={level}
            className="h-full"
            style={{
              width: `${(counts[level] / total) * 100}%`,
              backgroundColor: FRICTION_COLORS[level],
            }}
            title={`${counts[level]} ${level}`}
          />
        ) : null
      )}
    </div>
  );
}

interface PipelineListProps {
  pipelines?: Pipeline[];
}

export function PipelineList({ pipelines }: PipelineListProps = {}) {
  const data = pipelines ?? mockPipelines;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
            <th className="text-left font-medium pb-3 pr-4 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Pipeline</th>
            <th className="text-left font-medium pb-3 px-3 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Cloud</th>
            <th className="text-left font-medium pb-3 px-3 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Platforms</th>
            <th className="text-right font-medium pb-3 px-3 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Runs/wk</th>
            <th className="text-right font-medium pb-3 px-3 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Last run</th>
            <th className="text-left font-medium pb-3 px-3 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Friction profile</th>
            <th className="text-right font-medium pb-3 pl-3 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => {
            const criticalCount = p.stages.filter((s) => s.frictionLevel === "critical").length;
            return (
              <tr
                key={p.id}
                className="transition-colors"
                style={{ borderBottom: "1px solid var(--nc-ghost)" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--nc-surface-2)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
              >
                <td className="py-3 pr-4">
                  <p className="font-medium text-xs" style={{ color: "var(--foreground)" }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{p.studio}</p>
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-col gap-1">
                    <CloudBadge provider={p.cloudProvider} />
                    <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>{p.pipelineTool}</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-wrap gap-1">
                    {p.platforms.map((pl) => (
                      <span key={pl} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--nc-surface-3)", color: "var(--muted-foreground)", border: "1px solid var(--nc-ghost)" }}>
                        {pl === "Xbox Series X" ? "XSX" : pl}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-3 text-right text-xs" style={{ color: "var(--foreground)" }}>{p.weeklyRunCount}</td>
                <td className="py-3 px-3 text-right text-xs" style={{ color: "var(--muted-foreground)" }}>{p.lastRunDurationMin}m</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <FrictionBar pipeline={p} />
                    {criticalCount > 0 && (
                      <span className="text-[10px] font-medium" style={{ color: "#ff716c" }}>{criticalCount} critical</span>
                    )}
                  </div>
                </td>
                <td className="py-3 pl-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <StatusIcon status={p.lastRunStatus} />
                    <span className="text-[10px] capitalize" style={{
                      color: p.lastRunStatus === "success" ? "#00ffa3" :
                             p.lastRunStatus === "failure" ? "#ff716c" :
                             p.lastRunStatus === "running" ? "#69daff" : "var(--muted-foreground)"
                    }}>
                      {p.lastRunStatus}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
