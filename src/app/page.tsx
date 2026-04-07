import { Header } from "@/components/layout/Header";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { PipelineList } from "@/components/dashboard/PipelineList";
import { FrictionAnalysis } from "@/components/ai/FrictionAnalysis";
import { DevExScoreGrid } from "@/components/dashboard/DevExScore";
import { AiAdoptionPanel } from "@/components/dashboard/AiAdoptionPanel";
import { FetchErrorBanner } from "@/components/errors/FetchErrorBanner";
import { ErrorCard } from "@/components/errors/ErrorCard";
import {
  getLiveRepoData,
  derivePipelines,
  deriveDoraMetrics,
  deriveDevExScores,
  deriveDashboardStats,
} from "@/lib/live-data";

// Lightweight surface card — no shadcn Card to avoid stale classname overrides
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}
    >
      {children}
    </div>
  );
}

function PanelHeader({ title, badge }: { title: string; badge?: React.ReactNode }) {
  return (
    <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
      <h2 className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>{title}</h2>
      {badge}
    </div>
  );
}

export default async function DashboardPage() {
  const result = await getLiveRepoData().catch(() => ({ data: [], errors: [], totalAttempted: 0, successCount: 0, isLive: false }));
  const repoData = result.data;
  const isLive = repoData.length > 0;

  const pipelines = isLive ? derivePipelines(repoData) : undefined;
  const doraMetrics = isLive ? deriveDoraMetrics(repoData) : undefined;
  const devExScores = isLive ? deriveDevExScores(repoData) : undefined;
  const stats = isLive ? deriveDashboardStats(repoData) : undefined;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--nc-void)" }}>
      <Header
        title="SDLC Friction Dashboard"
        subtitle="Open-source game engine repos · 6 repos · GitHub Actions"
        isLive={isLive}
      />

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
            message="No GitHub token configured. Add one in Settings to see live pipeline data."
            variant="info"
            action={{ label: "Go to Settings", onClick: () => (window.location.href = "/settings") }}
          />
        )}

        {/* KPI cards */}
        <MetricsCards stats={stats} metrics={doraMetrics} />

        {/* Pipeline list */}
        <Panel>
          <PanelHeader title="Pipeline Overview · GitHub Actions" />
          <div className="p-4"><PipelineList pipelines={pipelines} /></div>
        </Panel>

        {/* DevEx scores */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest mb-4" style={{ color: "var(--muted-foreground)" }}>Developer Experience Scores</p>
          <DevExScoreGrid scores={devExScores} />
        </div>

        {/* AI Adoption */}
        <Panel>
          <PanelHeader
            title="AI-Augmented SDLC Adoption"
            badge={<span className="text-[9px] px-2 py-0.5 rounded" style={{ backgroundColor: "var(--nc-surface-2)", color: "var(--muted-foreground)", border: "1px solid var(--nc-ghost)" }}>illustrative · hivel.ai framework</span>}
          />
          <div className="p-4"><AiAdoptionPanel /></div>
        </Panel>

        {/* AI Analysis */}
        <Panel>
          <PanelHeader
            title="AI Friction Analysis"
            badge={<span className="text-[9px] px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(105,218,255,0.08)", color: "var(--nc-cyan)", border: "1px solid rgba(105,218,255,0.2)" }}>Powered by Claude</span>}
          />
          <div className="p-4"><FrictionAnalysis repoData={isLive ? repoData : undefined} /></div>
        </Panel>
      </main>
    </div>
  );
}
