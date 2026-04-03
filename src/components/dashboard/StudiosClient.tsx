"use client";

import { useState, useEffect } from "react";
import { CANONICAL_REPOS } from "@/lib/repo-config";
import type { RepoLiveData } from "@/lib/repo-fetcher";
import type { DashboardStats, FrictionLevel, DoraMetrics, Pipeline, DevExScoreBreakdown, SDLCStage, StageMetrics } from "@/lib/types";
import { getCustomRepos, type TrackedCustomRepo } from "@/lib/custom-repos";
import { StudioDetail, DoraTierBadge } from "@/components/dashboard/StudioDetail";
import { FrictionAnalysis } from "@/components/ai/FrictionAnalysis";
import { AddRepoButton } from "@/components/dashboard/AddRepoButton";
import { cn } from "@/lib/utils";
import { ChevronLeft, TrendingUp, TrendingDown, Minus, ExternalLink, Loader2 } from "lucide-react";

// ── Color helpers ─────────────────────────────────────────────────────────────

function scoreColorHex(score: number) {
  if (score >= 80) return "#00ffa3";
  if (score >= 60) return "#69daff";
  if (score >= 40) return "#ffc965";
  return "#ffc965"; // amber even for low scores — red only for actual errors
}

const FRICTION_STRIP: Record<FrictionLevel, string> = {
  low:      "rgba(105,218,255,0.35)",
  medium:   "#69daff",
  high:     "#ffc965",
  critical: "#ff716c",
};

// ── Helper functions for custom repos ──────────────────────────────────────────

function workflowToStage(name: string): SDLCStage {
  const n = name.toLowerCase();
  if (/deploy|release|publish|ship/.test(n)) return "prod_deploy";
  if (/staging|preview|canary/.test(n)) return "staging_deploy";
  if (/integration|e2e|functional/.test(n)) return "integration_test";
  if (/test|jest|pytest|rspec|spec/.test(n)) return "unit_test";
  if (/lint|check|static|format|style|validate/.test(n)) return "commit";
  if (/review|pr\b/.test(n)) return "review";
  return "build";
}

function computeDevExScore(dora: { deploymentFrequencyPerDay: number; changeFailureRate: number; leadTimeHours: number }): number {
  const reliability = Math.max(0, 100 - dora.changeFailureRate * 600);
  const throughput = Math.min(100, dora.deploymentFrequencyPerDay * 15);
  const speed = Math.max(0, 100 - (dora.leadTimeHours / 24) * 50);
  return Math.round(reliability * 0.4 + throughput * 0.35 + speed * 0.25);
}

function computeDevExBreakdown(dora: DoraMetrics): DevExScoreBreakdown {
  const reliability = Math.max(0, 100 - dora.changeFailureRate * 600);
  const throughput = Math.min(100, dora.deploymentFrequencyPerDay * 15);
  const speed = Math.max(0, 100 - (dora.leadTimeHours / 24) * 50);

  return {
    studioId: dora.studioId,
    studioName: dora.studioName,
    total: dora.devExScore,
    buildSpeed: speed,
    reliability: reliability,
    deploymentConfidence: throughput,
    reviewCycleTime: dora.leadTimeHours,
    history: [],
  };
}

interface GitHubLiveResponse {
  source: "github_live" | "gitlab_live";
  repo: string;
  totalRuns: number;
  authenticated: boolean;
  metrics: { deploymentFrequencyPerDay: number; avgRunDurationMin: number; changeFailureRate: number; successRate: number };
  recentRuns: Array<{ id: string; name: string; status: string; conclusion: string | null; createdAt: string; durationMin: number; commitMessage?: string }>;
  frictionSignals: any;
}

