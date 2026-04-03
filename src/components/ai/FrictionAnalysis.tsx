"use client";

import React, { useState, useEffect } from "react";
import type { AIAnalysisResult } from "@/lib/types";
import type { RepoLiveData } from "@/lib/repo-fetcher";
import { mockDoraMetrics } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Zap,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { STAGE_LABELS } from "@/lib/mock-data";

function PriorityBadge({ priority }: { priority: string }) {
  const style: React.CSSProperties =
    priority === "high"
      ? { backgroundColor: "rgba(255,113,108,0.1)", color: "#ff716c", borderColor: "rgba(255,113,108,0.3)" }
      : priority === "medium"
      ? { backgroundColor: "rgba(255,201,101,0.1)", color: "#ffc965", borderColor: "rgba(255,201,101,0.3)" }
      : { backgroundColor: "rgba(105,218,255,0.1)", color: "#69daff", borderColor: "rgba(105,218,255,0.3)" };
  return (
    <span className="text-[10px] font-semibold border px-2 py-0.5 rounded" style={style}>
      {priority}
    </span>
  );
}

function EffortBadge({ effort }: { effort: string }) {
  const style: React.CSSProperties =
    effort === "low"
      ? { backgroundColor: "rgba(0,255,163,0.08)", color: "#00ffa3", borderColor: "rgba(0,255,163,0.25)" }
      : effort === "medium"
      ? { backgroundColor: "var(--nc-surface-2)", color: "var(--muted-foreground)", borderColor: "var(--nc-ghost)" }
      : { backgroundColor: "rgba(255,201,101,0.08)", color: "#ffc965", borderColor: "rgba(255,201,101,0.25)" };
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded border" style={style}>
      {effort} effort
    </span>
  );
}

interface FrictionAnalysisProps {
  repoData?: RepoLiveData[];
}

// Build a short fingerprint from the key DORA signals so the cache auto-invalidates
// when live data changes. No crypto needed — just stable serialisation of the metrics
// that the LLM actually receives.
function dataFingerprint(repoData: RepoLiveData[] | undefined, studioId: string): string {
  const repos = repoData ?? [];
  const target = studioId === "all" ? repos : repos.filter((r) => r.dora.studioId === studioId);
  const sig = target.map((r) =>
    `${r.dora.studioId}:${r.dora.deploymentFrequencyPerDay.toFixed(1)}:${r.dora.leadTimeHours}:${r.dora.changeFailureRate.toFixed(3)}:${r.frictionSignals.openPrCount}:${r.frictionSignals.flakyWorkflows.length}`
  ).join("|");
  return sig || studioId;
}

function cacheKey(studioId: string, fingerprint: string) {
  return `ai-report:${studioId}:${fingerprint}`;
}

