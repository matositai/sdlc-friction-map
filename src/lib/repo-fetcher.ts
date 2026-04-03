import type {
  Pipeline,
  DoraMetrics,
  DoraTrend,
  DevExScoreBreakdown,
  FrictionSignals,
  FlakyWorkflow,
  BuildWeekTrend,
  FrictionIssue,
  PrimaryFrictionSource,
  SDLCStage,
  FrictionLevel,
  StageMetrics,
  MetricDataPoint,
  Platform,
} from "./types";
import { CANONICAL_REPOS, type RepoConfig } from "./repo-config";

// ── GitHub API shapes ─────────────────────────────────────────────────────────

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
  head_commit?: { message: string };
}

interface GitHubPR {
  number: number;
  created_at: string;
}

interface GitHubIssueLabel {
  name: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  labels: GitHubIssueLabel[];
  created_at: string;
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface RepoLiveData {
  pipeline: Pipeline;
  dora: DoraMetrics;
  trend: DoraTrend;
  devEx: DevExScoreBreakdown;
  frictionSignals: FrictionSignals;
}

// ── Stage mapping ─────────────────────────────────────────────────────────────

const STAGE_BENCHMARKS: Record<SDLCStage, number> = {
  commit: 2,
  build: 15,
  unit_test: 8,
  integration_test: 15,
  review: 120,
  staging_deploy: 10,
  prod_deploy: 15,
};

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

function computeFrictionLevel(actual: number, benchmark: number, failureRate: number): FrictionLevel {
  if (actual > benchmark * 2 || failureRate > 0.15) return "critical";
  if (actual > benchmark * 1.5 || failureRate > 0.1) return "high";
  if (actual > benchmark * 1.2 || failureRate > 0.05) return "medium";
  return "low";
}

function computeStages(runs: WorkflowRun[], prs: GitHubPR[]): StageMetrics[] {
  const completed = runs.filter((r) => r.status === "completed");

  // Group by mapped stage
  const stageMap = new Map<SDLCStage, WorkflowRun[]>();
  for (const r of completed) {
    const stage = workflowToStage(r.name);
    const arr = stageMap.get(stage) ?? [];
    arr.push(r);
    stageMap.set(stage, arr);
  }

  const result: StageMetrics[] = [];

  for (const [stage, stageRuns] of stageMap) {
    const benchmark = STAGE_BENCHMARKS[stage];
    const successful = stageRuns.filter((r) => r.conclusion === "success");
    const failed = stageRuns.filter((r) => r.conclusion === "failure");
    const failureRate = stageRuns.length > 0 ? failed.length / stageRuns.length : 0;

    let avgDurationMin = 0;
    if (successful.length > 0) {
      avgDurationMin = +(
        successful.reduce((sum, r) => {
          const start = new Date(r.run_started_at ?? r.created_at).getTime();
          const end = new Date(r.updated_at).getTime();
          return sum + (end - start) / 60_000;
        }, 0) / successful.length
      ).toFixed(1);
    }

    // Queue wait: time between created_at and run_started_at (if available)
    let queueWaitMin = 0;
    if (successful.length > 0) {
      const withStart = successful.filter((r) => r.run_started_at);
      if (withStart.length > 0) {
        queueWaitMin = +(
          withStart.reduce((sum, r) => {
            return sum + (new Date(r.run_started_at!).getTime() - new Date(r.created_at).getTime()) / 60_000;
          }, 0) / withStart.length
        ).toFixed(1);
      }
    }

    const frictionLevel = computeFrictionLevel(avgDurationMin, benchmark, failureRate);

    // Top issue text
    const topIssue =
      frictionLevel === "critical" || frictionLevel === "high"
        ? `${(failureRate * 100).toFixed(0)}% failure rate · ${avgDurationMin}m avg`
        : undefined;

    result.push({
      stage,
      avgDurationMin,
      benchmarkMin: benchmark,
      failureRate: +failureRate.toFixed(3),
      queueWaitMin,
      frictionLevel,
      topIssue,
    });
  }

  // Add a "review" stage derived from PR data if not already present
  if (!stageMap.has("review") && prs.length > 0) {
    const avgPrAgeDays = prs.reduce(
      (sum, pr) => sum + (Date.now() - new Date(pr.created_at).getTime()) / 86_400_000,
      0
    ) / prs.length;
    const avgPrAgeMin = avgPrAgeDays * 24 * 60;
    result.push({
      stage: "review",
      avgDurationMin: +avgPrAgeMin.toFixed(1),
      benchmarkMin: STAGE_BENCHMARKS.review,
      failureRate: 0,
      queueWaitMin: 0,
      frictionLevel: computeFrictionLevel(avgPrAgeMin, STAGE_BENCHMARKS.review, 0),
      topIssue: `${prs.length} open PRs · avg ${avgPrAgeDays.toFixed(0)}d age`,
    });
  }

  // Sort by natural SDLC order
  const ORDER: SDLCStage[] = [
    "commit", "build", "unit_test", "integration_test", "review", "staging_deploy", "prod_deploy",
  ];
  return result.sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage));
}

