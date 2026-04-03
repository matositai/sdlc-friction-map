"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FrictionProfile } from "./FrictionProfile";
import type { CuratedRepo, GitHubLiveResponse } from "@/lib/types";
import {
  GitBranch,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Lock,
} from "lucide-react";

// ── Curated repos ─────────────────────────────────────────────────────────────

const CURATED_REPOS: CuratedRepo[] = [
  {
    owner: "godotengine",
    repo: "godot",
    displayName: "Godot Engine",
    language: "C++",
    why: "130+ deploys/month, platform matrix, shader compilation — direct Frostbite analogue",
  },
  {
    owner: "o3de",
    repo: "o3de",
    displayName: "Open 3D Engine",
    language: "C++",
    why: "Amazon's game engine — heavy CI, multi-platform matrix, full GitHub Actions, analogue for DICE/Battlefield pipeline",
  },
  {
    owner: "CleverRaven",
    repo: "Cataclysm-DDA",
    displayName: "Cataclysm DDA",
    language: "C++",
    why: "1,500+ contributors → PR backlog hell, legacy C++ refactor debt, multi-platform matrix",
  },
  {
    owner: "space-wizards",
    repo: "space-station-14",
    displayName: "Space Station 14",
    language: "C#",
    why: "Custom engine (Robust Toolbox) fork sync — upstream breaks all downstream servers",
  },
  {
    owner: "EpicGames",
    repo: "UnrealEngine",
    displayName: "Unreal Engine 5",
    language: "C++",
    why: "EA's closest external analogue to Frostbite",
    disabled: true,
    disabledReason: "Private repo — requires accepting Epic Games EULA and linking your GitHub account at unrealengine.com/ue-on-github. Note: Epic uses their proprietary Horde CI system internally, so GitHub Actions workflow run data will be sparse.",
  },
];

// ── Repo gallery ──────────────────────────────────────────────────────────────

interface RepoGalleryProps {
  onSelect: (owner: string, repo: string) => void;
  selectedOwner: string;
  selectedRepo: string;
}

function RepoGallery({ onSelect, selectedOwner, selectedRepo }: RepoGalleryProps) {
  return (
    <div>
      <p className="text-zinc-500 text-[10px] uppercase tracking-wide font-medium mb-2">
        Friction Goldmine Repos — click to populate
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {CURATED_REPOS.map((r) => {
          const isSelected = r.owner === selectedOwner && r.repo === selectedRepo;
          if (r.disabled) {
            return (
              <Tooltip key={r.repo}>
                <TooltipTrigger>
                  <div className="text-left bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3 opacity-40 cursor-not-allowed">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lock className="w-3 h-3 text-zinc-500" />
                      <p className="text-zinc-400 text-xs font-medium truncate">{r.displayName}</p>
                    </div>
                    <p className="text-zinc-600 text-[10px]">{r.language}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {r.disabledReason}
                </TooltipContent>
              </Tooltip>
            );
          }
          return (
            <button
              key={r.repo}
              onClick={() => onSelect(r.owner, r.repo)}
              className={cn(
                "text-left bg-zinc-900/60 border rounded-lg p-3 transition-all hover:border-zinc-600",
                isSelected ? "border-blue-600/60 bg-blue-950/20" : "border-zinc-800"
              )}
            >
              <p className={cn("text-xs font-medium mb-0.5 truncate",
                isSelected ? "text-blue-300" : "text-zinc-200"
              )}>
                {r.displayName}
              </p>
              <p className="text-zinc-600 text-[9px] mb-1.5">{r.owner}/{r.repo}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">{r.language}</span>
              </div>
              <p className="text-zinc-600 text-[9px] mt-1.5 leading-relaxed line-clamp-2">{r.why}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GitHubLiveMode() {
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GitHubLiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleGallerySelect(o: string, r: string) {
    setOwner(o);
    setRepo(r);
    setData(null);
    setError(null);
  }

  async function connect() {
    if (!owner || !repo) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token || undefined, owner, repo }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "GitHub API error");
        return;
      }
      setData(json as GitHubLiveResponse);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Explainer */}
      <div className="bg-blue-950/20 border border-blue-800/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <GitBranch className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-300 text-sm font-medium mb-1">Live Mode — GitHub Actions</p>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Connect to any public repo without a token (60 req/hr limit). Add a token for private repos or higher rate limits. Pulls workflow runs, PR backlog, open friction issues, and computes DORA metrics + friction signals. Nothing is stored.
            </p>
          </div>
        </div>
      </div>

      {/* Curated gallery */}
      <RepoGallery
        onSelect={handleGallerySelect}
        selectedOwner={owner}
        selectedRepo={repo}
      />

      {/* Form */}
      <div className="space-y-3">
        <div>
          <label className="text-zinc-400 text-xs font-medium block mb-1.5">
            GitHub Personal Access Token{" "}
            <span className="text-zinc-600 font-normal">(optional for public repos)</span>
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_... or leave blank for public repos"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
          <p className="text-zinc-600 text-[10px] mt-1">
            Required for private repos. For public repos, unauthenticated requests are limited to 60/hr.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-zinc-400 text-xs font-medium block mb-1.5">Owner / Organization</label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="godotengine"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs font-medium block mb-1.5">Repository Name</label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="godot"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        <Button
          onClick={connect}
          disabled={loading || !owner || !repo}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 h-9"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Pulling data...</>
          ) : (
            <><GitBranch className="w-4 h-4 mr-2" /> Connect & Analyze</>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-4">
          {/* Result header */}
          <div className="flex items-center gap-2">
            <Badge className="bg-green-900/50 text-green-400 border-green-800/50 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 inline-block animate-pulse" />
              Live Data
            </Badge>
            <span className="text-zinc-400 text-sm font-mono">{data.repo}</span>
            {!data.authenticated && (
              <Badge className="bg-yellow-900/40 text-yellow-400 border-yellow-700/50 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Unauthenticated · 60 req/hr
              </Badge>
            )}
            <button
              onClick={connect}
              className="ml-auto text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Full friction profile */}
          <FrictionProfile data={data} />
        </div>
      )}
    </div>
  );
}
