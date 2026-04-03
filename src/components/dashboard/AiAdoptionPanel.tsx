"use client";

import React from "react";
import { mockAIAdoption } from "@/lib/mock-data";
import { AIAdoptionMetrics, AIAdoptionCohort } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Cohort badge ──────────────────────────────────────────────────────────────

const COHORT_INLINE: Record<AIAdoptionCohort, React.CSSProperties> = {
  high:   { backgroundColor: "rgba(0,255,163,0.1)", color: "#00ffa3", borderColor: "rgba(0,255,163,0.25)" },
  medium: { backgroundColor: "rgba(105,218,255,0.1)", color: "#69daff", borderColor: "rgba(105,218,255,0.25)" },
  low:    { backgroundColor: "rgba(255,201,101,0.1)", color: "#ffc965", borderColor: "rgba(255,201,101,0.25)" },
  none:   { backgroundColor: "var(--nc-surface-3)", color: "var(--muted-foreground)", borderColor: "var(--nc-ghost)" },
};

const COHORT_LABELS: Record<AIAdoptionCohort, string> = {
  high:   "High adoption",
  medium: "Medium adoption",
  low:    "Low adoption",
  none:   "Not adopted",
};

function CohortBadge({ cohort }: { cohort: AIAdoptionCohort }) {
  return (
    <span className="text-[10px] font-medium border px-2 py-0.5 rounded" style={COHORT_INLINE[cohort]}>
      {COHORT_LABELS[cohort]}
    </span>
  );
}

// ── Velocity/Capability bar ───────────────────────────────────────────────────

function VCRatio({ ratio }: { ratio: number }) {
  const pct = Math.min(100, Math.round(ratio * 60)); // scale so 1.0 ≈ 60%
  const isReal = ratio >= 1.0;
  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="w-full">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Velocity vs. Capability</span>
            <span className="text-[10px] font-semibold" style={{ color: isReal ? "#00ffa3" : "#ffc965" }}>
              {ratio.toFixed(2)}× {isReal ? "✓ real" : "⚠ inflated"}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--nc-surface-3)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: isReal ? "#00ffa3" : "#ffc965" }}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {isReal
          ? "Velocity gains reflect genuine developer capability improvement — AI is adding real value beyond boilerplate."
          : "Velocity appears inflated: teams are shipping more lines faster, but reviews are slower and estimation accuracy is low. Classic AI boilerplate trap."}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Context Guardian score ────────────────────────────────────────────────────

function ContextGuardianBar({ score }: { score: number }) {
  const barColor = score >= 70 ? "#00ffa3" : score >= 45 ? "#ffc965" : "#ff716c";
  const textColor = score >= 70 ? "#00ffa3" : score >= 45 ? "#ffc965" : "#ff716c";
  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="w-full">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Context Guardian Score</span>
            <span className="text-[10px] font-semibold" style={{ color: textColor }}>
              {score}/100
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--nc-surface-3)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: barColor }} />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        Code review quality metric. High = reviewers are acting as &quot;Context Guardians&quot; — evaluating logical soundness, integration compatibility, and AI reasoning detours. Low = reviews stuck on syntax and naming conventions.
      </TooltipContent>
    </Tooltip>
  );
}

// ── Per-studio card ───────────────────────────────────────────────────────────

