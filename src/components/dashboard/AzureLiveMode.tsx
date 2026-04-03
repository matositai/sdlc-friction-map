"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Cloud,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface AzureMetrics {
  source: "azure_devops";
  org: string;
  project: string;
  totalPipelines: number;
  metrics: {
    deploymentFrequencyPerDay: number;
    avgRunDurationMin: number;
    changeFailureRate: number;
    successRate: number;
    totalRuns: number;
  };
  pipelines: Array<{
    id: number;
    name: string;
    folder: string;
    totalRuns: number;
    successRate: number | null;
    avgDurationMin: number | null;
    recentRuns: Array<{
      id: number;
      name: string;
      result: string | null;
      state: string;
      createdDate: string;
      durationMin: number;
    }>;
  }>;
}

// ── Curated Azure DevOps example projects ────────────────────────────────────

const AZURE_EXAMPLES = [
  {
    org: "TwilightForestMod",
    project: "ThetwilightForest",
    displayName: "The Twilight Forest",
    desc: "Minecraft Forge mod — Gradle + JDK matrix, obfuscation pipeline. Friction: JDK version drift, Gradle cache misses.",
    frictionTags: ["JDK matrix", "Gradle cache", "Forge versioning"],
  },
  {
    org: "EverestAPI",
    project: "Olympus",
    displayName: "Olympus (Celeste Mod Loader)",
    desc: "Cross-platform GUI launcher — Windows/macOS/Linux matrix + code signing. Friction: macOS cert expiry, artifact bloat.",
    frictionTags: ["Code signing", "macOS matrix", "Artifact publishing"],
  },
  {
    org: "microsoft",
    project: "DirectXShaderCompiler",
    displayName: "DirectX Shader Compiler",
    desc: "HLSL compiler used in game engines. C++ multi-platform build. Friction: compiler bootstrap times, native test matrix.",
    frictionTags: ["C++ compile time", "Platform matrix", "Test coverage"],
  },
];

function AzureCuratedGallery({ onSelect }: { onSelect: (org: string, project: string) => void }) {
  return (
    <div className="mb-5">
      <p className="text-zinc-500 text-[10px] uppercase tracking-wide font-medium mb-2">
        Reference pipelines — click to pre-fill form
      </p>
      <div className="grid grid-cols-1 gap-2">
        {AZURE_EXAMPLES.map((ex) => (
          <button
            key={ex.displayName}
            onClick={() => onSelect(ex.org, ex.project)}
            className="text-left p-3 rounded-lg border border-zinc-700 bg-zinc-900/50 hover:border-sky-600/50 hover:bg-sky-950/20 transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-white text-xs font-medium">{ex.displayName}</p>
              <div className="flex gap-1">
                {ex.frictionTags.slice(0, 2).map((t) => (
                  <span key={t} className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{t}</span>
                ))}
              </div>
            </div>
            <p className="text-zinc-600 text-[10px]">{ex.desc}</p>
            <p className="text-zinc-700 text-[10px] font-mono mt-1">{ex.org} / {ex.project}</p>
          </button>
        ))}
      </div>
      <p className="text-zinc-700 text-[10px] mt-2">
        * Enter your own PAT below to fetch live execution data from these projects&apos; Azure Pipelines.
      </p>
    </div>
  );
}

export function AzureLiveMode() {
  const [token, setToken] = useState("");
  const [org, setOrg] = useState("");
  const [project, setProject] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AzureMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (!token || !org || !project) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/azure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, org, project }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Azure API error"); return; }
      setData(json as AzureMetrics);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      <AzureCuratedGallery onSelect={(o, p) => { setOrg(o); setProject(p); }} />

      {/* Explainer */}
      <div className="bg-sky-950/20 border border-sky-800/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Cloud className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sky-300 text-sm font-medium mb-1">Live Mode — Azure DevOps</p>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Connects to the Azure DevOps Pipelines REST API (v7.1) using a Personal Access Token with <code className="bg-zinc-800 px-1 rounded">vso.build</code> scope. Pulls pipeline list and run history, then normalises to the same DORA framework.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-3">
        <div>
          <label className="text-zinc-400 text-xs font-medium block mb-1.5">Personal Access Token (PAT)</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="your-pat-token"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
          />
          <p className="text-zinc-600 text-[10px] mt-1">
            Azure DevOps → User settings → Personal access tokens → New Token → Scope: <code>Build (read)</code>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-zinc-400 text-xs font-medium block mb-1.5">Organization</label>
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="my-org"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs font-medium block mb-1.5">Project</label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="my-project"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
            />
          </div>
        </div>
        <Button
          onClick={connect}
          disabled={loading || !token || !org || !project}
          className="w-full bg-sky-900/40 hover:bg-sky-800/50 text-sky-200 border border-sky-800/50 h-9"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
            : <><Cloud className="w-4 h-4 mr-2" /> Connect Azure DevOps</>}
        </Button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-sky-900/50 text-sky-400 border-sky-800/50 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5 inline-block animate-pulse" />
              Live Data
            </Badge>
            <span className="text-zinc-400 text-sm font-mono">{data.org}/{data.project}</span>
            <button onClick={connect} className="ml-auto text-zinc-500 hover:text-zinc-300">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* DORA metrics */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Deploy Frequency", value: `${data.metrics.deploymentFrequencyPerDay}/day`, sub: `${data.metrics.totalRuns} total runs` },
              { label: "Avg Duration", value: `${data.metrics.avgRunDurationMin}m`, sub: "Successful runs" },
              { label: "Change Failure Rate", value: `${(data.metrics.changeFailureRate * 100).toFixed(0)}%`, sub: "Failed / completed", warn: data.metrics.changeFailureRate > 0.1 },
              { label: "Success Rate", value: `${(data.metrics.successRate * 100).toFixed(0)}%`, sub: "Completed runs", ok: data.metrics.successRate > 0.9 },
            ].map((m) => (
              <div key={m.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">{m.label}</p>
                <p className={cn("text-xl font-bold", m.warn ? "text-red-400" : m.ok ? "text-green-400" : "text-white")}>{m.value}</p>
                <p className="text-zinc-600 text-[10px]">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Pipeline table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
                Pipelines ({data.totalPipelines} total, showing {data.pipelines.length})
              </p>
              <a
                href={`https://dev.azure.com/${data.org}/${data.project}/_build`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1 text-[10px]"
              >
                Open in Azure <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {data.pipelines.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 text-xs font-medium truncate">{p.name}</p>
                    <p className="text-zinc-600 text-[10px]">{p.folder || "/"} · {p.totalRuns} runs</p>
                  </div>
                  {p.successRate !== null && (
                    <span className={cn("text-[10px] font-semibold", p.successRate > 0.9 ? "text-green-400" : p.successRate > 0.7 ? "text-yellow-400" : "text-red-400")}>
                      {Math.round(p.successRate * 100)}% pass
                    </span>
                  )}
                  {p.avgDurationMin !== null && (
                    <span className="text-zinc-500 text-[10px]">{p.avgDurationMin}m avg</span>
                  )}
                  <div className="flex gap-1">
                    {p.recentRuns.slice(0, 5).map((r) =>
                      r.result === "succeeded" ? (
                        <CheckCircle2 key={r.id} className="w-3 h-3 text-green-500" />
                      ) : r.result === "failed" ? (
                        <XCircle key={r.id} className="w-3 h-3 text-red-500" />
                      ) : (
                        <Loader2 key={r.id} className="w-3 h-3 text-blue-400 animate-spin" />
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
