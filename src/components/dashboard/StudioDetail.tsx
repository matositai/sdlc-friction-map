"use client";

import { cn } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/mock-data";
import type { DoraMetrics, Pipeline, DevExScoreBreakdown, FrictionSignals, StageMetrics, SDLCStage } from "@/lib/types";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  GitPullRequest,
  Rocket,
  BarChart3,
} from "lucide-react";
import { FrictionProfile } from "@/components/dashboard/FrictionProfile";
import type { GitHubLiveResponse } from "@/lib/types";

// ── DORA Tier ─────────────────────────────────────────────────────────────────

interface Tier {
  label: string;
  color: string;
  bg: string;
  border: string;
}

function getDoraTier(devExScore: number): Tier {
  if (devExScore >= 80) return { label: "ELITE PERFORMER", color: "text-[#00ffa3]", bg: "bg-[rgba(0,255,163,0.08)]", border: "border-[rgba(0,255,163,0.2)]" };
  if (devExScore >= 60) return { label: "HIGH PERFORMER", color: "text-[#69daff]", bg: "bg-[rgba(105,218,255,0.08)]", border: "border-[rgba(105,218,255,0.2)]" };
  if (devExScore >= 40) return { label: "MED PERFORMER", color: "text-[#ffc965]", bg: "bg-[rgba(255,201,101,0.08)]", border: "border-[rgba(255,201,101,0.2)]" };
  return { label: "NEEDS ATTENTION", color: "text-[#ffc965]", bg: "bg-[rgba(255,201,101,0.08)]", border: "border-[rgba(255,201,101,0.2)]" };
}

export function DoraTierBadge({ devExScore }: { devExScore: number }) {
  const tier = getDoraTier(devExScore);
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-semibold tracking-wide", tier.bg, tier.border)}>
      <span className={tier.color}>◆ {tier.label}</span>
    </div>
  );
}

// ── Bottleneck Banner ─────────────────────────────────────────────────────────

function findWorstStage(stages: StageMetrics[]): StageMetrics | null {
  if (stages.length === 0) return null;
  return stages.reduce((worst, s) => {
    const ratioA = s.avgDurationMin / s.benchmarkMin;
    const ratioB = worst.avgDurationMin / worst.benchmarkMin;
    return ratioA > ratioB ? s : worst;
  });
}

export function BottleneckBanner({ stages }: { stages: StageMetrics[] }) {
  const worst = findWorstStage(stages);
  if (!worst) return null;

  const ratio = worst.avgDurationMin / worst.benchmarkMin;
  if (ratio < 1.2 && worst.failureRate < 0.05) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-lg" style={{ backgroundColor: "rgba(0,255,163,0.06)", border: "1px solid rgba(0,255,163,0.2)" }}>
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "#00ffa3" }} />
        <div>
          <p className="font-semibold text-sm" style={{ color: "#00ffa3" }}>All stages within benchmark</p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>No dominant bottleneck detected — pipeline is healthy.</p>
        </div>
      </div>
    );
  }

  const level = worst.frictionLevel;
  const isCritical = level === "critical";

  // Primary bottleneck uses amber (not red) — red is reserved for critical system errors
  const bannerBg = isCritical ? "rgba(255,113,108,0.08)" : "rgba(255,201,101,0.06)";
  const bannerBorder = isCritical ? "rgba(255,113,108,0.3)" : "rgba(255,201,101,0.2)";
  const accentColor = isCritical ? "#ff716c" : "#ffc965";
  const IconComp = isCritical ? XCircle : AlertOctagon;

  return (
    <div className="flex items-start gap-4 px-5 py-4 rounded-lg" style={{ backgroundColor: bannerBg, border: `1px solid ${bannerBorder}` }}>
      <IconComp className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest mb-1" style={{ color: `${accentColor}99` }}>
          Primary Bottleneck
        </p>
        <p className="text-lg font-bold leading-tight" style={{ color: accentColor }}>
          {STAGE_LABELS[worst.stage] ?? worst.stage}
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          <span className="font-semibold" style={{ color: accentColor }}>{ratio.toFixed(1)}×</span>{" "}
          benchmark · {worst.avgDurationMin.toFixed(0)}m avg vs {worst.benchmarkMin}m target
          {worst.failureRate > 0.05 && (
            <span className="ml-2 text-xs" style={{ color: "#ffc965" }}>· {(worst.failureRate * 100).toFixed(0)}% failure rate</span>
          )}
        </p>
        {worst.topIssue && (
          <p className="text-xs mt-1 italic" style={{ color: "rgba(255,255,255,0.3)" }}>{worst.topIssue}</p>
        )}
      </div>
    </div>
  );
}