function StudioAdoptionCard({ d }: { d: AIAdoptionMetrics }) {
  return (
    <div className="rounded-lg p-4 space-y-3" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold leading-tight" style={{ color: "var(--foreground)" }}>{d.studioName}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {Math.round(d.activeAiUsersPct * 100)}% devs active · {d.aiCodeAuthorshipPct}% AI-authored code
          </p>
        </div>
        <CohortBadge cohort={d.adoptionCohort} />
      </div>

      {/* Bars */}
      <div className="space-y-2.5">
        <VCRatio ratio={d.velocityVsCapabilityRatio} />
        <ContextGuardianBar score={d.contextGuardianScore} />
      </div>

      {/* Bottom stats row */}
      <div className="grid grid-cols-3 gap-2 pt-1" style={{ borderTop: "1px solid var(--nc-ghost)" }}>
        <Tooltip>
          <TooltipTrigger>
            <div className="text-center">
              <p className="text-sm font-bold font-heading" style={{ color: "var(--foreground)" }}>{d.estimationAccuracyPct}%</p>
              <p className="text-[9px] leading-tight" style={{ color: "rgba(255,255,255,0.2)" }}>Estimation accuracy</p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs">
            Sprint forecasts met. In AI-augmented teams, estimation often breaks down when story points assume human effort timelines but AI scaffolds 70%+ of boilerplate in minutes.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <div className="text-center">
              <p className="text-sm font-bold font-heading" style={{ color: d.promptReuseRate >= 0.5 ? "#00ffa3" : d.promptReuseRate >= 0.3 ? "#ffc965" : "#ff716c" }}>
                {Math.round(d.promptReuseRate * 100)}%
              </p>
              <p className="text-[9px] leading-tight" style={{ color: "rgba(255,255,255,0.2)" }}>Prompt reuse</p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs">
            Prompt reuse rate signals prompt governance maturity. High reuse = teams have standardized effective prompts (like code patterns). Low = each dev reinvents prompts, causing wildly inconsistent AI output quality.
          </TooltipContent>
        </Tooltip>
        <div className="text-center">
          <p className="text-sm font-bold font-heading" style={{ color: d.trend === "improving" ? "#00ffa3" : d.trend === "stable" ? "var(--muted-foreground)" : "#ff716c" }}>
            {d.trend === "improving" ? "↑" : d.trend === "stable" ? "→" : "↓"}
          </p>
          <p className="text-[9px] leading-tight" style={{ color: "rgba(255,255,255,0.2)" }}>Trend</p>
        </div>
      </div>
    </div>
  );
}

// ── Insight banner ────────────────────────────────────────────────────────────

function InsightBanner() {
  const inflated = mockAIAdoption.filter((d) => d.velocityVsCapabilityRatio < 1.0);
  const lowGuardian = mockAIAdoption.filter((d) => d.contextGuardianScore < 50);
  const noPromptGov = mockAIAdoption.filter((d) => d.promptReuseRate < 0.25);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(255,201,101,0.06)", border: "1px solid rgba(255,201,101,0.2)" }}>
        <p className="text-xs font-semibold mb-0.5" style={{ color: "#ffc965" }}>
          {inflated.length} studio{inflated.length !== 1 ? "s" : ""} — inflated velocity
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          Shipping faster but reviews are slower and estimation is breaking down. AI boilerplate trap — velocity without capability growth.
        </p>
      </div>
      <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(255,113,108,0.06)", border: "1px solid rgba(255,113,108,0.2)" }}>
        <p className="text-xs font-semibold mb-0.5" style={{ color: "#ff716c" }}>
          {lowGuardian.length} studio{lowGuardian.length !== 1 ? "s" : ""} — low Context Guardian score
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          Reviews focus on syntax, not logic or architectural fit. Linters can&apos;t comprehend AI-generated code intent — humans need to step up as guardians.
        </p>
      </div>
      <div className="rounded-lg p-3" style={{ backgroundColor: "var(--nc-surface-2)", border: "1px solid var(--nc-ghost)" }}>
        <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>
          {noPromptGov.length} studio{noPromptGov.length !== 1 ? "s" : ""} — no prompt governance
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          Prompts treated as disposable. Same feature request produces wildly different code quality across developers — not a tool problem, a prompt-hygiene problem.
        </p>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export function AiAdoptionPanel() {
  return (
    <div className="space-y-4">
      <InsightBanner />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {mockAIAdoption.map((d) => (
          <StudioAdoptionCard key={d.studioId} d={d} />
        ))}
      </div>
    </div>
  );
}
