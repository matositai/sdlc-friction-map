import { unstable_cache } from "next/cache";
import { fetchAllRepos, type RepoLiveData, type FetchResult } from "./repo-fetcher";
import type { DashboardStats, DoraMetrics, DoraTrend, DevExScoreBreakdown, Pipeline } from "./types";

// ── Cached fetcher ─────────────────────────────────────────────────────────────

export interface LiveDataResult {
  data: RepoLiveData[];
  errors: Array<{ repo: string; error: string }>;
  totalAttempted: number;
  successCount: number;
  isLive: boolean;
}

export async function getLiveRepoData(): Promise<LiveDataResult> {
  const token = process.env.GITHUB_TOKEN;
  // Include token presence in cache key so adding/removing a token
  // immediately busts the cache rather than serving stale unauthenticated data.
  const result = await unstable_cache(
    () => fetchAllRepos(token),
    [token ? "live-repo-data-authed" : "live-repo-data-anon"],
    { revalidate: 3600 }
  )();

  return {
    ...result,
    isLive: result.data.length > 0,
  };
}

// ── Derivation helpers ─────────────────────────────────────────────────────────

export function derivePipelines(repoData: RepoLiveData[]): Pipeline[] {
  return repoData.map((r) => r.pipeline);
}

export function deriveDoraMetrics(repoData: RepoLiveData[]): DoraMetrics[] {
  return repoData.map((r) => r.dora);
}

export function deriveDoraTrends(repoData: RepoLiveData[]): DoraTrend[] {
  return repoData.map((r) => r.trend);
}

export function deriveDevExScores(repoData: RepoLiveData[]): DevExScoreBreakdown[] {
  return repoData.map((r) => r.devEx);
}

export function deriveDashboardStats(repoData: RepoLiveData[]): DashboardStats {
  if (repoData.length === 0) {
    return {
      totalStudios: 0,
      totalPipelines: 0,
      avgDevExScore: 0,
      criticalFrictionCount: 0,
      weeklyBuilds: 0,
      avgLeadTimeHours: 0,
    };
  }

  const pipelines = repoData.map((r) => r.pipeline);
  const dora = repoData.map((r) => r.dora);

  const criticalFrictionCount = pipelines.reduce(
    (count, p) => count + p.stages.filter((s) => s.frictionLevel === "critical").length,
    0
  );

  return {
    totalStudios: repoData.length,
    totalPipelines: repoData.length,
    avgDevExScore: Math.round(dora.reduce((s, d) => s + d.devExScore, 0) / dora.length),
    criticalFrictionCount,
    weeklyBuilds: pipelines.reduce((s, p) => s + p.weeklyRunCount, 0),
    avgLeadTimeHours: +( dora.reduce((s, d) => s + d.leadTimeHours, 0) / dora.length).toFixed(1),
  };
}
