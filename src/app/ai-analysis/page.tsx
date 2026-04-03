import { Header } from "@/components/layout/Header";
import { FrictionAnalysis } from "@/components/ai/FrictionAnalysis";
import { FetchErrorBanner } from "@/components/errors/FetchErrorBanner";
import { ErrorCard } from "@/components/errors/ErrorCard";
import { getLiveRepoData } from "@/lib/live-data";

export default async function AIAnalysisPage() {
  const result = await getLiveRepoData().catch(() => ({ data: [], errors: [], totalAttempted: 0, successCount: 0, isLive: false }));
  const repoData = result.data;
  const isLive = repoData.length > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--nc-void)" }}>
      <Header
        title="AI Analysis"
        subtitle="Claude-powered friction analysis and recommendations"
        isLive={isLive}
      />
      <main className="p-6 max-w-[900px] w-full space-y-5">
        {/* Error banner if any fetches failed */}
        {result.errors.length > 0 && (
          <FetchErrorBanner errors={result.errors} successCount={result.successCount} totalAttempted={result.totalAttempted} />
        )}

        {/* How it works */}
        <div className="rounded-lg p-4 text-xs leading-relaxed" style={{ backgroundColor: "rgba(105,218,255,0.06)", border: "1px solid rgba(105,218,255,0.2)", color: "var(--muted-foreground)" }}>
          <span className="font-medium" style={{ color: "var(--foreground)" }}>How it works:</span> Claude analyzes the full pipeline dataset — stage durations, failure rates, flaky workflow names, open PR backlog, friction issue titles, and DORA metrics — and generates prioritized engineering recommendations. Select a studio to focus the analysis, or run it across all studios for a cross-team view. Requires{" "}
          <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>ANTHROPIC_API_KEY</code> in your <code style={{ backgroundColor: "var(--nc-surface-3)", padding: "0 4px", borderRadius: "2px" }}>.env.local</code>.
        </div>

        {/* Empty state if no data */}
        {!isLive && result.errors.length === 0 && (
          <ErrorCard
            icon="📭"
            title="No data to analyze"
            message="No GitHub token configured. Add one in Settings to enable AI analysis."
            variant="info"
            action={{ label: "Go to Settings", onClick: () => (window.location.href = "/settings") }}
          />
        )}

        {/* Analysis panel */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--nc-surface-1)", border: "1px solid var(--nc-ghost)" }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--nc-ghost)" }}>
            <h2 className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Friction Analysis</h2>
            <span className="text-[9px] px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(105,218,255,0.1)", color: "var(--nc-cyan)", border: "1px solid rgba(105,218,255,0.2)" }}>
              Powered by Claude
            </span>
          </div>
          <div className="p-6">
            <FrictionAnalysis repoData={isLive ? repoData : undefined} />
          </div>
        </div>
      </main>
    </div>
  );
}
