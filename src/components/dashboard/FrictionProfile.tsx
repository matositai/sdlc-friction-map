"use client";

import type { GitHubLiveResponse, FlakyWorkflow, BuildWeekTrend, FrictionIssue, PrimaryFrictionSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, ExternalLink, GitPullRequest, Zap, Clock, CheckCheck } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

// ── DORA metrics row ──────────────────────────────────────────────────────────

function DoraRow({ metrics, totalRuns }: { metrics: GitHubLiveResponse["metrics"]; totalRuns: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
        <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">Deploy Frequency</p>
        <p className="text-white text-xl font-bold">{metrics.deploymentFrequencyPerDay}/day</p>
        <p className="text-zinc-600 text-[10px]">{totalRuns} runs last 7 days</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
        <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">Avg Run Time</p>
        <p className="text-white text-xl font-bold">{metrics.avgRunDurationMin}m</p>
        <p className="text-zinc-600 text-[10px]">Successful runs only</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
        <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">Change Failure Rate</p>
        <p className={cn("text-xl font-bold",
          metrics.changeFailureRate > 0.1 ? "text-red-400" :
          metrics.changeFailureRate > 0.05 ? "text-yellow-400" : "text-green-400"
        )}>
          {(metrics.changeFailureRate * 100).toFixed(0)}%
        </p>
        <p className="text-zinc-600 text-[10px]">Failed / total completed</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
        <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">Success Rate</p>
        <p className={cn("text-xl font-bold",
          metrics.successRate > 0.9 ? "text-green-400" :
          metrics.successRate > 0.75 ? "text-yellow-400" : "text-red-400"
        )}>
          {(metrics.successRate * 100).toFixed(0)}%
        </p>
        <p className="text-zinc-600 text-[10px]">Of completed runs</p>
      </div>
    </div>
  );
}

// ── Primary friction badge ────────────────────────────────────────────────────

const FRICTION_STYLES: Record<PrimaryFrictionSource, { bg: string; text: string; icon: React.ReactNode }> = {
  "Build Time":  { bg: "bg-orange-950/30 border-orange-700/40", text: "text-orange-300", icon: <Clock className="w-4 h-4" /> },
  "PR Backlog":  { bg: "bg-yellow-950/30 border-yellow-700/40", text: "text-yellow-300", icon: <GitPullRequest className="w-4 h-4" /> },
  "Flaky Tests": { bg: "bg-red-950/30 border-red-700/40",       text: "text-red-300",    icon: <Zap className="w-4 h-4" /> },
  "Healthy":     { bg: "bg-green-950/30 border-green-700/40",   text: "text-green-300",  icon: <CheckCheck className="w-4 h-4" /> },
};

function PrimaryFrictionBadge({ source }: { source: PrimaryFrictionSource }) {
  const s = FRICTION_STYLES[source];
  return (
    <div className={cn("flex items-center gap-2 px-4 py-3 rounded-lg border", s.bg)}>
      <span className={s.text}>{s.icon}</span>
      <div>
        <p className={cn("text-sm font-semibold", s.text)}>Primary friction: {source}</p>
        <p className="text-zinc-500 text-[10px]">
          {source === "Build Time" && "Average run duration is high — builds are the bottleneck."}
          {source === "PR Backlog" && "Large number of open PRs with long wait times — review is the bottleneck."}
          {source === "Flaky Tests" && "High workflow failure rates — test reliability is the bottleneck."}
          {source === "Healthy" && "No dominant friction source detected. Pipeline is in good shape."}
        </p>
      </div>
    </div>
  );
}

// ── Flaky workflows ───────────────────────────────────────────────────────────

