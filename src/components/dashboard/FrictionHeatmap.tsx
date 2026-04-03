"use client";

import { useState } from "react";
import { mockPipelines, FRICTION_COLORS, STAGE_LABELS } from "@/lib/mock-data";
import type { Pipeline, SDLCStage, FrictionLevel, StageMetrics } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock } from "lucide-react";

const STAGES: SDLCStage[] = [
  "commit",
  "build",
  "unit_test",
  "integration_test",
  "review",
  "staging_deploy",
  "prod_deploy",
];

// Heatmap: surface (cold/low) → cyan (mid) → amber (hot) — no red to avoid confusion with error state
// Critical uses error red only as a last resort per DESIGN.md
const FRICTION_CELL_STYLE: Record<FrictionLevel, React.CSSProperties> = {
  low:      { backgroundColor: "rgba(105,218,255,0.06)", border: "1px solid rgba(105,218,255,0.12)" },
  medium:   { backgroundColor: "rgba(105,218,255,0.14)", border: "1px solid rgba(105,218,255,0.25)" },
  high:     { backgroundColor: "rgba(255,201,101,0.15)", border: "1px solid rgba(255,201,101,0.3)" },
  critical: { backgroundColor: "rgba(255,113,108,0.18)", border: "1px solid rgba(255,113,108,0.4)" },
};

const FRICTION_TEXT_COLOR: Record<FrictionLevel, string> = {
  low:      "#69daff",
  medium:   "#69daff",
  high:     "#ffc965",
  critical: "#ff716c",
};

function frictionBg(level: FrictionLevel) {
  // kept for compat — actual styles applied inline below
  return level;
}

function frictionText(level: FrictionLevel) {
  return ""; // not used — replaced by FRICTION_TEXT_COLOR
}

function StageCell({ stage, pipeline }: { stage: SDLCStage; pipeline: Pipeline }) {
  const stageData = pipeline.stages.find((s) => s.stage === stage);
  if (!stageData) return <div className="h-12 rounded border border-zinc-800 bg-zinc-900/30" />;

  const overRatio = stageData.avgDurationMin / stageData.benchmarkMin;

  const cellStyle = FRICTION_CELL_STYLE[stageData.frictionLevel];
  const textColor = FRICTION_TEXT_COLOR[stageData.frictionLevel];

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`${pipeline.studio} · ${STAGE_LABELS[stage]} — ${stageData.frictionLevel} friction, ${stageData.avgDurationMin}m avg (benchmark ${stageData.benchmarkMin}m), ${(stageData.failureRate * 100).toFixed(0)}% failure`}
        className="h-12 rounded cursor-pointer transition-all flex items-center justify-center"
        style={cellStyle}
      >
        {stageData.frictionLevel === "critical" && (
          <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#ff716c" }} aria-hidden="true" />
        )}
        {stageData.frictionLevel === "high" && (
          <Clock className="w-3.5 h-3.5" style={{ color: "#ffc965" }} aria-hidden="true" />
        )}
      </TooltipTrigger>
      <TooltipContent className="text-xs max-w-xs" style={{ backgroundColor: "rgba(26,31,42,0.95)", borderLeft: "2px solid var(--nc-cyan)" }}>
        <p className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          {pipeline.name} · {STAGE_LABELS[stage]}
        </p>
        <p style={{ color: "var(--muted-foreground)" }}>
          Avg: <span style={{ color: textColor }}>{stageData.avgDurationMin} min</span>
          {" "}(benchmark: {stageData.benchmarkMin} min · {overRatio.toFixed(1)}×)
        </p>
        <p style={{ color: "var(--muted-foreground)" }}>
          Failure rate: <span style={{ color: stageData.failureRate > 0.1 ? "#ff716c" : "var(--foreground)" }}>{(stageData.failureRate * 100).toFixed(0)}%</span>
        </p>
        {stageData.topIssue && (
          <p className="mt-1 pt-1" style={{ color: "#ffc965", borderTop: "1px solid var(--nc-ghost)" }}>{stageData.topIssue}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

interface FrictionHeatmapProps {
  pipelines?: Pipeline[];
}

export function FrictionHeatmap({ pipelines }: FrictionHeatmapProps = {}) {
  const [selectedFriction, setSelectedFriction] = useState<FrictionLevel | null>(null);

  const allPipelines = pipelines ?? mockPipelines;

  const filteredPipelines = selectedFriction
    ? allPipelines.filter((p) =>
        p.stages.some((s) => s.frictionLevel === selectedFriction)
      )
    : allPipelines;

  return (
    <div className="space-y-4">
      {/* Legend + filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Filter:</span>
        {(["low", "medium", "high", "critical"] as FrictionLevel[]).map((level) => {
          const color = FRICTION_TEXT_COLOR[level];
          const active = selectedFriction === level;
          return (
            <button
              key={level}
              onClick={() => setSelectedFriction(active ? null : level)}
              aria-pressed={active}
              className={cn("flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all", !active && selectedFriction !== null ? "opacity-30" : "")}
              style={{
                border: `1px solid ${active ? color : "var(--nc-ghost)"}`,
                color: active ? color : "var(--muted-foreground)",
                backgroundColor: active ? `${color}18` : "transparent",
              }}
            >
              <span className="w-1.5 h-1 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Stage headers */}
          <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: "160px repeat(7, 1fr)" }}>
            <div />
            {STAGES.map((stage) => (
              <div key={stage} className="text-center">
                <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                  {STAGE_LABELS[stage].split(" ")[0]}
                </span>
              </div>
            ))}
          </div>

          {/* Pipeline rows */}
          <div className="space-y-1">
            {filteredPipelines.map((pipeline) => (
              <div
                key={pipeline.id}
                className="grid gap-1 items-center"
                style={{ gridTemplateColumns: "160px repeat(7, 1fr)" }}
              >
                <div className="pr-3">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>{pipeline.studio}</p>
                  <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.2)" }}>EA ref: {pipeline.game}</p>
                </div>
                {STAGES.map((stage) => (
                  <StageCell key={stage} stage={stage} pipeline={pipeline} />
                ))}
              </div>
            ))}
          </div>

          {/* Stage full labels at bottom */}
          <div className="grid gap-1 mt-2" style={{ gridTemplateColumns: "160px repeat(7, 1fr)" }}>
            <div />
            {STAGES.map((stage) => (
              <div key={stage} className="text-center">
                <span className="text-zinc-600 text-[9px]">{STAGE_LABELS[stage]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid gap-1 min-w-[700px]" style={{ gridTemplateColumns: "160px repeat(7, 1fr)" }}>
        <div className="text-[10px] font-medium uppercase tracking-widest self-center" style={{ color: "var(--muted-foreground)" }}>
          Avg stage
        </div>
        {STAGES.map((stage) => {
          const allStages = allPipelines
            .map((p) => p.stages.find((s) => s.stage === stage))
            .filter(Boolean) as StageMetrics[];
          if (allStages.length === 0) return <div key={stage} />;
          const avg = allStages.reduce((a, b) => a + b.avgDurationMin, 0) / allStages.length;
          const bench = allStages.reduce((a, b) => a + b.benchmarkMin, 0) / allStages.length;
          const ratio = avg / bench;
          const color = ratio > 2 ? "#ff716c" : ratio > 1.3 ? "#ffc965" : "#00ffa3";
          return (
            <div key={stage} className="text-center">
              <span className="text-[10px] font-bold font-heading" style={{ color }}>{avg.toFixed(0)}m</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
