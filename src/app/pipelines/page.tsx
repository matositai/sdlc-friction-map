import { Header } from "@/components/layout/Header";
import { FetchErrorBanner } from "@/components/errors/FetchErrorBanner";
import { ErrorCard } from "@/components/errors/ErrorCard";
import { getLiveRepoData, deriveDashboardStats } from "@/lib/live-data";
import { CANONICAL_REPOS } from "@/lib/repo-config";
import { StudiosClient } from "@/components/dashboard/StudiosClient";

export default async function StudiosPage() {
  const result = await getLiveRepoData().catch(() => ({ data: [], errors: [], totalAttempted: 0, successCount: 0, isLive: false }));
  const repoData = result.data;
  const isLive = repoData.length > 0;
  const stats = isLive ? deriveDashboardStats(repoData) : undefined;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--nc-void)" }}>
      <Header
        title="Studios"
        subtitle={`${stats?.totalPipelines ?? CANONICAL_REPOS.length} tracked repos · click any card for SDLC detail`}
        isLive={isLive}
      />
      <main className="p-6 max-w-[1400px] w-full space-y-5">
        {/* Error banner if any fetches failed */}
        {result.errors.length > 0 && (
          <FetchErrorBanner errors={result.errors} successCount={result.successCount} totalAttempted={result.totalAttempted} />
        )}

        {/* Empty state if no data */}
        {!isLive && result.errors.length === 0 && (
          <ErrorCard
            icon="📭"
            title="No data to display"
            message="No GitHub token configured. Add one in Settings to see studio details."
            variant="info"
            action={{ label: "Go to Settings", onClick: () => (window.location.href = "/settings") }}
          />
        )}

        <StudiosClient repoData={repoData} stats={stats} isLive={isLive} />
      </main>
    </div>
  );
}