// ── Weekly Summary Bar ────────────────────────────────────────────────────────

export function WeeklySummaryBar({
  weeklyRuns,
  flakyCount,
  frictionIssueCount,
  devExTrend,
}: {
  weeklyRuns: number;
  flakyCount: number;
  frictionIssueCount: number;
  devExTrend: "improving" | "stable" | "degrading";
}) {
  const TrendIconComp = devExTrend === "improving" ? TrendingUp : devExTrend === "degrading" ? TrendingDown : Minus;
  const trendColor = devExTrend === "improving" ? "#00ffa3" : devExTrend === "degrading" ? "#ffc965" : "var(--muted-foreground)";

  return (
    <div className="flex items-center gap-5 flex-wrap px-1">
      <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
        <Rocket className="w-3.5 h-3.5" style={{ color: "#69daff" }} />
        <span className="font-semibold" style={{ color: "var(--foreground)" }}>{weeklyRuns}</span> runs this week
      </div>
      <div style={{ color: "rgba(255,255,255,0.1)" }}>·</div>
      <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
        <Zap className="w-3.5 h-3.5" style={{ color: "#ffc965" }} />
        <span className="font-semibold" style={{ color: flakyCount > 2 ? "#ffc965" : flakyCount > 0 ? "#ffc965" : "#00ffa3" }}>
          {flakyCount}
        </span> flaky workflows
      </div>
      <div style={{ color: "rgba(255,255,255,0.1)" }}>·</div>
      <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
        <GitPullRequest className="w-3.5 h-3.5" style={{ color: "#69daff" }} />
        <span className="font-semibold" style={{ color: frictionIssueCount > 5 ? "#ffc965" : frictionIssueCount > 2 ? "#ffc965" : "#00ffa3" }}>
          {frictionIssueCount}
        </span> friction issues open
      </div>
      <div style={{ color: "rgba(255,255,255,0.1)" }}>·</div>
      <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
        <TrendIconComp className="w-3.5 h-3.5" style={{ color: trendColor }} />
        <span className="font-semibold capitalize" style={{ color: trendColor }}>DevEx {devExTrend}</span>
      </div>
    </div>
  );
}

// ── SDLC Timeline ─────────────────────────────────────────────────────────────

const ORDERED_STAGES: SDLCStage[] = [
  "commit", "build", "unit_test", "integration_test", "review", "staging_deploy", "prod_deploy",
];

const SHORT_LABELS: Record<SDLCStage, string> = {
  commit: "Commit",
  build: "Build",
  unit_test: "Unit Test",
  integration_test: "Int. Test",
  review: "Review",
  staging_deploy: "Staging",
  prod_deploy: "Deploy",
};