// ── MTTR ──────────────────────────────────────────────────────────────────────

function computeMTTR(runs: WorkflowRun[]): number {
  const completed = runs.filter((r) => r.status === "completed").sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const recoveries: number[] = [];
  for (let i = 0; i < completed.length - 1; i++) {
    if (completed[i].conclusion === "failure" && completed[i + 1].conclusion === "success") {
      const mttr =
        (new Date(completed[i + 1].updated_at).getTime() -
          new Date(completed[i].updated_at).getTime()) /
        3_600_000;
      if (mttr > 0 && mttr < 168) recoveries.push(mttr); // cap at 1 week
    }
  }
  if (recoveries.length === 0) return 2.0;
  return +(recoveries.reduce((s, v) => s + v, 0) / recoveries.length).toFixed(2);
}

// ── Lead Time ─────────────────────────────────────────────────────────────────

function computeLeadTime(runs: WorkflowRun[]): number {
  const successful = runs.filter((r) => r.conclusion === "success");
  if (successful.length === 0) return 24;
  const avg =
    successful.reduce((sum, r) => {
      const elapsed =
        (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 3_600_000;
      return sum + elapsed;
    }, 0) / successful.length;
  return +avg.toFixed(2);
}

// ── DevEx score ───────────────────────────────────────────────────────────────

function computeDevExScore(dora: { deploymentFrequencyPerDay: number; changeFailureRate: number; leadTimeHours: number }): number {
  const reliability = Math.max(0, 100 - dora.changeFailureRate * 600);
  const throughput = Math.min(100, dora.deploymentFrequencyPerDay * 15);
  const speed = Math.max(0, 100 - (dora.leadTimeHours / 24) * 50);
  return Math.round(reliability * 0.4 + throughput * 0.35 + speed * 0.25);
}

// ── DoraTrend ─────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeTrend(
  runs: WorkflowRun[],
  color: string,
  studioId: string
): DoraTrend {
  // Group by day — last 90 days
  const cutoff = Date.now() - 90 * 86_400_000;
  const recent = runs.filter((r) => new Date(r.created_at).getTime() >= cutoff);

  const byDay = new Map<string, WorkflowRun[]>();
  for (const r of recent) {
    const day = isoDate(new Date(r.created_at));
    const arr = byDay.get(day) ?? [];
    arr.push(r);
    byDay.set(day, arr);
  }

  const days = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));

  const deployFrequency: MetricDataPoint[] = [];
  const changeFailureRate: MetricDataPoint[] = [];
  const leadTime: MetricDataPoint[] = [];
  const devExScore: MetricDataPoint[] = [];

  for (const [date, dayRuns] of days) {
    const completed = dayRuns.filter((r) => r.status === "completed");
    const failed = completed.filter((r) => r.conclusion === "failure");
    const successful = completed.filter((r) => r.conclusion === "success");

    const cfr = completed.length > 0 ? failed.length / completed.length : 0;
    const lt = computeLeadTime(dayRuns);
    const deployFreq = dayRuns.length;
    const dex = computeDevExScore({ deploymentFrequencyPerDay: deployFreq, changeFailureRate: cfr, leadTimeHours: lt });

    deployFrequency.push({ date, value: deployFreq, studioId });
    changeFailureRate.push({ date, value: +cfr.toFixed(3), studioId });
    leadTime.push({ date, value: lt, studioId });
    devExScore.push({ date, value: dex, studioId });
  }

  return {
    studioId,
    studioName: studioId, // will be overridden by caller
    color,
    deployFrequency,
    changeFailureRate,
    leadTime,
    devExScore,
  };
}