export function FrictionAnalysis({ repoData }: FrictionAnalysisProps = {}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<string>("all");

  const fingerprint = dataFingerprint(repoData, selectedStudio);

  // Load cached report whenever studio selection or live data changes
  useEffect(() => {
    setResult(null);
    setCached(false);
    setError(null);

    const fetchCachedReport = async () => {
      try {
        const key = cacheKey(selectedStudio, fingerprint);
        const res = await fetch(`/api/ai-report?key=${encodeURIComponent(key)}`);
        const { report } = await res.json();
        if (report) {
          setResult(report);
          setCached(true);
        }
      } catch {
        // Network error or KV not configured — just show "Analyze" button
      }
    };

    fetchCachedReport();
  }, [selectedStudio, fingerprint]);

  // Build selector options from real data or mock fallback
  const selectorOptions = repoData
    ? repoData.map((r) => ({ studioId: r.dora.studioId, studioName: r.dora.studioName }))
    : mockDoraMetrics.map((d) => ({ studioId: d.studioId, studioName: d.studioName }));

  async function runAnalysis(force = false) {
    if (!force && cached && result) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCached(false);

    try {
      const selectedRepo = selectedStudio !== "all" && repoData
        ? repoData.find((r) => r.dora.studioId === selectedStudio)
        : null;

      const payload: Record<string, unknown> = {
        studioId: selectedStudio === "all" ? undefined : selectedStudio,
        fingerprint,
      };

      if (repoData && repoData.length > 0) {
        if (selectedRepo) {
          payload.pipelines = [selectedRepo.pipeline];
          payload.doraMetrics = [selectedRepo.dora];
          payload.frictionSignals = [{ ...selectedRepo.frictionSignals, studioName: selectedRepo.dora.studioName }];
        } else {
          payload.pipelines = repoData.map((r) => r.pipeline);
          payload.doraMetrics = repoData.map((r) => r.dora);
          payload.frictionSignals = repoData.map((r) => ({ ...r.frictionSignals, studioName: r.dora.studioName }));
        }
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Analysis failed");
        return;
      }

      const analysisResult = data as AIAnalysisResult;
      const isCached = data.cached === true;
      setResult(analysisResult);
      setCached(isCached);
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  function formatAge(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60_000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "just now";
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedStudio} onValueChange={(v) => setSelectedStudio(v ?? "all")}>
          <SelectTrigger className="w-44 text-sm h-9" style={{ backgroundColor: "var(--nc-surface-2)", border: "1px solid var(--nc-ghost)", color: "var(--foreground)" }}>
            <SelectValue placeholder="All repos" />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
            <SelectItem value="all" style={{ color: "var(--foreground)" }}>All Repos</SelectItem>
            {selectorOptions.map((d) => (
              <SelectItem key={d.studioId} value={d.studioId} style={{ color: "var(--foreground)" }}>
                {d.studioName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!result ? (
          <Button
            onClick={() => runAnalysis(true)}
            disabled={loading}
            className="btn-primary-glow text-sm h-9 px-4"
            style={{ backgroundColor: "var(--nc-cyan)", color: "var(--nc-void)", fontWeight: 600 }}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" aria-hidden="true" />
                Analyzing with Claude...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
                Analyze Friction
              </>
            )}
          </Button>
        ) : (
          <button
            onClick={() => runAnalysis(true)}
            disabled={loading}
            className="text-[10px] px-2.5 py-1.5 rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#69daff]"
            style={{ border: "1px solid var(--nc-ghost)", color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(105,218,255,0.3)"; (e.currentTarget as HTMLElement).style.color = "var(--nc-cyan)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--nc-ghost)"; (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
            Regenerate
          </button>
        )}

        {result && (
          <span className="text-[10px] flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
            {cached ? (
              <>
                <span className="w-1.5 h-1 rounded-sm inline-block" style={{ backgroundColor: "#69daff" }} />
                Cached · {formatAge(result.generatedAt)}
              </>
            ) : (
              <>
                <span className="w-1.5 h-1 rounded-sm inline-block" style={{ backgroundColor: "#00ffa3" }} />
                Generated {new Date(result.generatedAt).toLocaleTimeString()}
              </>
            )}
          </span>
        )}

        {repoData && (
          <span className="text-[10px] flex items-center gap-1" style={{ color: "#00ffa3" }}>
            <span className="w-1.5 h-1 rounded-sm animate-pulse inline-block" style={{ backgroundColor: "#00ffa3" }} />
            Live data
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg px-4 py-3 flex items-start gap-3" style={{ backgroundColor: "rgba(255,113,108,0.08)", border: "1px solid rgba(255,113,108,0.3)" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ff716c" }} aria-hidden="true" />
          <div>
            <p className="text-sm font-medium" style={{ color: "#ff716c" }}>Analysis failed</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,113,108,0.7)" }}>{error}</p>
            {error.includes("ANTHROPIC_API_KEY") && (
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Add <code className="px-1 rounded" style={{ backgroundColor: "var(--nc-surface-3)" }}>ANTHROPIC_API_KEY=sk-ant-...</code> to your <code className="px-1 rounded" style={{ backgroundColor: "var(--nc-surface-3)" }}>.env.local</code> file and restart the dev server.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg animate-pulse" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }} />
          ))}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg p-4" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid rgba(105,218,255,0.2)" }}>
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded flex-shrink-0" style={{ backgroundColor: "rgba(105,218,255,0.1)" }}>
                <Zap className="w-4 h-4" style={{ color: "#69daff" }} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "var(--muted-foreground)" }}>Executive Summary</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{result.summary}</p>
              </div>
            </div>
          </div>

          {/* Top friction point */}
          <div className="rounded-lg p-4" style={{ backgroundColor: "rgba(255,113,108,0.06)", border: "1px solid rgba(255,113,108,0.25)" }}>
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded flex-shrink-0" style={{ backgroundColor: "rgba(255,113,108,0.12)" }}>
                <AlertTriangle className="w-4 h-4" style={{ color: "#ff716c" }} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "var(--muted-foreground)" }}>Highest Impact Friction Point</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{result.topFrictionPoint}</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest mb-3" style={{ color: "var(--muted-foreground)" }}>
              Prioritized Recommendations
            </p>
            <div className="space-y-3">
              {result.recommendations.map((rec, i) => {
                const borderColor =
                  rec.priority === "high" ? "rgba(255,113,108,0.3)" :
                  rec.priority === "medium" ? "rgba(255,201,101,0.2)" :
                  "var(--nc-ghost)";
                return (
                  <div
                    key={rec.id}
                    className="rounded-lg p-4 transition-colors"
                    style={{ backgroundColor: "var(--nc-surface-1)", border: `1px solid ${borderColor}` }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-xs mt-0.5 w-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{rec.title}</p>
                          <PriorityBadge priority={rec.priority} />
                        </div>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--muted-foreground)" }}>{rec.description}</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <EffortBadge effort={rec.effort} />
                          {rec.affectedStage && (
                            <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                              <ChevronRight className="w-3 h-3" />
                              {STAGE_LABELS[rec.affectedStage] || rec.affectedStage} stage
                            </span>
                          )}
                          {rec.affectedStudio && (
                            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{rec.affectedStudio}</span>
                          )}
                          {rec.weeklyHoursSaved && (
                            <span className="text-[10px] flex items-center gap-1 font-medium" style={{ color: "#00ffa3" }}>
                              <TrendingUp className="w-3 h-3" />
                              ~{rec.weeklyHoursSaved}h/week saved
                            </span>
                          )}
                          {rec.estimatedImpact && (
                            <span className="text-[10px] flex items-center gap-1" style={{ color: "#69daff" }}>
                              <Clock className="w-3 h-3" />
                              {rec.estimatedImpact}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="text-center py-12 rounded-lg" style={{ border: "1px dashed var(--nc-ghost)" }}>
          <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(105,218,255,0.3)" }} />
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Click &quot;Analyze Friction&quot; to get AI-powered recommendations</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
            {repoData
              ? `Powered by Claude · Analyzes ${repoData.length} live repos`
              : "Powered by Claude · Analyzes all 7 pipeline stages across 6 studios"}
          </p>
        </div>
      )}
    </div>
  );
}
