import { NextRequest, NextResponse } from "next/server";
import type {
  FlakyWorkflow,
  BuildWeekTrend,
  FrictionIssue,
  FrictionSignals,
  PrimaryFrictionSource,
  GitHubLiveResponse,
} from "@/lib/types";

// ── GitHub API shapes ─────────────────────────────────────────────────────────

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  head_commit: { message: string };
}

interface GitHubPR {
  number: number;
  created_at: string;
  state: string;
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

// ── Auth header builder ───────────────────────────────────────────────────────

function buildHeaders(token?: string): HeadersInit {
  const base: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  return token ? { ...base, Authorization: `Bearer ${token}` } : base;
}

// ── ISO week string (no library) ──────────────────────────────────────────────

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ── Pure computation helpers ──────────────────────────────────────────────────

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
    if (group.length < 3) continue; // too few runs to be meaningful
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
        new Date(r.run_started_at || r.created_at).getTime()) /
      60_000;
    const arr = groups.get(week) ?? [];
    arr.push(dur);
    groups.set(week, arr);
  }
  const trend: BuildWeekTrend[] = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, durations]) => ({
      week,
      avgDurationMin: +( durations.reduce((s, d) => s + d, 0) / durations.length).toFixed(1),
      runCount: durations.length,
    }));
  return trend;
}

function computePrStats(prs: GitHubPR[]): { openPrCount: number; avgPrAgeDays: number } {
  const openPrCount = prs.length;
  if (openPrCount === 0) return { openPrCount: 0, avgPrAgeDays: 0 };
  const avgPrAgeDays = +(
    prs.reduce((sum, pr) => sum + (Date.now() - new Date(pr.created_at).getTime()) / 86_400_000, 0) /
    openPrCount
  ).toFixed(1);
  return { openPrCount, avgPrAgeDays };
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

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { token, owner, repo } = body as { token?: string; owner?: string; repo?: string };

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 });
  }

  const headers = buildHeaders(token);
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  // Runs is the only hard-failure — everything else degrades gracefully
  let runsData: { workflow_runs: WorkflowRun[] };
  try {
    const runsRes = await fetch(`${base}/actions/runs?per_page=100`, { headers });
    if (!runsRes.ok) {
      const err = await runsRes.json().catch(() => ({})) as { message?: string };
      return NextResponse.json(
        { error: err.message || `GitHub API error ${runsRes.status}` },
        { status: runsRes.status }
      );
    }
    runsData = (await runsRes.json()) as { workflow_runs: WorkflowRun[] };
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Network error" }, { status: 500 });
  }

  // Parallel optional fetches — all degrade gracefully
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

  const prs: GitHubPR[] = prsResult.status === "fulfilled" ? prsResult.value : [];
  const issueArrays: GitHubIssue[][] = issueResults.map((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  // Core metrics from runs
  const runs = runsData.workflow_runs || [];
  const completed = runs.filter((r) => r.status === "completed");
  const successful = completed.filter((r) => r.conclusion === "success");
  const failed = completed.filter((r) => r.conclusion === "failure");
  const deployFreq = +(runs.length / 7).toFixed(2);
  const avgDurationMin =
    successful.length > 0
      ? +(
          successful.reduce((sum, r) => {
            const start = new Date(r.run_started_at || r.created_at).getTime();
            const end = new Date(r.updated_at).getTime();
            return sum + (end - start) / 60_000;
          }, 0) / successful.length
        ).toFixed(1)
      : 0;
  const changeFailureRate =
    completed.length > 0 ? +(failed.length / completed.length).toFixed(3) : 0;

  // Friction signals
  const flakyWorkflows = computeFlakyWorkflows(runs);
  const buildTimeTrend = computeBuildTimeTrend(runs);
  const { openPrCount, avgPrAgeDays } = computePrStats(prs);
  const frictionIssues = deduplicateIssues(issueArrays);
  const primaryFrictionSource = computePrimaryFrictionSource(
    avgDurationMin, openPrCount, avgPrAgeDays, flakyWorkflows
  );

  const frictionSignals: FrictionSignals = {
    flakyWorkflows,
    buildTimeTrend,
    openPrCount,
    avgPrAgeDays,
    frictionIssues,
    primaryFrictionSource,
  };

  const response: GitHubLiveResponse = {
    source: "github_live",
    repo: `${owner}/${repo}`,
    totalRuns: runs.length,
    authenticated: !!token,
    metrics: {
      deploymentFrequencyPerDay: deployFreq,
      avgRunDurationMin: avgDurationMin,
      changeFailureRate,
      successRate: +(successful.length / Math.max(completed.length, 1)).toFixed(3),
    },
    recentRuns: runs.slice(0, 10).map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      conclusion: r.conclusion,
      createdAt: r.created_at,
      durationMin: +(
        (new Date(r.updated_at).getTime() -
          new Date(r.run_started_at || r.created_at).getTime()) /
        60_000
      ).toFixed(1),
      commitMessage: r.head_commit?.message?.split("\n")[0]?.slice(0, 60) || "",
    })),
    frictionSignals,
  };

  return NextResponse.json(response);
}