function mapResponseToRepoLiveData(repo: TrackedCustomRepo, response: GitHubLiveResponse): RepoLiveData {
  const dora: DoraMetrics = {
    studioId: repo.id,
    studioName: repo.displayName,
    deploymentFrequencyPerDay: response.metrics.deploymentFrequencyPerDay,
    leadTimeHours: response.metrics.avgRunDurationMin / 60,
    mttrHours: 2.0,
    changeFailureRate: response.metrics.changeFailureRate,
    devExScore: 0,
    trend: "stable",
  };
  dora.devExScore = computeDevExScore(dora);

  // Group runs by workflow name → SDLC stage
  const stageMap = new Map<SDLCStage, typeof response.recentRuns>();
  for (const run of response.recentRuns) {
    if (run.status === "completed") {
      const stage = workflowToStage(run.name);
      const arr = stageMap.get(stage) ?? [];
      arr.push(run);
      stageMap.set(stage, arr);
    }
  }

  const stages: StageMetrics[] = [];
  for (const [stage, runs] of stageMap) {
    const successful = runs.filter((r) => r.conclusion === "success");
    const failed = runs.filter((r) => r.conclusion === "failure");
    const failureRate = runs.length > 0 ? failed.length / runs.length : 0;

    const avgDurationMin = successful.length > 0
      ? +(successful.reduce((sum, r) => sum + r.durationMin, 0) / successful.length).toFixed(1)
      : 0;

    const frictionLevel =
      avgDurationMin > 30 || failureRate > 0.15 ? "critical" :
      avgDurationMin > 20 || failureRate > 0.1 ? "high" :
      avgDurationMin > 15 || failureRate > 0.05 ? "medium" :
      "low";

    stages.push({
      stage,
      avgDurationMin,
      benchmarkMin: 10,
      failureRate: +failureRate.toFixed(3),
      queueWaitMin: 0,
      frictionLevel,
      topIssue: failureRate > 0.05 ? `${(failureRate * 100).toFixed(0)}% failure` : undefined,
    });
  }

  const pipeline: Pipeline = {
    id: repo.id,
    name: repo.displayName,
    studio: repo.displayName,
    game: repo.eaAnalogue ?? "Custom Repo",
    cloudProvider: "aws",
    pipelineTool: repo.provider === "github" ? "github_actions" : "gitlab_ci" as any,
    platforms: ["PC"],
    releasePhase: "live",
    stages,
    lastRunAt: response.recentRuns[0]?.createdAt ?? new Date().toISOString(),
    lastRunStatus: (response.recentRuns[0]?.status ?? "queued") as "success" | "failure" | "running" | "queued",
    lastRunDurationMin: response.recentRuns[0]?.durationMin ?? 0,
    weeklyRunCount: Math.round(dora.deploymentFrequencyPerDay * 7),
  };

  // Minimal trend data (no historical data for custom repos)
  const trend = {
    studioId: repo.id,
    studioName: repo.displayName,
    color: repo.color,
    leadTime: [],
    deployFrequency: [],
    changeFailureRate: [],
    devExScore: [],
  };

  return {
    pipeline,
    dora,
    trend,
    devEx: computeDevExBreakdown(dora),
    frictionSignals: response.frictionSignals,
  };
}

