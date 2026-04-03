import { Header } from "@/components/layout/Header";
import { FrictionHeatmap } from "@/components/dashboard/FrictionHeatmap";
import { FetchErrorBanner } from "@/components/errors/FetchErrorBanner";
import { ErrorCard } from "@/components/errors/ErrorCard";
import { FRICTION_COLORS, STAGE_LABELS } from "@/lib/mock-data";
import { getLiveRepoData, derivePipelines } from "@/lib/live-data";
import type { Pipeline, SDLCStage, FrictionLevel, StageMetrics } from "@/lib/types";

const STAGES: SDLCStage[] = [
  "commit", "build", "unit_test", "integration_test", "review", "staging_deploy", "prod_deploy",
];

function StageSummaryTable({ pipelines }: { pipelines: Pipeline[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
            <th className="text-left font-medium pb-3 pr-4 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Stage</th>
            <th className="text-right font-medium pb-3 px-4 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Avg Duration</th>
            <th className="text-right font-medium pb-3 px-4 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Benchmark</th>
            <th className="text-right font-medium pb-3 px-4 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Overhead</th>
            <th className="text-right font-medium pb-3 px-4 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Avg Failure %</th>
            <th className="text-left font-medium pb-3 pl-4 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Critical issues</th>
          </tr>
        </thead>
        <tbody>
          {STAGES.map((stage) => {
            const allStages = pipelines
              .map((p) => p.stages.find((s) => s.stage === stage))
              .filter(Boolean) as StageMetrics[];
            if (!allStages.length) return null;
            const avgDuration = allStages.reduce((a, b) => a + b.avgDurationMin, 0) / allStages.length;
            const avgBenchmark = allStages.reduce((a, b) => a + b.benchmarkMin, 0) / allStages.length;
            const avgFailure = allStages.reduce((a, b) => a + b.failureRate, 0) / allStages.length;
            const overhead = ((avgDuration - avgBenchmark) / avgBenchmark * 100);
            const criticalIssues = allStages
              .filter((s) => s.frictionLevel === "critical" && s.topIssue)
              .map((s) => s.topIssue!);

            return (
              <tr key={stage} style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
                <td className="py-3 pr-4 font-medium" style={{ color: "var(--foreground)" }}>{STAGE_LABELS[stage]}</td>
                <td className="py-3 px-4 text-right" style={{ color: "var(--foreground)" }}>{avgDuration.toFixed(0)}m</td>
                <td className="py-3 px-4 text-right" style={{ color: "var(--muted-foreground)" }}>{avgBenchmark.toFixed(0)}m</td>
                <td className="py-3 px-4 text-right font-medium" style={{ color: overhead > 50 ? "#ffc965" : overhead > 20 ? "#ffc965" : "#00ffa3" }}>
                  +{overhead.toFixed(0)}%
                </td>
                <td className="py-3 px-4 text-right" style={{ color: avgFailure > 0.1 ? "#ffc965" : avgFailure > 0.05 ? "#ffc965" : "#00ffa3" }}>
                  {(avgFailure * 100).toFixed(0)}%
                </td>
                <td className="py-3 pl-4 text-xs max-w-xs" style={{ color: "var(--muted-foreground)" }}>
                  {criticalIssues.length > 0 ? criticalIssues[0].slice(0, 80) + (criticalIssues[0].length > 80 ? "…" : "") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FrictionLegend() {
  const levels: { level: FrictionLevel; label: string; desc: string }[] = [
    { level: "low", label: "Low", desc: "Within benchmark" },
    { level: "medium", label: "Medium", desc: "1–1.5x benchmark" },
    { level: "high", label: "High", desc: "1.5–2x benchmark" },
    { level: "critical", label: "Critical", desc: ">2x or >10% failure" },
  ];
  return (
    <div className="flex gap-4 flex-wrap">
      {levels.map(({ level, label, desc }) => (
        <div key={level} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: FRICTION_COLORS[level] }} />
          <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{label}</span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{desc}</span>
        </div>
      ))}
    </div>
  );
}

export default async function FrictionPage() {
  const result = await getLiveRepoData().catch(() => ({ data: [], errors: [], totalAttempted: 0, successCount: 0, isLive: false }));
  const repoData = result.data;
  const isLive = repoData.length > 0;
  const pipelines = isLive ? derivePipelines(repoData) : undefined;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--nc-void)" }}>
      <Header title="Friction Map" subtitle="SDLC stage-by-stage bottleneck analysis" isLive={isLive} />
      <main className="p-6 space-y-5 max-w-[1400px] w-full">
        {/* Error banner if any fetches failed */}
        {result.errors.length > 0 && (
          <FetchErrorBanner errors={result.errors} successCount={result.successCount} totalAttempted={result.totalAttempted} />
        )}

        {/* Empty state if no data */}
        {!isLive && result.errors.length === 0 && (
          <ErrorCard
            icon="📭"
            title="No data to display"
            message="No GitHub token configured. Add one in Settings to see friction analysis."
            variant="info"
            action={{ label: "Go to Settings", onClick: () => (window.location.href = "/settings") }}
          />
        )}

        <FrictionLegend />

        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
            <h2 className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
              Heatmap — All Repos × All SDLC Stages
            </h2>
          </div>
          <div className="p-6">
            <FrictionHeatmap pipelines={pipelines} />
          </div>
        </div>

        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
            <h2 className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
              Stage Performance Summary
            </h2>
          </div>
          <div className="p-6">
            <StageSummaryTable pipelines={pipelines ?? []} />
          </div>
        </div>
      </main>
    </div>
  );
}
