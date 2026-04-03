import { NextRequest, NextResponse } from "next/server";
import type { GitHubLiveResponse, FrictionSignals, FlakyWorkflow, BuildWeekTrend, FrictionIssue, PrimaryFrictionSource } from "@/lib/types";

// ── GitLab API shapes ─────────────────────────────────────────────────────────

interface GitLabPipeline {
  id: number;
  status: "success" | "failed" | "running" | "pending" | "created" | "canceled" | "skipped";
  ref: string;
  created_at: string;
  updated_at: string;
  duration?: number;      // seconds
  started_at?: string;
  finished_at?: string;
  source?: string;
}

interface GitLabJob {
  id: number;
  name: string;
  status: "success" | "failed" | "running" | "pending" | "created" | "canceled" | "skipped";
  created_at: string;
  started_at?: string;
  finished_at?: string;
  duration?: number; // seconds
  failure_reason?: string;
}

interface GitLabMR {
  iid: number;
  created_at: string;
}

interface GitLabIssueLabel {
  name: string;
}

interface GitLabIssue {
  iid: number;
  title: string;
  web_url: string;
  labels: string[] | GitLabIssueLabel[];
  created_at: string;
}

// ── Friction signal helpers ───────────────────────────────────────────────────

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function computeFlakyJobs(jobs: GitLabJob[]): FlakyWorkflow[] {
  const groups = new Map<string, GitLabJob[]>();
  for (const j of jobs) {
    const arr = groups.get(j.name) ?? [];
    arr.push(j);
    groups.set(j.name, arr);
  }
  const results: FlakyWorkflow[] = [];
  for (const [name, group] of groups) {
    if (group.length < 3) continue;
    const failures = group.filter((j) => j.status === "failed").length;
    results.push({ name, failureRate: failures / group.length, totalRuns: group.length });
  }
  return results.sort((a, b) => b.failureRate - a.failureRate).slice(0, 3);
}