function StageTimelineCell({ stage, data }: { stage: SDLCStage; data: StageMetrics | undefined }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center gap-1 min-w-0">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ border: "1px solid var(--nc-ghost)", backgroundColor: "var(--nc-surface-2)" }}>
          <Minus className="w-4 h-4" style={{ color: "rgba(255,255,255,0.15)" }} />
        </div>
        <p className="text-[9px] text-center leading-tight" style={{ color: "rgba(255,255,255,0.2)" }}>{SHORT_LABELS[stage]}</p>
        <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.1)" }}>—</p>
      </div>
    );
  }

  const ratio = data.avgDurationMin / data.benchmarkMin;

  // Colors: only critical uses error red; high/medium use amber/cyan
  const iconColor = data.frictionLevel === "critical" ? "#ff716c"
    : data.frictionLevel === "high" ? "#ffc965"
    : data.frictionLevel === "medium" ? "#69daff"
    : "#00ffa3";

  const cellBg = data.frictionLevel === "critical" ? "rgba(255,113,108,0.1)"
    : data.frictionLevel === "high" ? "rgba(255,201,101,0.08)"
    : data.frictionLevel === "medium" ? "rgba(105,218,255,0.06)"
    : "rgba(0,255,163,0.06)";

  const cellBorder = data.frictionLevel === "critical" ? "rgba(255,113,108,0.35)"
    : data.frictionLevel === "high" ? "rgba(255,201,101,0.25)"
    : data.frictionLevel === "medium" ? "rgba(105,218,255,0.2)"
    : "rgba(0,255,163,0.2)";

  const IconComponent = data.frictionLevel === "critical" ? XCircle
    : data.frictionLevel === "high" ? AlertOctagon
    : data.frictionLevel === "medium" ? AlertTriangle
    : CheckCircle2;

  const durLabel = data.avgDurationMin >= 60
    ? `${(data.avgDurationMin / 60).toFixed(1)}h`
    : `${data.avgDurationMin.toFixed(0)}m`;

  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cellBg, border: `1px solid ${cellBorder}` }}>
        <IconComponent className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <p className="text-[9px] text-center leading-tight font-medium" style={{ color: "var(--muted-foreground)" }}>{SHORT_LABELS[stage]}</p>
      <p className="text-[10px] font-bold font-heading" style={{ color: iconColor }}>{durLabel}</p>
      {ratio > 1.2 && (
        <p className="text-[8px]" style={{ color: "rgba(255,255,255,0.2)" }}>{ratio.toFixed(1)}×</p>
      )}
    </div>
  );
}