function FlakyWorkflowList({ workflows }: { workflows: FlakyWorkflow[] }) {
  if (workflows.length === 0) return (
    <p className="text-zinc-600 text-xs">No workflows with high failure rates detected.</p>
  );
  return (
    <div className="space-y-2">
      {workflows.map((w) => (
        <div key={w.name} className="space-y-1">
          <div className="flex justify-between items-center">
            <p className="text-zinc-300 text-xs truncate max-w-[70%]">{w.name}</p>
            <span className={cn("text-[10px] font-semibold",
              w.failureRate > 0.3 ? "text-red-400" : w.failureRate > 0.15 ? "text-orange-400" : "text-yellow-400"
            )}>
              {(w.failureRate * 100).toFixed(0)}% fail · {w.totalRuns} runs
            </span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full",
                w.failureRate > 0.3 ? "bg-red-500" : w.failureRate > 0.15 ? "bg-orange-500" : "bg-yellow-500"
              )}
              style={{ width: `${(w.failureRate * 100).toFixed(0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Build time trend chart ────────────────────────────────────────────────────

const BuildTrendTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="text-white font-medium">{payload[0].value.toFixed(1)} min avg</p>
    </div>
  );
};

function BuildTrendMiniChart({ trend }: { trend: BuildWeekTrend[] }) {
  if (trend.length === 0) return (
    <p className="text-zinc-600 text-xs">Not enough data for trend.</p>
  );
  return (
    <ResponsiveContainer width="100%" height={100}>
      <BarChart data={trend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <XAxis
          dataKey="week"
          tick={{ fill: "#71717a", fontSize: 9 }}
          tickFormatter={(v: string) => v.replace(/^\d{4}-/, "")}
        />
        <YAxis tick={{ fill: "#71717a", fontSize: 9 }} />
        <ChartTooltip content={<BuildTrendTooltip />} />
        <Bar dataKey="avgDurationMin" radius={[2, 2, 0, 0]}>
          {trend.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.avgDurationMin > 40 ? "#ef4444" : entry.avgDurationMin > 20 ? "#f59e0b" : "#22c55e"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Friction issues ───────────────────────────────────────────────────────────

function FrictionIssueList({ issues }: { issues: FrictionIssue[] }) {
  if (issues.length === 0) return (
    <p className="text-zinc-600 text-xs">No open issues with CI/Build/Infrastructure labels found.</p>
  );
  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <a
          key={issue.number}
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 group hover:bg-zinc-800/50 rounded-md px-2 py-1.5 -mx-2 transition-colors"
        >
          <span className="text-zinc-600 text-[10px] font-mono mt-0.5 flex-shrink-0">#{issue.number}</span>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-300 text-xs group-hover:text-white transition-colors truncate">{issue.title}</p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {issue.labels.slice(0, 3).map((l) => (
                <span key={l} className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">{l}</span>
              ))}
              <span className="text-zinc-600 text-[9px]">· {formatRelativeDate(issue.createdAt)}</span>
            </div>
          </div>
          <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 mt-0.5" />
        </a>
      ))}
    </div>
  );
}

// ── Recent runs panel ─────────────────────────────────────────────────────────

function RunRow({ run }: { run: GitHubLiveResponse["recentRuns"][0] }) {
  const ok = run.conclusion === "success";
  const failed = run.conclusion === "failure";
  return (
    <div className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
      {ok ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
      ) : failed ? (
        <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
      ) : (
        <Loader2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 animate-spin" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-zinc-300 text-xs truncate">{run.commitMessage || run.name}</p>
        <p className="text-zinc-600 text-[10px]">
          {new Date(run.createdAt).toLocaleDateString()} · {run.durationMin}m
        </p>
      </div>
      <span className={cn("text-[10px] font-medium",
        ok ? "text-green-400" : failed ? "text-red-400" : "text-blue-400"
      )}>
        {run.conclusion || run.status}
      </span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function FrictionProfile({ data }: { data: GitHubLiveResponse }) {
  const { metrics, totalRuns, frictionSignals, recentRuns } = data;

  return (
    <div className="space-y-5">
      {/* DORA metrics */}
      <DoraRow metrics={metrics} totalRuns={totalRuns} />

      {/* Primary friction label */}
      <PrimaryFrictionBadge source={frictionSignals.primaryFrictionSource} />

      {/* Signals grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Flaky workflows */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-3">
            Flakiest Workflows
          </p>
          <FlakyWorkflowList workflows={frictionSignals.flakyWorkflows} />
        </div>

        {/* PR backlog */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-3">
            PR Backlog
          </p>
          <div className="flex gap-6">
            <div>
              <p className={cn("text-2xl font-bold",
                frictionSignals.openPrCount > 30 ? "text-red-400" :
                frictionSignals.openPrCount > 15 ? "text-yellow-400" : "text-green-400"
              )}>
                {frictionSignals.openPrCount}
              </p>
              <p className="text-zinc-500 text-[10px]">Open PRs</p>
            </div>
            <div>
              <p className={cn("text-2xl font-bold",
                frictionSignals.avgPrAgeDays > 21 ? "text-red-400" :
                frictionSignals.avgPrAgeDays > 7 ? "text-yellow-400" : "text-green-400"
              )}>
                {frictionSignals.avgPrAgeDays}d
              </p>
              <p className="text-zinc-500 text-[10px]">Avg PR age</p>
            </div>
          </div>
          {frictionSignals.openPrCount === 0 && (
            <p className="text-zinc-600 text-xs mt-2">No open PRs — clean queue.</p>
          )}
        </div>
      </div>

      {/* Build time trend */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-3">
          Build Time Trend (last 8 weeks — successful runs)
        </p>
        <BuildTrendMiniChart trend={frictionSignals.buildTimeTrend} />
      </div>

      {/* Friction issues */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-3">
          Open Friction Issues
          <span className="text-zinc-600 normal-case font-normal ml-2">CI · Build · Technical Debt · Infrastructure · Refactor</span>
        </p>
        <FrictionIssueList issues={frictionSignals.frictionIssues} />
      </div>

      {/* Recent runs */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Recent Runs</p>
          <a
            href={`https://github.com/${data.repo}/actions`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1 text-[10px] transition-colors"
          >
            View on GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        {recentRuns.map((run) => (
          <RunRow key={run.id} run={run} />
        ))}
      </div>
    </div>
  );
}
