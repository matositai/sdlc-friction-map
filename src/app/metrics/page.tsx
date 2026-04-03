import { Header } from "@/components/layout/Header";
import { StudioDoraTable } from "@/components/dashboard/MetricsCards";
import { DevExScoreGrid } from "@/components/dashboard/DevExScore";
import { AiAdoptionPanel } from "@/components/dashboard/AiAdoptionPanel";
import { LeadTimeChart } from "@/components/charts/LeadTimeChart";
import { DeployFrequencyChart } from "@/components/charts/DeployFrequencyChart";
import { ChangeFailureChart } from "@/components/charts/ChangeFailureChart";
import { FetchErrorBanner } from "@/components/errors/FetchErrorBanner";
import { ErrorCard } from "@/components/errors/ErrorCard";
import {
  getLiveRepoData,
  deriveDoraMetrics,
  deriveDoraTrends,
  deriveDevExScores,
} from "@/lib/live-data";

export default async function MetricsPage() {
  const result = await getLiveRepoData().catch(() => ({ data: [], errors: [], totalAttempted: 0, successCount: 0, isLive: false }));
  const repoData = result.data;
  const isLive = repoData.length > 0;

  const doraMetrics = isLive ? deriveDoraMetrics(repoData) : undefined;
  const doraTrends = isLive ? deriveDoraTrends(repoData) : undefined;
  const devExScores = isLive ? deriveDevExScores(repoData) : undefined;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--nc-void)" }}>
      <Header title="DORA Metrics" subtitle="Deployment frequency, lead time, MTTR & change failure rate" isLive={isLive} />
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
            message="No GitHub token configured. Add one in Settings to see live DORA metrics."
            variant="info"
            action={{ label: "Go to Settings", onClick: () => (window.location.href = "/settings") }}
          />
        )}

        {/* Info banner */}
        <div className="rounded-lg p-4 text-xs leading-relaxed" style={{ backgroundColor: "rgba(0,255,163,0.06)", border: "1px solid rgba(0,255,163,0.2)", color: "var(--muted-foreground)" }}>
          <span className="font-medium" style={{ color: "var(--foreground)" }}>About DORA Metrics:</span> The four DORA (DevOps Research & Assessment) metrics are the industry-standard framework for measuring software delivery performance.{" "}
          <span style={{ color: "#00ffa3" }}>Elite</span> performers deploy multiple times per day with lead times under 1 hour, MTTR under 1 hour, and change failure rates below 5%.
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
              <h2 className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Lead Time for Changes — 90-day trend</h2>
            </div>
            <div className="p-6">
              <LeadTimeChart trends={doraTrends} />
            </div>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
              <h2 className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Change Failure Rate by Repo</h2>
            </div>
            <div className="p-6">
              <ChangeFailureChart metrics={doraMetrics} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
              <h2 className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Full DORA Scorecard</h2>
            </div>
            <div className="p-6">
              <StudioDoraTable metrics={doraMetrics} />
            </div>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
              <h2 className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Deployment Frequency</h2>
            </div>
            <div className="p-6">
              <DeployFrequencyChart metrics={doraMetrics} trends={doraTrends} />
            </div>
          </div>
        </div>

        {/* DevEx scores */}
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--muted-foreground)" }}>Developer Experience Scores</h2>
          <DevExScoreGrid scores={devExScores} />
        </div>

        {/* AI Adoption */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
            <h2 className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>AI-Augmented SDLC Adoption</h2>
            <span className="text-[9px] px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(255,201,101,0.08)", color: "#ffc965", border: "1px solid rgba(255,201,101,0.2)" }}>
              Illustrative Data
            </span>
          </div>
          <div className="p-6">
            <p className="text-[10px] mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
              These metrics model AI adoption patterns. To make them live, integrate GitHub Copilot Metrics API (<code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>GET /orgs/&#123;org&#125;/copilot/usage</code>) or telemetry from your IDE/CI system.
            </p>
            <AiAdoptionPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