async function fetchCustomRepoData(repo: TrackedCustomRepo): Promise<RepoLiveData> {
  const endpoint = repo.provider === "github" ? "/api/github" : "/api/gitlab";
  const body = repo.provider === "github"
    ? { owner: repo.github?.owner, repo: repo.github?.repo, token: repo.github?.token }
    : { projectPath: repo.gitlab?.projectPath, host: repo.gitlab?.host, token: repo.gitlab?.token };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Failed to fetch ${repo.displayName}`);
  const data = (await response.json()) as GitHubLiveResponse;
  return mapResponseToRepoLiveData(repo, data);
}

// ── Compact studio card ───────────────────────────────────────────────────────

function CompactStudioCard({
  studio,
  config,
  onClick,
}: {
  studio: RepoLiveData;
  config: (typeof CANONICAL_REPOS)[0];
  onClick: () => void;
}) {
  const { dora, pipeline } = studio;

  const frictionCounts: Record<FrictionLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  pipeline.stages.forEach((s) => frictionCounts[s.frictionLevel]++);
  const total = pipeline.stages.length;

  const ltColor = dora.leadTimeHours > 20 ? "#ffc965" : dora.leadTimeHours > 12 ? "#ffc965" : "#00ffa3";
  const cfrColor = dora.changeFailureRate > 0.1 ? "#ffc965" : dora.changeFailureRate > 0.05 ? "#ffc965" : "#00ffa3";

  const hasCritical = frictionCounts.critical > 0;

  return (
    <button
      onClick={onClick}
      aria-label={`View ${config.displayName} — DevEx score ${dora.devExScore}`}
      className="w-full text-left rounded-lg p-4 transition-all duration-150 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#69daff]"
      style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(105,218,255,0.4)";
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--nc-surface-2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--nc-ghost)";
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--nc-surface-1)";
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
        <span className="font-semibold text-sm flex-1 truncate leading-tight" style={{ color: "var(--foreground)" }}>
          {config.displayName}
        </span>
        {hasCritical && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ backgroundColor: "rgba(255,113,108,0.12)", color: "#ff716c", border: "1px solid rgba(255,113,108,0.3)" }}>
            CRITICAL
          </span>
        )}
        <span className="font-bold text-lg font-heading flex-shrink-0" style={{ color: scoreColorHex(dora.devExScore) }}>
          {dora.devExScore}
        </span>
      </div>

      {/* DORA metrics row */}
      <div className="grid grid-cols-3 gap-1 text-center mb-3">
        <div>
          <p className="text-xs font-bold font-heading" style={{ color: "#69daff" }}>
            {dora.deploymentFrequencyPerDay.toFixed(1)}
          </p>
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>dep/day</p>
        </div>
        <div>
          <p className="text-xs font-bold font-heading" style={{ color: ltColor }}>{dora.leadTimeHours}h</p>
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>lead time</p>
        </div>
        <div>
          <p className="text-xs font-bold font-heading" style={{ color: cfrColor }}>
            {(dora.changeFailureRate * 100).toFixed(0)}%
          </p>
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>failure</p>
        </div>
      </div>

      {/* Friction strip */}
      <div className="flex h-1 rounded-full overflow-hidden gap-px">
        {(["low", "medium", "high", "critical"] as FrictionLevel[]).map((level) =>
          frictionCounts[level] > 0 ? (
            <div
              key={level}
              className="h-full"
              style={{
                width: `${(frictionCounts[level] / total) * 100}%`,
                backgroundColor: FRICTION_STRIP[level],
              }}
            />
          ) : null
        )}
      </div>
    </button>
  );
}

function EmptyCompactCard({ config }: { config: (typeof CANONICAL_REPOS)[0] }) {
  return (
    <div
      className="rounded-lg p-4 opacity-40"
      style={{ backgroundColor: "var(--nc-surface-1)", border: "1px dashed var(--nc-ghost)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
        <span className="font-medium text-sm" style={{ color: "var(--muted-foreground)" }}>{config.displayName}</span>
      </div>
      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{config.owner}/{config.repo}</p>
      <p className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.15)" }}>No live data · add GITHUB_TOKEN</p>
    </div>
  );
}

function CompactCustomCard({
  repo,
  onClick,
}: {
  repo: TrackedCustomRepo;
  onClick: (data: RepoLiveData) => void;
}) {
  const [state, setState] = useState<"loading" | "error" | RepoLiveData | null>(null);

  useEffect(() => {
    fetchCustomRepoData(repo)
      .then((data) => setState(data))
      .catch(() => setState("error"));
  }, [repo.id]);

  if (state === "loading" || state === null) {
    return (
      <div
        className="rounded-lg p-4 animate-pulse"
        style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: repo.color }} />
          <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{repo.displayName}</span>
        </div>
        <div className="h-2 rounded" style={{ backgroundColor: "var(--nc-surface-3)" }} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        className="rounded-lg p-4 opacity-50"
        style={{ backgroundColor: "var(--nc-surface-1)", border: "1px dashed rgba(255,113,108,0.3)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: repo.color }} />
          <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{repo.displayName}</span>
        </div>
        <p className="text-[9px]" style={{ color: "rgba(255,113,108,0.5)" }}>Failed to load</p>
      </div>
    );
  }

  const { dora, pipeline } = state;
  const frictionCounts: Record<FrictionLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  pipeline.stages.forEach((s) => frictionCounts[s.frictionLevel]++);
  const total = pipeline.stages.length;

  const ltColor = dora.leadTimeHours > 20 ? "#ffc965" : dora.leadTimeHours > 12 ? "#ffc965" : "#00ffa3";
  const cfrColor = dora.changeFailureRate > 0.1 ? "#ffc965" : dora.changeFailureRate > 0.05 ? "#ffc965" : "#00ffa3";

  return (
    <button
      onClick={() => onClick(state)}
      aria-label={`View ${repo.displayName} — DevEx score ${dora.devExScore}`}
      className="w-full text-left rounded-lg p-4 transition-all duration-150 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#69daff]"
      style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(105,218,255,0.4)";
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--nc-surface-2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--nc-ghost)";
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--nc-surface-1)";
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: repo.color }} />
        <span className="font-semibold text-sm flex-1 truncate leading-tight" style={{ color: "var(--foreground)" }}>
          {repo.displayName}
        </span>
        <span className="font-bold text-lg font-heading flex-shrink-0" style={{ color: scoreColorHex(dora.devExScore) }}>
          {dora.devExScore}
        </span>
      </div>

      {/* DORA metrics row */}
      <div className="grid grid-cols-3 gap-1 text-center mb-3">
        <div>
          <p className="text-xs font-bold font-heading" style={{ color: "#69daff" }}>
            {dora.deploymentFrequencyPerDay.toFixed(1)}
          </p>
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>dep/day</p>
        </div>
        <div>
          <p className="text-xs font-bold font-heading" style={{ color: ltColor }}>{dora.leadTimeHours}h</p>
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>lead time</p>
        </div>
        <div>
          <p className="text-xs font-bold font-heading" style={{ color: cfrColor }}>
            {(dora.changeFailureRate * 100).toFixed(0)}%
          </p>
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>failure</p>
        </div>
      </div>

      {/* Friction strip */}
      <div className="flex h-1 rounded-full overflow-hidden gap-px">
        {(["low", "medium", "high", "critical"] as FrictionLevel[]).map((level) =>
          frictionCounts[level] > 0 ? (
            <div
              key={level}
              className="h-full"
              style={{
                width: `${(frictionCounts[level] / total) * 100}%`,
                backgroundColor: FRICTION_STRIP[level],
              }}
            />
          ) : null
        )}
      </div>
    </button>
  );
}

// ── Detail panel (zoom-in view) ───────────────────────────────────────────────

function StudioDetailPanel({
  studio,
  config,
  onBack,
}: {
  studio: RepoLiveData;
  config: (typeof CANONICAL_REPOS)[0];
  onBack: () => void;
}) {
  const { pipeline, dora, devEx, frictionSignals } = studio;

  return (
    <div className="animate-fade-slide space-y-5">
      {/* Breadcrumb / back bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs transition-colors px-3 py-1.5 rounded"
          style={{ color: "var(--muted-foreground)", border: "1px solid var(--nc-ghost)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--nc-cyan)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(105,218,255,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--nc-ghost)";
          }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          All Studios
        </button>

        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.15)" }}>/</span>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{config.displayName}</span>
          <DoraTierBadge devExScore={dora.devExScore} />
        </div>

        <div className="flex-1" />

        <a
          href={`https://github.com/${config.owner}/${config.repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] transition-colors"
          style={{ color: "rgba(255,255,255,0.2)" }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--nc-cyan)"}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)"}
        >
          {config.owner}/{config.repo}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Studio detail */}
      <StudioDetail
        displayName={config.displayName}
        language={config.language}
        eaAnalogue={config.eaAnalogue}
        pipeline={pipeline}
        dora={dora}
        devEx={devEx}
        frictionSignals={frictionSignals}
        repoUrl={`https://github.com/${config.owner}/${config.repo}`}
      />

      {/* AI analysis */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
          <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
            AI Friction Analysis · {config.displayName}
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(105,218,255,0.08)", color: "var(--nc-cyan)", border: "1px solid rgba(105,218,255,0.2)" }}>
            Powered by Claude
          </span>
        </div>
        <div className="p-4">
          <FrictionAnalysis repoData={[studio]} />
        </div>
      </div>
    </div>
  );
}

