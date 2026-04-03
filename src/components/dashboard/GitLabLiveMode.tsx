"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FrictionProfile } from "./FrictionProfile";
import type { GitHubLiveResponse } from "@/lib/types";
import { GitBranch, Loader2, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";

// ── Curated GitLab repos ──────────────────────────────────────────────────────

interface GitLabCuratedRepo {
  projectPath: string;
  displayName: string;
  language: string;
  why: string;
  host?: string;
}

const CURATED_REPOS: GitLabCuratedRepo[] = [
  {
    projectPath: "veloren/veloren",
    displayName: "Veloren",
    language: "Rust",
    why: "Voxel RPG — heavy Rust compile times, OOM failures, Git LFS asset friction. The CI friction gold mine.",
  },
  {
    projectPath: "inkscape/inkscape",
    displayName: "Inkscape",
    language: "C++",
    why: "Cross-platform C++ graphics app — complex multi-platform matrix builds, code signing challenges.",
  },
  {
    projectPath: "godotengine/godot-docs",
    displayName: "Godot Docs",
    language: "RST/Python",
    why: "Documentation CI — fast pipeline, healthy baseline. Good comparison point against heavy engine builds.",
  },
];

// ── Gallery card ──────────────────────────────────────────────────────────────

function RepoCard({
  repo,
  selected,
  onSelect,
}: {
  repo: GitLabCuratedRepo;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "text-left p-3 rounded-lg border transition-all",
        selected
          ? "border-orange-500/60 bg-orange-950/20"
          : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-white text-xs font-medium">{repo.displayName}</p>
        <span className="text-[9px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{repo.language}</span>
      </div>
      <p className="text-zinc-500 text-[10px] font-mono mb-1.5">{repo.host ? `${repo.host}/` : "gitlab.com/"}{repo.projectPath}</p>
      <p className="text-zinc-500 text-[10px] leading-relaxed">{repo.why}</p>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GitLabLiveMode() {
  const [token, setToken] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [host, setHost] = useState("gitlab.com");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GitHubLiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  function selectCurated(repo: GitLabCuratedRepo) {
    setProjectPath(repo.projectPath);
    setHost(repo.host ?? "gitlab.com");
    setSelectedRepo(repo.projectPath);
    setData(null);
    setError(null);
  }

  async function connect() {
    if (!projectPath.trim()) {
      setError("Enter a GitLab project path (e.g. veloren/veloren)");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/gitlab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim() || undefined,
          projectPath: projectPath.trim(),
          host: host.trim() || "gitlab.com",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Request failed");
        return;
      }
      setData(json as GitHubLiveResponse);
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-orange-950/20 border border-orange-800/30 rounded-lg p-3 text-xs text-zinc-400 leading-relaxed">
        <span className="text-orange-300 font-medium">GitLab CI Integration</span>
        {" "}— Connects to GitLab&apos;s REST API v4. Public projects work without a token.
        For private projects or higher rate limits, use a{" "}
        <a
          href="https://gitlab.com/-/user_settings/personal_access_tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 underline hover:text-orange-300 inline-flex items-center gap-0.5"
        >
          Personal Access Token <ExternalLink className="w-2.5 h-2.5" />
        </a>
        {" "}with <code className="bg-zinc-800 px-1 rounded">read_api</code> scope.
      </div>

      {/* Curated gallery */}
      <div>
        <p className="text-zinc-500 text-[10px] uppercase tracking-wide font-medium mb-2">Game dev projects on GitLab</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CURATED_REPOS.map((repo) => (
            <RepoCard
              key={repo.projectPath}
              repo={repo}
              selected={selectedRepo === repo.projectPath}
              onSelect={() => selectCurated(repo)}
            />
          ))}
        </div>
      </div>

      {/* Manual input */}
      <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Connect any project</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-zinc-500 text-[10px] uppercase tracking-wide block mb-1">GitLab Host</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="gitlab.com"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/60"
            />
          </div>
          <div>
            <label className="text-zinc-500 text-[10px] uppercase tracking-wide block mb-1">Project Path</label>
            <input
              type="text"
              value={projectPath}
              onChange={(e) => { setProjectPath(e.target.value); setSelectedRepo(null); }}
              placeholder="veloren/veloren"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/60"
            />
          </div>
        </div>

        <div>
          <label className="text-zinc-500 text-[10px] uppercase tracking-wide block mb-1">
            Access Token <span className="normal-case text-zinc-600">(optional for public projects)</span>
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/60"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={connect}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-500 text-white text-sm h-9 px-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <GitBranch className="w-3.5 h-3.5 mr-2" />
                Connect & Analyze
              </>
            )}
          </Button>

          {data && (
            <Button
              variant="outline"
              onClick={connect}
              disabled={loading}
              className="border-zinc-700 text-zinc-300 hover:text-white h-9 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Refresh
            </Button>
          )}

          {data && (
            <Badge className="bg-orange-900/40 text-orange-300 border-orange-800/50 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mr-1.5 animate-pulse inline-block" />
              Live · GitLab CI
              {!data.authenticated && " · Unauthenticated"}
            </Badge>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-950/30 border border-red-800/50 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm font-medium">Connection failed</p>
            <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
              {data.repo} · {data.totalRuns} pipelines analyzed
            </p>
            <a
              href={`https://${host.trim() || "gitlab.com"}/${projectPath}/-/pipelines`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 text-[10px] flex items-center gap-1"
            >
              View on GitLab <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <FrictionProfile data={data} />
        </div>
      )}
    </div>
  );
}