// ── DevEx breakdown ───────────────────────────────────────────────────────────

function computeDevExBreakdown(
  dora: DoraMetrics,
  pipeline: Pipeline,
  runs: WorkflowRun[]
): DevExScoreBreakdown {
  const reliability = Math.round(Math.max(0, 100 - dora.changeFailureRate * 600));
  const throughput = Math.round(Math.min(100, dora.deploymentFrequencyPerDay * 15));
  const speed = Math.round(Math.max(0, 100 - (dora.leadTimeHours / 24) * 50));

  // Review cycle time sub-score — approximate from lead time
  const reviewCycleTime = Math.round(Math.max(0, 100 - dora.leadTimeHours * 2));

  // 30-day history
  const cutoff = Date.now() - 30 * 86_400_000;
  const recent = runs.filter((r) => new Date(r.created_at).getTime() >= cutoff);
  const byDay = new Map<string, WorkflowRun[]>();
  for (const r of recent) {
    const day = isoDate(new Date(r.created_at));
    const arr = byDay.get(day) ?? [];
    arr.push(r);
    byDay.set(day, arr);
  }
  const history: MetricDataPoint[] = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRuns]) => {
      const c = dayRuns.filter((r) => r.status === "completed");
      const f = c.filter((r) => r.conclusion === "failure");
      const cfr = c.length > 0 ? f.length / c.length : 0;
      const lt = computeLeadTime(dayRuns);
      return {
        date,
        value: computeDevExScore({ deploymentFrequencyPerDay: dayRuns.length, changeFailureRate: cfr, leadTimeHours: lt }),
        studioId: dora.studioId,
      };
    });

  return {
    studioId: dora.studioId,
    studioName: dora.studioName,
    total: dora.devExScore,
    buildSpeed: speed,
    reliability,
    deploymentConfidence: throughput,
    reviewCycleTime,
    history,
  };
}

// ── ISO week ──────────────────────────────────────────────────────────────────

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ── Friction signals ──────────────────────────────────────────────────────────

function computeFlakyWorkflows(runs: WorkflowRun[]): FlakyWorkflow[] {
  const completed = runs.filter((r) => r.status === "completed");
  const groups = new Map<string, WorkflowRun[]>();
  for (const r of completed) {
    const arr = groups.get(r.name) ?? [];
    arr.push(r);
    groups.set(r.name, arr);
  }
  const results: FlakyWorkflow[] = [];
  for (const [name, group] of groups) {
    if (group.length < 3) continue;
    const failures = group.filter((r) => r.conclusion === "failure").length;
    results.push({ name, failureRate: failures / group.length, totalRuns: group.length });
  }
  return results.sort((a, b) => b.failureRate - a.failureRate).slice(0, 3);
}

function computeBuildTimeTrend(runs: WorkflowRun[]): BuildWeekTrend[] {
  const successful = runs.filter((r) => r.conclusion === "success");
  const groups = new Map<string, number[]>();
  for (const r of successful) {
    const week = isoWeek(r.created_at);
    const dur =
      (new Date(r.updated_at).getTime() -
        new Date(r.run_started_at ?? r.created_at).getTime()) / 60_000;
    const arr = groups.get(week) ?? [];
    arr.push(dur);
    groups.set(week, arr);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, durations]) => ({
      week,
      avgDurationMin: +(durations.reduce((s, d) => s + d, 0) / durations.length).toFixed(1),
      runCount: durations.length,
    }));
}

