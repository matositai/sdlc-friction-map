import { NextResponse } from "next/server";
import { CANONICAL_REPOS } from "@/lib/repo-config";

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const results: Record<string, unknown> = {
    tokenPresent: !!token,
    tokenPrefix: token ? token.slice(0, 8) + "…" : null,
    repos: [],
  };

  const repoResults = [];
  for (const config of CANONICAL_REPOS) {
    const base = `https://api.github.com/repos/${config.owner}/${config.repo}`;
    const headers: HeadersInit = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    try {
      const res = await fetch(`${base}/actions/runs?per_page=1`, { headers });
      const rateRemaining = res.headers.get("x-ratelimit-remaining");
      const rateLimit = res.headers.get("x-ratelimit-limit");
      if (res.ok) {
        const data = await res.json() as { total_count?: number };
        repoResults.push({
          repo: `${config.owner}/${config.repo}`,
          status: res.status,
          totalRuns: data.total_count,
          rateRemaining,
          rateLimit,
        });
      } else {
        const err = await res.json().catch(() => ({})) as { message?: string };
        repoResults.push({
          repo: `${config.owner}/${config.repo}`,
          status: res.status,
          error: err.message,
          rateRemaining,
          rateLimit,
        });
      }
    } catch (e) {
      repoResults.push({
        repo: `${config.owner}/${config.repo}`,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  results.repos = repoResults;
  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
