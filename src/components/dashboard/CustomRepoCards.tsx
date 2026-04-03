"use client";

import { useEffect, useState } from "react";
import { getCustomRepos, removeCustomRepo, type TrackedCustomRepo } from "@/lib/custom-repos";
import { FrictionProfile } from "./FrictionProfile";
import { Card, CardContent } from "@/components/ui/card";
import type { GitHubLiveResponse } from "@/lib/types";
import { GitBranch, X, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function providerLabel(repo: TrackedCustomRepo): string {
  if (repo.provider === "github") return "GitHub";
  if (repo.provider === "gitlab") return "GitLab CI";
  if (repo.provider === "azure") return "Azure DevOps";
  if (repo.provider === "aws") return "AWS CodePipeline";
  return repo.provider;
}

function providerPath(repo: TrackedCustomRepo): string {
  if (repo.github) return `${repo.github.owner}/${repo.github.repo}`;
  if (repo.gitlab) return repo.gitlab.projectPath;
  if (repo.azure) return `${repo.azure.org}/${repo.azure.project}`;
  if (repo.aws) return repo.aws.region;
  return "";
}

async function fetchRepoData(repo: TrackedCustomRepo): Promise<GitHubLiveResponse> {
  if (repo.provider === "github" && repo.github) {
    const res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: repo.github.owner,
        repo: repo.github.repo,
        token: repo.github.token,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "GitHub API error");
    return json as GitHubLiveResponse;
  }

  if (repo.provider === "gitlab" && repo.gitlab) {
    const res = await fetch("/api/gitlab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectPath: repo.gitlab.projectPath,
        host: repo.gitlab.host ?? "gitlab.com",
        token: repo.gitlab.token,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "GitLab API error");
    return json as GitHubLiveResponse;
  }

  throw new Error(`Live fetch not supported for provider: ${repo.provider}`);
}

function CustomRepoCard({ repo, onRemove }: { repo: TrackedCustomRepo; onRemove: () => void }) {
  const [data, setData] = useState<GitHubLiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchRepoData(repo));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const providerColor =
    repo.provider === "github" ? "text-purple-400 bg-purple-950/40 border-purple-800/40" :
    repo.provider === "gitlab" ? "text-orange-400 bg-orange-950/40 border-orange-800/40" :
    repo.provider === "azure"  ? "text-sky-400 bg-sky-950/40 border-sky-800/40" :
    "text-yellow-400 bg-yellow-950/40 border-yellow-800/40";

  return (
    <Card className="bg-zinc-900 border-zinc-800 relative group">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: repo.color }} />
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-sm leading-tight truncate">{repo.displayName}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("text-[9px] font-medium border px-1.5 py-0.5 rounded-full", providerColor)}>
                {providerLabel(repo)}
              </span>
              <span className="text-zinc-600 text-[10px] font-mono truncate flex items-center gap-1">
                <GitBranch className="w-2.5 h-2.5" />
                {providerPath(repo)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!loading && (
            <button onClick={load} className="text-zinc-600 hover:text-zinc-400 transition-colors" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onRemove}
            className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            title="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <CardContent className="p-5">
        {loading && (
          <div className="flex items-center gap-2 text-zinc-500 text-xs py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Fetching live data…
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-2 bg-red-950/30 border border-red-800/50 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {data && !loading && <FrictionProfile data={data} />}
      </CardContent>
    </Card>
  );
}

export function CustomRepoCards() {
  const [repos, setRepos] = useState<TrackedCustomRepo[]>([]);

  useEffect(() => {
    setRepos(getCustomRepos());
  }, []);

  function handleRemove(id: string) {
    removeCustomRepo(id);
    setRepos(getCustomRepos());
  }

  if (repos.length === 0) return null;

  return (
    <div className="space-y-4 mt-2">
      <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">
        Custom Repos <span className="text-zinc-700">({repos.length})</span>
      </p>
      <div className="space-y-4">
        {repos.map((repo) => (
          <CustomRepoCard key={repo.id} repo={repo} onRemove={() => handleRemove(repo.id)} />
        ))}
      </div>
    </div>
  );
}