function computePrimaryFrictionSource(
  avgDurationMin: number,
  openPrCount: number,
  avgPrAgeDays: number,
  flakyWorkflows: FlakyWorkflow[]
): PrimaryFrictionSource {
  const buildScore = avgDurationMin > 30 ? 2 : avgDurationMin > 15 ? 1 : 0;
  const prScore = openPrCount > 20 && avgPrAgeDays > 14 ? 2 : openPrCount > 10 ? 1 : 0;
  const flakyScore =
    flakyWorkflows.length > 0 && flakyWorkflows[0].failureRate > 0.3
      ? 2
      : flakyWorkflows.length > 0 && flakyWorkflows[0].failureRate > 0.15
      ? 1
      : 0;
  if (buildScore === 0 && prScore === 0 && flakyScore === 0) return "Healthy";
  if (buildScore >= prScore && buildScore >= flakyScore) return "Build Time";
  if (prScore >= flakyScore) return "PR Backlog";
  return "Flaky Tests";
}

function deduplicateIssues(issueArrays: GitHubIssue[][]): FrictionIssue[] {
  const seen = new Map<number, GitHubIssue>();
  for (const arr of issueArrays) {
    for (const issue of arr) {
      if (!seen.has(issue.number)) seen.set(issue.number, issue);
    }
  }
  return Array.from(seen.values())
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 10)
    .map((i) => ({
      number: i.number,
      title: i.title,
      url: i.html_url,
      labels: i.labels.map((l) => l.name),
      createdAt: i.created_at,
    }));
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function buildHeaders(token?: string): HeadersInit {
  const base: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  return token ? { ...base, Authorization: `Bearer ${token}` } : base;
}

// ── Core fetch for one repo ───────────────────────────────────────────────────