export function SdlcTimeline({ stages }: { stages: StageMetrics[] }) {
  const stageMap = new Map(stages.map((s) => [s.stage, s]));

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>SDLC Pipeline Timeline</p>
      <div className="flex items-start gap-1">
        {ORDERED_STAGES.map((stage, i) => (
          <div key={stage} className="flex items-center gap-1 flex-1 min-w-0">
            <StageTimelineCell stage={stage} data={stageMap.get(stage)} />
            {i < ORDERED_STAGES.length - 1 && (
              <div className="w-3 h-px bg-zinc-700 flex-shrink-0 mt-[-18px]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DORA Big Numbers ──────────────────────────────────────────────────────────

function DoraCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
      <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-3xl font-bold font-heading" style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>{sub}</p>
    </div>
  );
}

function DoraMetricsGrid({ dora }: { dora: DoraMetrics }) {
  // Amber for warning, green for good — red only for critical system errors, not DORA thresholds
  const cfrColor = dora.changeFailureRate > 0.05 ? "#ffc965" : "#00ffa3";
  const ltColor = dora.leadTimeHours > 12 ? "#ffc965" : "#00ffa3";
  const mttrColor = dora.mttrHours > 2 ? "#ffc965" : "#00ffa3";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <DoraCard
        label="Deploy Frequency"
        value={`${dora.deploymentFrequencyPerDay.toFixed(1)}/day`}
        sub="Workflow runs per day"
        color="#69daff"
      />
      <DoraCard
        label="Lead Time"
        value={`${dora.leadTimeHours}h`}
        sub="Commit → Production"
        color={ltColor}
      />
      <DoraCard
        label="MTTR"
        value={`${dora.mttrHours}h`}
        sub="Mean Time to Recovery"
        color={mttrColor}
      />
      <DoraCard
        label="Change Failure Rate"
        value={`${(dora.changeFailureRate * 100).toFixed(0)}%`}
        sub="Failed deployments"
        color={cfrColor}
      />
    </div>
  );
}

// ── DevEx Score Gauge ─────────────────────────────────────────────────────────

function DevExGauge({ devEx }: { devEx: DevExScoreBreakdown }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const progress = (devEx.total / 100) * circumference;
  function scoreHex(v: number) {
    return v >= 80 ? "#00ffa3" : v >= 60 ? "#69daff" : "#ffc965";
  }

  return (
    <div className="rounded-lg p-4 flex items-center gap-5" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
      <div className="relative flex items-center justify-center flex-shrink-0">
        <svg width="72" height="72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--nc-surface-3)" strokeWidth="5" />
          <circle
            cx="36" cy="36" r={r} fill="none" strokeWidth="5"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            stroke={scoreHex(devEx.total)}
          />
        </svg>
        <span className="absolute text-xl font-bold font-heading rotate-90" style={{ color: scoreHex(devEx.total) }}>{devEx.total}</span>
      </div>
      <div className="flex-1 space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>DevEx Score</p>
        {[
          { label: "Build Speed", value: devEx.buildSpeed },
          { label: "Reliability", value: devEx.reliability },
          { label: "Deploy Confidence", value: devEx.deploymentConfidence },
          { label: "Review Cycle", value: devEx.reviewCycleTime },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-2">
            <p className="text-[10px] w-24 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>{label}</p>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--nc-surface-3)" }}>
              <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: scoreHex(value) }} />
            </div>
            <p className="text-[10px] font-semibold w-6 text-right flex-shrink-0" style={{ color: scoreHex(value) }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main StudioDetail export ──────────────────────────────────────────────────

interface StudioDetailProps {
  displayName: string;
  language: string;
  eaAnalogue: string;
  pipeline: Pipeline;
  dora: DoraMetrics;
  devEx: DevExScoreBreakdown;
  frictionSignals: FrictionSignals;
  repoUrl?: string;
}

export function StudioDetail({
  displayName,
  language,
  eaAnalogue,
  pipeline,
  dora,
  devEx,
  frictionSignals,
}: StudioDetailProps) {
  // Build a GitHubLiveResponse-compatible object for FrictionProfile
  const frictionProfileData: GitHubLiveResponse = {
    source: "github_live",
    repo: `${pipeline.id}`,
    totalRuns: pipeline.weeklyRunCount,
    authenticated: true,
    metrics: {
      deploymentFrequencyPerDay: dora.deploymentFrequencyPerDay,
      avgRunDurationMin: pipeline.lastRunDurationMin,
      changeFailureRate: dora.changeFailureRate,
      successRate: 1 - dora.changeFailureRate,
    },
    recentRuns: [], // not available at this level
    frictionSignals,
  };

  return (
    <div className="space-y-5">
      {/* Bottleneck headline */}
      <BottleneckBanner stages={pipeline.stages} />

      {/* Tier + weekly summary row */}
      <div className="flex items-center gap-4 flex-wrap">
        <DoraTierBadge devExScore={dora.devExScore} />
        <div className="h-4 w-px bg-zinc-700 hidden sm:block" />
        <WeeklySummaryBar
          weeklyRuns={pipeline.weeklyRunCount}
          flakyCount={frictionSignals.flakyWorkflows.length}
          frictionIssueCount={frictionSignals.frictionIssues.length}
          devExTrend={dora.trend}
        />
      </div>

      {/* DORA big numbers */}
      <DoraMetricsGrid dora={dora} />

      {/* SDLC Timeline + DevEx side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg p-4" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
          <SdlcTimeline stages={pipeline.stages} />
        </div>
        <DevExGauge devEx={devEx} />
      </div>

      {/* Friction signals (reuse FrictionProfile) */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest mb-3" style={{ color: "var(--muted-foreground)" }}>Friction Signals · GitHub Actions</p>
        <FrictionProfile data={frictionProfileData} />
      </div>
    </div>
  );
}