function computeBuildTimeTrend(pipelines: GitLabPipeline[]): BuildWeekTrend[] {
  const successful = pipelines.filter((p) => p.status === "success" && p.duration != null);
  const groups = new Map<string, number[]>();
  for (const p of successful) {
    const week = isoWeek(p.created_at);
    const durMin = (p.duration ?? 0) / 60;
    const arr = groups.get(week) ?? [];
    arr.push(durMin);
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
  openMrCount: number,
  avgMrAgeDays: number,
  flakyJobs: FlakyWorkflow[]
): PrimaryFrictionSource {
  const buildScore = avgDurationMin > 30 ? 2 : avgDurationMin > 15 ? 1 : 0;
  const prScore = openMrCount > 20 && avgMrAgeDays > 14 ? 2 : openMrCount > 10 ? 1 : 0;
  const flakyScore =
    flakyJobs.length > 0 && flakyJobs[0].failureRate > 0.3 ? 2
    : flakyJobs.length > 0 && flakyJobs[0].failureRate > 0.15 ? 1
    : 0;
  if (buildScore === 0 && prScore === 0 && flakyScore === 0) return "Healthy";
  if (buildScore >= prScore && buildScore >= flakyScore) return "Build Time";
  if (prScore >= flakyScore) return "PR Backlog";
  return "Flaky Tests";
}

function normalizeLabels(labels: string[] | GitLabIssueLabel[]): string[] {
  if (labels.length === 0) return [];
  if (typeof labels[0] === "string") return labels as string[];
  return (labels as GitLabIssueLabel[]).map((l) => l.name);
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    token?: string;
    projectPath?: string;
    host?: string;
  };

  const { token, projectPath, host = "gitlab.com" } = body;
  if (!projectPath) {
    return NextResponse.json({ error: "projectPath is required (e.g. veloren/veloren)" }, { status: 400 });
  }

  const encodedPath = encodeURIComponent(projectPath);
  const apiBase = `https://${host}/api/v4/projects/${encodedPath}`;
  const headers: HeadersInit = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Fetch pipelines — required
  const pipelinesRes = await fetch(`${apiBase}/pipelines?per_page=100&order_by=id&sort=desc`, { headers });
  if (!pipelinesRes.ok) {
    const err = await pipelinesRes.json().catch(() => ({})) as { message?: string };
    const msg = Array.isArray(err.message) ? err.message[0] : (err.message ?? `GitLab ${pipelinesRes.status}`);
    return NextResponse.json({ error: msg }, { status: pipelinesRes.status });
  }
  const pipelines: GitLabPipeline[] = await pipelinesRes.json();

  // Parallel optional fetches
  const [jobsResult, mrsResult, ...issueResults] = await Promise.allSettled([
    fetch(`${apiBase}/jobs?per_page=100`, { headers }).then((r) =>
      r.ok ? (r.json() as Promise<GitLabJob[]>) : ([] as GitLabJob[])
    ),
    fetch(`${apiBase}/merge_requests?state=opened&per_page=100`, { headers }).then((r) =>
      r.ok ? (r.json() as Promise<GitLabMR[]>) : ([] as GitLabMR[])
    ),
    fetch(`${apiBase}/issues?labels=CI&state=opened&per_page=10`, { headers }).then((r) =>
      r.ok ? (r.json() as Promise<GitLabIssue[]>) : ([] as GitLabIssue[])
    ),
    fetch(`${apiBase}/issues?labels=build&state=opened&per_page=10`, { headers }).then((r) =>
      r.ok ? (r.json() as Promise<GitLabIssue[]>) : ([] as GitLabIssue[])
    ),
    fetch(`${apiBase}/issues?labels=Technical+Debt&state=opened&per_page=10`, { headers }).then((r) =>
      r.ok ? (r.json() as Promise<GitLabIssue[]>) : ([] as GitLabIssue[])
    ),
    fetch(`${apiBase}/issues?labels=infrastructure&state=opened&per_page=10`, { headers }).then((r) =>
      r.ok ? (r.json() as Promise<GitLabIssue[]>) : ([] as GitLabIssue[])
    ),
  ]);

  const jobs: GitLabJob[] = jobsResult.status === "fulfilled" ? jobsResult.value : [];
  const mrs: GitLabMR[] = mrsResult.status === "fulfilled" ? mrsResult.value : [];
  const issueArrays: GitLabIssue[][] = issueResults.map((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  // Normalize pipelines to workflow-run shape
  const completed = pipelines.filter((p) => ["success", "failed", "canceled"].includes(p.status));
  const successful = completed.filter((p) => p.status === "success");
  const failed = completed.filter((p) => p.status === "failed");

  const deployFreqPerDay = +(pipelines.length / 7).toFixed(2);
  const avgRunDurationMin =
    successful.length > 0
      ? +(successful.reduce((s, p) => s + (p.duration ?? 0) / 60, 0) / successful.length).toFixed(1)
      : 0;
  const changeFailureRate = completed.length > 0 ? +(failed.length / completed.length).toFixed(3) : 0;
  const successRate = 1 - changeFailureRate;

  // MR (PR) stats
  const openMrCount = mrs.length;
  const avgMrAgeDays =
    mrs.length > 0
      ? +(mrs.reduce((s, m) => s + (Date.now() - new Date(m.created_at).getTime()) / 86_400_000, 0) / mrs.length).toFixed(1)
      : 0;

  // Friction signals
  const flakyJobs = computeFlakyJobs(jobs);
  const buildTimeTrend = computeBuildTimeTrend(pipelines);
  const primaryFrictionSource = computePrimaryFrictionSource(avgRunDurationMin, openMrCount, avgMrAgeDays, flakyJobs);

  // Deduplicate issues
  const seen = new Map<number, GitLabIssue>();
  for (const arr of issueArrays) {
    for (const issue of arr) {
      if (!seen.has(issue.iid)) seen.set(issue.iid, issue);
    }
  }
  const frictionIssues: FrictionIssue[] = Array.from(seen.values())
    .slice(0, 10)
    .map((i) => ({
      number: i.iid,
      title: i.title,
      url: i.web_url,
      labels: normalizeLabels(i.labels),
      createdAt: i.created_at,
    }));

  const frictionSignals: FrictionSignals = {
    flakyWorkflows: flakyJobs,
    buildTimeTrend,
    openPrCount: openMrCount,
    avgPrAgeDays: avgMrAgeDays,
    frictionIssues,
    primaryFrictionSource,
  };

  // Recent runs (last 10)
  const recentRuns = pipelines.slice(0, 10).map((p) => ({
    id: p.id,
    name: `Pipeline #${p.id} (${p.ref})`,
    status: p.status === "running" ? "in_progress" : "completed",
    conclusion:
      p.status === "success" ? "success"
      : p.status === "failed" ? "failure"
      : p.status === "canceled" ? "cancelled"
      : null,
    createdAt: p.created_at,
    durationMin: +(( p.duration ?? 0) / 60).toFixed(1),
    commitMessage: `${p.ref} (${p.source ?? "push"})`,
  }));

  const response: GitHubLiveResponse = {
    source: "github_live", // reuse same type, provider-agnostic
    repo: projectPath,
    totalRuns: pipelines.length,
    authenticated: !!token,
    metrics: {
      deploymentFrequencyPerDay: deployFreqPerDay,
      avgRunDurationMin,
      changeFailureRate,
      successRate,
    },
    recentRuns,
    frictionSignals,
  };

  return NextResponse.json(response);
}