export async function fetchOneRepo(
  config: RepoConfig,
  token?: string
): Promise<RepoLiveData> {
  const headers = buildHeaders(token);
  const base = `https://api.github.com/repos/${config.owner}/${config.repo}`;

  // Fetch recent runs for stage/trend analysis (last 100)
  const runsRes = await fetch(`${base}/actions/runs?per_page=100`, { headers });
  if (!runsRes.ok) {
    // Capture rate limit reset time for better error messaging
    const resetHeader = runsRes.headers.get("x-ratelimit-reset");
    let resetMessage = "";
    if (resetHeader && runsRes.status === 429) {
      const resetAt = new Date(parseInt(resetHeader) * 1000).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      resetMessage = ` · Resets at ${resetAt}`;
    }

    const err = await runsRes.json().catch(() => ({})) as { message?: string };
    throw new Error((err.message ?? `GitHub ${runsRes.status}`) + resetMessage);
  }
  const runsData = (await runsRes.json()) as { workflow_runs: WorkflowRun[]; total_count: number };
  const runs: WorkflowRun[] = runsData.workflow_runs ?? [];

  // ── Paginate historical runs for richer trend data ───────────────────────────
  // If authenticated and repo has >100 runs, fetch up to 5 pages (500 runs) going back 90 days
  let allRuns: WorkflowRun[] = runs;
  if (token && runsData.total_count > 100) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    let page = 2;
    while (allRuns.length < 500) {
      const pageRes = await fetch(
        `${base}/actions/runs?created>=${ninetyDaysAgo}&per_page=100&page=${page}`,
        { headers }
      );
      if (!pageRes.ok) break;
      const pageData = (await pageRes.json()) as { workflow_runs: WorkflowRun[] };
      const pageRuns = pageData.workflow_runs ?? [];
      if (pageRuns.length === 0) break;
      allRuns = [...allRuns, ...pageRuns];
      page++;
    }
  }

  // Accurate 7-day deploy frequency — use GitHub's date filter + total_count
  // (per_page=1 so we only pay for 1 item; total_count reflects the full match count)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const freqRes = await fetch(
    `${base}/actions/runs?created=>=${sevenDaysAgo}&per_page=1`,
    { headers }
  );
  const freqData = freqRes.ok
    ? ((await freqRes.json()) as { total_count: number })
    : { total_count: 0 };
  const deployFreq = +(freqData.total_count / 7).toFixed(2);

  // ── Multi-period deploy frequency for 14d/30d/90d trend views ────────────────
  // Only when authenticated to conserve rate limit budget
  let deployFreq14d = 0;
  let deployFreq30d = 0;
  let deployFreq90d = 0;

  if (token) {
    const toFreq = (res: Response, days: number) =>
      res.ok
        ? res.json().then((d: { total_count: number }) => +(d.total_count / days).toFixed(2))
        : Promise.resolve(0);

    const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);

    [deployFreq14d, deployFreq30d, deployFreq90d] = await Promise.all([
      fetch(`${base}/actions/runs?created=>=${fourteenDaysAgo}&per_page=1`, { headers }).then(r => toFreq(r, 14)).catch(() => 0),
      fetch(`${base}/actions/runs?created=>=${thirtyDaysAgo}&per_page=1`, { headers }).then(r => toFreq(r, 30)).catch(() => 0),
      fetch(`${base}/actions/runs?created=>=${ninetyDaysAgo}&per_page=1`, { headers }).then(r => toFreq(r, 90)).catch(() => 0),
    ]);
  }

  // Parallel optional fetches — only when authenticated (token present)
  // Without a token, GitHub allows only 60 req/hr. 6 repos × 7 calls = 42,
  // which burns the budget fast across multiple page loads. Skip the
  // PR/issue calls when unauthenticated to stay at 1 call per repo (6 total).
  let prs: GitHubPR[] = [];
  let issueArrays: GitHubIssue[][] = [[], [], [], [], []];

  if (token) {
    const [prsResult, ...issueResults] = await Promise.allSettled([
      fetch(`${base}/pulls?state=open&per_page=100`, { headers }).then((r) =>
        r.ok ? (r.json() as Promise<GitHubPR[]>) : ([] as GitHubPR[])
      ),
      fetch(`${base}/issues?labels=CI&state=open&per_page=10`, { headers }).then((r) =>
        r.ok ? (r.json() as Promise<GitHubIssue[]>) : ([] as GitHubIssue[])
      ),
      fetch(`${base}/issues?labels=build&state=open&per_page=10`, { headers }).then((r) =>
        r.ok ? (r.json() as Promise<GitHubIssue[]>) : ([] as GitHubIssue[])
      ),
      fetch(`${base}/issues?labels=Technical+Debt&state=open&per_page=10`, { headers }).then((r) =>
        r.ok ? (r.json() as Promise<GitHubIssue[]>) : ([] as GitHubIssue[])
      ),
      fetch(`${base}/issues?labels=Infrastructure&state=open&per_page=10`, { headers }).then((r) =>
        r.ok ? (r.json() as Promise<GitHubIssue[]>) : ([] as GitHubIssue[])
      ),
      fetch(`${base}/issues?labels=Refactor&state=open&per_page=10`, { headers }).then((r) =>
        r.ok ? (r.json() as Promise<GitHubIssue[]>) : ([] as GitHubIssue[])
      ),
    ]);
    prs = prsResult.status === "fulfilled" ? prsResult.value : [];
    issueArrays = issueResults.map((r) => (r.status === "fulfilled" ? r.value : []));
  }

  // Core DORA metrics — use allRuns for richer trend data when available
  const completed = allRuns.filter((r) => r.status === "completed");
  const successful = completed.filter((r) => r.conclusion === "success");
  const failed = completed.filter((r) => r.conclusion === "failure");

  const avgRunDurationMin =
    successful.length > 0
      ? +(
          successful.reduce((sum, r) => {
            const start = new Date(r.run_started_at ?? r.created_at).getTime();
            return sum + (new Date(r.updated_at).getTime() - start) / 60_000;
          }, 0) / successful.length
        ).toFixed(1)
      : 0;
  const changeFailureRate = completed.length > 0 ? +(failed.length / completed.length).toFixed(3) : 0;
  const leadTimeHours = computeLeadTime(allRuns);
  const mttrHours = computeMTTR(allRuns);

  // Friction signals
  const flakyWorkflows = computeFlakyWorkflows(allRuns);
  const buildTimeTrend = computeBuildTimeTrend(allRuns);
  const openPrCount = prs.length;
  const avgPrAgeDays =
    prs.length > 0
      ? +(prs.reduce((sum, pr) => sum + (Date.now() - new Date(pr.created_at).getTime()) / 86_400_000, 0) / prs.length).toFixed(1)
      : 0;
  const frictionIssues = deduplicateIssues(issueArrays);
  const primaryFrictionSource = computePrimaryFrictionSource(
    avgRunDurationMin, openPrCount, avgPrAgeDays, flakyWorkflows
  );

  const frictionSignals: FrictionSignals = {
    flakyWorkflows,
    buildTimeTrend,
    openPrCount,
    avgPrAgeDays,
    frictionIssues,
    primaryFrictionSource,
  };

  // Stage breakdown — use allRuns for comprehensive stage analysis
  const stages = computeStages(allRuns, prs);

  // Last run info
  const latestRun = runs[0];
  const lastRunStatus: Pipeline["lastRunStatus"] =
    !latestRun ? "queued"
    : latestRun.status === "in_progress" ? "running"
    : latestRun.conclusion === "success" ? "success"
    : latestRun.conclusion === "failure" ? "failure"
    : "queued";

  const pipeline: Pipeline = {
    id: `${config.owner}/${config.repo}`,
    name: `${config.displayName} CI`,
    studio: config.displayName,
    game: config.eaAnalogue,
    cloudProvider: "github",
    pipelineTool: "GitHub Actions",
    platforms: ["PC"] as Platform[],
    releasePhase: "live",
    stages,
    lastRunAt: latestRun?.created_at ?? new Date().toISOString(),
    lastRunStatus,
    lastRunDurationMin: avgRunDurationMin,
    weeklyRunCount: runs.length,
  };

  const devExScore = computeDevExScore({ deploymentFrequencyPerDay: deployFreq, changeFailureRate, leadTimeHours });

  const dora: DoraMetrics = {
    studioId: config.studioId,
    studioName: config.displayName,
    deploymentFrequencyPerDay: deployFreq,
    deployFreq14d: deployFreq14d || undefined,
    deployFreq30d: deployFreq30d || undefined,
    deployFreq90d: deployFreq90d || undefined,
    leadTimeHours,
    mttrHours,
    changeFailureRate,
    devExScore,
    trend: "stable",
  };

  const trend = computeTrend(allRuns, config.color, config.studioId);
  trend.studioName = config.displayName;

  const devEx = computeDevExBreakdown(dora, pipeline, allRuns);

  return { pipeline, dora, trend, devEx, frictionSignals };
}