// ── Custom Studio Detail Panel (drill-down for custom repos) ──────────────────

function CustomStudioDetailPanel({
  studio,
  repo,
  onBack,
}: {
  studio: RepoLiveData;
  repo: TrackedCustomRepo;
  onBack: () => void;
}) {
  const { pipeline, dora, devEx, frictionSignals } = studio;

  const repoUrl =
    repo.provider === "github" ? `https://github.com/${repo.github?.owner}/${repo.github?.repo}` :
    repo.provider === "gitlab" ? `https://${repo.gitlab?.host ?? "gitlab.com"}/${repo.gitlab?.projectPath}` :
    "#";

  return (
    <div className="animate-fade-slide space-y-5">
      {/* Breadcrumb / back bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs transition-colors px-3 py-1.5 rounded"
          style={{ color: "var(--muted-foreground)", border: "1px solid var(--nc-ghost)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--nc-cyan)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(105,218,255,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--nc-ghost)";
          }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          All Studios
        </button>

        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.15)" }}>/</span>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: repo.color }} />
          <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{repo.displayName}</span>
          <DoraTierBadge devExScore={dora.devExScore} />
        </div>

        <div className="flex-1" />

        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] transition-colors"
          style={{ color: "rgba(255,255,255,0.2)" }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--nc-cyan)"}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.2)"}
        >
          {repo.provider === "github" ? `${repo.github?.owner}/${repo.github?.repo}` : repo.gitlab?.projectPath}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Studio detail */}
      <StudioDetail
        displayName={repo.displayName}
        language="Custom"
        eaAnalogue={repo.eaAnalogue ?? "Custom Repo"}
        pipeline={pipeline}
        dora={dora}
        devEx={devEx}
        frictionSignals={frictionSignals}
        repoUrl={repoUrl}
      />

      {/* AI analysis */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
          <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
            AI Friction Analysis · {repo.displayName}
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(105,218,255,0.08)", color: "var(--nc-cyan)", border: "1px solid rgba(105,218,255,0.2)" }}>
            Powered by Claude
          </span>
        </div>
        <div className="p-4">
          <FrictionAnalysis repoData={[studio]} />
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface StudiosClientProps {
  repoData: RepoLiveData[];
  stats?: DashboardStats;
  isLive: boolean;
}

export function StudiosClient({ repoData, stats, isLive }: StudiosClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCustom, setSelectedCustom] = useState<RepoLiveData | null>(null);
  const [selectedCustomRepo, setSelectedCustomRepo] = useState<TrackedCustomRepo | null>(null);
  const [customRepos, setCustomRepos] = useState<TrackedCustomRepo[]>([]);

  useEffect(() => {
    setCustomRepos(getCustomRepos());
  }, []);

  const studioMap = new Map(repoData.map((r) => [r.dora.studioId, r]));
  const selectedConfig = selectedId ? CANONICAL_REPOS.find((r) => r.studioId === selectedId) : null;
  const selectedStudio = selectedId ? studioMap.get(selectedId) : null;

  // Show custom repo detail panel if selected
  if (selectedCustom && selectedCustomRepo) {
    return (
      <CustomStudioDetailPanel
        studio={selectedCustom}
        repo={selectedCustomRepo}
        onBack={() => {
          setSelectedCustom(null);
          setSelectedCustomRepo(null);
        }}
      />
    );
  }

  // Show canonical repo detail panel if selected
  if (selectedId && selectedConfig && selectedStudio) {
    return (
      <StudioDetailPanel
        studio={selectedStudio}
        config={selectedConfig}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="animate-fade-slide space-y-5">
      {/* Summary bar */}
      {isLive && stats && (
        <div className="flex items-center gap-4 flex-wrap text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span>
            Avg DevEx:{" "}
            <span className="font-bold" style={{ color: stats.avgDevExScore >= 70 ? "#00ffa3" : stats.avgDevExScore >= 50 ? "#ffc965" : "#ffc965" }}>
              {stats.avgDevExScore}/100
            </span>
          </span>
          <span style={{ color: "var(--nc-ghost)" }}>·</span>
          <span>
            Weekly builds:{" "}
            <span className="font-semibold" style={{ color: "var(--foreground)" }}>{stats.weeklyBuilds.toLocaleString()}</span>
          </span>
          {stats.criticalFrictionCount > 0 && (
            <>
              <span style={{ color: "var(--nc-ghost)" }}>·</span>
              <span style={{ color: "#ff716c" }}>
                {stats.criticalFrictionCount} critical friction stages
              </span>
            </>
          )}
        </div>
      )}

      {/* Studio grid — canonical + custom */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {/* Canonical studios */}
        {CANONICAL_REPOS.map((config) => {
          const studio = studioMap.get(config.studioId);
          return studio ? (
            <CompactStudioCard
              key={config.studioId}
              studio={studio}
              config={config}
              onClick={() => setSelectedId(config.studioId)}
            />
          ) : (
            <EmptyCompactCard key={config.studioId} config={config} />
          );
        })}

        {/* Custom repos */}
        {customRepos.map((repo) => (
          <CompactCustomCard
            key={repo.id}
            repo={repo}
            onClick={(data) => {
              setSelectedCustom(data);
              setSelectedCustomRepo(repo);
            }}
          />
        ))}

        <AddRepoButton />
      </div>
    </div>
  );
}