// ── Fetch all repos ───────────────────────────────────────────────────────────

export interface FetchResult {
  data: RepoLiveData[];
  errors: Array<{ repo: string; error: string }>;
  totalAttempted: number;
  successCount: number;
}

export async function fetchAllRepos(token?: string): Promise<FetchResult> {
  const errors: Array<{ repo: string; error: string }> = [];

  if (token) {
    // Authenticated — all parallel
    const results = await Promise.allSettled(
      CANONICAL_REPOS.map((config) => fetchOneRepo(config, token))
    );
    const data = results.flatMap((r, i) => {
      if (r.status === "fulfilled") {
        return [r.value];
      } else {
        const repo = CANONICAL_REPOS[i];
        const errorMsg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        errors.push({ repo: `${repo.owner}/${repo.repo}`, error: errorMsg });
        return [];
      }
    });
    return {
      data,
      errors,
      totalAttempted: CANONICAL_REPOS.length,
      successCount: data.length,
    };
  }

  // Unauthenticated — sequential to avoid rate limit
  const out: RepoLiveData[] = [];
  for (const config of CANONICAL_REPOS) {
    try {
      out.push(await fetchOneRepo(config, undefined));
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      errors.push({ repo: `${config.owner}/${config.repo}`, error: errorMsg });
    }
  }
  return {
    data: out,
    errors,
    totalAttempted: CANONICAL_REPOS.length,
    successCount: out.length,
  };
}
